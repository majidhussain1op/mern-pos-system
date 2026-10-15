const express = require("express");
const router = express.Router();
const {
  createEntry,
  getEntries,
  deleteEntry,
} = require("../controllers/journalEntry.controller");
const authMiddleware = require("../middleware/auth"); // fix: pehle koi auth nahi tha

router.post("/", authMiddleware(["ADMIN"]), createEntry);
router.get("/", authMiddleware(["ADMIN", "MANAGER"]), getEntries);
router.delete("/:id", authMiddleware(["ADMIN"]), deleteEntry);

module.exports = router;
