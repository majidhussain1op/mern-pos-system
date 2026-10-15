const Account = require("../models/chartOfAccount.model");
const JournalEntry = require("../models/journalEntry.model");

// ---- 4-Level Chart of Accounts ----
// Level 1 = Main Head, Level 2 = Sub Head, Level 3 = Group, Level 4 = Posting Account
// NOTE: level-4 codes purane flat codes hi hain (1000, 4000, 5000 waghera), taake
// Accounting.services.js ke saare postSaleJournal/postPurchaseJournal helpers
// bina kisi change ke chalte rahen.
const COA_TREE = [
  {
    code: "1",
    name: "ASSETS",
    type: "ASSET",
    normalBalance: "DEBIT",
    children: [
      {
        code: "11",
        name: "Current Assets",
        children: [
          {
            code: "1101",
            name: "Cash & Bank",
            children: [
              { code: "1000", name: "Cash in Hand" },
              { code: "1010", name: "Bank Account" },
            ],
          },
          {
            code: "1102",
            name: "Receivables",
            children: [{ code: "1100", name: "Accounts Receivable" }],
          },
          {
            code: "1103",
            name: "Inventory",
            children: [{ code: "1200", name: "Inventory" }],
          },
        ],
      },
      {
        code: "12",
        name: "Fixed Assets",
        children: [
          {
            code: "1201",
            name: "Equipment & Fixtures",
            children: [{ code: "1300", name: "Shop Equipment" }],
          },
        ],
      },
    ],
  },
  {
    code: "2",
    name: "LIABILITIES",
    type: "LIABILITY",
    normalBalance: "CREDIT",
    children: [
      {
        code: "21",
        name: "Current Liabilities",
        children: [
          {
            code: "2101",
            name: "Payables",
            children: [{ code: "2000", name: "Accounts Payable" }],
          },
          {
            code: "2102",
            name: "Tax Payable",
            children: [{ code: "2100", name: "GST Payable" }],
          },
        ],
      },
    ],
  },
  {
    code: "3",
    name: "EQUITY",
    type: "EQUITY",
    normalBalance: "CREDIT",
    children: [
      {
        code: "31",
        name: "Capital",
        children: [
          {
            code: "3101",
            name: "Owner Capital",
            children: [
              { code: "3000", name: "Owner's Equity" },
              { code: "3010", name: "Owner Drawings" },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "4",
    name: "REVENUE",
    type: "REVENUE",
    normalBalance: "CREDIT",
    children: [
      {
        code: "41",
        name: "Operating Revenue",
        children: [
          {
            code: "4101",
            name: "Sales",
            children: [{ code: "4000", name: "Sales Revenue" }],
          },
        ],
      },
      {
        code: "42",
        name: "Other Income",
        children: [
          {
            code: "4201",
            name: "Misc Income",
            children: [{ code: "4200", name: "Other Income" }],
          },
        ],
      },
    ],
  },
  {
    code: "5",
    name: "EXPENSES",
    type: "EXPENSE",
    normalBalance: "DEBIT",
    children: [
      {
        code: "51",
        name: "Direct Expenses",
        children: [
          {
            code: "5101",
            name: "Cost of Sales",
            children: [{ code: "5000", name: "Cost of Goods Sold" }],
          },
        ],
      },
      {
        code: "52",
        name: "Operating Expenses",
        children: [
          {
            code: "5201",
            name: "Administrative Expenses",
            children: [
              { code: "5200", name: "Rent Expense" },
              { code: "5210", name: "Utilities Expense" },
              { code: "5220", name: "Salaries Expense" },
              { code: "5230", name: "Miscellaneous Expense" },
            ],
          },
        ],
      },
    ],
  },
];

// Tree ko recursively DB mein daalo - har node apne parent ka type/normalBalance
// inherit karta hai (Level 1 pe hi define hota hai)
const seedNode = async (node, level, parentId, inherited) => {
  const type = node.type || inherited.type;
  const normalBalance = node.normalBalance || inherited.normalBalance;

  const created = await Account.create({
    code: node.code,
    name: node.name,
    type,
    normalBalance,
    level,
    parent: parentId,
    isPostingAccount: level === 4,
  });

  if (node.children) {
    for (const child of node.children) {
      await seedNode(child, level + 1, created._id, { type, normalBalance });
    }
  }
};

const ensureAccountsSeeded = async () => {
  const count = await Account.countDocuments();
  if (count === 0) {
    for (const root of COA_TREE) {
      await seedNode(root, 1, null, {});
    }
  }
};

const getAccountByCode = async (code) => {
  await ensureAccountsSeeded();
  const account = await Account.findOne({ code });
  if (!account) {
    throw new Error(`Chart of Accounts mein "${code}" account nahi mila`);
  }
  if (!account.isPostingAccount) {
    throw new Error(
      `"${account.code} - ${account.name}" ek group account hai (Level ${account.level}) - entry sirf Level 4 posting account pe ho sakti hai`,
    );
  }
  return account;
};

const generateEntryNo = async () => {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = await JournalEntry.countDocuments({
    entryNo: { $regex: `^JE-${datePart}` },
  });
  return `JE-${datePart}-${String(countToday + 1).padStart(3, "0")}`;
};

const postJournalEntry = async ({
  description,
  lines,
  refType,
  refId = null,
  createdBy = null,
  date = new Date(),
}) => {
  if (!lines || lines.length < 2) {
    throw new Error("Journal entry mein kam az kam 2 lines honi chahiye");
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const resolvedLines = [];

  for (const line of lines) {
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    if (debit > 0 && credit > 0) {
      throw new Error("Ek line mein debit aur credit dono nahi ho sakte");
    }
    if (debit === 0 && credit === 0) continue;

    const account = await getAccountByCode(line.accountCode);
    resolvedLines.push({
      account: account._id,
      debit,
      credit,
      _accountDoc: account,
    });
    totalDebit += debit;
    totalCredit += credit;
  }

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Journal entry balance nahi ho rahi: Debit ${totalDebit.toFixed(2)} != Credit ${totalCredit.toFixed(2)}`,
    );
  }
  if (resolvedLines.length < 2) {
    throw new Error(
      "Journal entry mein kam az kam 2 non-zero lines honi chahiye",
    );
  }

  const entryNo = await generateEntryNo();

  const entry = await JournalEntry.create({
    entryNo,
    date,
    description,
    lines: resolvedLines.map(({ account, debit, credit }) => ({
      account,
      debit,
      credit,
    })),
    refType,
    refId,
    createdBy,
  });

  for (const line of resolvedLines) {
    const account = line._accountDoc;
    const delta =
      account.normalBalance === "DEBIT"
        ? line.debit - line.credit
        : line.credit - line.debit;

    await Account.findByIdAndUpdate(
      account._id,
      { $inc: { balance: delta } },
      { runValidators: false },
    );
  }

  return entry;
};

const postSaleJournal = async ({ sale, cogsAmount, createdBy }) => {
  const lines = [];
  if (sale.receivedAmount > 0)
    lines.push({ accountCode: "1000", debit: sale.receivedAmount });
  if (sale.receivable > 0)
    lines.push({ accountCode: "1100", debit: sale.receivable });
  lines.push({ accountCode: "4000", credit: sale.totalAmount });

  const totalTax = (sale.totalGstAmount || 0) + (sale.additionalGstAmount || 0);
  if (totalTax > 0) lines.push({ accountCode: "2100", credit: totalTax });

  await postJournalEntry({
    description: `Sale ${sale.invoiceNo}`,
    lines,
    refType: "Sale",
    refId: sale._id,
    createdBy,
    date: sale.date,
  });

  if (cogsAmount > 0) {
    await postJournalEntry({
      description: `COGS for Sale ${sale.invoiceNo}`,
      lines: [
        { accountCode: "5000", debit: cogsAmount },
        { accountCode: "1200", credit: cogsAmount },
      ],
      refType: "Sale",
      refId: sale._id,
      createdBy,
      date: sale.date,
    });
  }
};

const postSaleVoidJournal = async ({ sale, cogsAmount, createdBy }) => {
  const lines = [];
  if (sale.receivedAmount > 0)
    lines.push({ accountCode: "1000", credit: sale.receivedAmount });
  if (sale.receivable > 0)
    lines.push({ accountCode: "1100", credit: sale.receivable });
  lines.push({ accountCode: "4000", debit: sale.totalAmount });

  const totalTax = (sale.totalGstAmount || 0) + (sale.additionalGstAmount || 0);
  if (totalTax > 0) lines.push({ accountCode: "2100", debit: totalTax });

  await postJournalEntry({
    description: `Void Sale ${sale.invoiceNo}`,
    lines,
    refType: "SaleVoid",
    refId: sale._id,
    createdBy,
  });

  if (cogsAmount > 0) {
    await postJournalEntry({
      description: `Reverse COGS for Voided Sale ${sale.invoiceNo}`,
      lines: [
        { accountCode: "1200", debit: cogsAmount },
        { accountCode: "5000", credit: cogsAmount },
      ],
      refType: "SaleVoid",
      refId: sale._id,
      createdBy,
    });
  }
};

const postPurchaseJournal = async ({ purchase, createdBy }) => {
  const lines = [{ accountCode: "1200", debit: purchase.totalAmount }];
  if (purchase.paidAmount > 0)
    lines.push({ accountCode: "1000", credit: purchase.paidAmount });
  if (purchase.balance > 0)
    lines.push({ accountCode: "2000", credit: purchase.balance });

  await postJournalEntry({
    description: `Purchase ${purchase.invoiceNo}`,
    lines,
    refType: "Purchase",
    refId: purchase._id,
    createdBy,
    date: purchase.date,
  });
};

const postPurchaseReturnJournal = async ({ purchaseReturn, createdBy }) => {
  await postJournalEntry({
    description: `Purchase Return ${purchaseReturn.returnNo}`,
    lines: [
      { accountCode: "2000", debit: purchaseReturn.totalAmount },
      { accountCode: "1200", credit: purchaseReturn.totalAmount },
    ],
    refType: "PurchaseReturn",
    refId: purchaseReturn._id,
    createdBy,
    date: purchaseReturn.date,
  });
};

const postPaymentInJournal = async ({ entry, amount, createdBy }) => {
  await postJournalEntry({
    description: `Payment received from customer (${entry.reference || entry._id})`,
    lines: [
      { accountCode: "1000", debit: amount },
      { accountCode: "1100", credit: amount },
    ],
    refType: "PaymentIn",
    refId: entry._id,
    createdBy,
  });
};

const postPaymentOutJournal = async ({ entry, amount, createdBy }) => {
  await postJournalEntry({
    description: `Payment made to customer (${entry.reference || entry._id})`,
    lines: [
      { accountCode: "1100", debit: amount },
      { accountCode: "1000", credit: amount },
    ],
    refType: "PaymentOut",
    refId: entry._id,
    createdBy,
  });
};

module.exports = {
  ensureAccountsSeeded,
  postJournalEntry,
  postSaleJournal,
  postSaleVoidJournal,
  postPurchaseJournal,
  postPurchaseReturnJournal,
  postPaymentInJournal,
  postPaymentOutJournal,
};
