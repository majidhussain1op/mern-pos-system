import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

// Customers
export const getAllCustomers = () => api.get("/customers").then((r) => r.data);
export const searchCustomers = (q) =>
  api.get(`/customers/search?q=${q}`).then((r) => r.data);
export const createCustomer = (data) =>
  api.post("/customers", data).then((r) => r.data);
export const getCustomerById = (id) =>
  api.get(`/customers/${id}`).then((r) => r.data);

// CRM
export const getStatement = (id, params = {}) =>
  api.get(`/crm/${id}/statement`, { params }).then((r) => r.data);
export const getSummary = (id) =>
  api.get(`/crm/${id}/summary`).then((r) => r.data);
export const receivePayment = (id, data) =>
  api.post(`/crm/${id}/payment`, data).then((r) => r.data);
export const makePaymentOut = (id, data) =>
  api.post(`/crm/${id}/payment-out`, data).then((r) => r.data);
export const getDueList = () => api.get("/crm/due-list").then((r) => r.data);
export const updateCustomer = (id, data) =>
  api.put(`/customers/${id}`, data).then((r) => r.data);

export const deleteCustomer = (id) =>
  api.delete(`/customers/${id}`).then((r) => r.data);

export default api;
