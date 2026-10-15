const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // shopId agar future mein multi-shop banana ho (School Management jaisa multi-tenant)
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

categorySchema.index({ name: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
