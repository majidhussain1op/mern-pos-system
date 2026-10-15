const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.js");
const {
  openShift,
  getCurrentShift,
  recordCashMovement,
  closeShift,
  forceCloseShift,
  getShiftHistory,
  getShiftReport,
  getCashMovementHistory,
} = require("../controllers/shift.controller");

router.post("/open", authMiddleware(), openShift);
router.get("/current", authMiddleware(), getCurrentShift);
router.post("/cash-movement", authMiddleware(), recordCashMovement);
router.post("/close", authMiddleware(), closeShift);
router.get("/history", authMiddleware(["ADMIN", "MANAGER"]), getShiftHistory);

router.get(
  "/cash-movements/history",
  authMiddleware(["ADMIN", "MANAGER"]),
  getCashMovementHistory,
);

router.post(
  "/:id/force-close",
  authMiddleware(["ADMIN", "MANAGER"]),
  forceCloseShift,
);

// dynamic route last
router.get("/:id/report", authMiddleware(["ADMIN", "MANAGER"]), getShiftReport);

module.exports = router;
