const express = require("express");
const router = express.Router();
const {
  createVoucher,
  getVouchers,
  getVoucherById,
} = require("../controllers/voucher.controller");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware(["ADMIN", "MANAGER"]), createVoucher);
router.get("/", authMiddleware(["ADMIN", "MANAGER"]), getVouchers);
router.get("/:id", authMiddleware(["ADMIN", "MANAGER"]), getVoucherById);

module.exports = router;
