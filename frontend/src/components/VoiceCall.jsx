// components/VoiceCall.jsx
import { useRef, useEffect, useState } from "react";
import Peer from "simple-peer";
import { useAuthStore, useChatStore } from "../store/useChatStore"; // Wait, useChatStore for createCallLog
import { useSocketStore } from "../store/useSocketStore"; // Assume a socket store, or use from auth

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

export default VoiceCall;