const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qty: { type: Number, required: true },
    purchasePrice: { type: Number, required: true }, // jis price pe wapas credit mil raha hai
    lineTotal: { type: Number, required: true },
  },
  { _id: false },
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    returnNo: { type: String, required: true, unique: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    // Optional link - agar ye return kisi specific purchase invoice ke against hai
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
    items: { type: [returnItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    reason: { type: String, default: "" },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PurchaseReturn", purchaseReturnSchema);
