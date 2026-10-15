const Sale = require("../models/Sale");
const Purchase = require("../models/purchase.model");
const Item = require("../models/item.model");

// GET /api/reports/summary?from=&to=  - dashboard cards
const getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    // Sale schema mein confirmed field "date" hai. Purchase model ka schema
    // yahan nahi dekha, isliye uske liye purana "createdAt" hi rakha hai —
    // agar Purchase mein bhi "date" field hai to yahan badal dena.
    const saleDateFilter = {};
    const purchaseDateFilter = {};
    if (from || to) {
      saleDateFilter.date = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lte: new Date(to) }),
      };
      purchaseDateFilter.createdAt = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lte: new Date(to) }),
      };
    }

    // fix: status: "ACTIVE" filter add kiya — warna voided sales bhi total mein count ho rahi thi
    const sales = await Sale.find({
      ...saleDateFilter,
      status: "ACTIVE",
      isActive: { $ne: false },
    });
    const purchases = await Purchase.find(purchaseDateFilter);

    const totalSales = sales.reduce((s, r) => s + r.totalAmount, 0);
    const totalReceivable = sales.reduce((s, r) => s + r.receivable, 0);
    const totalPurchases = purchases.reduce((s, r) => s + r.totalAmount, 0);
    const totalPayable = purchases.reduce((s, r) => s + r.balance, 0);

    const lowStockCount = await Item.countDocuments({
      isActive: true,
      $expr: { $lte: ["$stockQty", "$minStockAlert"] },
    });

    res.json({
      success: true,
      summary: {
        totalSales,
        totalReceivable,
        totalPurchases,
        totalPayable,
        billCount: sales.length,
        lowStockCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/profit?from=&to=  - rough profit = sale price - purchase price per line
const getProfitReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const saleDateFilter = {};
    if (from || to) {
      saleDateFilter.date = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lte: new Date(to) }),
      };
    }

    // fix: "items.product" -> "items.item" (asal schema field), status: ACTIVE filter add kiya
    const sales = await Sale.find({
      ...saleDateFilter,
      status: "ACTIVE",
      isActive: { $ne: false },
    }).populate("items.item", "purchasePrice itemName");

    let totalRevenue = 0;
    let totalCost = 0;

    sales.forEach((sale) => {
      sale.items.forEach((line) => {
        // fix: line.quantity/line.price schema mein exist hi nahi karte,
        // asal fields "qty"/"sellPrice" hain. lineTotal already discount-adjusted
        // revenue hai, isliye use karo (qty * sellPrice discount ignore kar deta)
        totalRevenue += line.lineTotal;
        totalCost += (line.item?.purchasePrice || 0) * line.qty;
      });
    });

    res.json({
      success: true,
      report: {
        totalRevenue,
        totalCost,
        grossProfit: totalRevenue - totalCost,
      },
    });
  } catch (error) {
    console.error("getProfitReport error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/reports/top-selling-items?from=&to=&limit=
const getTopSellingItems = async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;

    const matchStage = {
      status: "ACTIVE",
      isActive: { $ne: false },
    };

    if (from || to) {
      matchStage.date = {};
      if (from) matchStage.date.$gte = new Date(from);
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        matchStage.date.$lte = endOfDay;
      }
    }

    const results = await Sale.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.item",
          totalQty: { $sum: "$items.qty" },
          totalRevenue: { $sum: "$items.lineTotal" },
          salesCount: { $sum: 1 },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: "items",
          localField: "_id",
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      { $unwind: { path: "$itemDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          itemId: "$_id",
          itemName: { $ifNull: ["$itemDetails.itemName", "Deleted Item"] },
          barcode: "$itemDetails.barcode",
          currentStock: "$itemDetails.stockQty",
          totalQty: 1,
          totalRevenue: 1,
          salesCount: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("getTopSellingItems error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch top selling items",
    });
  }
};

// GET /api/reports/sales?from=&to=&groupBy=day|month
const getSalesReport = async (req, res) => {
  try {
    const { from, to, groupBy = "day" } = req.query;

    const matchStage = {
      status: "ACTIVE",
      isActive: { $ne: false },
    };

    if (from || to) {
      matchStage.date = {};
      if (from) matchStage.date.$gte = new Date(from);
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        matchStage.date.$lte = endOfDay;
      }
    }

    // Date format: "day" -> YYYY-MM-DD, "month" -> YYYY-MM
    const dateFormat = groupBy === "month" ? "%Y-%m" : "%Y-%m-%d";

    const [timeline, byPaymentType, totals] = await Promise.all([
      // Din/mahine ke hisaab se sales trend
      Sale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$date" } },
            totalSales: { $sum: "$totalAmount" },
            totalReceived: { $sum: "$receivedAmount" },
            billCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Payment-type wise breakdown (poore range ka)
      Sale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$paymentType",
            totalAmount: { $sum: "$receivedAmount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // Overall totals
      Sale.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            totalReceived: { $sum: "$receivedAmount" },
            totalReceivable: { $sum: "$receivable" },
            billCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        timeline,
        byPaymentType,
        totals: totals[0] || {
          totalSales: 0,
          totalReceived: 0,
          totalReceivable: 0,
          billCount: 0,
        },
      },
    });
  } catch (error) {
    console.error("getSalesReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales report",
    });
  }
};

