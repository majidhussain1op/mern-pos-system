const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account", // adjust ref name if your Chart of Accounts model is registered under a different name
      required: true,
    },
    period: { type: String, required: true }, // "YYYY-MM", e.g. "2026-10"
    amount: { type: Number, required: true, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// one budget row per account per period
budgetSchema.index({ account: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);
