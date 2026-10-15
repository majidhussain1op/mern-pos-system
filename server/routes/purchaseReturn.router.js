const express = require("express");
const router = express.Router();
const {
  createPurchaseReturn,
  getAllPurchaseReturns,
} = require("../controllers/purchaseReturn.controller");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware(["ADMIN"]), createPurchaseReturn);
router.get("/", authMiddleware(["ADMIN", "MANAGER"]), getAllPurchaseReturns);

module.exports = router;
