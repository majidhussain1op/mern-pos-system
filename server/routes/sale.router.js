const express = require("express");
const router = express.Router();
const {
  createSale,
  getSaleById,
  voidSale,
  getAllSales,
  getSalesBySalesman,
  updateSale,
  deleteSale,
} = require("../controllers/sale.controller");
const authMiddleware = require("../middleware/auth");

router.post("/", authMiddleware(["ADMIN", "SALESMAN", "CASHIER"]), createSale);
router.get("/", authMiddleware(["ADMIN", "MANAGER"]), getAllSales);
router.get(
  "/salesman/:salesmanId",
  authMiddleware(["ADMIN", "MANAGER"]),
  getSalesBySalesman,
);
router.get("/:id", authMiddleware(), getSaleById);
router.post("/:id/void", authMiddleware(["ADMIN", "MANAGER"]), voidSale);
router.patch("/:id", authMiddleware(), updateSale);
router.delete("/:id", authMiddleware(["ADMIN"]), deleteSale);

module.exports = router;
