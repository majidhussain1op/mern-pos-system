const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  getBudgetComparison,
  setBudget,
} = require("../controllers/budget.controller");

router.get("/comparison", authMiddleware(), getBudgetComparison);
router.post("/", authMiddleware(["ADMIN", "MANAGER"]), setBudget);

module.exports = router;
