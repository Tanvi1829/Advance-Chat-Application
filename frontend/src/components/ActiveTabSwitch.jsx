import { useChatStore } from "../store/useChatStore";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="tabs tabs-boxed bg-transparent p-2 m-2">
      <button
        onClick={() => setActiveTab("chats")}
        className={`tab ${
          activeTab === "chats" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-600 dark:text-slate-400"
        }`}
      >
        Chats
      </button>

      <button
        onClick={() => setActiveTab("status")}
        className={`tab ${
          activeTab === "status" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-600 dark:text-slate-400"
        }`}
      >
        Status
      </button>

      <button
        onClick={() => setActiveTab("calls")}
        className={`tab ${
          activeTab === "calls" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-600 dark:text-slate-400"
        }`}
      >
        Call Logs
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`tab ${
          activeTab === "contacts" ? "bg-cyan-500/20 text-cyan-400" : "text-gray-600 dark:text-slate-400"
        }`}
      >
        Contacts
      </button>
    </div>
  );
}
export default ActiveTabSwitch;
