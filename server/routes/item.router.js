const express = require("express");
const router = express.Router();
const {
  createItem,
  getAllItems,
  searchByBarcode,
  searchByName,
  updateItem,
  deleteItem,
  searchItems,
} = require("../controllers/item.controller");
const authMiddleware = require("../middleware/auth"); // fix: pehle commented tha + galat path likha tha

// static/literal routes pehle
router.get("/search-name", authMiddleware(), searchByName);

router.get("/search", authMiddleware(), searchItems);

router.get("/search-barcode/:code", authMiddleware(), searchByBarcode);

router.post("/", authMiddleware(["ADMIN"]), createItem);
router.get("/", authMiddleware(), getAllItems);

// /:id routes sabse aakhir mein
router.put("/:id", authMiddleware(["ADMIN"]), updateItem);
router.delete("/:id", authMiddleware(["ADMIN"]), deleteItem);

module.exports = router;
