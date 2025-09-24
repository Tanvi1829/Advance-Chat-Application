// src/lib/getDateSeparatorLabel.js
// Returns 'Today', 'Yesterday', or date string for date separators in chat

export function getDateSeparatorLabel(dateString) {
  const date = new Date(dateString);
  const now = new Date();

  // Remove time for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = nowOnly - dateOnly;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
}
