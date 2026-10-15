// controllers/dashboard.controller.js
const Product = require("../models/product.model");
const Sales = require("../models/Sale");
const User = require("../models/user.model");

exports.getDashboardStats = async (req, res) => {
  try {
    // ===== TOTAL COUNTS =====
    const [totalProducts, totalSales, totalCustomers] = await Promise.all([
      Product.countDocuments(),
      Sales.countDocuments(),
      User.countDocuments({ role: "CUSTOMER" }),
    ]);

    // ===== TOTAL REVENUE =====
    const revenueResult = await Sales.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // ===== TODAY'S SALES =====
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaySales = await Sales.find({ createdAt: { $gte: startOfDay } });
    const todayRevenue = todaySales.reduce(
      (sum, s) => sum + (s.totalAmount || 0),
      0,
    );

    // ===== LOW STOCK PRODUCTS (stock < 10) =====
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
      .select("name stock")
      .limit(5);

    // ===== RECENT SALES (last 5) =====
    const recentSales = await Sales.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("customer", "name email");

    // ===== SALES CHART DATA (last 7 days) =====
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const salesLast7Days = await Sales.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalSales,
        totalCustomers,
        totalRevenue,
        todayRevenue,
        todaySalesCount: todaySales.length,
        lowStockProducts,
        recentSales,
        salesChart: salesLast7Days.map((d) => ({
          date: d._id,
          revenue: d.total,
          orders: d.count,
        })),
      },
    });
  } catch (error) {
    console.log("DASHBOARD ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
