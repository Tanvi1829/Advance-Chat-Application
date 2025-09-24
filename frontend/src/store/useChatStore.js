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
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

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
      return timeB - timeA; // latest on top
    });
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


    markMessagesAsRead: async (userId, messageIds) => {
    try {
      const response = await fetch(`/api/messages/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, messageIds }),
      });
      if (response.ok) {
        set((state) => ({
          messages: state.messages.map((msg) =>
            messageIds.includes(msg._id) ? { ...msg, read: true } : msg
          ),
        }));
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },


getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      let chats = res.data;
      
      // Additional verification: Get the actual latest message for each chat
      const updatedChats = await Promise.all(
        chats.map(async (chat) => {
          try {
            // Get the absolute latest message for this chat
            const messagesRes = await axiosInstance.get(`/messages/${chat._id}`);
            const messages = messagesRes.data;
            const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            
            // If we found a more recent message than what backend provided, use it
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

      // Sort by latest message time
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

      // Update chats with the latest message for the selected user
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
    };
    set({ messages: [...messages, optimisticMessage] });

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      // Remove optimistic message and add real message
      const filteredMessages = messages.filter(msg => msg._id !== tempId);
      set({ messages: [...filteredMessages, res.data] });

      // Update chats with the new message and resort
      set((state) => {
        const updatedChats = state.chats.map((chat) =>
          chat._id === selectedUser._id
            ? {
                ...chat,
                lastMessage: res.data,
              }
            : chat
        );
        return { chats: get().sortChats(updatedChats) };
      });
    } catch (error) {
      // Remove optimistic message on error
      set({ messages: messages.filter(msg => msg._id !== tempId) });
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    
    socket.on("newMessage", (newMessage) => {
      const { selectedUser, isSoundEnabled } = get();
      const { authUser } = useAuthStore.getState();
      
      // Check if this message involves the current user
      const isMessageForMe = newMessage.receiverId === authUser._id || newMessage.senderId === authUser._id;
      
      if (!isMessageForMe) return;

      // Debug log for socket message
      console.log("[Socket] newMessage received", newMessage, "selectedUser:", selectedUser);

      // If the message is for the open chat (sender or receiver), add it to the current chat
      if (
        selectedUser &&
        (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)
      ) {
        const currentMessages = get().messages;
        // Prevent duplicate messages (by _id)
        if (!currentMessages.some(msg => msg._id === newMessage._id)) {
          set({ messages: [...currentMessages, newMessage] });
        }

        if (isSoundEnabled) {
          const notificationSound = new Audio("/sounds/notification.mp3");
          notificationSound.currentTime = 0;
          notificationSound.play().catch((e) => console.log("Audio play failed:", e));
        }
      }

      // Always update the chat list for any message involving current user
      set((state) => {
        const chatPartnerId = newMessage.senderId === authUser._id ? newMessage.receiverId : newMessage.senderId;
        
        const updatedChats = state.chats.map((chat) =>
          chat._id === chatPartnerId
            ? { ...chat, lastMessage: newMessage }
            : chat
        );

        // Sort by latest message time
        const sortedChats = updatedChats.sort((a, b) => {
          const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        return { chats: sortedChats };
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },
}));
