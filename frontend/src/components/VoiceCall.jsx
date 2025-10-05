// components/VoiceCall.jsx
import { useRef, useEffect, useState } from "react";
import Peer from "simple-peer";
import { useAuthStore } from "../store/useChatStore"; // Wait, useChatStore for createCallLog
import { useSocketStore } from "../store/useSocketStore"; // Assume a socket store, or use from auth

function VoiceCall({ isCaller, receiverId, onEndCall }) {
  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const myVideoRef = useRef();
  const partnerVideoRef = useRef();
  const socket = useAuthStore((state) => state.socket); // From auth store

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(setStream);

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!stream) return;

    const p = new Peer({
      initiator: isCaller,
      trickle: false,
      stream,
    });

    p.on("signal", (data) => {
      if (isCaller) {
        socket.emit("call-user", { receiverId, offer: data });
      } else {
        socket.emit("answer-call", { callerId: receiverId, answer: data });
      }
    });

    p.on("stream", (remoteStream) => {
      partnerVideoRef.current.srcObject = remoteStream;
    });

    setPeer(p);

    // Listen for incoming signals
    const handleIncomingCall = (data) => {
      // Answer logic here
    };

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", ({ answer }) => p.signal(answer));
    socket.on("call-rejected", onEndCall);
    socket.on("call-ended", onEndCall);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      // Cleanup other listeners
      p.destroy();
    };
  }, [stream, isCaller, receiverId, socket, onEndCall]);

  const endCall = () => {
    peer?.destroy();
    socket.emit("end-call", { receiverId });
    // Create log
    useChatStore.getState().createCallLog({ receiverId, duration: 0, status: "completed" }); // Calculate duration properly
    onEndCall();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded-lg text-center">
        <video ref={myVideoRef} autoPlay muted className="hidden" />
        <video ref={partnerVideoRef} autoPlay className="w-64 h-64 bg-gray-200 rounded" />
        <button onClick={endCall} className="mt-4 bg-red-500 text-white p-3 rounded-full">
          End Call
        </button>
      </div>
    </div>
  );
}

export default VoiceCall;