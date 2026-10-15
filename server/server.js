require("dotenv").config();
const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const User = require("./models/user.model"); // ✅ ADD — agar /users route rakhna hai
const accountRoutes = require("./routes/account.router");
const budgetRoutes = require("./routes/budget.router");
const assistantRoutes = require("./routes/assistant.router");

connectDB();

// ✅ Ye route seedha app pe lagao (app.router nahi)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ---------- POS routers ----------
app.use("/api/items", require("./routes/item.router"));
app.use("/api/sales", require("./routes/sale.router"));
app.use("/api/purchases", require("./routes/purchase.router"));
app.use("/api/payments", require("./routes/payment.router"));
app.use("/api/customers", require("./routes/customer.router"));
app.use("/api/suppliers", require("./routes/supplier.router"));
app.use("/api/stock", require("./routes/stock.router"));
app.use("/api/journal", require("./routes/journal.router"));
app.use("/api/settings", require("./routes/settings.router"));
app.use("/api/users", require("./routes/user.routes")); // ✅ ADD — agar /users route rakhna hai
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/shifts", require("./routes/shift.router"));
app.use("/api/crm", require("./routes/crm.router"));
app.use("/api/reports", require("./routes/reports.router"));
app.use("/api/categories", require("./routes/category.router"));
app.use("/api/manufacturers", require("./routes/supplier.router"));
app.use("/api/purchase-orders", require("./routes/purchaseOrder.router"));
app.use("/api/purchase-returns", require("./routes/purchaseReturn.router"));
app.use("/api/journal-entries", require("./routes/journalEntry.router")); // manual entry create/list/delete
app.use("/api/vouchers", require("./routes/voucher.router"));
app.use("/api/financial-reports", require("./routes/financialReports.router"));
app.use("/api/accounts", accountRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/assistant", assistantRoutes);

const server = http.createServer(app);

server.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});
