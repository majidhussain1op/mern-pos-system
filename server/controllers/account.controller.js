const Account = require("../models/chartOfAccount.model");

const MAX_LEVEL = 4;

const VALID_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

// Asset & Expense are normally Debit; Liability, Equity & Revenue are normally Credit
const NORMAL_BALANCE_BY_TYPE = {
  ASSET: "DEBIT",
  EXPENSE: "DEBIT",
  LIABILITY: "CREDIT",
  EQUITY: "CREDIT",
  REVENUE: "CREDIT",
};

// GET /api/accounts
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ isActive: true }).sort({ code: 1 });
    res.json(accounts);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch accounts", error: err.message });
  }
};

// POST /api/accounts
exports.createAccount = async (req, res) => {
  try {
    const { code, name, type, parent } = req.body;

    if (!code || !name || !type) {
      return res
        .status(400)
        .json({ message: "Code, name and type are required" });
    }

    const normalizedType = String(type).toUpperCase();
    if (!VALID_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        message: `Invalid type "${type}". Must be one of: ${VALID_TYPES.join(", ")}`,
      });
    }

    const existing = await Account.findOne({ code, isActive: true });
    if (existing) {
      return res
        .status(400)
        .json({ message: `Account code "${code}" already exists` });
    }

    let level = 1;
    if (parent) {
      const parentAccount = await Account.findById(parent);
      if (!parentAccount || !parentAccount.isActive) {
        return res.status(400).json({ message: "Parent account not found" });
      }
      if (parentAccount.level >= MAX_LEVEL) {
        return res
          .status(400)
          .json({ message: `Maximum hierarchy depth is ${MAX_LEVEL} levels` });
      }
      level = parentAccount.level + 1;
    }

    // Per schema design: only level-4 accounts are posting accounts;
    // levels 1-3 are grouping/rollup only.
    const isPostingAccount = level === MAX_LEVEL;

    const account = await Account.create({
      code,
      name,
      type: normalizedType,
      normalBalance: NORMAL_BALANCE_BY_TYPE[normalizedType],
      parent: parent || null,
      level,
      isPostingAccount,
      isSystemAccount: false,
      balance: 0,
      isActive: true,
    });

    res.status(201).json(account);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create account", error: err.message });
  }
};

// PUT /api/accounts/:id
exports.updateAccount = async (req, res) => {
  try {
    const { code, name, type } = req.body;

    const update = { code, name };

    if (type) {
      const normalizedType = String(type).toUpperCase();
      if (!VALID_TYPES.includes(normalizedType)) {
        return res.status(400).json({
          message: `Invalid type "${type}". Must be one of: ${VALID_TYPES.join(", ")}`,
        });
      }
      update.type = normalizedType;
      update.normalBalance = NORMAL_BALANCE_BY_TYPE[normalizedType];
    }

    if (code) {
      const duplicate = await Account.findOne({
        code,
        isActive: true,
        _id: { $ne: req.params.id },
      });
      if (duplicate) {
        return res
          .status(400)
          .json({ message: `Account code "${code}" already exists` });
      }
    }

    const account = await Account.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: false,
    });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json(account);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update account", error: err.message });
  }
};

// DELETE /api/accounts/:id  (soft delete)
exports.deactivateAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const hasChildren = await Account.exists({
      parent: account._id,
      isActive: true,
    });
    if (hasChildren) {
      return res.status(400).json({
        message: "Cannot deactivate an account that has active child accounts",
      });
    }

    if (account.balance && account.balance !== 0) {
      return res.status(400).json({
        message: "Cannot deactivate an account with a non-zero balance",
      });
    }

    account.isActive = false;
    await account.save();

    res.json({ message: "Account deactivated", account });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to deactivate account", error: err.message });
  }
};
