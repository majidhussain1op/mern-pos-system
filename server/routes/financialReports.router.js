const express = require("express");
const router = express.Router();
const {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
} = require("../controllers/financialReports.controller");
const authMiddleware = require("../middleware/auth");

router.get(
  "/income-statement",
  authMiddleware(["ADMIN", "MANAGER"]),
  getIncomeStatement,
);
router.get(
  "/balance-sheet",
  authMiddleware(["ADMIN", "MANAGER"]),
  getBalanceSheet,
);
router.get("/cash-flow", authMiddleware(["ADMIN", "MANAGER"]), getCashFlow);

module.exports = router;
