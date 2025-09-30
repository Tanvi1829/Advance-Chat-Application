// import jwt from "jsonwebtoken";
// import User from "../models/User.js";
// import { ENV } from "../lib/env.js";

// export const socketAuthMiddleware = async (socket, next) => {
//   try {

//     let token;
//     extract token from http-only cookies
//      token = socket.handshake.headers.cookie
//       ?.split("; ")
//       .find((row) => row.startsWith("jwt="))
//       ?.split("=")[1];

//         if (!token) {
//       token = socket.handshake.auth.token;
//     }

//     if (!token) {
//       console.log("Socket connection rejected: No token provided");
//       return next(new Error("Unauthorized - No Token Provided"));
//     }

//     verify the token
//     const decoded = jwt.verify(token, ENV.JWT_SECRET);
//     if (!decoded) {
//       console.log("Socket connection rejected: Invalid token");
//       return next(new Error("Unauthorized - Invalid Token"));
//     }

//     find the user fromdb
//     const user = await User.findById(decoded.userId).select("-password");
//     if (!user) {
//       console.log("Socket connection rejected: User not found");
//       return next(new Error("User not found"));
//     }

//     attach user info to socket
//     socket.user = user;
//     socket.userId = user._id.toString();

//     console.log(`Socket authenticated for user: ${user.fullName} (${user._id})`);

//     next();
//   } catch (error) {
//     console.log("Error in socket authentication:", error.message);
//     next(new Error("Unauthorized - Authentication failed"));
//   }
// };


import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ENV } from "../lib/env.js";

// export const socketAuthMiddleware = async (socket, next) => {
//   try {
//     let token;

//     // Try cookie first
//     token = socket.handshake.headers.cookie
//       ?.split("; ")
//       .find((row) => row.startsWith("jwt="))
//       ?.split("=")[1];

//     // If no cookie, check auth query parameter (for localStorage token)
//     if (!token) {
//       token = socket.handshake.auth.token;
//     }

//     if (!token) {
//       console.log("Socket connection rejected: No token provided");
//       return next(new Error("Unauthorized - No Token Provided"));
//     }

//     const decoded = jwt.verify(token, ENV.JWT_SECRET);
//     if (!decoded) {
//       return next(new Error("Unauthorized - Invalid Token"));
//     }

//     const user = await User.findById(decoded.userId).select("-password");
//     if (!user) {
//       return next(new Error("User not found"));
//     }

//     socket.user = user;
//     socket.userId = user._id.toString();

//     console.log(`✅ Socket authenticated: ${user.fullName} (${user._id})`);
//     next();
//   } catch (error) {
//     console.log("❌ Socket auth error:", error.message);
//     next(new Error("Unauthorized - Authentication failed"));
//   }
// };


// socket.auth.middleware.js
export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token;

    // Cookie (same domain only)
    const cookieHeader = socket.handshake.headers.cookie;
    if (cookieHeader) {
      const jwtCookie = cookieHeader.split("; ").find(row => row.startsWith("jwt="));
      if (jwtCookie) token = jwtCookie.split("=")[1];
    }

    // Auth header (cross-domain)
    if (!token) {
      token = socket.handshake.auth?.token;
    }

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");
    
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};