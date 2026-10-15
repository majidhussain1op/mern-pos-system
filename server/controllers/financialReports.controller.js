const Account = require("../models/chartOfAccount.model");
const JournalEntry = require("../models/journalEntry.model");
const { ensureAccountsSeeded } = require("../services/Accounting.services");

// ---- Shared helper ----
// Date range ke andar har account ka debit/credit total nikalta hai.
// Stored Account.balance all-time hota hai, isliye period-wise reports
// (Income Statement, Cash Flow) ke liye journal se hi calculate karna zaroori hai.
const getPeriodTotals = async ({ from, to }) => {
  const match = {};
  if (from || to) {
    match.date = {};
    if (from) match.date.$gte = new Date(from);
    if (to) {
      const endOfDay = new Date(to);
      endOfDay.setHours(23, 59, 59, 999);
      match.date.$lte = endOfDay;
    }
  }

  const agg = await JournalEntry.aggregate([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$lines.account",
        totalDebit: { $sum: "$lines.debit" },
        totalCredit: { $sum: "$lines.credit" },
      },
    },
  ]);

  const map = {};
  agg.forEach((row) => {
    map[String(row._id)] = {
      debit: row.totalDebit || 0,
      credit: row.totalCredit || 0,
    };
  });
  return map;
};

// Account ka "net movement" uske normal balance side ke hisaab se
const netFor = (account, totals) => {
  const t = totals[String(account._id)] || { debit: 0, credit: 0 };
  return account.normalBalance === "DEBIT"
    ? t.debit - t.credit
    : t.credit - t.debit;
};

// Accounts ko unke Level-2 (Sub Head) parent ke hisaab se group karo,
// taake report mein "Operating Revenue", "Direct Expenses" jaise heads bane
const groupByParent = async (accounts, totals) => {
  const allAccounts = await Account.find({ isActive: true });
  const byId = {};
  allAccounts.forEach((a) => (byId[String(a._id)] = a));

  // Kisi bhi account ka Level-2 ancestor dhoondo
  const findLevel2 = (acc) => {
    let current = acc;
    while (current && current.level > 2) {
      current = byId[String(current.parent)];
    }
    return current && current.level === 2 ? current : null;
  };

  const groups = {};
  accounts.forEach((acc) => {
    const amount = netFor(acc, totals);
    if (Math.abs(amount) < 0.01) return; // zero-activity accounts skip

    const head = findLevel2(acc);
    const key = head ? head.code : "other";
    if (!groups[key]) {
      groups[key] = {
        code: head ? head.code : "—",
        name: head ? head.name : "Other",
        accounts: [],
        subtotal: 0,
      };
    }
    groups[key].accounts.push({
      code: acc.code,
      name: acc.name,
      amount,
    });
    groups[key].subtotal += amount;
  });

  return Object.values(groups).sort((a, b) => a.code.localeCompare(b.code));
};

