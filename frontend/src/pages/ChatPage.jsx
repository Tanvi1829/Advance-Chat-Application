import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import ChatsList from "../components/ChatsList";
import ChatContainer from "../components/ChatContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ContactList from "../components/ContactList";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPage() {
  const { subscribeToMessages, unsubscribeFromMessages, selectedUser, activeTab } = useChatStore();
  const { socket } = useAuthStore();

  useEffect(() => {
    if (socket) {
      subscribeToMessages();
    }
    return () => {
      if (socket) {
        unsubscribeFromMessages();
      }
    };
  }, [subscribeToMessages, unsubscribeFromMessages, socket]);

  return (
    <div className="h-screen w-screen bg-gray-50 dark:bg-slate-900 flex">
      {/* SIDEBAR */}
      <aside className="w-[380px] bg-white dark:bg-slate-800/50 border-r border-gray-200 dark:border-slate-700/50 flex flex-col">
        <ProfileHeader />
        <ActiveTabSwitch />
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeTab === "chats" ? <ChatsList /> : <ContactList />}
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 bg-white dark:bg-slate-800/50 flex flex-col">
        {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
      </main>
    </div>
  );
}

export default ChatPage;