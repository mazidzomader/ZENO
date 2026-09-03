const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markRead,
  markAllRead,
  getUnread,
} = require('../controllers/notificationController');
const { createNotification } = require('../services/notificationService');

// All routes require authentication
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnread);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);

// POST /api/notifications/admin-broadcast (admin only)
router.post('/admin-broadcast', authorize('admin'), async (req, res) => {
  try {
    const { userIds, title, message } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Provide an array of userIds.' });
    }
    // Send to each user
    const promises = userIds.map((uid) =>
      createNotification({
        userId: uid,
        type: 'admin_message',
        title,
        message,
        sendEmail: true,
      })
    );
    await Promise.all(promises);
    res.json({ message: 'Broadcast sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;