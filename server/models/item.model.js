const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    barcode: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    urduName: { type: String, default: "" },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    manufacturer: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },

    purchasePrice: { type: Number, default: 0 },
    sellPrice: { type: Number, required: true },

    stockQty: { type: Number, default: 0 },

    minStockAlert: { type: Number, default: 5 },
    unit: { type: String, default: "pcs" },
    itemImage: { type: String, default: "" },

    expiryDate: { type: Date, default: null },

    // naya: item ka apna GST rate (%). null = Settings ka default rate use hoga.
    // Kuch items exempt (0%) ya alag rate pe ho sakte hain, isliye per-item override.
    gstRate: { type: Number, default: null },

    isActive: { type: Boolean, default: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

itemSchema.index({ barcode: 1, shopId: 1 }, { unique: true });
itemSchema.index({ itemName: "text" });
itemSchema.index({ expiryDate: 1 });

module.exports = mongoose.model("Item", itemSchema);
