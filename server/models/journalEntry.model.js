const mongoose = require("mongoose");

const journalLineSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  { _id: false },
);

const journalEntrySchema = new mongoose.Schema(
  {
    entryNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    description: { type: String, default: "" },
    lines: { type: [journalLineSchema], required: true },

    refType: {
      type: String,
      enum: [
        "Sale",
        "SaleVoid",
        "Purchase",
        "PurchaseReturn",
        "PaymentIn",
        "PaymentOut",
        "Voucher", // naya - Payment/Receipt/Contra/Journal vouchers se
        "Manual",
      ],
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, default: null },

    isSystemGenerated: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

journalEntrySchema.index({ date: -1 });
journalEntrySchema.index({ refType: 1, refId: 1 });

module.exports = mongoose.model("JournalEntry", journalEntrySchema);
