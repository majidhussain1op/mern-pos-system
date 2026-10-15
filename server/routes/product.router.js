const express = require("express");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  getProductByBarcode,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller"); // apna actual path check kar lena
const authMiddleware = require("../middleware/auth"); // jo naam tera project mein hey wahi use karna

// Static routes hamesha /:id se pehle (jaise project convention hey)
router.get("/barcode/:code", authMiddleware, getProductByBarcode);

router
  .route("/")
  .get(authMiddleware, getAllProducts)
  .post(authMiddleware, createProduct);

router
  .route("/:id")
  .get(authMiddleware, getProductById)
  .put(authMiddleware, updateProduct)
  .delete(authMiddleware, deleteProduct);

module.exports = router;
