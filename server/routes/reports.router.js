const express = require("express");
const router = express.Router();
const {
  getSummary,
  getProfitReport,
  getTopSellingItems,
  getSalesReport,
  getStockReport,
  getExpiryReport,
} = require("../controllers/report.controller");
const authMiddleware = require("../middleware/auth");

router.get("/summary", authMiddleware(["ADMIN", "MANAGER"]), getSummary);
router.get("/profit", authMiddleware(["ADMIN", "MANAGER"]), getProfitReport);
router.get(
  "/top-selling-items",
  authMiddleware(["ADMIN", "MANAGER"]),
  getTopSellingItems,
);
router.get("/sales", authMiddleware(["ADMIN", "MANAGER"]), getSalesReport);
router.get("/stock", authMiddleware(["ADMIN", "MANAGER"]), getStockReport);
router.get("/expiry", authMiddleware(["ADMIN", "MANAGER"]), getExpiryReport);

module.exports = router;
