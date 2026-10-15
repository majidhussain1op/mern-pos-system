const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "ABC", "ANIX" (Manufacture column)
    phone: { type: String },
    address: { type: String },
    // running balance - positive = hum ne supplier ko dene hain (payable)
    balance: { type: Number, default: 0 },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Supplier", supplierSchema);