// GET /api/reports/stock?status=all|low|negative&category=
const getStockReport = async (req, res) => {
  try {
    const { status, category } = req.query;

    const matchStage = { isActive: true };
    if (category) matchStage.category = category;

    const items = await Item.find(matchStage)
      .populate("category", "name")
      .populate("manufacturer", "name")
      .sort({ stockQty: 1 }); // sabse kam/negative stock upar

    const enriched = items.map((item) => {
      const stockValue = item.stockQty * (item.purchasePrice || 0);
      let stockStatus = "OK";
      if (item.stockQty < 0) stockStatus = "NEGATIVE";
      else if (item.stockQty <= item.minStockAlert) stockStatus = "LOW";

      return {
        _id: item._id,
        itemName: item.itemName,
        barcode: item.barcode,
        category: item.category?.name || "—",
        manufacturer: item.manufacturer?.name || "—",
        stockQty: item.stockQty,
        minStockAlert: item.minStockAlert,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        stockValue,
        status: stockStatus,
      };
    });

    // Filter by status agar frontend ne maanga ho (list poori fetch karne ke baad,
    // kyunki status calculated field hai, DB-level query mein nahi ban sakta)
    const filtered =
      status && status !== "all"
        ? enriched.filter((i) => i.status === status.toUpperCase())
        : enriched;

    const totals = {
      totalItems: enriched.length,
      totalStockValue: enriched.reduce((sum, i) => sum + i.stockValue, 0),
      lowStockCount: enriched.filter((i) => i.status === "LOW").length,
      negativeStockCount: enriched.filter((i) => i.status === "NEGATIVE")
        .length,
    };

    return res.status(200).json({
      success: true,
      data: filtered,
      totals,
    });
  } catch (error) {
    console.error("getStockReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock report",
    });
  }
};

// GET /api/reports/expiry?status=all|expired|expiring_soon|ok&days=30
const getExpiryReport = async (req, res) => {
  try {
    const { status, days = 30 } = req.query;

    const items = await Item.find({
      isActive: true,
      expiryDate: { $ne: null },
    })
      .populate("category", "name")
      .sort({ expiryDate: 1 });

    const now = new Date();
    const warningWindowMs = Number(days) * 24 * 60 * 60 * 1000;

    const enriched = items.map((item) => {
      const expiryDate = new Date(item.expiryDate);
      const msUntilExpiry = expiryDate - now;

      let expiryStatus = "OK";
      if (msUntilExpiry < 0) expiryStatus = "EXPIRED";
      else if (msUntilExpiry <= warningWindowMs) expiryStatus = "EXPIRING_SOON";

      const daysUntilExpiry = Math.ceil(msUntilExpiry / (24 * 60 * 60 * 1000));

      return {
        _id: item._id,
        itemName: item.itemName,
        barcode: item.barcode,
        category: item.category?.name || "—",
        stockQty: item.stockQty,
        expiryDate: item.expiryDate,
        daysUntilExpiry,
        status: expiryStatus,
      };
    });

    const filtered =
      status && status !== "all"
        ? enriched.filter((i) => i.status === status.toUpperCase())
        : enriched;

    const totals = {
      totalTracked: enriched.length,
      expiredCount: enriched.filter((i) => i.status === "EXPIRED").length,
      expiringSoonCount: enriched.filter((i) => i.status === "EXPIRING_SOON")
        .length,
      // expired stock ki value bhi dikha do - "kitna maal waste ho gaya"
      expiredStockValue: enriched
        .filter((i) => i.status === "EXPIRED")
        .reduce((sum, i) => sum + i.stockQty, 0),
    };

    return res.status(200).json({ success: true, data: filtered, totals });
  } catch (error) {
    console.error("getExpiryReport error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expiry report",
    });
  }
};

module.exports = {
  getSummary,
  getProfitReport,
  getTopSellingItems,
  getSalesReport,
  getStockReport,
  getExpiryReport,
};
