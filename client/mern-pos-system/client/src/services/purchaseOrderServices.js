import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const poService = {
  create: (data) => api.post("/purchase-orders", data),
  getAll: (params) => api.get("/purchase-orders", { params }),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  send: (id) => api.post(`/purchase-orders/${id}/send`),
  confirm: (id) => api.post(`/purchase-orders/${id}/confirm`),
  cancel: (id, reason) => api.post(`/purchase-orders/${id}/cancel`, { reason }),
  receiveGoods: (id, data) => api.post(`/purchase-orders/${id}/receive`, data),
};

export default poService;
