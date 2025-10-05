import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { useEffect, useRef, useState } from "react";
import { getDateSeparatorLabel } from "../lib/getDateSeparatorLabel";
import { Check, CheckCheck, ChevronDown, X } from "lucide-react";
import Peer from "simple-peer";

// Incoming Call Modal Component
function IncomingCallModal({ callerId, callerName, offer, onAccept, onReject }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg text-center max-w-sm w-full mx-4">
        <img
          src="/avatar.png" // Fetch caller profile pic via API if needed
          alt={callerName}
          className="w-24 h-24 rounded-full mx-auto mb-4"
        />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Incoming Voice Call</h2>
        <p className="text-gray-600 dark:text-slate-400 mb-6">{callerName} is calling</p>
        <div className="flex space-x-4 justify-center">
          <button
            onClick={onReject}
            className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            onClick={onAccept}
            className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Voice Call Interface
function VoiceCall({ isIncoming, callerId, receiverId, offer, onEndCall, callType, selectedUser }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { socket } = useAuthStore();
  const { createCallLog } = useChatStore();
  const callStartTime = useRef(Date.now());

  useEffect(() => {
    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: callType === "video", audio: true });
        setLocalStream(stream);
        if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        callStartTime.current = Date.now();
      } catch (err) {
        console.error("Media error:", err);
        setError("Allow microphone to make calls.");
        setIsInitializing(false);
      }
    };
    initStream();

    return () => localStream?.getTracks().forEach(track => track.stop());
  }, [callType]);

  useEffect(() => {
    // Wait for CDN load
    if (typeof window.SimplePeer === 'undefined') {
      setTimeout(() => {
        if (typeof window.SimplePeer === 'undefined') {
          setError("Call library not loaded. Refresh page.");
          onEndCall();
        }
      }, 1000);
      return;
    }

    if (!localStream || !socket || !selectedUser) {
      setIsInitializing(false);
      return;
    }

    let p;
    try {
      p = new window.SimplePeer({
        initiator: !isIncoming,
        trickle: false,
        stream: localStream,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });
      console.log("✅ Peer initialized");
    } catch (err) {
      console.error("Peer error:", err);
      setError("Call setup failed.");
      setIsInitializing(false);
      return;
    }

    p.on("signal", (data) => {
      if (!isIncoming) {
        socket.emit("call-user", { receiverId: receiverId || selectedUser._id, offer: data });
        console.log("📞 Offer sent");
      } else {
        socket.emit("answer-call", { callerId, answer: data });
        console.log("📞 Answer sent");
      }
    });

    p.on("stream", (stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      setIsConnected(true);
      console.log("✅ Connected – stream received");
    });

    p.on("error", (err) => {
      console.error("Peer error:", err);
      setError("Connection failed.");
      onEndCall();
    });

    p.on("close", endCall);

    setPeer(p);
    setIsInitializing(false);

    if (isIncoming && offer) p.signal(offer);

    // Socket listeners
    const handleAccepted = ({ answer }) => !isIncoming && p.signal(answer);
    const handleRejected = () => endCall();
    const handleEnded = () => endCall();
    const handleIce = ({ candidate }) => p.signal(candidate);

    socket.on("call-accepted", handleAccepted);
    socket.on("call-rejected", handleRejected);
    socket.on("call-ended", handleEnded);
    socket.on("ice-candidate", handleIce);

    return () => {
      socket.off("call-accepted", handleAccepted);
      socket.off("call-rejected", handleRejected);
      socket.off("call-ended", handleEnded);
      socket.off("ice-candidate", handleIce);
      p?.destroy();
    };
  }, [localStream, isIncoming, callerId, receiverId, offer, socket, selectedUser, callType, onEndCall]);

  const endCall = () => {
    const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
    const status = isConnected ? "completed" : "missed";
    const logReceiverId = isIncoming ? callerId : (receiverId || selectedUser._id);
    createCallLog({ receiverId: logReceiverId, type: isIncoming ? "incoming" : "outgoing", duration, status });
    onEndCall();
    peer?.destroy();
    localStream?.getTracks().forEach(track => track.stop());
    socket.emit("end-call", { receiverId: logReceiverId });
    console.log("📞 Call ended:", { duration, status });
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 text-white">
        <div className="bg-red-500 p-4 rounded-lg text-center max-w-sm">
          <p className="mb-4">{error}</p>
          <button onClick={onEndCall} className="bg-white text-red-500 px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Starting call...</p>
        </div>
      </div>
    );
  }

  const title = isIncoming ? "Ringing..." : isConnected ? "Connected" : "Calling...";
  const duration = isConnected ? Math.floor((Date.now() - callStartTime.current) / 1000) : 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 text-white">
      <div className="text-center mb-8">
        <img src={selectedUser?.profilePic || "/avatar.png"} alt="" className="w-32 h-32 rounded-full mx-auto mb-4" />
        <h2 className="text-2xl font-semibold">{selectedUser?.fullName}</h2>
        <p className="text-gray-400">{title}</p>
        {isConnected && <p className="text-sm text-green-400 mt-2">{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</p>}
      </div>
      <video ref={myVideoRef} autoPlay muted className="hidden" />
      <video ref={remoteVideoRef} autoPlay className={`w-64 h-64 bg-gray-900 rounded-full mb-8 ${callType === 'video' ? 'block' : 'hidden'}`} />
      <div className="flex space-x-4">
        {callType === "video" && <button className="p-3 bg-gray-600 text-white rounded-full hover:bg-gray-700"><Phone className="w-6 h-6" /></button>}
        <button onClick={endCall} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600">
          <X className="w-8 h-8" />
        </button>
        <button className="p-3 bg-gray-600 text-white rounded-full hover:bg-gray-700"><ChevronDown className="w-6 h-6" /></button>
      </div>
    </div>
  );
}

