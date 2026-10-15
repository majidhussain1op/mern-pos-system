// ADJUST these require paths to match your actual model filenames
const Account = require("../models/chartOfAccount.model");
const JournalEntry = require("../models/journalEntry.model");

// GET /api/journal/cash-flow?cashAccounts=id1,id2&from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getCashFlow = async (req, res) => {
  try {
    const { cashAccounts, from, to } = req.query;
    if (!cashAccounts) {
      return res.status(400).json({ message: "cashAccounts is required" });
    }
    const cashAccountIds = cashAccounts.split(",");

    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(`${to}T23:59:59.999Z`);
    const periodQuery = Object.keys(dateFilter).length
      ? { date: dateFilter }
      : {};

    // Opening balance = net movement on these cash accounts BEFORE `from`
    let openingCashBalance = 0;
    if (from) {
      const priorEntries = await JournalEntry.find({
        date: { $lt: new Date(from) },
      }).lean();
      priorEntries.forEach((entry) => {
        (entry.lines || []).forEach((line) => {
          if (cashAccountIds.includes(String(line.account))) {
            openingCashBalance += (line.debit || 0) - (line.credit || 0);
          }
        });
      });
    }

    // Entries in the period
    const entries = await JournalEntry.find(periodQuery).lean();

    // Collect every counterpart account touched in the same voucher as a cash account
    const counterAccountIds = new Set();
    const cashLines = []; // { date, amount, counterAccountId }

    entries.forEach((entry) => {
      const lines = entry.lines || [];
      const touchesCash = lines.some((l) =>
        cashAccountIds.includes(String(l.account)),
      );
      if (!touchesCash) return;

      const cashAmount = lines
        .filter((l) => cashAccountIds.includes(String(l.account)))
        .reduce((sum, l) => sum + (l.debit || 0) - (l.credit || 0), 0);

      const counterLine = lines.find(
        (l) => !cashAccountIds.includes(String(l.account)),
      );
      const counterAccountId = counterLine ? String(counterLine.account) : null;
      if (counterAccountId) counterAccountIds.add(counterAccountId);

      cashLines.push({
        date: entry.date,
        amount: cashAmount,
        counterAccountId,
      });
    });

    const counterAccounts = await Account.find({
      _id: { $in: Array.from(counterAccountIds) },
    }).lean();
    const accountById = {};
    counterAccounts.forEach((a) => (accountById[String(a._id)] = a));

    const operating = [];
    const investing = [];
    const financing = [];

    cashLines.forEach((line) => {
      const counter = accountById[line.counterAccountId];
      if (!counter) return;
      const row = {
        date: line.date,
        counterAccount: `${counter.code} - ${counter.name}`,
        amount: line.amount,
      };
      if (counter.type === "Income" || counter.type === "Expense") {
        operating.push(row);
      } else if (counter.type === "Asset") {
        investing.push(row);
      } else if (counter.type === "Liability" || counter.type === "Equity") {
        financing.push(row);
      }
    });

    const netOperating = operating.reduce((s, r) => s + r.amount, 0);
    const netInvesting = investing.reduce((s, r) => s + r.amount, 0);
    const netFinancing = financing.reduce((s, r) => s + r.amount, 0);
    const netChange = netOperating + netInvesting + netFinancing;

    res.json({
      operating,
      investing,
      financing,
      netOperating,
      netInvesting,
      netFinancing,
      openingCashBalance,
      netChange,
      closingCashBalance: openingCashBalance + netChange,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to generate Cash Flow Statement",
      error: err.message,
    });
  }
};
