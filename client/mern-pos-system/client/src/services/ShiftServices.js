import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

// Attach token automatically on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const shiftService = {
  openShift: (openingCash, notes) =>
    api.post("/shifts/open", { openingCash, notes }),

  getCurrentShift: () => api.get("/shifts/current"),

  recordCashMovement: (type, amount, reason) =>
    api.post("/shifts/cash-movement", { type, amount, reason }),

  closeShift: (closingCash, notes) =>
    api.post("/shifts/close", { closingCash, notes }),

  // naya (Step 2) - Admin/Manager forcibly closes a shift cashier close karna bhool gaya
  forceCloseShift: (id, closingCash, reason) =>
    api.post(`/shifts/${id}/force-close`, { closingCash, reason }),

  getShiftHistory: (params) => api.get("/shifts/history", { params }),

  getShiftReport: (id) => api.get(`/shifts/${id}/report`),

  getCashMovementHistory: (params) =>
    api.get("/shifts/cash-movements/history", { params }),
};

export default shiftService;
