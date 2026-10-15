const Budget = require("../models/budget.model");
const Account = require("../models/chartOfAccount.model");
const JournalEntry = require("../models/journalEntry.model");

// GET /api/budgets/comparison?period=YYYY-MM
// Returns every EXPENSE posting account with its budget (if set) and actual
// spend for that month, so the frontend can render budget vs actual in one call.
exports.getBudgetComparison = async (req, res) => {
  try {
    const { period } = req.query; // "YYYY-MM"
    if (!period) {
      return res.status(400).json({ message: "period (YYYY-MM) is required" });
    }

    const [year, month] = period.split("-").map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999); // last day of month

    const expenseAccounts = await Account.find({
      type: "EXPENSE",
      isPostingAccount: true,
      isActive: true,
    }).lean();

    const budgets = await Budget.find({ period }).lean();
    const budgetByAccount = {};
    budgets.forEach((b) => (budgetByAccount[String(b.account)] = b.amount));

    // Sum actual debit on each expense account within the month
    const entries = await JournalEntry.find({
      date: { $gte: from, $lte: to },
    }).lean();
    const actualByAccount = {};
    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        const id = String(line.account);
        actualByAccount[id] =
          (actualByAccount[id] || 0) + ((line.debit || 0) - (line.credit || 0));
      });
    });

    const rows = expenseAccounts.map((acc) => {
      const budget = budgetByAccount[String(acc._id)] || 0;
      const actual = actualByAccount[String(acc._id)] || 0;
      return {
        accountId: acc._id,
        code: acc.code,
        name: acc.name,
        budget,
        actual,
        variance: budget - actual, // positive = under budget, negative = over budget
        percentUsed: budget > 0 ? Math.round((actual / budget) * 100) : null,
      };
    });

    rows.sort((a, b) => a.code.localeCompare(b.code));

    res.json({
      period,
      rows,
      totalBudget: rows.reduce((s, r) => s + r.budget, 0),
      totalActual: rows.reduce((s, r) => s + r.actual, 0),
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to load budget comparison",
      error: err.message,
    });
  }
};

// POST /api/budgets
// Body: { account, period, amount } — upserts (create or update) one budget row
exports.setBudget = async (req, res) => {
  try {
    const { account, period, amount } = req.body;
    if (!account || !period || amount === undefined) {
      return res
        .status(400)
        .json({ message: "account, period and amount are required" });
    }

    const budget = await Budget.findOneAndUpdate(
      { account, period },
      { amount, createdBy: req.user?.id },
      { new: true, upsert: true, runValidators: false },
    );

    res.json(budget);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to save budget", error: err.message });
  }
};
