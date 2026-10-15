import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const reportService = {
  getTopSellingItems: (params) =>
    api.get("/reports/top-selling-items", { params }),

  getSalesReport: (params) => api.get("/reports/sales", { params }),

  getStockReport: (params) => api.get("/reports/stock", { params }),

  getExpiryReport: (params) => api.get("/reports/expiry", { params }),
};

export default reportService;
