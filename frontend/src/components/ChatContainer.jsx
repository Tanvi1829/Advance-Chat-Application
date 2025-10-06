import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { useEffect, useRef, useState } from "react";
import { getDateSeparatorLabel } from "../lib/getDateSeparatorLabel";
import { Check, CheckCheck, ChevronDown, X, Phone, User, Mic, MicOff, Volume2, VolumeX, Video, SwitchCamera  } from "lucide-react";
import Peer from "simple-peer";
import toast from "react-hot-toast";

// Updated: Full Screen Incoming Call Modal (WhatsApp Style – Image 2)
function IncomingCallModal({ callerId, callerName, offer, onAccept, onReject }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-between z-50 px-4 pt-20 pb-20">
      {/* Top: Large Avatar & Name */}
      <div className="text-center flex flex-col items-center">
        <div className="w-40 h-40 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-2xl">
          <img src="/avatar.png" alt={callerName} className="w-32 h-32 rounded-full" /> {/* Dynamic profile pic */}
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">{callerName}</h2>
        <p className="text-green-400 text-xl">Incoming Voice Call</p>
      </div>

      {/* Bottom: Accept/Reject Buttons */}
      <div className="flex space-x-8">
        <button 
          onClick={onReject} 
          className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-all"
        >
          <X className="w-8 h-8 text-white" />
        </button>
        <button 
          onClick={onAccept} 
          className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-all"
        >
          <Phone className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );
}

// Updated: Full Screen Voice Call (Caller Side – Image 1 Style)
// function VoiceCall({ 
//   isIncoming = false, 
//   callerId, 
//   receiverId, 
//   offer, 
//   onEndCall, 
//   callType = "voice",
//   selectedUser 
// }) {
//   const { onlineUsers } = useAuthStore(); // For offline/online status
//   const isReceiverOnline = onlineUsers.includes(selectedUser?._id);
//   const [localStream, setLocalStream] = useState(null);
//   const [remoteStream, setRemoteStream] = useState(null);
//   const [peer, setPeer] = useState(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [error, setError] = useState(null);
//   const [isInitializing, setIsInitializing] = useState(true);
//   const myVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const { socket } = useAuthStore();
//   const { createCallLog } = useChatStore();
//   const callStartTime = useRef(Date.now());

//   useEffect(() => {
//     const initStream = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: callType === "video", audio: true });
//         setLocalStream(stream);
//         if (myVideoRef.current) myVideoRef.current.srcObject = stream;
//         callStartTime.current = Date.now();
//       } catch (err) {
//         console.error("Media error:", err);
//         setError("Allow microphone for calls.");
//         setIsInitializing(false);
//       }
//     };
//     initStream();

//     return () => localStream?.getTracks().forEach(track => track.stop());
//   }, [callType]);

//   useEffect(() => {
//     if (typeof window.SimplePeer === 'undefined') {
//       setTimeout(() => {
//         if (typeof window.SimplePeer === 'undefined') setError("Call library load failed. Refresh.");
//       }, 1000);
//       return;
//     }

//     if (!localStream || !socket || !selectedUser) {
//       setIsInitializing(false);
//       return;
//     }

//     let p;
//     try {
//       p = new window.SimplePeer({
//         initiator: !isIncoming,
//         trickle: false,
//         stream: localStream,
//         config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
//       });
//       console.log("✅ Peer ready");
//     } catch (err) {
//       console.error("Peer init error:", err);
//       setError("Call setup failed.");
//       setIsInitializing(false);
//       return;
//     }

//     p.on("signal", (data) => {
//       if (!isIncoming) {
//         socket.emit("call-user", { receiverId: receiverId || selectedUser._id, offer: data });
//       } else {
//         socket.emit("answer-call", { callerId, answer: data });
//       }
//     });

//     p.on("stream", (stream) => {
//       setRemoteStream(stream);
//       if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
//       setIsConnected(true);
//     });

