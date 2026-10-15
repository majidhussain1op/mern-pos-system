const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const CustomerLedger = require("../models/customerLedger.model");
const {
  postPaymentInJournal,
  postPaymentOutJournal,
} = require("../services/Accounting.services");

const getUserId = (req) => req.user?.id || req.user?._id;

// ---- Helper: ledger entry create + customer balance update (atomic-ish) ----
const postLedgerEntry = async ({
  customerId,
  type,
  debit = 0,
  credit = 0,
  reference,
  saleId,
  note,
  createdBy,
  session,
}) => {
  const customer = await Customer.findById(customerId).session(session);
  if (!customer) throw new Error("Customer not found");

  const newBalance = customer.balance + debit - credit;

  const [entry] = await CustomerLedger.create(
    [
      {
        customer: customerId,
        type,
        debit,
        credit,
        balanceAfter: newBalance,
        reference,
        saleId,
        note,
        createdBy,
        shopId: customer.shopId,
      },
    ],
    { session },
  );

  await Customer.findByIdAndUpdate(
    customerId,
    { balance: newBalance },
    { new: true, runValidators: false, session },
  );

  return entry;
};

// POST /api/crm/:id/payment  (customer se cash receive - udhar wasooli)
// body: { amount, note, reference }
const receivePayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, note, reference } = req.body;
    const { id } = req.params;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount valid nahi hai" });
    }

    let entry;
    await session.withTransaction(async () => {
      entry = await postLedgerEntry({
        customerId: id,
        type: "PAYMENT_IN",
        credit: amount, // credit = balance kam hoga
        reference,
        note,
        createdBy: getUserId(req),
        session,
      });
    });

    // Accounting: Dr Cash in Hand, Cr Accounts Receivable
    try {
      await postPaymentInJournal({ entry, amount, createdBy: getUserId(req) });
    } catch (journalError) {
      console.error(
        "postPaymentInJournal error (payment saved, journal failed):",
        journalError,
      );
    }

    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// POST /api/crm/:id/payment-out  (customer ko wapis cash dena - refund/advance return)
const makePaymentOut = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, note, reference } = req.body;
    const { id } = req.params;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount valid nahi hai" });
    }

    let entry;
    await session.withTransaction(async () => {
      entry = await postLedgerEntry({
        customerId: id,
        type: "PAYMENT_OUT",
        debit: amount, // debit = balance badhega (unko dena hai to unka due kam...
        // dhyan se: PAYMENT_OUT matlab hum ne diya, customer ka balance (receivable) badh jayega agar wo already negative tha
        reference,
        note,
        createdBy: getUserId(req),
        session,
      });
    });

    // Accounting: Dr Accounts Receivable, Cr Cash in Hand
    try {
      await postPaymentOutJournal({ entry, amount, createdBy: getUserId(req) });
    } catch (journalError) {
      console.error(
        "postPaymentOutJournal error (payment saved, journal failed):",
        journalError,
      );
    }

    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// POST /api/crm/:id/adjustment  (manual balance correction)
const adjustBalance = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { amount, note } = req.body; // amount can be +ve or -ve
    const { id } = req.params;

    if (amount === undefined || amount === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Adjustment amount required" });
    }

    let entry;
    await session.withTransaction(async () => {
      entry = await postLedgerEntry({
        customerId: id,
        type: "ADJUSTMENT",
        debit: amount > 0 ? amount : 0,
        credit: amount < 0 ? Math.abs(amount) : 0,
        note,
        createdBy: getUserId(req),
        session,
      });
    });

    res.json({ success: true, entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// GET /api/crm/:id/statement?from=&to=  (customer ledger history)
const getStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const filter = { customer: id };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const entries = await CustomerLedger.find(filter)
      .sort({ createdAt: 1 })
      .populate("saleId", "invoiceNo grandTotal");

    res.json({
      success: true,
      customer,
      currentBalance: customer.balance,
      entries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/crm/due-list?minBalance=0  (jinke paise hum ne lene hain)
const getDueList = async (req, res) => {
  try {
    const minBalance = Number(req.query.minBalance) || 0;
    const customers = await Customer.find({
      balance: { $gt: minBalance },
      isActive: true,
    }).sort({ balance: -1 });

    const totalReceivable = customers.reduce((sum, c) => sum + c.balance, 0);

    res.json({
      success: true,
      customers,
      totalReceivable,
      count: customers.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/crm/:id/summary  (quick profile card ke liye)
const getCustomerSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    }

    const [totalSales, totalPayments, lastTxn] = await Promise.all([
      CustomerLedger.aggregate([
        {
          $match: {
            customer: new mongoose.Types.ObjectId(id),
            type: "SALE",
          },
        },
        {
          $group: { _id: null, total: { $sum: "$debit" }, count: { $sum: 1 } },
        },
      ]),
      CustomerLedger.aggregate([
        {
          $match: {
            customer: new mongoose.Types.ObjectId(id),
            type: "PAYMENT_IN",
          },
        },
        {
          $group: { _id: null, total: { $sum: "$credit" }, count: { $sum: 1 } },
        },
      ]),
      CustomerLedger.findOne({ customer: id }).sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      customer,
      totalSalesAmount: totalSales[0]?.total || 0,
      totalSalesCount: totalSales[0]?.count || 0,
      totalPaidAmount: totalPayments[0]?.total || 0,
      totalPaidCount: totalPayments[0]?.count || 0,
      lastTransactionDate: lastTxn?.createdAt || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  postLedgerEntry, // sale.controller.js mein import karke SALE type ke liye use karna
  receivePayment,
  makePaymentOut,
  adjustBalance,
  getStatement,
  getDueList,
  getCustomerSummary,
};
