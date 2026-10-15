const Shift = require("../models/shift.model");
const CashMovement = require("../models/cashmovement.model");
const Sale = require("../models/Sale");

// JWT payload mein 'id' ya '_id' — jo bhi ho, dono handle karo
const getUserId = (req) => req.user?.id || req.user?._id;

// Helper: generate a unique, human-readable shift number
const generateShiftNumber = async () => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = await Shift.countDocuments({
    shiftNumber: { $regex: `^SH-${datePart}` },
  });
  return `SH-${datePart}-${String(countToday + 1).padStart(3, "0")}`;
};

// Shared: shift close hote waqt sales se totals nikalna (normal close + force close dono use karte hain)
const computeShiftCloseTotals = async (shiftId) => {
  const sales = await Sale.find({
    shift: shiftId,
    isVoided: { $ne: true },
  });

  let totalCashSales = 0;
  let totalCardSales = 0;
  let totalOtherTenderSales = 0;

  sales.forEach((sale) => {
    if (sale.payments && sale.payments.length > 0) {
      sale.payments.forEach((p) => {
        if (p.method === "CASH") totalCashSales += p.amount;
        else if (p.method === "CARD") totalCardSales += p.amount;
        else totalOtherTenderSales += p.amount;
      });
    } else if (sale.paymentType === "CASH") {
      totalCashSales += sale.receivedAmount; // fix: totalAmount ki jagah receivedAmount (credit portion drawer mein nahi aata)
    } else if (sale.paymentType === "CARD") {
      totalCardSales += sale.receivedAmount;
    } else {
      totalOtherTenderSales += sale.receivedAmount;
    }
  });

  return { sales, totalCashSales, totalCardSales, totalOtherTenderSales };
};

// @desc   Open a new shift for logged-in cashier
// @route  POST /api/shifts/open
exports.openShift = async (req, res) => {
  try {
    const cashierId = getUserId(req);
    const { openingCash, notes } = req.body;

    if (openingCash === undefined || openingCash < 0) {
      return res.status(400).json({
        success: false,
        message: "Opening cash amount is required and cannot be negative",
      });
    }

    // Prevent opening a second shift while one is already open
    const existingOpenShift = await Shift.findOne({
      cashier: cashierId,
      status: "OPEN",
      isActive: true,
    });

    if (existingOpenShift) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an open shift. Close it before opening a new one.",
        data: existingOpenShift,
      });
    }

    const shiftNumber = await generateShiftNumber();

    const shift = await Shift.create({
      shiftNumber,
      cashier: cashierId,
      openingCash,
      notes: notes || "",
    });

    return res.status(201).json({ success: true, data: shift });
  } catch (error) {
    console.error("openShift error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to open shift" });
  }
};

// @desc   Get the currently open shift for logged-in cashier
// @route  GET /api/shifts/current
exports.getCurrentShift = async (req, res) => {
  try {
    const shift = await Shift.findOne({
      cashier: getUserId(req),
      status: "OPEN",
      isActive: true,
    }).populate("cashier", "name email");

    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "No open shift found" });
    }

    return res.status(200).json({ success: true, data: shift });
  } catch (error) {
    console.error("getCurrentShift error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch current shift" });
  }
};

// @desc   Record Cash IN or Cash OUT against the open shift
// @route  POST /api/shifts/cash-movement
exports.recordCashMovement = async (req, res) => {
  try {
    const { type, amount, reason } = req.body;

    if (!["CASH_IN", "CASH_OUT"].includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid movement type" });
    }
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Amount must be greater than 0" });
    }
    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Reason is required" });
    }

    const shift = await Shift.findOne({
      cashier: getUserId(req),
      status: "OPEN",
      isActive: true,
    });

    if (!shift) {
      return res.status(400).json({
        success: false,
        message: "No open shift found. Open a shift first.",
      });
    }

    const movement = await CashMovement.create({
      shift: shift._id,
      type,
      amount,
      reason: reason.trim(),
      createdBy: getUserId(req),
    });

    // Keep running totals on the shift for fast reporting
    const field = type === "CASH_IN" ? "totalCashIn" : "totalCashOut";
    await Shift.findByIdAndUpdate(
      shift._id,
      { $inc: { [field]: amount } },
      { runValidators: false },
    );

    return res.status(201).json({ success: true, data: movement });
  } catch (error) {
    console.error("recordCashMovement error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record cash movement" });
  }
};

// @desc   Close the current open shift
// @route  POST /api/shifts/close
exports.closeShift = async (req, res) => {
  try {
    const { closingCash, notes } = req.body;

    if (closingCash === undefined || closingCash < 0) {
      return res.status(400).json({
        success: false,
        message: "Closing cash amount is required and cannot be negative",
      });
    }

    const shift = await Shift.findOne({
      cashier: getUserId(req),
      status: "OPEN",
      isActive: true,
    });

    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "No open shift found to close" });
    }

    // Recalculate sales totals directly from Sale collection (source of truth,
    // not just relying on running counters) to avoid drift.
    const { sales, totalCashSales, totalCardSales, totalOtherTenderSales } =
      await computeShiftCloseTotals(shift._id);

    // Sale Return feature abhi nahi bana, is liye returns deduction filhal 0.
    // Jab SaleReturn model ban jaega, yahan uska cash-refund total subtract hoga:
    // const returns = await SaleReturn.find({ shift: shift._id, refundMethod: "CASH" });
    // const totalCashReturns = returns.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
    const totalCashReturns = 0;

    const expectedCash =
      shift.openingCash +
      totalCashSales +
      shift.totalCashIn -
      shift.totalCashOut -
      totalCashReturns;

    const variance = closingCash - expectedCash;

    const updatedShift = await Shift.findByIdAndUpdate(
      shift._id,
      {
        status: "CLOSED",
        closingCash,
        expectedCash,
        variance,
        totalCashSales,
        totalCardSales,
        totalOtherTenderSales,
        totalSaleReturns: totalCashReturns,
        totalSalesCount: sales.length,
        closedAt: new Date(),
        closedBy: getUserId(req),
        notes: notes ?? shift.notes,
      },
      { new: true, runValidators: false },
    );

    return res.status(200).json({ success: true, data: updatedShift });
  } catch (error) {
    console.error("closeShift error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to close shift" });
  }
};

