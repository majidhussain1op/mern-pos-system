const express = require("express");
const router = express.Router();
const {
  receivePayment,
  makePaymentOut,
  adjustBalance,
  getStatement,
  getDueList,
  getCustomerSummary,
} = require("../controllers/crm.controller");
// const { authMiddleware } = require("../middleware/authMiddleware");

// static routes pehle
router.get("/due-list", /* authMiddleware(["ADMIN"]), */ getDueList);

// dynamic /:id routes
router.get(
  "/:id/statement",
  /* authMiddleware(["ADMIN","SALESMAN"]), */ getStatement,
);
router.get(
  "/:id/summary",
  /* authMiddleware(["ADMIN","SALESMAN"]), */ getCustomerSummary,
);
router.post(
  "/:id/payment",
  /* authMiddleware(["ADMIN","SALESMAN"]), */ receivePayment,
);
router.post(
  "/:id/payment-out",
  /* authMiddleware(["ADMIN"]), */ makePaymentOut,
);
router.post("/:id/adjustment", /* authMiddleware(["ADMIN"]), */ adjustBalance);

module.exports = router;
