// src/lib/formatChatDate.js
// Utility to format chat dates like WhatsApp: time for today, 'Yesterday', or date for older

export function formatChatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();

  // Remove time for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = nowOnly - dateOnly;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays === 0) {
    // Today: show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } else if (diffDays === 1) {
    // Yesterday
    return 'Yesterday';
  } else {
    // Older: show date (MM/DD/YYYY)
    return date.toLocaleDateString();
  }
}
