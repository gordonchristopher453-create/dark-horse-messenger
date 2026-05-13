/**
 * Dark Horse Messenger - General Helpers
 */

/**
 * Format file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate random avatar color
 */
const getAvatarColor = (name) => {
  const colors = [
    '#7c3aed', '#2563eb', '#059669',
    '#d97706', '#dc2626', '#7c3aed',
    '#0891b2', '#65a30d'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

/**
 * Truncate text
 */
const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format last seen
 */
const formatLastSeen = (date) => {
  if (!date) return 'Unknown';
  const now = new Date();
  const lastSeen = new Date(date);
  const diff = now - lastSeen;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return lastSeen.toLocaleDateString();
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Paginate results
 */
const paginate = (page = 1, limit = 20) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  return { skip, limit: parseInt(limit) };
};

module.exports = {
  formatFileSize,
  getAvatarColor,
  truncateText,
  formatLastSeen,
  isValidObjectId,
  paginate
};
