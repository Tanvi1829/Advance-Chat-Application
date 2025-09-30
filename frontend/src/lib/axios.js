import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://advance-chat-application-8.onrender.com/api",
  // baseURL: import.meta.env.VITE_BACKEND_URL || "http://localhost:3000/api",
  withCredentials: true,   // 👈 ye add karo agar cookie based auth hai
});

// Agar token localStorage me hai to interceptor lagao
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log("📤 Request:", config.method.toUpperCase(), config.url);
  return config;
});
