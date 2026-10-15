const cors = require("cors");
const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(cors());

app.use(express.json());

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/products", require("./routes/product.router"));

module.exports = app;
