const express = require("express");
const router = express.Router();
const {
  createPayment,
  getPayments,
} = require("../controllers/payment.controller");
// const { authMiddleware } = require("../middleware/authMiddleware");

router.post("/", /* authMiddleware(["ADMIN"]), */ createPayment);
router.get("/", /* authMiddleware(["ADMIN"]), */ getPayments);

module.exports = router;
