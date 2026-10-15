const express = require("express");
const router = express.Router();
const {
  createPO,
  updatePO,
  sendPO,
  confirmPO,
  cancelPO,
  receiveGoods,
  getAllPOs,
  getPOById,
} = require("../controllers/purchaseOrder.controller");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware(["ADMIN"]), createPO);
router.get("/", authMiddleware(["ADMIN", "MANAGER"]), getAllPOs);

router.put("/:id", authMiddleware(["ADMIN"]), updatePO);
router.post("/:id/send", authMiddleware(["ADMIN"]), sendPO);
router.post("/:id/confirm", authMiddleware(["ADMIN"]), confirmPO);
router.post("/:id/cancel", authMiddleware(["ADMIN"]), cancelPO);
router.post("/:id/receive", authMiddleware(["ADMIN"]), receiveGoods);
router.get("/:id", authMiddleware(["ADMIN", "MANAGER"]), getPOById);

module.exports = router;
