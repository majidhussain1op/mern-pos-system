const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const { chatWithAssistant } = require("../controllers/Assistan.controller");

router.post("/chat", authMiddleware(), chatWithAssistant);

module.exports = router;
