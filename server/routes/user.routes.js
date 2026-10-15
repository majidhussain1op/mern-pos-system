// routes/user.routes.js
const express = require("express");
const router = express.Router();

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserActive,
} = require("../controllers/user.controller");
const auth = require("../middleware/auth");

// Apna actual middleware path use karo (jo dhoonda tha last time)
// 👈 confirm karo ye path sahi hai

router.post("/", auth, createUser);
router.get("/", auth, getAllUsers);
router.get("/:id", auth, getUserById);
router.put("/:id", auth, updateUser);
router.delete("/:id", auth, deleteUser);
router.patch("/:id/toggle-active", auth, toggleUserActive);

module.exports = router;