//     p.on("error", (err) => {
//       console.error("Peer error:", err);
//       setError("Connection lost.");
//       onEndCall();
//     });

//     p.on("close", endCall);

//     setPeer(p);
//     setIsInitializing(false);

//     if (isIncoming && offer) p.signal(offer);

//     const handleAccepted = ({ answer }) => !isIncoming && p.signal(answer);
//     const handleRejected = endCall;
//     const handleEnded = endCall;
//     const handleIce = ({ candidate }) => p.signal(candidate);

//     socket.on("call-accepted", handleAccepted);
//     socket.on("call-rejected", handleRejected);
//     socket.on("call-ended", handleEnded);
//     socket.on("ice-candidate", handleIce);

//     return () => {
//       socket.off("call-accepted", handleAccepted);
//       socket.off("call-rejected", handleRejected);
//       socket.off("call-ended", handleEnded);
//       socket.off("ice-candidate", handleIce);
//       p?.destroy();
//     };
//   }, [localStream, isIncoming, callerId, receiverId, offer, socket, selectedUser, callType, onEndCall]);

//   const endCall = () => {
//     const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
//     const status = isConnected ? "completed" : "missed";
//     createCallLog({ 
//       receiverId: isIncoming ? callerId : (receiverId || selectedUser._id), 
//       type: isIncoming ? "incoming" : "outgoing", 
//       duration, 
//       status 
//     });
//     onEndCall();
//     peer?.destroy();
//     localStream?.getTracks().forEach(track => track.stop());
//     socket.emit("end-call", { receiverId: isIncoming ? callerId : (receiverId || selectedUser._id) });
//   };

//   if (error) {
//     return (
//       <div className="fixed inset-0 bg-black flex items-center justify-center z-50 text-white">
//         <div className="bg-red-500 p-4 rounded-lg text-center max-w-sm">
//           <p className="mb-4">{error}</p>
//           <button onClick={onEndCall} className="bg-white text-red-500 px-4 py-2 rounded">Close</button>
//         </div>
//       </div>
//     );
//   }

//   if (isInitializing) {
//     return (
//       <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
//           <p>Starting call...</p>
//         </div>
//       </div>
//     );
//   }

//   // Status: Offline = "Calling...", Online = "Ringing..." (for caller)
//   const statusText = !isIncoming ? (isReceiverOnline ? "Ringing..." : "Calling...") : "Ringing...";
//   const duration = isConnected ? Math.floor((Date.now() - callStartTime.current) / 1000) : 0;
//   const mins = Math.floor(duration / 60);
//   const secs = duration % 60;

//   return (
//     <div className="fixed inset-0 bg-black flex flex-col items-center justify-between z-50 px-4 pt-20 pb-20">
//       {/* Top: Avatar & Name */}
//       <div className="text-center flex flex-col items-center">
//         <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
//           <User className="w-16 h-16 text-white" /> {/* Or img */}
//         </div>
//         <h2 className="text-2xl font-semibold text-white mb-1">{selectedUser?.fullName}</h2>
//         <p className="text-green-400 text-lg">{statusText}</p>
//         {isConnected && <p className="text-sm text-green-400 mt-2">{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</p>}
//       </div>

//       {/* Video (if video call) */}
//       <video ref={remoteVideoRef} autoPlay className={`w-64 h-64 bg-gray-900 rounded-full ${callType === 'video' ? 'block' : 'hidden'}`} />
//       <video ref={myVideoRef} autoPlay muted className="hidden" />

//       {/* Bottom: End Button */}
//       <div className="flex space-x-6">
//         {callType === "video" && (
//           <button className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700">
//             <Phone className="w-6 h-6 text-white" />
//           </button>
//         )}
//         <button onClick={endCall} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600">
//           <X className="w-8 h-8 text-white" />
//         </button>
//         <button className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700">
//           <ChevronDown className="w-6 h-6 text-white" />
//         </button>
//       </div>
//     </div>
//   );
// }

