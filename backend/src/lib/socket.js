// import { Server } from "socket.io";
// import http from "http";
// import express from "express";
// import { ENV } from "./env.js";
// import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: [
//       "https://advance-chat-application-9.onrender.com",
//        "http://localhost:5173",
//     ], // frontend domain
//     methods: ["GET", "POST"],
//     credentials: true, // ✅ send cookies
//   },
// });

// // apply authentication middleware to all socket connections
// io.use(socketAuthMiddleware);

// // we will use this function to check if the user is online or not
// const userSocketMap = {}; // {userId:socketId}
// export function getReceiverSocketId(userId) {
//   return userSocketMap[userId];
// }

// // this is for storig online users

// io.on("connection", (socket) => {
//   console.log("A user connected", socket.user.fullName);

//   const userId = socket.userId;
//   userSocketMap[userId] = socket.id;

//   // io.emit() is used to send events to all connected clients
//   io.emit("getOnlineUsers", Object.keys(userSocketMap));

//     socket.on("typing", ({ receiverId, isTyping }) => {
//     const receiverSocketId = getReceiverSocketId(receiverId);
    
//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit("userTyping", {
//         userId: userId,
//         isTyping: isTyping
//       });
      
//       console.log(`User ${userId} is ${isTyping ? 'typing' : 'not typing'} to ${receiverId}`);
//     }
//   });
  
//   // with socket.on we listen for events from clients
//   socket.on("disconnect", () => {
//     console.log("A user disconnected", socket.user.fullName);
//     delete userSocketMap[userId];
//     io.emit("getOnlineUsers", Object.keys(userSocketMap));
//   });

//     socket.on("call-user", ({ receiverId, offer }) => {
//     const receiverSocketId = getReceiverSocketId(receiverId);
//     if (receiverSocketId) {
//       socket.to(receiverSocketId).emit("incoming-call", {
//         callerId: userId,
//         callerName: socket.user.fullName,
//         offer,
//       });
//       console.log(`Call initiated from ${userId} to ${receiverId}`);
//     }
//   });

//   socket.on("answer-call", ({ callerId, answer }) => {
//     const callerSocketId = getReceiverSocketId(callerId);
//     if (callerSocketId) {
//       socket.to(callerSocketId).emit("call-accepted", { answer });
//     }
//   });

//   socket.on("reject-call", ({ callerId }) => {
//     const callerSocketId = getReceiverSocketId(callerId);
//     if (callerSocketId) {
//       socket.to(callerSocketId).emit("call-rejected");
//     }
//   });

//   socket.on("ice-candidate", ({ receiverId, candidate }) => {
//     const receiverSocketId = getReceiverSocketId(receiverId);
//     if (receiverSocketId) {
//       socket.to(receiverSocketId).emit("ice-candidate", { candidate });
//     }
//   });

//   socket.on("end-call", ({ receiverId }) => {
//     const receiverSocketId = getReceiverSocketId(receiverId);
//     if (receiverSocketId) {
//       socket.to(receiverSocketId).emit("call-ended");
//     }
//   });

//   // New: Create call log on call end (from backend, but emit to create)
//   socket.on("create-call-log", async ({ receiverId, duration, status }) => {
//     // You can emit to a webhook or directly call the controller, but for simplicity, just log
//     console.log(`Call log: ${userId} -> ${receiverId}, duration: ${duration}, status: ${status}`);
//     // In production, emit to a server-side event to persist
//   });

//   socket.on("disconnect", () => {
//     console.log("A user disconnected", socket.user.fullName);
//     delete userSocketMap[userId];
//     io.emit("getOnlineUsers", Object.keys(userSocketMap));
//   });

// });

// export { io, app, server };


import { Server } from "socket.io";
import http from "http";
import express from "express";
import { ENV } from "./env.js";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://advance-chat-application-9.onrender.com", // Frontend
      "http://localhost:5173" // Local
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.use(socketAuthMiddleware);

const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId.toString()]; // ✅ String conversion for match
}

io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.user.fullName, "ID:", socket.userId);
  
  const userId = socket.userId.toString(); // ✅ String for map
  userSocketMap[userId] = socket.id;
  
  io.emit("getOnlineUsers", Object.keys(userSocketMap)); // Broadcast online users

  socket.on("typing", ({ receiverId, isTyping }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("userTyping", { userId: socket.userId, isTyping });
    }
  });

  // ✅ Updated: Call Signaling Events
  socket.on("call-user", ({ receiverId, offer }) => {
    const receiverIdStr = receiverId.toString();
    const receiverSocketId = getReceiverSocketId(receiverIdStr);
    console.log(`📞 Call initiated: ${socket.userId} -> ${receiverIdStr}, Socket: ${receiverSocketId}`);
    
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        callerId: socket.userId,
        callerName: socket.user.fullName,
        offer,
      });
      console.log("✅ Incoming-call emitted to receiver");
    } else {
      console.warn("❌ Receiver socket not found – user offline?");
      // Optional: Emit back to caller "user-offline"
      socket.emit("call-failed", { reason: "receiver-offline" });
    }
  });

  socket.on("answer-call", ({ callerId, answer }) => {
    const callerIdStr = callerId.toString();
    const callerSocketId = getReceiverSocketId(callerIdStr);
    console.log(`📞 Answer from ${socket.userId} to ${callerIdStr}`);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-accepted", { answer });
      console.log("✅ Call-accepted emitted");
    }
  });

  socket.on("reject-call", ({ callerId }) => {
    const callerIdStr = callerId.toString();
    const callerSocketId = getReceiverSocketId(callerIdStr);
    console.log(`📞 Reject from ${socket.userId} to ${callerIdStr}`);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-rejected");
      console.log("✅ Call-rejected emitted");
    }
  });

  socket.on("ice-candidate", ({ receiverId, candidate }) => {
    const receiverIdStr = receiverId.toString();
    const receiverSocketId = getReceiverSocketId(receiverIdStr);
    if (receiverSocketId && candidate) {
      io.to(receiverSocketId).emit("ice-candidate", { candidate });
      console.log("🧊 ICE candidate sent");
    }
  });

  socket.on("end-call", ({ receiverId }) => {
    const receiverIdStr = receiverId.toString();
    const receiverSocketId = getReceiverSocketId(receiverIdStr);
    console.log(`📞 End call from ${socket.userId} to ${receiverIdStr}`);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-ended");
      console.log("✅ Call-ended emitted");
    }
  });

  socket.on("disconnect", () => {
    console.log("👤 User disconnected:", socket.user.fullName);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };