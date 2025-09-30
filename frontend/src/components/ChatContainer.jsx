import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { useEffect, useRef } from "react";
import { getDateSeparatorLabel } from "../lib/getDateSeparatorLabel";
import { Check, CheckCheck } from "lucide-react";


function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsRead,
    setUnreadCount
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    // subscribeToMessages();

    if (selectedUser) {
      getMessagesByUserId(selectedUser._id);
    }

    // return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark messages as read when user opens the chat
  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      const unreadMessages = messages.filter(
        (msg) =>
          msg.read === false &&
          msg.receiverId?.toString() === authUser._id &&
          msg.senderId?.toString() === selectedUser._id
      );
      console.log("unreadMessages", unreadMessages);
      
      if (unreadMessages.length > 0) {
        // Delay marking as read to allow user to see the badge
        const timer = setTimeout(() => {
          markMessagesAsRead(selectedUser._id);
          // setUnreadCount(selectedUser._id, 0);
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [selectedUser?._id, messages.length, authUser._id, markMessagesAsRead]);

    const renderReadReceipt = (msg) => {
    const isSender = msg.senderId === authUser._id;
    
    // Only show ticks for messages sent by current user
    if (!isSender) return null;

    
  const receiverUserId = msg.receiverId;
  const { isUserOnline } = useAuthStore.getState();
  const isReceiverOnline = isUserOnline(receiverUserId);

    // if (msg.read) {
    //   // Double blue tick - Message read
    //   return (
    //     <div className="flex items-center gap-0.5 ml-1">
    //       <CheckCheck className="w-4 h-4 text-white" />
    //     </div>
    //   );
    // } else {
    //   // Double grey tick - Message delivered but not read
    //   return (
    //     <div className="flex items-center gap-0.5 ml-1">
    //       <CheckCheck className="w-4 h-4 text-slate-400" />
    //     </div>
    //   );
    // }

      if (msg.read) {
    // Blue double tick - Message read
    return (
      <CheckCheck className="w-4 h-4 text-white" />
    );
  } else if (isReceiverOnline) {
    // Grey double tick - Delivered (receiver online but not read)
    return (
      <CheckCheck className="w-4 h-4 text-slate-700" />
    );
  } else {
    // Single grey tick - Sent but not delivered (receiver offline)
    return (
      <Check className="w-4 h-4 text-slate-700" />
    );
  }
  };

  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {(() => {
              let lastDate = null;
              
              // Find unread messages from the other user
              const unreadMessages = messages.filter(
                (msg) =>
                  msg.read === false &&
                  msg.receiverId?.toString() === authUser._id &&
                  msg.senderId?.toString() === selectedUser._id
              );
              
              let firstUnreadIdx = -1;
              let unreadCount = 0;
              
              
              if (unreadMessages.length > 0) {
                const firstUnreadMsgId = unreadMessages[0]._id;
                firstUnreadIdx = messages.findIndex((msg) => msg._id === firstUnreadMsgId);
                unreadCount = unreadMessages.length;
              }
              return messages.map((msg, idx) => {
                const isSender = msg.senderId === authUser._id;
                const senderName = isSender ? "" : selectedUser.fullName;
                const date = new Date(msg.createdAt);
                const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                const msgDate = new Date(msg.createdAt);
                const msgDateOnly = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
                
                let showDateSeparator = false;
                if (!lastDate || msgDateOnly.getTime() !== lastDate.getTime()) {
                  showDateSeparator = true;
                  lastDate = msgDateOnly;
                }

  const showUnreadBadge = unreadCount > 0 && idx === firstUnreadIdx;

                
                return (
                  <div key={msg._id + '-container'}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-2">
                        <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded shadow-sm border border-slate-300 opacity-90" 
                              style={{fontWeight: 500, letterSpacing: '0.5px'}}>
                          {getDateSeparatorLabel(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    {/* {unreadCount > 0 && idx === firstUnreadIdx && ( */}
                    {showUnreadBadge && (
                      <div className="flex justify-center my-3">
                        <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-sm font-semibold opacity-95">
                          {unreadCount} unread message{unreadCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    
                    {/* Show unread badge after date separator */}
                    
                    <div className={`flex flex-col ${isSender ? "items-end" : "items-start"}`}>
                      {/* <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-slate-300">{senderName}</span>
                      </div> */}
                       {!isSender && (
          <span className="text-sm font-medium text-slate-300 mb-1">{senderName}</span>
        )}
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
                        {/* {msg.text && <p>{msg.text}</p>}
                        <span className="text-xs text-slate-400">{time}</span>
                         {isSender && (
                          <span className="inline-flex items-center ml-1 align-bottom">
                            {renderReadReceipt(msg)}
                          </span>
                        )} */}
                         {msg.text && <p className="mb-1">{msg.text}</p>}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs opacity-70">{time}</span>
            {isSender && renderReadReceipt(msg)}
          </div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
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