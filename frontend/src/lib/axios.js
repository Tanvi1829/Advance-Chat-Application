import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : "https://advance-chat-application-8.onrender.com/api",
  withCredentials: true,
});

