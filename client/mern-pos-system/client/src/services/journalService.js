import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Assumption: journal.controller.js is mounted at /api/journal.
// GET /journal/trial-balance?asOf=YYYY-MM-DD
// Expected response: array of
//   { _id, code, name, type, debit, credit }
// (one row per account, with its net balance already split into the
// correct debit/credit column based on account type)
const journalService = {
  getTrialBalance: async (asOf) => {
    const res = await api.get("/journal/trial-balance", {
      params: asOf ? { asOf } : {},
    });
    return res.data;
  },

  // Assumption: GET /journal/ledger/:accountId?from=&to=
  // Expected response: { openingBalance, closingBalance, entries: [
  //   { date, voucherType, reference, narration, debit, credit, runningBalance }
  // ] }
  getAccountLedger: async (accountId, from, to) => {
    const res = await api.get(`/journal/ledger/${accountId}`, {
      params: { from, to },
    });
    return res.data;
  },

  // Assumption: GET /journal/income-statement?from=&to=
  // Expected response: {
  //   income: [{ code, name, amount }],
  //   expense: [{ code, name, amount }],
  //   totalIncome, totalExpense, netProfit
  // }
  getIncomeStatement: async (from, to) => {
    const res = await api.get("/journal/income-statement", {
      params: { from, to },
    });
    return res.data;
  },

  // Assumption: GET /journal/cash-flow?cashAccounts=id1,id2&from=&to=
  // Expected response: {
  //   operating: [{ account, counterAccount, date, amount }],
  //   investing: [...],
  //   financing: [...],
  //   netOperating, netInvesting, netFinancing,
  //   openingCashBalance, closingCashBalance, netChange
  // }
  getCashFlow: async (cashAccountIds, from, to) => {
    const res = await api.get("/journal/cash-flow", {
      params: { cashAccounts: cashAccountIds.join(","), from, to },
    });
    return res.data;
  },
};

export default journalService;
