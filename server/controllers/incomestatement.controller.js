// ADJUST THESE TWO REQUIRE PATHS to match your actual model filenames
// (Chart of Accounts model was confirmed earlier as chartOfAccounts.model.js —
// use whatever exact filename you fixed account.controller.js to use)
const Account = require("../models/chartOfAccount.model");
const JournalEntry = require("../models/journalEntry.model");

// GET /api/journal/income-statement?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getIncomeStatement = async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(`${to}T23:59:59.999Z`);

    const query = Object.keys(dateFilter).length ? { date: dateFilter } : {};

    const entries = await JournalEntry.find(query).lean();

    // Sum debit/credit per account across every line in every entry
    const totalsByAccount = {};
    entries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        const id = String(line.account);
        if (!totalsByAccount[id]) totalsByAccount[id] = { debit: 0, credit: 0 };
        totalsByAccount[id].debit += line.debit || 0;
        totalsByAccount[id].credit += line.credit || 0;
      });
    });

    const accountIds = Object.keys(totalsByAccount);
    const accounts = await Account.find({ _id: { $in: accountIds } }).lean();

    const income = [];
    const expense = [];

    accounts.forEach((acc) => {
      const t = totalsByAccount[String(acc._id)];
      if (!t) return;

      if (acc.type === "Income") {
        // Income accounts have a normal credit balance
        const amount = t.credit - t.debit;
        if (amount !== 0)
          income.push({ code: acc.code, name: acc.name, amount });
      } else if (acc.type === "Expense") {
        // Expense accounts have a normal debit balance
        const amount = t.debit - t.credit;
        if (amount !== 0)
          expense.push({ code: acc.code, name: acc.name, amount });
      }
    });

    income.sort((a, b) => a.code.localeCompare(b.code));
    expense.sort((a, b) => a.code.localeCompare(b.code));

    const totalIncome = income.reduce((s, r) => s + r.amount, 0);
    const totalExpense = expense.reduce((s, r) => s + r.amount, 0);

    res.json({
      income,
      expense,
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to generate Income Statement",
      error: err.message,
    });
  }
};
