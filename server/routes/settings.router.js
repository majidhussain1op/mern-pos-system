const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateSettings,
} = require("../controllers/settings.controller");
const authMiddleware = require("../middleware/auth"); // fix: pehle bilkul koi auth nahi tha, kisi ne bhi settings change kar sakta tha

router.get("/", authMiddleware(), getSettings); // read: kisi bhi logged-in user ke liye (FillReceipt isko use karta hai)
router.put("/", authMiddleware(["ADMIN"]), updateSettings); // write: sirf ADMIN

module.exports = router;
