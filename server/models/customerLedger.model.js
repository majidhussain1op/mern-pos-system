const mongoose = require("mongoose");

const customerLedgerSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    type: {
      type: String,
      enum: ["SALE", "PAYMENT_IN", "PAYMENT_OUT", "ADJUSTMENT", "OPENING"],
      required: true,
    },
    // debit = customer par charge hua (balance badha)
    // credit = customer ne pay kiya (balance ghata)
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balanceAfter: { type: Number, required: true }, // running balance snapshot
    reference: { type: String }, // e.g. Sale invoice no, receipt no
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    note: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

customerLedgerSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model("CustomerLedger", customerLedgerSchema);
