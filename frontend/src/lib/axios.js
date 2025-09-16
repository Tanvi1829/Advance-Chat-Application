import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development"
    ? "http://localhost:3000/api"
    : import.meta.env.VITE_API_URL,  // must include /api if your backend routes are /api/...
  withCredentials: true,  // ✅ sends cookies with requests
});
