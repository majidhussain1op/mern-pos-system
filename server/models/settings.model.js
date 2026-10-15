const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: "Nexus POS" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    currency: { type: String, default: "PKR" },
    invoicePrefix: { type: String, default: "INV-" },
    lowStockThresholdDefault: { type: Number, default: 5 },
    // ---- Discount rules (naya) ----
    maxDiscountPercent: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },
    allowBillWiseDiscount: {
      type: Boolean,
      default: true,
    },
    gstEnabled: { type: Boolean, default: true },
    defaultGstRate: { type: Number, default: 17 }, // Pakistan standard GST rate, item pe override na ho to ye use hoga
    additionalGstRate: { type: Number, default: 3 }, // FBR "Further Tax" - sab sales pe automatically
    allowItemWiseDiscount: {
      type: Boolean,
      default: true,
    },

    // ---- Barcode rule (naya) ----
    barcodeRequired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Singleton pattern - only one settings doc should ever exist
module.exports = mongoose.model("Settings", settingsSchema);
