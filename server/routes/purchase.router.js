const express = require("express");
const router = express.Router();
const {
  createPurchase,
  getAllPurchases,
} = require("../controllers/purchase.controller");
const authMiddleware = require("../middleware/auth"); // fix: pehle commented tha + galat import path

router.post("/", authMiddleware(["ADMIN"]), createPurchase);
router.get("/", authMiddleware(["ADMIN", "MANAGER"]), getAllPurchases);

module.exports = router;
