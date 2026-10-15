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

// Assumption: manual journal entries live at /journal-entries (per the
// existing journalEntry.controller.js/routes.js, routed through
// postJournalEntry for balance-safety). Payload shape assumed:
// {
//   date, narration, voucherType,   // "Payment" | "Receipt" | "Journal" | "Contra"
//   lines: [{ account, debit, credit, narration }]
// }
const journalEntryService = {
  getAll: async (params = {}) => {
    const res = await api.get("/journal-entries", { params });
    return res.data;
  },

  // Convenience wrapper for the Date Wise Receipt/Payment report.
  // Assumption: backend filters by voucherType in addition to date range.
  getByVoucherType: async (voucherType, from, to) => {
    const res = await api.get("/journal-entries", {
      params: { voucherType, from, to },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/journal-entries/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/journal-entries", payload);
    return res.data;
  },

  // Backend only allows deleting entries with refType: "Manual"
  // (reverses the balance impact first)
  remove: async (id) => {
    const res = await api.delete(`/journal-entries/${id}`);
    return res.data;
  },
};

export default journalEntryService;
