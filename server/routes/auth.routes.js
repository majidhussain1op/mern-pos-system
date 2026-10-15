const express = require("express");

const router = express.Router();

const auth = require("../controllers/auth.controller");

router.post("/register", auth.register);

router.post("/login", auth.login);

router.post("/google-login", auth.googleLogin);

module.exports = router;
