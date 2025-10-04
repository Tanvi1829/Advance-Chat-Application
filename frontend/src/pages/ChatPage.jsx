import { useChatStore } from "../store/useChatStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatPage() {
  const { activeTab, selectedUser, subscribeToMessages, unsubscribeFromMessages } = useChatStore();
    const { socket } = useAuthStore();
  

    useEffect(() => {
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }, [subscribeToMessages, unsubscribeFromMessages, socket]);

  return (
    // <div className="h-screen bg-gray-50 dark:bg-slate-90">
    //   <BorderAnimatedContainer>
    //     {/* LEFT SIDE */}
    //     <div className="w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">
    //       <ProfileHeader />
    //       <ActiveTabSwitch />

    //       <div className="flex-1 overflow-y-auto p-4 space-y-2">
    //         {activeTab === "chats" ? <ChatsList /> : <ContactList />}
    //       </div>
    //     </div>

    //     {/* RIGHT SIDE */}
    //     <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
    //       {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
    //     </div>
    //   </BorderAnimatedContainer>
    // </div>
      <div className="h-screen bg-gray-50 dark:bg-slate-900">
      <div className="container mx-auto h-full p-6">
        <div className="grid grid-cols-[380px_1fr] h-full gap-6">
          {/* SIDEBAR */}
          <aside className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-lg overflow-hidden flex flex-col shadow-lg">
            <ProfileHeader />
            <ActiveTabSwitch />
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeTab === "chats" ? <ChatsList /> : <ContactList />}
            </div>
          </aside>

          {/* MAIN CHAT AREA */}
          <main className="bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700/50 rounded-lg overflow-hidden flex flex-col shadow-lg">
            {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
          </main>
        </div>
      </div>
    </div>
  );
}
export default ChatPage;
