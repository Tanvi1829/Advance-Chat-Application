import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
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
              return messages.map((msg, idx) => {
                const isSender = msg.senderId === authUser._id;
                const senderName = isSender ? "You" : selectedUser.fullName;
                const time = formatChatDate(msg.createdAt);
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
                      <div key={msg._id + '-date'} className="flex justify-center my-4">
                        <span className="bg-slate-700 text-slate-200 text-xs px-3 py-1 rounded-full shadow">
                          {getDateSeparatorLabel(msg.createdAt)}
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