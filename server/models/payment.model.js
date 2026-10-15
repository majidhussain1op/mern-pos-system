const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["RECEIVE", "PAY"], required: true }, // RECEIVE = customer se, PAY = supplier ko
    partyType: { type: String, enum: ["Customer", "Supplier"], required: true },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "partyType",
    },

    amount: { type: Number, required: true },
    method: { type: String, enum: ["Cash", "Bank", "Cheque"], default: "Cash" },

    refType: {
      type: String,
      enum: ["Sale", "Purchase", "Manual"],
      default: "Manual",
    },
    refId: { type: mongoose.Schema.Types.ObjectId },

    date: { type: Date, default: Date.now },
    remarks: { type: String, default: "" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
