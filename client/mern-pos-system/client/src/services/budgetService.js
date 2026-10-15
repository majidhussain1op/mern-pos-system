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

const budgetService = {
  // period: "YYYY-MM"
  getComparison: async (period) => {
    const res = await api.get("/budgets/comparison", { params: { period } });
    return res.data;
  },

  setBudget: async (account, period, amount) => {
    const res = await api.post("/budgets", { account, period, amount });
    return res.data;
  },
};

export default budgetService;
