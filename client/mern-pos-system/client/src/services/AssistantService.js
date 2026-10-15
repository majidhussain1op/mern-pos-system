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

const assistantService = {
  // history: [{ role: "user"|"assistant", content: string }]
  chat: async (message, history = []) => {
    const res = await api.post("/assistant/chat", { message, history });
    return res.data.reply;
  },
};

export default assistantService;
