const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "General",
    },
    // Replace single `price` field with tiers, add barcode
    priceTiers: {
      retail: { type: Number, required: true },
      wholesale: { type: Number, default: null },
      special: { type: Number, default: null },
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // allows many products with barcode: null, only checks uniqueness when set
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    image: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Product", productSchema);
