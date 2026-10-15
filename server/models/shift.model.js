const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    shiftNumber: {
      type: String,
      required: true,
      unique: true,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["OPEN", "CLOSED"],
      default: "OPEN",
    },
    openingCash: {
      type: Number,
      required: true,
      default: 0,
    },
    closingCash: {
      type: Number, // actual cash counted by cashier at close
      default: null,
    },
    expectedCash: {
      type: Number, // system-calculated: opening + cashSales + cashIn - cashOut - cashRefunds
      default: null,
    },
    variance: {
      type: Number, // closingCash - expectedCash (+ / - / 0)
      default: null,
    },
    totalCashSales: {
      type: Number,
      default: 0,
    },
    totalCardSales: {
      type: Number,
      default: 0,
    },
    totalOtherTenderSales: {
      type: Number,
      default: 0,
    },
    totalCashIn: {
      type: Number,
      default: 0,
    },
    totalCashOut: {
      type: Number,
      default: 0,
    },
    totalSaleReturns: {
      type: Number,
      default: 0,
    },
    totalSalesCount: {
      type: Number,
      default: 0,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isForceClosed: {
      type: Boolean,
      default: false,
    },
    forceCloseReason: {
      type: String,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Fast lookup: "give me the OPEN shift for this cashier"
shiftSchema.index({ cashier: 1, status: 1 });

module.exports = mongoose.model("Shift", shiftSchema);
