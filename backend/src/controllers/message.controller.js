import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

// ✅ Get all contacts except self
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

// ✅ Get all messages between two users
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

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessagesByUserId:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Send message
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
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      read: false,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    if (senderSocketId && senderSocketId !== receiverSocketId) {
      io.to(senderSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get chat partners with last message + unread count
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
      { $project: { "partner.password": 0 } },
      { $sort: { "lastMessage.createdAt": -1 } },
    ]);

    const chatPartners = await Promise.all(
      aggregation.map(async (item) => {
        const unreadCount = await Message.countDocuments({
          senderId: item._id,
          receiverId: loggedInUserId,
          read: false,
        });

        return {
          ...item.partner,
          lastMessage: item.lastMessage,
          unreadCount,
        };
      })
    );

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Mark messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userId } = req.params;

    const unreadMessages = await Message.find({
      senderId: userId,
      receiverId: myId,
      read: false,
    }).select("_id");

    const messageIds = unreadMessages.map((msg) => msg._id.toString());

    await Message.updateMany(
      { senderId: userId, receiverId: myId, read: false },
      { $set: { read: true } }
    );

    const senderSocketId = getReceiverSocketId(userId);
    if (senderSocketId && messageIds.length > 0) {
      io.to(senderSocketId).emit("messageRead", {
        messageIds,
        userId: myId.toString(),
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
