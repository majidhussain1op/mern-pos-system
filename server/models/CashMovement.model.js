const mongoose = require("mongoose");

const cashMovementSchema = new mongoose.Schema(
  {
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      required: true,
    },
    type: {
      type: String,
      enum: ["CASH_IN", "CASH_OUT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

cashMovementSchema.index({ shift: 1 });

module.exports = mongoose.model("CashMovement", cashMovementSchema);