function VoiceCall({ 
  isIncoming = false, 
  callerId, 
  receiverId, 
  offer, 
  onEndCall, 
  callType = "voice",
  selectedUser 
}) {
  const { onlineUsers } = useAuthStore();
  const isReceiverOnline = onlineUsers.includes(selectedUser?._id);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMuted, setIsMuted] = useState(false); // Mic mute state
  const [isSpeaker, setIsSpeaker] = useState(true); // Speaker on/off
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
        setError("Allow microphone/camera for calls.");
        setIsInitializing(false);
      }
    };
    initStream();

    return () => localStream?.getTracks().forEach(track => track.stop());
  }, [callType]);

  // Mic Mute Toggle
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Speaker Toggle (for mobile – uses Web Audio API if needed)
  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
    // For advanced: Implement Web Audio Context for speaker routing
  };

  useEffect(() => {
    if (typeof window.SimplePeer === 'undefined') {
      setTimeout(() => setError("Call library failed. Refresh."), 1000);
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
    } catch (err) {
      setError("Call connection failed.");
      setIsInitializing(false);
      return;
    }

    p.on("signal", (data) => {
      if (!isIncoming) {
        socket.emit("call-user", { receiverId: receiverId || selectedUser._id, offer: data });
      } else {
        socket.emit("answer-call", { callerId, answer: data });
      }
    });

    p.on("stream", (stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      setIsConnected(true);
    });

    p.on("error", () => {
      setError("Call dropped.");
      onEndCall();
    });

    p.on("close", endCall);

    setPeer(p);
    setIsInitializing(false);

    if (isIncoming && offer) p.signal(offer);

    const handleAccepted = ({ answer }) => !isIncoming && p.signal(answer);
    const handleRejected = endCall;
    const handleEnded = endCall;
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
    createCallLog({ 
      receiverId: isIncoming ? callerId : (receiverId || selectedUser._id), 
      type: isIncoming ? "incoming" : "outgoing", 
      duration, 
      status 
    });
    onEndCall();
    peer?.destroy();
    localStream?.getTracks().forEach(track => track.stop());
    socket.emit("end-call", { receiverId: isIncoming ? callerId : (receiverId || selectedUser._id) });
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 text-white">
        <div className="bg-red-500 p-4 rounded-lg text-center max-w-sm">
          <p className="mb-4">{error}</p>
          <button onClick={onEndCall} className="bg-white text-red-500 px-4 py-2 rounded">Close</button>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 text-white pt-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Connecting...</p>
        </div>
      </div>
    );
  }

  // For receiver after accept: Show connected screen immediately
  const isActiveCall = isConnected || !isIncoming; // Receiver after accept = active
  const statusText = isActiveCall ? "Connected" : (isReceiverOnline ? "Ringing..." : "Calling...");
  const duration = isActiveCall ? Math.floor((Date.now() - callStartTime.current) / 1000) : 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-between z-50 px-4 pt-20 pb-20">
      {/* Top: Avatar & Status */}
      <div className="text-center flex flex-col items-center">
        <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4 shadow-2xl">
          <img src={selectedUser?.profilePic || "/avatar.png"} alt="" className="w-28 h-28 rounded-full" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">{selectedUser?.fullName}</h2>
        <p className="text-green-400 text-lg">{statusText}</p>
        {isActiveCall && <p className="text-sm text-white mt-2">{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</p>}
      </div>

      {/* Remote Video (Full Screen for Video Calls) */}
      {callType === "video" && (
        <video ref={remoteVideoRef} autoPlay className="w-full h-64 bg-gray-900 rounded-2xl mt-8" />
      )}
      <video ref={myVideoRef} autoPlay muted className="hidden" />

      {/* Bottom Controls Bar (WhatsApp Style – Image 2) */}
      {isActiveCall && (
        <div className="flex space-x-6 bg-black/50 backdrop-blur-sm p-4 rounded-full w-full max-w-md justify-center">
          {callType === "video" && (
            <button onClick={() => {}} className="p-3 bg-gray-700 rounded-full">
              <SwitchCamera className="w-6 h-6 text-white" />
            </button>
          )}
          <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-700'}`}>
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
          <button onClick={toggleSpeaker} className={`p-3 rounded-full ${isSpeaker ? 'bg-green-600' : 'bg-gray-700'}`}>
            {isSpeaker ? <Volume2 className="w-6 h-6 text-white" /> : <VolumeX className="w-6 h-6 text-white" />}
          </button>
          {callType === "voice" && (
            <button onClick={() => {}} className="p-3 bg-gray-700 rounded-full">
              <Video className="w-6 h-6 text-white" />
            </button>
          )}
          <button onClick={endCall} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-white" />
          </button>
        </div>
      )}
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

  // const startCall = () => {
  //   if (!selectedUser || !socket) {
  //     console.error("No selected user or socket"); // Debug
  //     return;
  //   }
  //   setIsCalling(true);
  //   setCurrentCallType("voice");
  //   console.log("Starting outgoing call to:", selectedUser._id); // Debug
  // };

  // Existing useEffects for scrolling and read receipts
  //   const startCall = () => {
  //   if (!selectedUser || !socket) {
  //     toast.error("Connection error.");
  //     return;
  //   }
  //   setIsCalling(true);
  //   setCurrentCallType("voice");
  // };

    const startCall = () => {
    if (!selectedUser || !socket) {
      toast.error("Connection lost – refresh.");
      return;
    }
    const isOnline = onlineUsers.includes(selectedUser._id.toString()); // ✅ String match
    if (!isOnline) {
      toast.warning("User offline – sending anyway.");
    }
    setIsCalling(true);
    setCurrentCallType("voice");
    console.log("📞 Starting call to", selectedUser._id, "Online?", isOnline);
  };


    useEffect(() => {
    if (!socket) return;

    const handleIncoming = ({ callerId, callerName, offer }) => {
      console.log("📞 Incoming call in ChatContainer from", callerName, "ID:", callerId);
      setIncomingCall({ callerId: callerId.toString(), callerName, offer }); // ✅ String ID
    };

    const handleEnded = () => {
      console.log("📞 Call ended in ChatContainer");
      setIsCalling(false);
      setIncomingCall(null);
    };

    socket.on("incoming-call", handleIncoming);
    socket.on("call-ended", handleEnded);
    socket.on("call-failed", ({ reason }) => {
      toast.error(reason === 'receiver-offline' ? "User went offline" : "Call failed");
      setIsCalling(false);
    });

    return () => {
      socket.off("incoming-call", handleIncoming);
      socket.off("call-ended", handleEnded);
      socket.off("call-failed");
    };
  }, [socket]);

  const handleAccept = () => {
    console.log("📞 Accepting call from", incomingCall.callerId);
    setIncomingCall(null);
    setIsCalling(true);
    // Peer signaling in VoiceCall will emit answer
  };

  const handleReject = () => {
    console.log("📞 Rejecting call from", incomingCall.callerId);
    socket.emit("reject-call", { callerId: incomingCall.callerId });
    createCallLog({ receiverId: incomingCall.callerId, type: "incoming", duration: 0, status: "declined" });
    setIncomingCall(null);
  };
  
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
      {/* {incomingCall && !isCalling && (
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
      )} */}
{/* 
      {incomingCall && !isCalling && <IncomingCallModal {...incomingCall} onAccept={handleAccept} onReject={handleReject} />}
      {isCalling && selectedUser && <VoiceCall receiverId={selectedUser._id} selectedUser={selectedUser} onEndCall={() => setIsCalling(false)} callType={currentCallType} />} */}

        {incomingCall && !isCalling && (
        <IncomingCallModal
          callerId={incomingCall.callerId}
          callerName={incomingCall.callerName}
          offer={incomingCall.offer}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
      {isCalling && selectedUser && (
        <VoiceCall
          isIncoming={false} // Always false for active call screen
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