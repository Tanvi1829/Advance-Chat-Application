import { useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight, Phone, Video } from "lucide-react"; // Assume Lucide icons
import { useChatStore } from "../store/useChatStore";

function CallLogsList() {
  const { callLogs, getCallLogs, isCallLogsLoading } = useChatStore();

  useEffect(() => {
    getCallLogs();
  }, []);

  if (isCallLogsLoading) return <div className="text-center p-4">Loading calls...</div>;

  return (
    <div className="space-y-3">
      {callLogs.map((log) => (
        <div key={log._id} className="flex items-center space-x-3 p-3 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
          <div className="flex-shrink-0">
            {log.type === "incoming" ? (
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
            ) : (
              <ArrowUpRight className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <img
            src={log.contact.profilePic || "/default-avatar.png"}
            alt={log.contact.fullName}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {log.contact.fullName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {log.duration > 0 ? `${Math.floor(log.duration / 60)}m ${log.duration % 60}s` : "Missed call"}
            </p>
          </div>
          <div className="flex space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Phone className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Video className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
      {callLogs.length === 0 && (
        <div className="text-center p-4 text-gray-500">No calls yet</div>
      )}
    </div>
  );
}

export default CallLogsList;