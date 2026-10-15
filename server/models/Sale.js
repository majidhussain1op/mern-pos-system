const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true },
    sellPrice: { type: Number, required: true },
    lessPercent: { type: Number, default: 0 },
    lessAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true }, // FOC hone par ye 0 hoga (customer se charge nahi)

    // naya: GST/FOC handling
    isFOC: { type: Boolean, default: false }, // Free of Charge - customer se paisa nahi liya
    gstRate: { type: Number, default: 0 }, // is line pe jo rate apply hua (snapshot, baad mein rate badle to purani sale na badle)
    gstAmount: { type: Number, default: 0 }, // normal line: charge hone wala GST. FOC line: sirf record ke liye (customer se nahi liya)
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now },
    items: [saleItemSchema],
    subTotal: { type: Number, default: 0 },
    lessPercent: { type: Number, default: 0 },
    lessAmount: { type: Number, default: 0 }, // bill-level fixed amount
    totalAmount: { type: Number, required: true }, // goods value after discount, TAX SE PEHLE (backward-compatible field, reports isi ko use karte hain)

    // naya: GST breakdown
    totalGstAmount: { type: Number, default: 0 }, // sirf non-FOC lines ka GST, customer se charge hota hai
    additionalGstAmount: { type: Number, default: 0 }, // global "Further Tax" - sab sales pe automatically
    focGstAmount: { type: Number, default: 0 }, // FOC items ka GST - sirf record/reporting ke liye, customer se NAHI liya
    grandTotal: { type: Number, default: 0 }, // totalAmount + totalGstAmount + additionalGstAmount = customer ne asal mein kitna dena hai

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    paymentType: {
      type: String,
      enum: ["CASH", "CARD", "EASYPAISA", "JAZZCASH", "BANK"],
      default: "CASH",
    },
    payments: [{ method: String, amount: Number }],
    receivedAmount: { type: Number, default: 0 },
    changeDue: { type: Number, default: 0 },
    receivable: { type: Number, default: 0 }, // ab grandTotal - receivedAmount se calculate hota hai
    salesman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    biltiNo: String,
    remarks: String,
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    status: { type: String, enum: ["ACTIVE", "VOID"], default: "ACTIVE" },
    voidedAt: { type: Date, default: null },
    voidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    voidReason: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

saleSchema.index({ shift: 1 });
// saleSchema.index({ invoiceNo: 1 });
saleSchema.index({ date: -1 });

module.exports = mongoose.model("Sale", saleSchema);
