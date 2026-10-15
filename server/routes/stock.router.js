const express = require("express");
const router = express.Router();
const {
  getCurrentStock,
  getLowStock,
  getItemLedger,
  adjustStock,
} = require("../controllers/stock.controller");
// const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/low", getLowStock); // static route pehle
router.get("/ledger/:itemId", getItemLedger);
router.post("/adjust", adjustStock);
router.get("/", getCurrentStock);

module.exports = router;
