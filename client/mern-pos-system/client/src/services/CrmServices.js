import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const crmService = {
  getDueList: (params) => api.get("/crm/due-list", { params }),

  getStatement: (customerId, params) =>
    api.get(`/crm/${customerId}/statement`, { params }),

  getCustomerSummary: (customerId) => api.get(`/crm/${customerId}/summary`),
};

export default crmService;
