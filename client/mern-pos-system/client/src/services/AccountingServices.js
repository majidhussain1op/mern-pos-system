import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const accountingService = {
  getChartOfAccounts: () => api.get("/journal/accounts"),
  getTrialBalance: () => api.get("/journal/trial-balance"),
  getJournalEntries: (params) => api.get("/journal/entries", { params }),
  getAccountLedger: (accountId, params) =>
    api.get(`/journal/accounts/${accountId}/ledger`, { params }),

  // Manual entry CRUD - alag endpoint (/api/journal-entries)
  createManualEntry: (data) => api.post("/journal-entries", data),
  deleteManualEntry: (id) => api.delete(`/journal-entries/${id}`),
};

export default accountingService;
