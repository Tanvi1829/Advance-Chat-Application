import { useEffect, useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const typingTimeoutRef = useRef(null); // NEW


  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled,  selectedUser, emitTyping } = useChatStore();


    const handleTyping = (value) => {
    setText(value);
    if (isSoundEnabled) playRandomKeyStrokeSound();

    // Emit typing = true
    if (selectedUser) {
      emitTyping(selectedUser._id, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing = false after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (selectedUser) {
        emitTyping(selectedUser._id, false);
      }
    }, 2000);
  };


    useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (selectedUser) {
        emitTyping(selectedUser._id, false);
      }
    };
  }, [selectedUser, emitTyping]);


  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
    });
    setText("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-slate-700/50">
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-800 dark:bg-slate-800 flex items-center justify-center text-gray-200 dark:text-slate-200 hover:bg-gray-700 dark:hover:bg-slate-700"
              type="button"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex space-x-4">
        <input
          type="text"
          value={text}
          // onChange={(e) => {
          //   setText(e.target.value);
          //   isSoundEnabled && playRandomKeyStrokeSound();
          // }}
          onChange={(e) => handleTyping(e.target.value)}
          className="flex-1 bg-gray-100 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50 text-gray-900 dark:text-slate-200 placeholder-gray-500 dark:placeholder-slate-400 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="Type your message..."
        />

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`bg-gray-100 dark:bg-slate-800/50 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 border border-gray-300 dark:border-slate-700/50 rounded-lg px-4 transition-colors  ${
            imagePreview ? "text-cyan-500" : ""
          }`}
        >
          <ImageIcon className="w-5 h-5" />
        </button>
        <button
          type="submit"
          disabled={!text.trim() && !imagePreview}
          className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg px-4 py-2 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SendIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
export default MessageInput;
