const express = require("express");
const router = express.Router();

const {
  getChartOfAccounts,
  getTrialBalance,
  getJournalEntries,
  getAccountLedger,
  getConsolidatedLedger,
} = require("../controllers/journal.controller");
const authMiddleware = require("../middleware/auth");

router.get(
  "/accounts",
  authMiddleware(["ADMIN", "MANAGER"]),
  getChartOfAccounts,
);
router.get(
  "/trial-balance",
  authMiddleware(["ADMIN", "MANAGER"]),
  getTrialBalance,
);
router.get("/entries", authMiddleware(["ADMIN", "MANAGER"]), getJournalEntries);
router.get(
  "/consolidated-ledger",
  authMiddleware(["ADMIN", "MANAGER"]),
  getConsolidatedLedger,
);
router.get(
  "/accounts/:id/ledger",
  authMiddleware(["ADMIN", "MANAGER"]),
  getAccountLedger,
);

const {
  getIncomeStatement,
} = require("../controllers/incomeStatement.controller");
const { getCashFlow } = require("../controllers/cashflow.controller");
router.get("/income-statement", authMiddleware(), getIncomeStatement);

router.get("/cash-flow", authMiddleware(), getCashFlow);
module.exports = router;
