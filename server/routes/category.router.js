const express = require("express");
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const authMiddleware = require("../middleware/auth");

router.get("/", authMiddleware(), getAllCategories);
router.post("/", authMiddleware(["ADMIN"]), createCategory);
router.put("/:id", authMiddleware(["ADMIN"]), updateCategory);
router.delete("/:id", authMiddleware(["ADMIN"]), deleteCategory);

module.exports = router;
