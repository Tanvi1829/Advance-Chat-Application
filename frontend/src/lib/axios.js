import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://advance-chat-application-9.onrender.com/api",
  withCredentials: true,   // 👈 ye add karo agar cookie based auth hai
});

// Agar token localStorage me hai to interceptor lagao
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
