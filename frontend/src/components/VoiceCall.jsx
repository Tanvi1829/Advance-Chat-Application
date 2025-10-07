// components/VoiceCall.jsx
import { useRef, useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { Phone, Mic, MicOff, Volume2, VolumeX, Video, ChevronDown, X, SwitchCamera } from "lucide-react";
import toast from "react-hot-toast";

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
  const isReceiverOnline = onlineUsers.includes(selectedUser?._id.toString());
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [callState, setCallState] = useState("initializing"); // Start with initializing
  const [error, setError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const myAudioRef = useRef(null); // Local audio muted
  const remoteAudioRef = useRef(null); // Remote audio
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const { socket } = useAuthStore();
  const { createCallLog } = useChatStore();
  const callStartTime = useRef(Date.now());

  useEffect(() => {
    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: callType === "video", 
          audio: true 
        });
        setLocalStream(stream);
        // Attach local stream
        if (callType === "voice") {
          if (myAudioRef.current) {
            myAudioRef.current.srcObject = stream;
            myAudioRef.current.muted = true; // Self-mute
          }
        } else {
          if (myVideoRef.current) myVideoRef.current.srcObject = stream;
        }
        stream.getAudioTracks().forEach(track => track.enabled = true);
        callStartTime.current = Date.now();
        setIsInitializing(false);
        console.log("✅ Local stream ready");
      } catch (err) {
        console.error("Media error:", err);
        setError("Allow mic/camera for calls.");
      }
    };
    initStream();

    return () => localStream?.getTracks().forEach(track => track.stop());
  }, [callType]);

  useEffect(() => {
    if (typeof window.SimplePeer === 'undefined' || !localStream || !socket || !selectedUser) {
      setIsInitializing(false);
      return;
    }

    let p;
    try {
      p = new window.SimplePeer({
        initiator: !isIncoming,
        trickle: false,
        stream: localStream,
        config: { 
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:nomane.expert:3478', username: 'nomane', credential: 'nomane' }
          ] 
        }
      });
      console.log("✅ Peer ready");
    } catch (err) {
      setError("Call setup failed.");
      return;
    }

    // Set initial state
    if (!isIncoming && !isReceiverOnline) {
      setCallState("calling");
    } else if (!isIncoming) {
      setCallState("ringing");
      // Emit offer for caller
      p.on("signal", (data) => {
        socket.emit("call-user", { receiverId: receiverId || selectedUser._id, offer: data });
        console.log("📞 Offer sent (caller)");
      });
    } else {
      // Receiver: Signal offer immediately
      p.signal(offer);
      setCallState("connecting");
      p.on("signal", (data) => {
        socket.emit("answer-call", { callerId, answer: data });
        console.log("📞 Answer sent (receiver)");
      });
    }

    p.on("stream", (stream) => {
      setRemoteStream(stream);
      if (callType === "voice") {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
          remoteAudioRef.current.play().catch(e => console.error("Remote audio play error:", e));
        }
      } else {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      }
      stream.getAudioTracks().forEach(track => track.enabled = true);
      setCallState("connected");
      console.log("✅ Connected – audio/video active");
    });

    p.on("icecandidate", (candidate) => {
      if (candidate) {
        socket.emit("ice-candidate", { 
          receiverId: !isIncoming ? (receiverId || selectedUser._id) : callerId, 
          candidate 
        });
      }
    });

    p.on("error", (err) => {
      console.error("Peer error:", err);
      if (err.type !== 'close') setError("Connection issue.");
    });

    p.on("close", endCall);

    setPeer(p);

    // Socket events
    const handleAccepted = ({ answer }) => {
      if (!isIncoming) {
        p.signal(answer);
        setCallState("connecting");
        console.log("📞 Accepted – connecting (caller)");
      }
    };

    const handleRejected = () => {
      setCallState("rejected");
      setTimeout(onEndCall, 1500);
    };

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
  }, [localStream, isIncoming, callerId, receiverId, offer, socket, selectedUser, callType, onEndCall, isReceiverOnline]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => setIsSpeaker(!isSpeaker);

  const endCall = () => {
    setCallState("ended");
    const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
    const status = callState === "connected" ? "completed" : "missed";
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

  const getStatusText = () => {
    switch (callState) {
      case "calling": return "Calling...";
      case "ringing": return "Ringing...";
      case "connecting": return "Connecting...";
      case "connected": return "Connected";
      case "rejected": return "Rejected";
      default: return "Calling...";
    }
  };

  const duration = callState === "connected" ? Math.floor((Date.now() - callStartTime.current) / 1000) : 0;
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-between z-50 px-4 pt-20 pb-20">
      <div className="text-center flex flex-col items-center">
        <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4 shadow-2xl">
          <img src={selectedUser?.profilePic || "/avatar.png"} alt="" className="w-28 h-28 rounded-full" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">{selectedUser?.fullName}</h2>
        <p className="text-green-400 text-lg">{getStatusText()}</p>
        {callState === "connected" && <p className="text-sm text-white mt-2">{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</p>}
      </div>

      {/* Audio/Video */}
      {callType === "voice" && (
        <>
          <audio ref={remoteAudioRef} autoPlay className="hidden" />
          <audio ref={myAudioRef} autoPlay muted className="hidden" />
        </>
      )}
      {callType === "video" && (
        <>
          <video ref={remoteVideoRef} autoPlay className="w-full h-64 bg-gray-900 rounded-2xl mt-8" />
          <video ref={myVideoRef} autoPlay muted className="hidden" />
        </>
      )}

      {/* Controls (Connected Only) */}
      {callState === "connected" && (
        <div className="flex space-x-6 bg-black/50 backdrop-blur-sm p-4 rounded-full w-full max-w-md justify-center">
          {callType === "video" && <button className="p-3 bg-gray-700 rounded-full"><SwitchCamera className="w-6 h-6 text-white" /></button>}
          <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-700'}`}>
            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
          </button>
          <button onClick={toggleSpeaker} className={`p-3 rounded-full ${isSpeaker ? 'bg-green-600' : 'bg-gray-700'}`}>
            {isSpeaker ? <Volume2 className="w-6 h-6 text-white" /> : <VolumeX className="w-6 h-6 text-white" />}
          </button>
          {callType === "voice" && <button className="p-3 bg-gray-700 rounded-full"><Video className="w-6 h-6 text-white" /></button>}
          <button onClick={endCall} className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <X className="w-8 h-8 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

export default VoiceCall;