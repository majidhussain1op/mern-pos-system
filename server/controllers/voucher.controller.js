const Voucher = require("../models/voucher.model");
const Account = require("../models/chartOfAccount.model");
const { postJournalEntry } = require("../services/Accounting.services");

const getUserId = (req) => req.user?.id || req.user?._id;

const VOUCHER_PREFIX = {
  PAYMENT: "PV",
  RECEIPT: "RV",
  CONTRA: "CV",
  JOURNAL: "JV",
};

const generateVoucherNo = async (voucherType) => {
  const prefix = VOUCHER_PREFIX[voucherType];
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = await Voucher.countDocuments({
    voucherNo: { $regex: `^${prefix}-${datePart}` },
  });
  return `${prefix}-${datePart}-${String(countToday + 1).padStart(3, "0")}`;
};

// POST /api/vouchers
// body: { voucherType, date, lines: [{accountCode, debit, credit, narration}],
//         narration, partyType, customer, supplier, paymentMode, referenceNo }
const createVoucher = async (req, res) => {
  try {
    const {
      voucherType,
      date,
      lines,
      narration,
      partyType,
      customer,
      supplier,
      paymentMode,
      referenceNo,
    } = req.body;

    if (!VOUCHER_PREFIX[voucherType]) {
      return res.status(400).json({
        success: false,
        message:
          "Voucher type PAYMENT, RECEIPT, CONTRA ya JOURNAL hona chahiye",
      });
    }
    if (!lines || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Voucher mein kam az kam 2 lines honi chahiye",
      });
    }

    // Balance check yahan bhi kar lo taake user ko saaf error mile (postJournalEntry
    // bhi karta hai, lekin wahan ka message zyada technical hai)
    const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Debit (${totalDebit.toFixed(2)}) aur Credit (${totalCredit.toFixed(2)}) barabar hone chahiye`,
      });
    }
    if (totalDebit <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount 0 se zyada hona chahiye" });
    }

    // Har accountCode ko resolve karo (aur confirm karo posting account hai)
    const resolvedLines = [];
    for (const line of lines) {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (debit === 0 && credit === 0) continue;

      const account = await Account.findOne({ code: line.accountCode });
      if (!account) {
        return res.status(400).json({
          success: false,
          message: `Account "${line.accountCode}" nahi mila`,
        });
      }
      if (!account.isPostingAccount) {
        return res.status(400).json({
          success: false,
          message: `"${account.code} - ${account.name}" group account hai - entry sirf Level 4 account pe ho sakti hai`,
        });
      }

      resolvedLines.push({
        account: account._id,
        accountCode: account.code,
        debit,
        credit,
        narration: line.narration || "",
      });
    }

    const voucherNo = await generateVoucherNo(voucherType);
    const voucherDate = date ? new Date(date) : new Date();

    const voucher = await Voucher.create({
      voucherNo,
      voucherType,
      date: voucherDate,
      lines: resolvedLines,
      totalAmount: totalDebit,
      narration: narration || "",
      partyType: partyType || "OTHER",
      customer: customer || null,
      supplier: supplier || null,
      paymentMode: paymentMode || "CASH",
      referenceNo: referenceNo || "",
      createdBy: getUserId(req),
    });

    // Journal entry post karo. Agar ye fail ho to voucher bhi rollback kar do -
    // voucher bina journal ke adhoora hai (sale ke barkhilaf, jahan sale zyada
    // zaroori thi journal se)
    try {
      const entry = await postJournalEntry({
        description: `${voucherType} Voucher ${voucherNo}${narration ? ` - ${narration}` : ""}`,
        lines: lines.map((l) => ({
          accountCode: l.accountCode,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
        refType: "Voucher",
        refId: voucher._id,
        createdBy: getUserId(req),
        date: voucherDate,
      });

      voucher.journalEntry = entry._id;
      await voucher.save();
    } catch (journalError) {
      await Voucher.findByIdAndDelete(voucher._id);
      return res.status(400).json({
        success: false,
        message: `Journal post nahi ho saki: ${journalError.message}`,
      });
    }

    return res.status(201).json({ success: true, voucher });
  } catch (error) {
    console.error("createVoucher error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/vouchers?voucherType=&from=&to=&partyType=&supplier=&customer=&page=&limit=
const getVouchers = async (req, res) => {
  try {
    const {
      voucherType,
      from,
      to,
      partyType,
      supplier,
      customer,
      page = 1,
      limit = 30,
    } = req.query;

    const filter = { isActive: true };
    if (voucherType) filter.voucherType = voucherType;
    if (partyType) filter.partyType = partyType;
    if (supplier) filter.supplier = supplier;
    if (customer) filter.customer = customer;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        filter.date.$lte = endOfDay;
      }
    }

    const vouchers = await Voucher.find(filter)
      .populate("lines.account", "code name")
      .populate("customer", "name phone")
      .populate("supplier", "name phone")
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Voucher.countDocuments(filter);
    const totalAmountAgg = await Voucher.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    return res.status(200).json({
      success: true,
      data: vouchers,
      summary: { totalAmount: totalAmountAgg[0]?.total || 0, count: total },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/vouchers/:id
const getVoucherById = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)
      .populate("lines.account", "code name type")
      .populate("customer", "name phone")
      .populate("supplier", "name phone")
      .populate("journalEntry", "entryNo date");

    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, message: "Voucher not found" });
    }
    return res.status(200).json({ success: true, voucher });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createVoucher, getVouchers, getVoucherById };
