import { ChevronDown, MoreVertical, Phone, PhoneIcon, VideoIcon, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

function ChatHeader() {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);
    const isTyping = typingUsers[selectedUser._id] === true; // NEW: Check if user is typing

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div
      className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700/50 max-h-[84px] px-6 flex-1"
    >
      <div className="flex items-center space-x-3">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-12 rounded-full">
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
          </div>
        </div>

        <div>
          <h3 className="text-gray-900 dark:text-slate-200 font-medium">{selectedUser.fullName}</h3>
          {/* <p className="text-slate-400 text-sm">{isOnline ? "Online" : "Offline"}</p> */}
          {isTyping ? (
           <p className="text-cyan-400 text-sm italic flex items-center gap-1">
              <span>typing</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </span>
            </p>
          ) : (
            <p className="text-gray-600 dark:text-slate-400 text-sm">{isOnline ? "Online" : "Offline"}</p>
          )}

        </div>
      </div>

<div className="flex gap-6">

            <PhoneIcon className="w-5 h-5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors cursor-pointer" />
            <VideoIcon className="w-5 h-5 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors cursor-pointer" />
      {/* <button onClick={() => setSelectedUser(null)}>
        <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
      </button> */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 transition-colors"
          >
            <MoreVertical className="size-5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl">
              <div className="py-1">
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50">
                  Edit Contact
                </button>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50">
                  Archive Chat
                </button>
                <div className="border-t border-gray-200 dark:border-slate-700 my-1"></div>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50">
                  Share Contact
                </button>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50">
                  Add to favorites
                </button>
                <div className="border-t border-gray-200 dark:border-slate-700 my-1"></div>
                <button className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  Delete Chat
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/50"
                >
                  Close Chat
                </button>
              </div>
            </div>
          )}
        </div>
</div>
    </div>
  );
}
export default ChatHeader;