function ChatContainer() {
  const {
    selectedUser,
    setSelectedUser, 
    typingUsers,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    markMessagesAsRead,
    setUnreadCount,
    chats,
    createCallLog,
  } = useChatStore();
  const { authUser, socket, onlineUsers } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null); // {callerId, callerName, offer}
  const [isCalling, setIsCalling] = useState(false); // Shared outgoing call state
  const [currentCallType, setCurrentCallType] = useState("voice");

  useEffect(() => {
    if (selectedUser) {
      getMessagesByUserId(selectedUser._id);
    }
  }, [selectedUser, getMessagesByUserId, socket]);

  // Socket listeners for incoming calls (global)
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = ({ callerId, callerName, offer }) => {
      console.log("Incoming call received:", callerId, callerName); // Debug
      setIncomingCall({ callerId, callerName, offer });
    };

    const handleCallEnded = () => {
      console.log("Call ended via socket"); // Debug
      setIsCalling(false);
      setIncomingCall(null);
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-ended", handleCallEnded);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-ended", handleCallEnded);
    };
  }, [socket]);

  const handleAcceptCall = () => {
    setIncomingCall(null);
    setIsCalling(true);
    setCurrentCallType("voice");
    console.log("Call accepted"); // Debug
  };

  const handleRejectCall = () => {
    const callerId = incomingCall.callerId;
    setIncomingCall(null);
    socket.emit("reject-call", { callerId });
    // Create missed log
    createCallLog({
      receiverId: callerId,
      type: "incoming",
      duration: 0,
      status: "missed",
    });
    console.log("Call rejected"); // Debug
  };

  const startCall = () => {
    if (!selectedUser || !socket) {
      console.error("No selected user or socket"); // Debug
      return;
    }
    setIsCalling(true);
    setCurrentCallType("voice");
    console.log("Starting outgoing call to:", selectedUser._id); // Debug
  };

  // Existing useEffects for scrolling and read receipts
  useEffect(() => {
    if (messageEndRef.current && !showScrollButton) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showScrollButton]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedUser && messages.length > 0) {
      const unreadMessages = messages.filter(
        (msg) =>
          msg.read === false &&
          msg.receiverId?.toString() === authUser._id &&
          msg.senderId?.toString() === selectedUser._id
      );
      
      if (unreadMessages.length > 0) {
        const timer = setTimeout(() => {
          markMessagesAsRead(selectedUser._id);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedUser?._id, messages.length, authUser._id, markMessagesAsRead]);

  const renderReadReceipt = (msg) => {
    const isSender = msg.senderId === authUser._id;
    if (!isSender) return null;

    const receiverUserId = msg.receiverId;
    const { isUserOnline } = useAuthStore.getState();
    const isReceiverOnline = isUserOnline(receiverUserId);

    if (msg.read) {
      return <CheckCheck className="w-4 h-4 text-white" />;
    } else if (isReceiverOnline) {
      return <CheckCheck className="w-4 h-4 text-slate-700 dark:text-slate-700" />;
    } else {
      return <Check className="w-4 h-4 text-slate-700 dark:text-slate-700" />;
    }
  };

  const isTyping = typingUsers[selectedUser?._id] === true;

  return (
    <>
      {selectedUser && <ChatHeader onStartCall={startCall} isCalling={isCalling} />}
      <div ref={messagesContainerRef} className="flex-1 px-6 overflow-y-auto">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="w-full mx-auto space-y-6">
            {(() => {
              let lastDate = null;
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
                        <span className="bg-gray-200 dark:bg-slate-200 text-gray-700 dark:text-slate-600 text-xs px-2 py-0.5 rounded shadow-sm border border-gray-300 dark:border-slate-300 opacity-90" 
                              style={{fontWeight: 500, letterSpacing: '0.5px'}}>
                          {getDateSeparatorLabel(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    {showUnreadBadge && (
                      <div className="flex justify-center my-3">
                        <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-sm font-semibold opacity-95">
                          {unreadCount} unread message{unreadCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isSender ? "items-end" : "items-start"}`}>
                      {!isSender && (
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{senderName}</span>
                      )}
                      <div
                        className={`chat-bubble mt-1 relative ${
                          isSender
                          ? "bg-cyan-600 text-white"
                          : "bg-gray-200 dark:bg-slate-800 text-gray-900 dark:text-slate-200"
                        } p-3 rounded-lg max-w-xs break-words whitespace-pre-line`}
                      >
                        {msg.image && (
                          <img src={msg.image} alt="Shared" className="rounded-lg h-48 object-cover" />
                        )}
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
            {isTyping && (
              <div className="flex items-start">
                <div className="inline-flex items-center gap-1.5 bg-gray-200 dark:bg-slate-800 rounded-2xl p-4" >
                  <span className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : selectedUser ? (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 dark:text-slate-400">Select a conversation to start chatting</p>
          </div>
        )}

        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-full p-3 shadow-lg hover:bg-gray-100 dark:hover:bg-slate-600 transition-all z-10"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {selectedUser && <MessageInput />}
      
      {/* Call Overlays */}
      {incomingCall && !isCalling && (
        <IncomingCallModal
          callerId={incomingCall.callerId}
          callerName={incomingCall.callerName}
          offer={incomingCall.offer}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      {isCalling && selectedUser && (
        <VoiceCall
          isIncoming={false}
          receiverId={selectedUser._id}
          selectedUser={selectedUser}
          onEndCall={() => setIsCalling(false)}
          callType={currentCallType}
        />
      )}
    </>
  );
}

export default ChatContainer;