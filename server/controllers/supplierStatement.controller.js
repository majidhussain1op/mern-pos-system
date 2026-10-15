// ADJUST these require paths if your model filenames differ
const Purchase = require("../models/purchase.model");
const PurchaseReturn = require("../models/purchaseReturn.model");
const Supplier = require("../models/supplier.model"); // adjust if filename differs

// GET /api/manufacturers/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD
//
// NOTE: Purchase.paidAmount is a running total with no per-payment log in
// the schemas provided, so this statement currently shows Purchase and
// Purchase Return activity only (no individual "Payment" rows). If supplier
// payments are tracked in a separate model/collection, tell me its name and
// fields and I'll add it in.
exports.getSupplierStatement = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    const fromDate = from ? new Date(from) : null;

    // --- Opening balance: net of everything BEFORE `from` ---
    let openingBalance = 0;
    if (fromDate) {
      const [priorPurchases, priorReturns] = await Promise.all([
        Purchase.find({ supplier: id, date: { $lt: fromDate } }).lean(),
        PurchaseReturn.find({ supplier: id, date: { $lt: fromDate } }).lean(),
      ]);
      // balance = total owed (totalAmount) minus what's already been paid (paidAmount) minus returns
      openingBalance =
        priorPurchases.reduce(
          (s, p) => s + (p.totalAmount - (p.paidAmount || 0)),
          0,
        ) - priorReturns.reduce((s, r) => s + (r.totalAmount || 0), 0);
    }

    // --- Transactions within [from, to] ---
    const dateFilter = {};
    if (fromDate) dateFilter.$gte = fromDate;
    dateFilter.$lte = toDate;

    const [purchases, returns] = await Promise.all([
      Purchase.find({ supplier: id, date: dateFilter }).lean(),
      PurchaseReturn.find({ supplier: id, date: dateFilter }).lean(),
    ]);

    const transactions = [
      ...purchases.map((p) => ({
        date: p.date,
        type: "Purchase",
        reference: p.invoiceNo,
        amount: p.totalAmount,
      })),
      ...purchases
        .filter((p) => (p.paidAmount || 0) > 0)
        .map((p) => ({
          date: p.date,
          type: "Payment (on this purchase)",
          reference: p.invoiceNo,
          amount: -(p.paidAmount || 0),
        })),
      ...returns.map((r) => ({
        date: r.date,
        type: "Purchase Return",
        reference: r.returnNo,
        amount: -(r.totalAmount || 0),
      })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningBalance = openingBalance;
    const transactionsWithBalance = transactions.map((t) => {
      runningBalance += t.amount;
      return { ...t, amount: Math.abs(t.amount), balance: runningBalance };
    });

    res.json({
      openingBalance,
      closingBalance: runningBalance,
      transactions: transactionsWithBalance,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to generate supplier statement",
      error: err.message,
    });
  }
};
