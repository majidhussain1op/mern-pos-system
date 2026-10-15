const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    type: { type: String, enum: ["IN", "OUT", "ADJUST"], required: true },
    qty: { type: Number, required: true }, // always positive, "type" decides direction

    refType: {
      type: String,
      enum: ["Purchase", "Sale", "SaleVoid", "Adjustment"], // fix: "SaleVoid" missing tha, voidSale controller isko bhejta hai — pehle silently validation-fail ho raha tha
      required: true,
    },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Purchase._id or Sale._id

    balanceAfter: { type: Number, required: true }, // stockQty snapshot after this entry
    date: { type: Date, default: Date.now },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true },
);

// Har purchase/sale pe ye entry banti hai + Item.stockQty ko $inc/$dec karo
// isi transaction/session mein - taake stock hamesha ledger se match kare
stockLedgerSchema.index({ item: 1, date: -1 });

module.exports = mongoose.model("StockLedger", stockLedgerSchema);
