const Account = require("../models/chartOfAccount.model");
const JournalEntry = require("../models/journalEntry.model");
const { ensureAccountsSeeded } = require("../services/Accounting.services");

// Flat account list ko 4-level tree mein badlo, aur har parent ka balance
// apne children se rollup karke nikalo (level-4 ka balance DB mein stored hai,
// level 1-3 ka calculated hota hai - is se kabhi stale nahi hota)
const buildAccountTree = (accounts) => {
  const byId = {};
  accounts.forEach((a) => {
    byId[String(a._id)] = {
      _id: a._id,
      code: a.code,
      name: a.name,
      type: a.type,
      normalBalance: a.normalBalance,
      level: a.level,
      isPostingAccount: a.isPostingAccount,
      balance: a.isPostingAccount ? a.balance : 0,
      children: [],
    };
  });

  const roots = [];
  accounts.forEach((a) => {
    const node = byId[String(a._id)];
    if (a.parent && byId[String(a.parent)]) {
      byId[String(a.parent)].children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Bottom-up rollup
  const rollup = (node) => {
    if (node.isPostingAccount) return node.balance;
    node.balance = node.children.reduce((sum, c) => sum + rollup(c), 0);
    return node.balance;
  };
  roots.forEach(rollup);

  return roots;
};

// GET /api/journal/accounts?flat=true
const getChartOfAccounts = async (req, res) => {
  try {
    await ensureAccountsSeeded();
    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });

    // flat=true -> purani flat list (dropdowns waghera ke liye, sirf posting accounts)
    if (req.query.flat === "true") {
      return res.json({
        success: true,
        accounts: accounts.filter((a) => a.isPostingAccount),
      });
    }

    return res.json({
      success: true,
      accounts, // flat list (sab levels)
      tree: buildAccountTree(accounts), // 4-level nested tree with rolled-up balances
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/journal/trial-balance
// Trial balance sirf posting (level-4) accounts se banti hai - group accounts
// ka balance unhi children ka sum hota hai, dobara count karne se double ho jata
const getTrialBalance = async (req, res) => {
  try {
    await ensureAccountsSeeded();
    const accounts = await Account.find({
      isActive: true,
      isPostingAccount: true,
    }).sort({ code: 1 });

    const rows = accounts.map((acc) => ({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: acc.normalBalance === "DEBIT" && acc.balance > 0 ? acc.balance : 0,
      credit:
        acc.normalBalance === "CREDIT" && acc.balance > 0 ? acc.balance : 0,
      abnormalDebit:
        acc.normalBalance === "CREDIT" && acc.balance < 0 ? -acc.balance : 0,
      abnormalCredit:
        acc.normalBalance === "DEBIT" && acc.balance < 0 ? -acc.balance : 0,
    }));

    const totalDebit = rows.reduce((s, r) => s + r.debit + r.abnormalDebit, 0);
    const totalCredit = rows.reduce(
      (s, r) => s + r.credit + r.abnormalCredit,
      0,
    );

    res.json({
      success: true,
      rows,
      totals: {
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/journal/entries?from=&to=&refType=&page=&limit=
const getJournalEntries = async (req, res) => {
  try {
    const { from, to, refType, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (refType) filter.refType = refType;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const entries = await JournalEntry.find(filter)
      .populate("lines.account", "code name")
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await JournalEntry.countDocuments(filter);

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/journal/accounts/:id/ledger?from=&to=
const getAccountLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const account = await Account.findById(id);
    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });
    }

    const filter = { "lines.account": id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const entries = await JournalEntry.find(filter).sort({
      date: 1,
      createdAt: 1,
    });

    let runningBalance = 0;
    const transactions = entries.map((entry) => {
      const line = entry.lines.find((l) => String(l.account) === String(id));
      const delta =
        account.normalBalance === "DEBIT"
          ? (line.debit || 0) - (line.credit || 0)
          : (line.credit || 0) - (line.debit || 0);
      runningBalance += delta;

      return {
        entryNo: entry.entryNo,
        date: entry.date,
        description: entry.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        runningBalance,
        refType: entry.refType,
      };
    });

    res.json({
      success: true,
      account,
      transactions,
      currentBalance: account.balance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/journal/consolidated-ledger?from=&to=&type=
// Saare accounts ka ledger ek hi page pe (har account apne transactions ke sath)
const getConsolidatedLedger = async (req, res) => {
  try {
    await ensureAccountsSeeded();
    const { from, to, type } = req.query;

    const accountFilter = { isActive: true, isPostingAccount: true };
    if (type) accountFilter.type = type;
    const accounts = await Account.find(accountFilter).sort({ code: 1 });

    const entryFilter = {};
    if (from || to) {
      entryFilter.date = {};
      if (from) entryFilter.date.$gte = new Date(from);
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        entryFilter.date.$lte = endOfDay;
      }
    }

    const entries = await JournalEntry.find(entryFilter).sort({
      date: 1,
      createdAt: 1,
    });

    // Har account ke liye uski transactions nikalo (ek hi pass mein, taake
    // har account ke liye alag DB query na chale)
    const ledgerByAccount = {};
    accounts.forEach((acc) => {
      ledgerByAccount[String(acc._id)] = {
        account: {
          _id: acc._id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          normalBalance: acc.normalBalance,
        },
        transactions: [],
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
      };
    });

    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const key = String(line.account);
        const ledger = ledgerByAccount[key];
        if (!ledger) return; // account filter se bahar hai

        const debit = line.debit || 0;
        const credit = line.credit || 0;
        const delta =
          ledger.account.normalBalance === "DEBIT"
            ? debit - credit
            : credit - debit;
        ledger.closingBalance += delta;
        ledger.totalDebit += debit;
        ledger.totalCredit += credit;

        ledger.transactions.push({
          entryNo: entry.entryNo,
          date: entry.date,
          description: entry.description,
          refType: entry.refType,
          debit,
          credit,
          runningBalance: ledger.closingBalance,
        });
      });
    });

    // Sirf wo accounts bhejo jinme is range mein koi transaction hui
    const ledgers = Object.values(ledgerByAccount).filter(
      (l) => l.transactions.length > 0,
    );

    res.json({
      success: true,
      ledgers,
      totals: {
        totalDebit: ledgers.reduce((s, l) => s + l.totalDebit, 0),
        totalCredit: ledgers.reduce((s, l) => s + l.totalCredit, 0),
        accountCount: ledgers.length,
      },
    });
  } catch (error) {
    console.error("getConsolidatedLedger error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getChartOfAccounts,
  getTrialBalance,
  getJournalEntries,
  getAccountLedger,
  getConsolidatedLedger,
};
