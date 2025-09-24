import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getAllContacts:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Returns all messages between logged-in user and userToChatId, with read and receiverId fields
export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).lean();

    // Ensure each message has read and receiverId fields (for frontend logic)
    const messagesWithRead = messages.map(msg => ({
      ...msg,
      read: msg.read,
      receiverId: msg.receiverId,
    }));

    res.status(200).json(messagesWithRead);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!text && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    let imageUrl;
    if (image) {
      // upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    // Also emit to sender (for multi-tab/devices or instant update)
    if (senderSocketId && senderSocketId !== receiverSocketId) {
      io.to(senderSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// export const getChatPartners = async (req, res) => {
//   try {
//     const loggedInUserId = req.user._id;

//     // Use aggregation to find chat partners and their latest message
//     const aggregation = await Message.aggregate([
//       {
//         $match: {
//           $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
//         },
//       },
//       {
//         $sort: { createdAt: -1 }, // Sort messages by newest first
//       },
//       {
//         $group: {
//           _id: {
//             $cond: [
//               { $eq: ["$senderId", loggedInUserId] },
//               "$receiverId",
//               "$senderId",
//             ],
//           },
//           lastMessage: { $first: "$$ROOT" }, // Get the whole latest message doc
//         },
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "_id",
//           foreignField: "_id",
//           as: "partner",
//         },
//       },
//       {
//         $unwind: "$partner",
//       },
//       {
//         $project: {
//           "partner.password": 0, // Exclude password
//           lastMessage: 1,
//         },
//       },
//       {
//         $sort: { "lastMessage.createdAt": -1 }, // Sort chats by latest message time
//       },
//     ]);

//     // Return both partner and lastMessage for each chat
// const chatPartners = await Promise.all(
//       aggregation.map(async (item) => {
//         // Double-check by getting the actual latest message
//         const latestMessage = await Message.findOne({
//           $or: [
//             { senderId: loggedInUserId, receiverId: item._id },
//             { senderId: item._id, receiverId: loggedInUserId },
//           ],
//         }).sort({ createdAt: -1 });

//         return {
//           ...item.partner,
//           lastMessage: latestMessage || item.lastMessage,
//         };
//       })
//     );

//     // Sort one more time by the actual latest message
//     chatPartners.sort((a, b) => {
//       const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
//       const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
//       return timeB - timeA;
//     });

//     res.status(200).json(chatPartners);
//   } catch (error) {
//     console.error("Error in getChatPartners: ", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


// export const markMessagesAsRead = async (req, res) => {
//   try {
//     const myId = req.user._id; // The person who is reading the messages
//     const { id: otherUserId } = req.params; // The person who sent the messages

//     // Mark all unread messages from otherUserId to myId as read
//     const result = await Message.updateMany(
//       {
//         senderId: otherUserId,
//         receiverId: myId,
//         read: false,
//       },
//       {
//         $set: { read: true }
//       }
//     );

//     // Emit to both users to update their UI
//     const mySocketId = getReceiverSocketId(myId);
//     const otherSocketId = getReceiverSocketId(otherUserId);

//     if (mySocketId) {
//       io.to(mySocketId).emit("messagesRead", { 
//         chatPartnerId: otherUserId,
//         readCount: result.modifiedCount 
//       });
//     }
    
//     if (otherSocketId) {
//       io.to(otherSocketId).emit("messagesRead", { 
//         chatPartnerId: myId,
//         readCount: result.modifiedCount 
//       });
//     }

//     res.status(200).json({ 
//       message: "Messages marked as read", 
//       readCount: result.modifiedCount 
//     });
//   } catch (error) {
//     console.log("Error in markMessagesAsRead controller: ", error.message);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };


export const markMessagesAsRead = async (req, res) => {
  try {
    const { userId, messageIds } = req.body;
    const loggedInUserId = req.user._id;

    if (userId !== loggedInUserId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Message.updateMany(
      { _id: { $in: messageIds }, receiverId: loggedInUserId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// Returns all chat partners with last message and unreadCount for WhatsApp-style badge
export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const aggregation = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "partner",
        },
      },
      { $unwind: "$partner" },
      // {
      //   $project: {
      //     partner: {
      //       password: 0
      //     },
      //     lastMessage: 1
      //   }
      // },
      {
  $project: {
    "partner.password": 0,
    "_id": 0
  }
},
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    // For each chat, count unread messages where receiver is logged-in user and read: false
    const chatPartners = await Promise.all(
      aggregation.map(async (item) => {
        try {
          const latestMessage = await Message.findOne({
            $or: [
              { senderId: loggedInUserId, receiverId: item._id },
              { senderId: item._id, receiverId: loggedInUserId },
            ],
          }).sort({ createdAt: -1 });

          // Count unread messages for this chat
          const unreadCount = await Message.countDocuments({
            senderId: item._id,
            receiverId: loggedInUserId,
            read: false,
          });

          return {
            ...item.partner,
            lastMessage: latestMessage || item.lastMessage,
            unreadCount,
          };
        } catch (err) {
          console.error("Error fetching latest message/unread for user:", item._id, err);
          return {
            ...item.partner,
            lastMessage: item.lastMessage || null,
            unreadCount: 0,
          };
        }
      })
    );

    chatPartners.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};