// GET /api/financial-reports/income-statement?from=&to=
// Revenue - Expenses = Net Profit (period-wise)
const getIncomeStatement = async (req, res) => {
  try {
    await ensureAccountsSeeded();
    const { from, to } = req.query;
    const totals = await getPeriodTotals({ from, to });

    const revenueAccounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
      type: "REVENUE",
    }).sort({ code: 1 });

    const expenseAccounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
      type: "EXPENSE",
    }).sort({ code: 1 });

    const revenueGroups = await groupByParent(revenueAccounts, totals);
    const expenseGroups = await groupByParent(expenseAccounts, totals);

    const totalRevenue = revenueGroups.reduce((s, g) => s + g.subtotal, 0);
    const totalExpenses = expenseGroups.reduce((s, g) => s + g.subtotal, 0);

    // COGS alag se nikalo taake Gross Profit bhi dikha sakein
    const cogsAccount = await Account.findOne({ code: "5000" });
    const cogs = cogsAccount ? netFor(cogsAccount, totals) : 0;
    const grossProfit = totalRevenue - cogs;
    const operatingExpenses = totalExpenses - cogs;

    res.json({
      success: true,
      period: { from: from || null, to: to || null },
      revenue: { groups: revenueGroups, total: totalRevenue },
      expenses: { groups: expenseGroups, total: totalExpenses },
      summary: {
        totalRevenue,
        costOfGoodsSold: cogs,
        grossProfit,
        operatingExpenses,
        netProfit: totalRevenue - totalExpenses,
      },
    });
  } catch (error) {
    console.error("getIncomeStatement error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/financial-reports/balance-sheet?asOf=
// Assets = Liabilities + Equity (+ current period ka profit)
// Note: ye "as of date" report hai, date-range nahi - isliye shuru se us date tak
const getBalanceSheet = async (req, res) => {
  try {
    await ensureAccountsSeeded();
    const { asOf } = req.query;
    const totals = await getPeriodTotals({ from: null, to: asOf });

    const assetAccounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
      type: "ASSET",
    }).sort({ code: 1 });

    const liabilityAccounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
      type: "LIABILITY",
    }).sort({ code: 1 });

    const equityAccounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
      type: "EQUITY",
    }).sort({ code: 1 });

    // Retained earnings = ab tak ka (Revenue - Expenses). Ye equity ka hissa
    // hai lekin apna koi account nahi rakhta - isliye har baar calculate hota hai
    const revenueAccounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
      type: "REVENUE",
    });
    const expenseAccounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
      type: "EXPENSE",
    });

    const totalRevenue = revenueAccounts.reduce(
      (s, a) => s + netFor(a, totals),
      0,
    );
    const totalExpenses = expenseAccounts.reduce(
      (s, a) => s + netFor(a, totals),
      0,
    );
    const retainedEarnings = totalRevenue - totalExpenses;

    const assetGroups = await groupByParent(assetAccounts, totals);
    const liabilityGroups = await groupByParent(liabilityAccounts, totals);
    const equityGroups = await groupByParent(equityAccounts, totals);

    const totalAssets = assetGroups.reduce((s, g) => s + g.subtotal, 0);
    const totalLiabilities = liabilityGroups.reduce(
      (s, g) => s + g.subtotal,
      0,
    );
    const totalEquityAccounts = equityGroups.reduce(
      (s, g) => s + g.subtotal,
      0,
    );
    const totalEquity = totalEquityAccounts + retainedEarnings;

    res.json({
      success: true,
      asOf: asOf || null,
      assets: { groups: assetGroups, total: totalAssets },
      liabilities: { groups: liabilityGroups, total: totalLiabilities },
      equity: {
        groups: equityGroups,
        retainedEarnings,
        total: totalEquity,
      },
      summary: {
        totalAssets,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
        // Double-entry sahi hai to ye dono barabar hone chahiye
        isBalanced:
          Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
    });
  } catch (error) {
    console.error("getBalanceSheet error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/financial-reports/cash-flow?from=&to=
// Cash accounts (1000 Cash in Hand, 1010 Bank) ki movement, source ke hisaab se
const getCashFlow = async (req, res) => {
  try {
    await ensureAccountsSeeded();
    const { from, to } = req.query;

    const cashAccounts = await Account.find({
      code: { $in: ["1000", "1010"] },
    });
    const cashAccountIds = cashAccounts.map((a) => String(a._id));

    const match = {};
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        match.date.$lte = endOfDay;
      }
    }

    const entries = await JournalEntry.find(match).sort({ date: 1 });

    // refType ke hisaab se cash in/out group karo
    const byCategory = {};
    let totalIn = 0;
    let totalOut = 0;

    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (!cashAccountIds.includes(String(line.account))) return;

        const inflow = line.debit || 0; // cash aaya
        const outflow = line.credit || 0; // cash gaya
        if (inflow === 0 && outflow === 0) return;

        const cat = entry.refType;
        if (!byCategory[cat]) {
          byCategory[cat] = { category: cat, inflow: 0, outflow: 0, net: 0 };
        }
        byCategory[cat].inflow += inflow;
        byCategory[cat].outflow += outflow;
        byCategory[cat].net += inflow - outflow;

        totalIn += inflow;
        totalOut += outflow;
      });
    });

    // Opening balance = is period se pehle ka net cash
    const openingTotals = from
      ? await getPeriodTotals({
          from: null,
          to: new Date(new Date(from).getTime() - 1),
        })
      : {};
    const openingBalance = cashAccounts.reduce(
      (s, a) => s + netFor(a, openingTotals),
      0,
    );

    res.json({
      success: true,
      period: { from: from || null, to: to || null },
      openingBalance,
      categories: Object.values(byCategory).sort((a, b) => b.net - a.net),
      summary: {
        totalInflow: totalIn,
        totalOutflow: totalOut,
        netCashFlow: totalIn - totalOut,
        closingBalance: openingBalance + (totalIn - totalOut),
      },
    });
  } catch (error) {
    console.error("getCashFlow error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getIncomeStatement, getBalanceSheet, getCashFlow };
