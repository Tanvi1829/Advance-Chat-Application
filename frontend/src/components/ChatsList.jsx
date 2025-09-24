// src/components/ChatsList.jsx
import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <>
      {chats.map((chat) => {
        const lastMessage = chat.lastMessage;
        const time = lastMessage
          ? new Date(lastMessage.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "";
        const messageText = lastMessage ? lastMessage.text || "Image" : "No recent message";
        const senderName = lastMessage && lastMessage.senderId === authUser._id ? "You" : chat.fullName;
        const unreadCount = chat.unreadCount || 0;

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
              <div className="flex-1">
                <h4 className="text-slate-200 font-medium truncate">{chat.fullName}</h4>
                <div className="flex items-baseline gap-2">
                  <p className="text-sm text-slate-300 break-words whitespace-pre-line max-w-[180px]">
                    {lastMessage ? `${senderName}: ${messageText}` : messageText}
                  </p>
                </div>
              </div>
                  {lastMessage && <span className="text-xs text-slate-400">{time}</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default ChatsList;