import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const supplierService = {
  getAll: () => api.get("/manufacturers"),
  search: (q) => api.get("/manufacturers/search", { params: { q } }),
  create: (data) => api.post("/manufacturers", data),
  update: (id, data) => api.put(`/manufacturers/${id}`, data),
  remove: (id) => api.delete(`/manufacturers/${id}`),
};

export default supplierService;
