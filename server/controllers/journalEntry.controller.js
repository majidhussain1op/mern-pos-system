const JournalEntry = require("../models/journalEntry.model");
const Account = require("../models/chartOfAccount.model");
const { postJournalEntry } = require("../services/Accounting.services");

const getUserId = (req) => req.user?.id || req.user?._id;

// POST /api/journal-entries  (Manual entry - admin khud koi adjustment post kar sakta hai)
// body: { description, lines: [{ accountCode, debit, credit }] }
// fix: pehle seedha JournalEntry.create(req.body) hota tha - na balance check,
// na entryNo auto-generate, na Account.balance update. Ab postJournalEntry
// service use ho raha hai jo ye sab guarantee karta hai.
const createEntry = async (req, res) => {
  try {
    const { description, lines } = req.body;
    if (!lines || lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Entry mein kam az kam 2 lines honi chahiye",
      });
    }

    const entry = await postJournalEntry({
      description,
      lines, // [{ accountCode, debit, credit }]
      refType: "Manual",
      refId: null,
      createdBy: getUserId(req),
    });

    res.status(201).json({ success: true, entry });
  } catch (error) {
    // postJournalEntry balance-mismatch ya missing-account pe throw karta hai -
    // ye validation errors hain, 500 nahi 400 hone chahiye
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/journal-entries?from=&to=&refType=
const getEntries = async (req, res) => {
  try {
    const { from, to, refType } = req.query;
    const filter = {};
    if (refType) filter.refType = refType;
    if (from || to) {
      filter.date = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lte: new Date(to) }),
      };
    }
    const entries = await JournalEntry.find(filter)
      .populate("lines.account", "code name")
      .sort({ date: -1 });
    res.json({ success: true, entries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/journal-entries/:id
// fix: pehle seedha delete ho jati thi, Account.balance corrupt ho jata (asal
// accounting principle bhi yehi kehta hai - entries delete nahi, reverse hoti
// hain). Ab: system-generated entries kabhi delete nahi hoti (Sale/Purchase se
// khud-ba-khud bani hain, unka apna reversal flow hai - jaise voidSale).
// Sirf Manual entries delete ho sakti hain, aur delete se pehle Account.balance
// ka impact wapas reverse hota hai.
const deleteEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }
    if (entry.refType !== "Manual") {
      return res.status(400).json({
        success: false,
        message:
          "System-generated entries delete nahi ho sakti (Sale/Purchase se khud bani hain) - unko unke apne void/return flow se reverse karo",
      });
    }

    // Har line ka balance-impact reverse karo delete se pehle
    for (const line of entry.lines) {
      const account = await Account.findById(line.account);
      if (!account) continue;
      const delta =
        account.normalBalance === "DEBIT"
          ? (line.credit || 0) - (line.debit || 0) // reverse
          : (line.debit || 0) - (line.credit || 0);
      await Account.findByIdAndUpdate(
        account._id,
        { $inc: { balance: delta } },
        { runValidators: false },
      );
    }

    await JournalEntry.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Entry deleted aur balances reverse ho gaye",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createEntry, getEntries, deleteEntry };
