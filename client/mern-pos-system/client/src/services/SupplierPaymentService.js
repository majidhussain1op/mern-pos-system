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

const supplierPaymentService = {
  // Reuses the existing /manufacturers endpoint (already used in Purchase.jsx).
  // Expected: array of { _id, name, balance } — balance = outstanding payable
  getSuppliers: async () => {
    const res = await api.get("/manufacturers");
    return res.data.manufacturers || res.data.data || res.data;
  },

  // Assumption: GET /manufacturers/:id/statement?from=&to=
  // mirrors the existing CustomerStatement pattern.
  // Expected: {
  //   openingBalance, closingBalance,
  //   transactions: [{ date, type, reference, amount, balance }]
  //   // type: "Purchase" | "Payment" | "Purchase Return"
  // }
  getStatement: async (supplierId, from, to) => {
    const res = await api.get(`/manufacturers/${supplierId}/statement`, {
      params: { from, to },
    });
    return res.data;
  },
};

export default supplierPaymentService;
