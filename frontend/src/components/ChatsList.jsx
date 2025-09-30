// src/components/ChatsList.jsx
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect } from "react";
import { formatChatDate } from "../lib/formatChatDate";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers, authUser, socket } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

    useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      console.log("📨 New message in ChatsList:", newMessage);
      // This will trigger re-render because chats state will update
      // The update happens in useChatStore's subscribeToMessages
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <>
      {chats.map((chat) => {
        const lastMessage = chat.lastMessage;
  const time = lastMessage ? formatChatDate(lastMessage.createdAt) : "";
        const messageText = lastMessage ? lastMessage.text || "Image" : "No recent message";
        const senderName = lastMessage && lastMessage.senderId === authUser._id ? "You" : chat.fullName;
  const unreadCount = typeof chat.unreadCount === 'number' ? chat.unreadCount : 0;

        return (
          <div
            key={chat._id}
            className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
            onClick={() => setSelectedUser(chat)}
          >
            <div className="flex items-center gap-3">
              <div className={`avatar ${onlineUsers.includes(chat._id) ? "online" : "offline"}`}>
                <div className="size-12 rounded-full">
                  <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h4 className="text-slate-200 font-medium truncate">{chat.fullName}</h4>
                  {lastMessage && <span className="text-xs text-slate-400 ml-2">{time}</span>}
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-300 truncate whitespace-nowrap max-w-[180px]">
                    {lastMessage ? `${senderName}: ${messageText}` : messageText}
                  </p>
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 min-w-[22px] h-[22px] flex items-center justify-center font-semibold shadow-md border-2 border-black/30">
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default ChatsList;