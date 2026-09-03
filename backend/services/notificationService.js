const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

/**
 * Create a notification for a user, and optionally send an email.
 * @param {ObjectId} userId - Recipient's user ID
 * @param {string} type - One of the enum values
 * @param {string} title - Short headline
 * @param {string} message - Full message
 * @param {ObjectId} relatedId - Optional related document ID
 * @param {boolean} sendEmail - Whether to also send an email (default true)
 */
exports.createNotification = async ({ userId, type, title, message, relatedId = null, sendEmail = true }) => {
  // 1. Save in-app notification
  const notification = new Notification({
    userId,
    type,
    title,
    message,
    relatedId,
  });
  await notification.save();

  // 2. Send email (if user exists and has an email)
  if (sendEmail) {
    try {
      const user = await User.findById(userId).select('name email');
      if (user && user.email) {
        await sendEmail({
          to: user.email,
          subject: `[ZENO] ${title}`,
          html: `
            <div style="font-family: monospace; max-width: 600px; padding: 20px; border: 2px solid #000;">
              <h2 style="font-weight: 900; text-transform: uppercase;">ZENO Notification</h2>
              <p><strong>${title}</strong></p>
              <p>${message}</p>
              <hr style="border-top: 2px solid #000; margin: 20px 0;" />
              <p style="font-size: 12px; color: #555;">
                You received this because you have a ZENO account. 
                <br>Manage notifications in your profile.
              </p>
            </div>
          `,
          text: `${title}\n\n${message}\n\n---\nZENO Parking System`,
        });
        // Mark emailSent
        notification.emailSent = true;
        await notification.save();
      }
    } catch (emailErr) {
      // Log but don't fail
      console.warn('Email not sent:', emailErr.message);
    }
  }

  return notification;
};

/**
 * Fetch notifications for a user (paginated, newest first)
 */
exports.getUserNotifications = async (userId, { limit = 20, skip = 0, unreadOnly = false } = {}) => {
  const filter = { userId };
  if (unreadOnly) filter.isRead = false;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Notification.countDocuments(filter);

  return { notifications, total };
};

/**
 * Mark a notification as read
 */
exports.markAsRead = async (notificationId, userId) => {
  const result = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  return result;
};

/**
 * Mark all notifications as read for a user
 */
exports.markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result;
};

/**
 * Get unread count
 */
exports.getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};