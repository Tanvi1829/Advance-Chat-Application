// Remove this file or simplify it since socket is now managed in the store

// If you want to keep this file for configuration, just export the URL:
export const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// The actual socket connection is now handled in useAuthStore.js