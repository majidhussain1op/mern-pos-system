const mongoose = require("mongoose");
const Customer = require("../models/customer.model");
const CustomerLedger = require("../models/customerLedger.model");

// GET /api/customers/search?q=ali
const searchCustomers = async (req, res) => {
  try {
    const { q } = req.query;
    const customers = await Customer.find({
      isActive: true,
      name: { $regex: q || "", $options: "i" },
    }).limit(20);
    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/customers  (Add icon - quick create)
const createCustomer = async (req, res) => {
  try {
    const { name, phone, address, email, cnic, creditLimit } = req.body;
    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Customer name required hai" });
    }
    const customer = await Customer.create({
      name,
      phone,
      address,
      email,
      cnic,
      creditLimit,
    });
    res.status(201).json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/customers
const getAllCustomers = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === "true" ? {} : { isActive: true };
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/customers/stats  (dashboard summary - top receivables etc)
const getCustomerStats = async (req, res) => {
  try {
    const totalReceivable = await Customer.aggregate([
      { $match: { isActive: true, balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$balance" } } },
    ]);

    const topDebtors = await Customer.find({
      isActive: true,
      balance: { $gt: 0 },
    })
      .sort({ balance: -1 })
      .limit(10)
      .select("name phone balance");

    res.json({
      success: true,
      totalReceivable: totalReceivable[0]?.total || 0,
      totalCustomers: await Customer.countDocuments({ isActive: true }),
      topDebtors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/customers/:id
const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/customers/:id
const updateCustomer = async (req, res) => {
  try {
    const { name, phone, address, email, cnic, creditLimit } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { name, phone, address, email, cnic, creditLimit },
      { new: true, runValidators: false },
    );
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/customers/:id  (soft delete)
const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true, runValidators: false },
    );
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    res.json({ success: true, message: "Customer deactivate ho gaya" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/customers/:id/ledger  (statement / history)
const getCustomerLedger = async (req, res) => {
  try {
    const ledger = await CustomerLedger.find({ customerId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, ledger });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/customers/:id/payment  (collect payment against balance)
const addPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { amount, paymentMethod, note } = req.body;
    if (!amount || amount <= 0) {
      throw new Error("Valid payment amount required hai");
    }

    const customer = await Customer.findById(req.params.id).session(session);
    if (!customer) throw new Error("Customer not found");

    // payment => balance kam hoga (receivable settle)
    const newBalance = customer.balance - Number(amount);

    await Customer.findByIdAndUpdate(
      customer._id,
      { balance: newBalance, $inc: { totalPaid: Number(amount) } },
      { session, runValidators: false },
    );

    const [entry] = await CustomerLedger.create(
      [
        {
          customerId: customer._id,
          type: "PAYMENT",
          amount: Number(amount),
          balanceAfter: newBalance,
          paymentMethod: paymentMethod || "CASH",
          note,
          createdBy: req.user?.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, ledgerEntry: entry, newBalance });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// POST /api/customers/:id/adjust  (manual balance adjustment - opening balance, correction)
const adjustBalance = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { amount, note } = req.body; // amount can be +ve or -ve
    if (amount === undefined || amount === 0) {
      throw new Error("Valid adjustment amount required hai");
    }

    const customer = await Customer.findById(req.params.id).session(session);
    if (!customer) throw new Error("Customer not found");

    const newBalance = customer.balance + Number(amount);

    await Customer.findByIdAndUpdate(
      customer._id,
      { balance: newBalance },
      { session, runValidators: false },
    );

    const [entry] = await CustomerLedger.create(
      [
        {
          customerId: customer._id,
          type: "ADJUSTMENT",
          amount: Math.abs(Number(amount)),
          balanceAfter: newBalance,
          note: note || "Manual adjustment",
          createdBy: req.user?.id,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, ledgerEntry: entry, newBalance });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  searchCustomers,
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getCustomerLedger,
  addPayment,
  adjustBalance,
};
