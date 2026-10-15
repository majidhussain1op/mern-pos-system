const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
      required: true,
    },
    normalBalance: { type: String, enum: ["DEBIT", "CREDIT"], required: true },

    // ---- 4-Level hierarchy ----
    // Level 1: Main Head      (e.g. "1" Assets)
    // Level 2: Sub Head       (e.g. "11" Current Assets)
    // Level 3: Group          (e.g. "1101" Cash & Bank)
    // Level 4: Posting Account(e.g. "1000" Cash in Hand) <- sirf isi pe entry post hoti hai
    level: { type: Number, enum: [1, 2, 3, 4], required: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null, // Level 1 ka koi parent nahi hota
    },
    // Sirf level-4 accounts pe journal entry post ho sakti hai. Level 1-3
    // sirf grouping/rollup ke liye hain (unka balance children se aata hai)
    isPostingAccount: { type: Boolean, default: false },

    balance: { type: Number, default: 0 },
    isSystemAccount: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

accountSchema.index({ level: 1, code: 1 });
accountSchema.index({ parent: 1 });

module.exports = mongoose.model("Account", accountSchema);
