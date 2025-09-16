import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";
import { app, server } from "./lib/socket.js";

const __dirname = path.resolve();

const PORT = ENV.PORT || 3000;

app.use(express.json({ limit: "10mb" })); // req.body
const allowedOrigins = [
  "https://advance-chat-app.netlify.app",
  "http://localhost:5173",
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // Postman or server-side requests
    if(!allowedOrigins.includes(origin)){
      return callback(new Error("CORS blocked"), false);
    }
    return callback(null, true);
  },
  credentials: true, // ✅ allow cookies
}));

app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (ENV.NODE_ENV === "production") {
  // Serve static frontend files
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // Only serve index.html for routes NOT starting with /api
  app.get(/^\/(?!api).*/, (_, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}




server.listen(PORT, () => {
  console.log("Server running on port: " + PORT);
  connectDB();
});
