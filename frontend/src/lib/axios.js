import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:3000/api"
      : import.meta.env.VITE_API_URL + "/api", // adds /api for backend routes
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // cookies
});
