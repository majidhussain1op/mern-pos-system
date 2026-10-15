const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const {
  getAccounts,
  createAccount,
  updateAccount,
  deactivateAccount,
} = require("../controllers/account.controller");

router.get("/", authMiddleware(), getAccounts);
router.post("/", authMiddleware(["ADMIN", "MANAGER"]), createAccount);
router.put("/:id", authMiddleware(["ADMIN", "MANAGER"]), updateAccount);
router.delete("/:id", authMiddleware(["ADMIN"]), deactivateAccount);

module.exports = router;