// @desc   Admin/Manager forcibly closes a shift the cashier forgot to close
// @route  POST /api/shifts/:id/force-close
exports.forceCloseShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { closingCash, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Force close ki wajah (reason) likhna zaroori hai",
      });
    }

    const shift = await Shift.findOne({
      _id: id,
      status: "OPEN",
      isActive: true,
    });
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Ye shift open nahi hai ya mil nahi raha",
      });
    }

    const { sales, totalCashSales, totalCardSales, totalOtherTenderSales } =
      await computeShiftCloseTotals(shift._id);

    const totalCashReturns = 0; // SaleReturn ban jaega to yahan wire hoga

    const expectedCash =
      shift.openingCash +
      totalCashSales +
      shift.totalCashIn -
      shift.totalCashOut -
      totalCashReturns;

    // Agar admin ne actual counted cash nahi diya, expectedCash ko hi closingCash maan lo (variance 0)
    const finalClosingCash =
      closingCash !== undefined && closingCash !== null
        ? closingCash
        : expectedCash;

    const variance = finalClosingCash - expectedCash;

    const updatedShift = await Shift.findByIdAndUpdate(
      shift._id,
      {
        status: "CLOSED",
        closingCash: finalClosingCash,
        expectedCash,
        variance,
        totalCashSales,
        totalCardSales,
        totalOtherTenderSales,
        totalSaleReturns: totalCashReturns,
        totalSalesCount: sales.length,
        closedAt: new Date(),
        closedBy: getUserId(req),
        isForceClosed: true,
        forceCloseReason: reason.trim(),
      },
      { new: true, runValidators: false },
    );

    return res.status(200).json({ success: true, data: updatedShift });
  } catch (error) {
    console.error("forceCloseShift error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to force-close shift" });
  }
};

// @desc   Get shift history (Admin/Manager view — all cashiers)
// @route  GET /api/shifts/history
exports.getShiftHistory = async (req, res) => {
  try {
    const { cashierId, status, from, to, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };
    if (cashierId) filter.cashier = cashierId;
    if (status) filter.status = status;
    if (from || to) {
      filter.openedAt = {};
      if (from) filter.openedAt.$gte = new Date(from);
      if (to) filter.openedAt.$lte = new Date(to);
    }

    const shifts = await Shift.find(filter)
      .populate("cashier", "name email")
      .sort({ openedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Shift.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: shifts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getShiftHistory error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch shift history" });
  }
};

// @desc   Get full report for a single shift (sales + movements breakdown)
// @route  GET /api/shifts/:id/report
exports.getShiftReport = async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await Shift.findById(id).populate("cashier", "name email");
    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Shift not found" });
    }

    const cashMovements = await CashMovement.find({ shift: id, isActive: true })
      .populate("createdBy", "name")
      .sort({ createdAt: 1 });

    const sales = await Sale.find({ shift: id, isVoided: { $ne: true } }).sort({
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      data: { shift, cashMovements, sales },
    });
  } catch (error) {
    console.error("getShiftReport error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch shift report" });
  }
};

// @desc   Get combined Cash IN/OUT history across ALL shifts (Admin/Manager report)
// @route  GET /api/shifts/cash-movements/history
exports.getCashMovementHistory = async (req, res) => {
  try {
    const {
      type, // "CASH_IN" | "CASH_OUT"
      cashierId,
      from,
      to,
      page = 1,
      limit = 30,
    } = req.query;

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // Agar cashier se filter karna ho, pehle uski shifts dhoondo,
    // phir un shift IDs se cash movements filter karo
    if (cashierId) {
      const cashierShifts = await Shift.find({ cashier: cashierId }).select(
        "_id",
      );
      filter.shift = { $in: cashierShifts.map((s) => s._id) };
    }

    const movements = await CashMovement.find(filter)
      .populate("createdBy", "name email")
      .populate({
        path: "shift",
        select: "shiftNumber cashier status",
        populate: { path: "cashier", select: "name email" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await CashMovement.countDocuments(filter);

    // Summary totals (across the filtered set, not just current page)
    const summaryAgg = await CashMovement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$type",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = {
      totalCashIn:
        summaryAgg.find((s) => s._id === "CASH_IN")?.totalAmount || 0,
      totalCashOut:
        summaryAgg.find((s) => s._id === "CASH_OUT")?.totalAmount || 0,
      countCashIn: summaryAgg.find((s) => s._id === "CASH_IN")?.count || 0,
      countCashOut: summaryAgg.find((s) => s._id === "CASH_OUT")?.count || 0,
    };

    return res.status(200).json({
      success: true,
      data: movements,
      summary,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getCashMovementHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cash movement history",
    });
  }
};
