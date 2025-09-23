import { create } from "zustand";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { axiosInstance } from "../lib/axios";

const getSocketURL = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('netlify') || 
        window.location.hostname.includes('vercel') || 
        window.location.hostname.includes('onrender') ||
        window.location.protocol === 'https:') {
      return "https://advance-chat-application-8.onrender.com";
    }
  }
  return "http://localhost:3000";
};

const BASE_URL = getSocketURL();

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      console.log("🔍 Current logged in user:", res.data._id, res.data.fullName);
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error);
      set({ authUser: null });
      localStorage.removeItem("token");
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      set({ authUser: res.data });
      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      // Complete cleanup before login
      get().disconnectSocket();
      localStorage.removeItem("token");
      set({ onlineUsers: [] });
      
      const res = await axiosInstance.post("/auth/login", data);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      set({ authUser: res.data });
      console.log("🔍 Fresh login - User:", res.data._id, res.data.fullName);
      toast.success("Logged in successfully");
      
      // Wait for cleanup then connect
      setTimeout(() => {
        get().connectSocket();
      }, 1000);
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      get().disconnectSocket();
      await axiosInstance.post("/auth/logout");
      set({ authUser: null, onlineUsers: [] });
      localStorage.removeItem("token");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      toast.error(error.response.data.message);
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get();
    
    if (!authUser) {
      console.log("No auth user for socket connection");
      return;
    }
    
    // Always disconnect existing socket
    if (socket) {
      socket.disconnect();
    }

    console.log("Creating socket connection to:", BASE_URL);
    console.log("For user:", authUser._id, authUser.fullName);

    try {
      const socketOptions = {
        withCredentials: true,
        timeout: 20000,
        forceNew: true,
        transports: ['websocket', 'polling'], // Include both transports
        autoConnect: true,
      };

      const newSocket = io(BASE_URL, socketOptions);

      newSocket.on("connect", () => {
        console.log("✅ Socket connected successfully!");
        console.log("Socket ID:", newSocket.id);
        console.log("Expected user in online list:", authUser._id);
        
        newSocket.emit("requestOnlineUsers");
      });

      newSocket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        console.error("Error details:", {
          message: error.message,
          type: error.type,
          description: error.description
        });
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        set({ onlineUsers: [] });
      });

      newSocket.on("getOnlineUsers", (userIds) => {
        const onlineUsersArray = Array.isArray(userIds) 
          ? userIds.map(id => id.toString()) 
          : [];
        console.log("👥 Online users received:", onlineUsersArray);
        console.log("👥 Current user should be in list:", authUser._id);
        console.log("👥 Is current user online?", onlineUsersArray.includes(authUser._id));
        set({ onlineUsers: onlineUsersArray });
      });

      newSocket.on("newMessage", (newMessage) => {
        console.log("📨 New message received:", newMessage);
      });

      set({ socket: newSocket });
      
    } catch (error) {
      console.error("Failed to create socket:", error);
    }
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      console.log("Disconnecting socket");
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },

  isUserOnline: (userId) => {
    const { onlineUsers } = get();
    return onlineUsers.some(id => id.toString() === userId.toString());
  },
}));