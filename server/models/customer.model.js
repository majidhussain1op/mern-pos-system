const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, default: "COUNTER" },
    phone: { type: String },
    address: { type: String },
    // positive = customer hum se lena hai (receivable)
    // negative = hum customer ko dena hai (advance/overpaid)
    balance: { type: Number, default: 0 },
    creditLimit: { type: Number, default: 0 }, // 0 = no limit check
    isActive: { type: Boolean, default: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

customerSchema.index({ name: "text", phone: 1 });

module.exports = mongoose.model("Customer", customerSchema);
