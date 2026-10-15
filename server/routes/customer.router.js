const express = require("express");
const router = express.Router();
const {
  searchCustomers,
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customer.controller");
// const { authMiddleware } = require("../middleware/authMiddleware");

// static route pehle
router.get(
  "/search",
  /* authMiddleware(["ADMIN","SALESMAN"]), */ searchCustomers,
);

router.post("/", /* authMiddleware(["ADMIN","SALESMAN"]), */ createCustomer);
router.get("/", /* authMiddleware(["ADMIN","SALESMAN"]), */ getAllCustomers);

// /:id sabse aakhir mein
router.get("/:id", /* authMiddleware(["ADMIN","SALESMAN"]), */ getCustomerById);
router.put("/:id", updateCustomer); // 👈 add
router.delete("/:id", deleteCustomer); // 👈 add

module.exports = router;
