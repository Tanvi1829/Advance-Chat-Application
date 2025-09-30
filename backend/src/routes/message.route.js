// import express from "express";
// import { protectRoute } from "../middleware/auth.middleware.js";
// import {
//   getAllContacts,
//   getMessagesByUserId,
//   sendMessage,
//   getChatPartners,
//   markMessagesAsRead
// } from "../controllers/message.controller.js";

// const router = express.Router();

// router.get("/contacts", protectRoute, getAllContacts);
// router.get("/chats", protectRoute, getChatPartners);

// // ✅ CRITICAL: Specific routes BEFORE generic /:id
// // router.post("/mark-as-read/:id", protectRoute, markMessagesAsRead);
// router.post("/mark-as-read/:id", protectRoute, (req, res, next) => {
//   console.log("✅ mark-as-read route hit! ID:", req.params.id);
//   markMessagesAsRead(req, res, next);
// });
// router.post("/send/:id", protectRoute, sendMessage);

// // ✅ Generic route at END
// router.get("/:id", protectRoute, getMessagesByUserId);

// export default router;

import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getAllContacts,
  getMessagesByUserId,
  sendMessage,
  getChatPartners,
  markMessagesAsRead
} from "../controllers/message.controller.js";

const router = express.Router();

// Test log
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📂 MESSAGE ROUTES LOADING...");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

router.get("/contacts", protectRoute, getAllContacts);
router.get("/chats", protectRoute, getChatPartners);

// Specific routes FIRST
router.post("/mark-as-read/:id", protectRoute, (req, res, next) => {
  console.log("✅ MARK AS READ HIT! Params:", req.params);
  markMessagesAsRead(req, res, next);
});

router.post("/send/:id", protectRoute, sendMessage);

// Generic route LAST
router.get("/:id", protectRoute, getMessagesByUserId);

console.log("✅ All message routes registered");

export default router;