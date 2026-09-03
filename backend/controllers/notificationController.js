const { createNotification, getUserNotifications, markAsRead, markAllAsRead, getUnreadCount } = require('../services/notificationService');

// ── GET /api/notifications ────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0, unreadOnly = false } = req.query;
    const result = await getUserNotifications(userId, {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      unreadOnly: unreadOnly === 'true',
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/notifications/:id/read ──────────────────────────────────────
exports.markRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or already read.' });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/notifications/read-all ──────────────────────────────────────
exports.markAllRead = async (req, res) => {
  try {
    const result = await markAllAsRead(req.user._id);
    res.json({ message: `Marked ${result.modifiedCount} notifications as read.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/notifications/unread-count ──────────────────────────────────
exports.getUnread = async (req, res) => {
  try {
    const count = await getUnreadCount(req.user._id);
    res.json({ unreadCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};