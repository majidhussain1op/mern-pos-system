const express = require("express");
const router = express.Router();
const {
  createSupplier,
  getAllSuppliers,
  updateSupplier,
  deleteSupplier,
  searchSuppliers,
} = require("../controllers/supplier.controller");
const authMiddleware = require("../middleware/auth");
const {
  getSupplierStatement,
} = require("../controllers/supplierStatement.controller");

router.get("/search", authMiddleware(), searchSuppliers); // static route pehle
router.get("/", authMiddleware(), getAllSuppliers);
router.post("/", authMiddleware(["ADMIN"]), createSupplier);
router.put("/:id", authMiddleware(["ADMIN"]), updateSupplier);
router.delete("/:id", authMiddleware(["ADMIN"]), deleteSupplier);

router.get("/:id/statement", authMiddleware(), getSupplierStatement);

module.exports = router;
