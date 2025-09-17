// import axios from "axios";

// export const axiosInstance = axios.create({
//   baseURL: import.meta.env.MODE === "development"
//     ? "http://localhost:3000/api"
//     : import.meta.env.VITE_API_URL + "/api",
//   headers: { "Content-Type": "application/json" },
//   withCredentials: true, // ✅ this is crucial
// });

// frontend/lib/axiosInstance.js
import axios from "axios";

// Helper to get JWT from cookies
function getTokenFromCookie(cookieName = "jwt") {
  const cookie = document.cookie
    .split("; ")
    .find(row => row.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  return cookie.split("=")[1];
}

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: "https://advance-chat-application-8.onrender.com/api",
});

// Add request interceptor to attach JWT automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getTokenFromCookie("jwt"); // automatically get latest token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
