const mongoose = require("mongoose");

const voucherLineSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    accountCode: { type: String, required: true }, // snapshot, report mein fast display ke liye
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    narration: { type: String, default: "" },
  },
  { _id: false },
);

const voucherSchema = new mongoose.Schema(
  {
    voucherNo: { type: String, required: true, unique: true },
    // PAYMENT  - humne kisi ko paisa diya (cash/bank nikla)
    // RECEIPT  - humein paisa mila (cash/bank aaya)
    // CONTRA   - cash <-> bank ke beech transfer (bahar koi paisa nahi gaya)
    // JOURNAL  - general adjustment (koi cash movement nahi)
    voucherType: {
      type: String,
      enum: ["PAYMENT", "RECEIPT", "CONTRA", "JOURNAL"],
      required: true,
    },
    date: { type: Date, default: Date.now },
    lines: { type: [voucherLineSchema], required: true },
    totalAmount: { type: Number, required: true },
    narration: { type: String, default: "" },

    // Kis party se related hai (optional - supplier/customer payment summary ke liye)
    partyType: {
      type: String,
      enum: ["CUSTOMER", "SUPPLIER", "OTHER"],
      default: "OTHER",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "BANK", "OTHER"],
      default: "CASH",
    },
    referenceNo: { type: String, default: "" }, // cheque no, transaction id waghera

    // Isi voucher se bani journal entry (traceability)
    journalEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JournalEntry",
      default: null,
    },

    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

voucherSchema.index({ voucherType: 1, date: -1 });
voucherSchema.index({ supplier: 1 });
voucherSchema.index({ customer: 1 });

module.exports = mongoose.model("Voucher", voucherSchema);
