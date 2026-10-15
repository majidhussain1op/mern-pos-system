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

const accountService = {
  // Returns the full Chart of Accounts.
  // Assumption: GET /accounts returns a flat array of active accounts
  // ({ _id, code, name, type, level, parent, isPostingAccount, isActive }).
  // The frontend builds the tree client-side from `parent`.
  getAll: async () => {
    const res = await api.get("/accounts");
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/accounts", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/accounts/${id}`, payload);
    return res.data;
  },

  // Soft delete — matches the isActive:false convention used elsewhere
  // in this project (never isDeleted).
  deactivate: async (id) => {
    const res = await api.delete(`/accounts/${id}`);
    return res.data;
  },
};

export default accountService;
