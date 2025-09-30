import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  unreadCounts: {},
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,
  typingUsers: {}, // NEW: Track typing users

  toggleSound: () => {
    localStorage.setItem("isSoundEnabled", !get().isSoundEnabled);
    set({ isSoundEnabled: !get().isSoundEnabled });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  sortChats: (chats) => {
    return chats.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  },

    // NEW: Emit typing status
    emitTyping: (receiverId, isTyping) => {
      const socket = useAuthStore.getState().socket;
      if (!socket) return;
      
      socket.emit("typing", { receiverId, isTyping });
    },

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Cannot fetch contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      let chats = res.data;
      
      const updatedChats = await Promise.all(
        chats.map(async (chat) => {
          try {
            const messagesRes = await axiosInstance.get(`/messages/${chat._id}`);
            const messages = messagesRes.data;
            const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            
            if (latestMessage && (!chat.lastMessage || 
                new Date(latestMessage.createdAt) > new Date(chat.lastMessage.createdAt))) {
              return { ...chat, lastMessage: latestMessage };
            }
            return chat;
          } catch (error) {
            console.error(`Error fetching messages for ${chat._id}:`, error);
            return chat;
          }
        })
      );

      const sortedChats = updatedChats.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      set({ chats: sortedChats });
    } catch (error) {
      toast.error(error.response?.data?.message || "Cannot fetch chats");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      const messages = res.data;
      set({ messages });

      set((state) => {
        const updatedChats = state.chats.map((chat) =>
          chat._id === userId
            ? {
                ...chat,
                lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
              }
            : chat
        );
        return { chats: updatedChats };
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Cannot fetch messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const { authUser } = useAuthStore.getState();

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      read: false, // Initially not read
    };
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      const filteredMessages = messages.filter(msg => msg._id !== tempId);
      set({ messages: [...filteredMessages, res.data] });

      set((state) => {
        const updatedChats = state.chats.map((chat) =>
          chat._id === selectedUser._id
            ? { ...chat, lastMessage: res.data }
            : chat
        );
        return { chats: get().sortChats(updatedChats) };
      });
    } catch (error) {
      set({ messages: messages.filter(msg => msg._id !== tempId) });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
      if (!socket) {
    console.log("No socket connection");
    return;
  }

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, isSoundEnabled } = get();
      const { authUser } = useAuthStore.getState();
      
      const isMessageForMe = newMessage.receiverId === authUser._id || newMessage.senderId === authUser._id;
      
      if (!isMessageForMe) return;

      if (
        selectedUser &&
        (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)
      ) {
        const currentMessages = get().messages;
        if (!currentMessages.some(msg => msg._id === newMessage._id)) {
          set({ messages: [...currentMessages, newMessage] });
        }

        if (isSoundEnabled) {
          const notificationSound = new Audio("/sounds/notification.mp3");
          notificationSound.currentTime = 0;
          notificationSound.play().catch((e) => console.log("Audio play failed:", e));
        }
      }

      set((state) => {
        const chatPartnerId = newMessage.senderId === authUser._id ? newMessage.receiverId : newMessage.senderId;
        
        // const updatedChats = state.chats.map((chat) =>
        //   chat._id === chatPartnerId
        //     ? { ...chat, lastMessage: newMessage }
        //     : chat
        // );

        // const sortedChats = updatedChats.sort((a, b) => {
        //   const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        //   const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        //   return timeB - timeA;
        // });

              let updatedChats = [...state.chats];
      const existingChatIndex = updatedChats.findIndex(
        chat => chat._id === chatPartnerId
      );

      if (existingChatIndex !== -1) {
        // Update existing chat
        updatedChats[existingChatIndex] = {
          ...updatedChats[existingChatIndex],
          lastMessage: newMessage,
          unreadCount: 
            newMessage.senderId === chatPartnerId && 
            selectedUser?._id !== chatPartnerId
              ? (updatedChats[existingChatIndex].unreadCount || 0) + 1
              : updatedChats[existingChatIndex].unreadCount || 0
        };
      } else {
        // ✅ New chat partner - fetch their details and add to list
        axiosInstance.get(`/auth/user/${chatPartnerId}`)
          .then(res => {
            set((state) => ({
              chats: [{
                ...res.data,
                lastMessage: newMessage,
                unreadCount: newMessage.senderId === chatPartnerId ? 1 : 0
              }, ...state.chats]
            }));
          })
          .catch(err => console.error("Failed to fetch user:", err));
      }

      // Sort by latest message
      updatedChats.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt 
          ? new Date(a.lastMessage.createdAt).getTime() 
          : 0;
        const timeB = b.lastMessage?.createdAt 
          ? new Date(b.lastMessage.createdAt).getTime() 
          : 0;
        return timeB - timeA;
      });
        return { chats: sortedChats };
      });
    });

        socket.on("userTyping", ({ userId, isTyping }) => {
      console.log(`User ${userId} typing status:`, isTyping);
      
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [userId]: isTyping
        }
      }));
    });

    // Listen for read receipts
    socket.on("messageRead", ({ messageIds, userId }) => {
      console.log("📘 messageRead event received:", messageIds, userId);
      
      set((state) => {
        const updatedMessages = state.messages.map((msg) =>
          messageIds.includes(msg._id.toString()) ? { ...msg, read: true } : msg
        );
        
        console.log("Updated messages with read status:", updatedMessages.filter(m => messageIds.includes(m._id.toString())));
        
        return { messages: updatedMessages };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageRead"); // ✅ Add this
  },

  markMessagesAsRead: async (userId) => {
    try {
      console.log("🔍 Calling mark-as-read for userId:", userId);
    console.log("🔍 Full URL:", `/messages/mark-as-read/${userId}`);
      const res = await axiosInstance.post(`/messages/mark-as-read/${userId}`);
      console.log("✅ markMessagesAsRead response:", res.data);

      set((state) => {
        const updatedMessages = state.messages.map((msg) =>
          // msg.senderId === userId ? { ...msg, read: true } : msg
          msg.senderId === userId && msg.read === false 
          ? { ...msg, read: true } 
          : msg
        );
        console.log("Updated messages after marking as read:", updatedMessages.filter(m => m.senderId === userId && m.read));
        const updatedChats = state.chats.map((chat) =>
          chat._id === userId ? { ...chat, unreadCount: 0 } : chat
        );

        return { messages: updatedMessages, chats: updatedChats };
      });
    } catch (error) {
      console.error("❌ Error marking messages as read:", error);
      console.error("❌ Error:", error.response?.status);
    console.error("❌ URL tried:", error.config?.url);
    console.error("❌ Method:", error.config?.method);
    }
  },

  setUnreadCount: (receiverId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [receiverId]: count },
    })),
}));