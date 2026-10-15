import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const categoryService = {
  getAll: () => api.get("/categories"),
  create: (name) => api.post("/categories", { name }),
  update: (id, name) => api.put(`/categories/${id}`, { name }),
  remove: (id) => api.delete(`/categories/${id}`),
};

export default categoryService;
