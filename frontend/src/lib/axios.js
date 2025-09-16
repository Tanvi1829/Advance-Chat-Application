import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : "https://advance-chat-application-8.onrender.com/api", // note /api
  withCredentials: true,
});
