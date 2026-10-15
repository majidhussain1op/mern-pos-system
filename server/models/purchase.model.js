const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true },
    purchasePrice: { type: Number, required: true }, // price at time of purchase
  },
  { _id: false },
);

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    // naya: agar ye purchase kisi PurchaseOrder (goods-receive) se bani hai
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },
    items: { type: [purchaseItemSchema], required: true },

    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }, // totalAmount - paidAmount -> supplier.balance mein add hoga

    date: { type: Date, default: Date.now },
    remarks: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

purchaseSchema.index({ purchaseOrder: 1 });

module.exports = mongoose.model("Purchase", purchaseSchema);
