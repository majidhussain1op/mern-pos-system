const Payment = require("../models/payment.model");
const Customer = require("../models/customer.model");
const Supplier = require("../models/supplier.model");

// POST /api/payments
// body: { type: "RECEIVE"|"PAY", partyType: "Customer"|"Supplier", party, amount, method, remarks }
const createPayment = async (req, res) => {
  try {
    const { type, partyType, party, amount, method, remarks } = req.body;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount valid hona chahiye" });
    }

    const payment = await Payment.create({
      type,
      partyType,
      party,
      amount,
      method,
      remarks,
    });

    const Model = partyType === "Customer" ? Customer : Supplier;
    // RECEIVE (customer se paisa aaya) -> balance kam ho jata hai
    // PAY (supplier ko diya) -> balance kam ho jata hai
    // dono cases mein balance minus hi hota hai kyunki balance = "kitna aur lena/dena hai"
    await Model.findByIdAndUpdate(
      party,
      { $inc: { balance: -amount } },
      { new: true, runValidators: false },
    );

    res.status(201).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payments?partyType=Customer&party=<id>
const getPayments = async (req, res) => {
  try {
    const { partyType, party } = req.query;
    const filter = {};
    if (partyType) filter.partyType = partyType;
    if (party) filter.party = party;

    const payments = await Payment.find(filter).sort({ date: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createPayment, getPayments };
