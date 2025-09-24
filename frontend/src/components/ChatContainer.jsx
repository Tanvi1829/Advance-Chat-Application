import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { useEffect, useRef } from "react";
import { formatChatDate } from "../lib/formatChatDate";
import { getDateSeparatorLabel } from "../lib/getDateSeparatorLabel";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  // Subscribe to global messages when component mounts
  useEffect(() => {
    subscribeToMessages();

    // Clean up on unmount
    return () => unsubscribeFromMessages();
  }, []); // Empty dependency array - run once on mount

  // Get messages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      getMessagesByUserId(selectedUser._id);
    }
  }, [selectedUser, getMessagesByUserId]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {(() => {
              let lastDate = null;
              // Find the index of the first unread message (assuming messages have isRead and recipientId fields)
              let firstUnreadIdx = messages.findIndex(
                (msg) => !msg.isRead && msg.recipientId === authUser._id
              );
              let unreadCount = messages.filter(
                (msg) => !msg.isRead && msg.recipientId === authUser._id
              ).length;
              return messages.map((msg, idx) => {
                const isSender = msg.senderId === authUser._id;
                const senderName = isSender ? "You" : selectedUser.fullName;
                // Always show only the time next to each message
                const date = new Date(msg.createdAt);
                const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const msgDate = new Date(msg.createdAt);
                const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
                let showDateSeparator = false;
                if (!lastDate || msgDateOnly.getTime() !== lastDate.getTime()) {
                  showDateSeparator = true;
                  lastDate = msgDateOnly;
                }
                return (
                  <>
                    {showDateSeparator && (
                      <div key={msg._id + '-date'} className="flex justify-center my-2">
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded shadow-sm border border-slate-300 opacity-90" style={{fontWeight: 500, letterSpacing: '0.5px'}}>
                          {getDateSeparatorLabel(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    {unreadCount > 0 && idx === firstUnreadIdx && (
                      <div key={msg._id + '-unread'} className="flex justify-center my-2">
                        <span className="bg-yellow-200 text-yellow-800 text-xs px-3 py-1 rounded-full shadow-sm border border-yellow-300 font-semibold opacity-95">
                          {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isSender ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-slate-300">{senderName}</span>
                        <span className="text-xs text-slate-400">{time}</span>
                      </div>
                      <div
                        className={`chat-bubble mt-1 relative ${
                          isSender
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-800 text-slate-200"
                        } p-3 rounded-lg max-w-xs break-words whitespace-pre-line`}
                      >
                        {msg.image && (
                          <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                        )}
                        {msg.text && <p>{msg.text}</p>}
                      </div>
                    </div>
                  </>
                );
              });
            })()}
            {/* 👇 scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : selectedUser ? (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {selectedUser && <MessageInput />}
    </>
  );
}

export default ChatContainer;