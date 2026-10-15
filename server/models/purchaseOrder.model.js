const mongoose = require("mongoose");

const poItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    qtyOrdered: { type: Number, required: true },
    expectedPrice: { type: Number, default: 0 },
    qtyReceived: { type: Number, default: 0 }, // partial receiving track karne ke liye
  },
  { _id: false },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    items: { type: [poItemSchema], required: true },

    // DRAFT: abhi bana rahe hain, edit ho sakta hai
    // SENT: supplier ko bhej diya
    // CONFIRMED: supplier ne confirm kar diya (manual toggle, no supplier portal)
    // PARTIALLY_RECEIVED: kuch items receive ho chuke
    // RECEIVED: sab items pura receive ho chuke
    // CANCELLED: PO cancel ho gaya
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SENT",
        "CONFIRMED",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "CANCELLED",
      ],
      default: "DRAFT",
    },

    sentAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }, // jab status RECEIVED bana

    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
