import { useEffect, useState } from 'react';
import API from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async (unreadOnly = false) => {
    setLoading(true);
    try {
      const res = await API.get('/notifications', { params: { unreadOnly, limit: 50 } });
      setNotifications(res.data.notifications || []);
      const countRes = await API.get('/notifications/unread-count');
      setUnreadCount(countRes.data.unreadCount || 0);
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      alert('Failed to mark as read.');
    }
  };

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      alert('Failed to mark all as read.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, []);

  if (loading) return <p className="p-6">Loading notifications...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center border-b-4 border-ink pb-4 mb-6">
        <h1 className="font-display text-3xl font-bold uppercase">Notifications</h1>
        <div className="flex gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="border-2 border-ink bg-bgBase px-4 py-2 font-mono text-xs uppercase hover:bg-highlight"
            >
              Mark All Read
            </button>
          )}
          <button
            onClick={() => fetchNotifications()}
            className="border-2 border-ink bg-ink text-bgBase px-4 py-2 font-mono text-xs uppercase hover:bg-highlight hover:text-ink"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="border-2 border-alert p-3 text-alert font-mono text-xs">{error}</div>}

      {notifications.length === 0 ? (
        <div className="border-2 border-dashed border-ink p-12 text-center font-mono text-xs text-inkMuted">
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={`border-2 border-ink p-4 flex justify-between items-center ${
                n.isRead ? 'bg-bgBase' : 'bg-highlight/20'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-sm">{n.title}</span>
                  {!n.isRead && (
                    <span className="bg-ink text-bgBase text-[10px] px-2 py-0.5 uppercase">New</span>
                  )}
                </div>
                <p className="font-mono text-xs text-inkMuted mt-1">{n.message}</p>
                <span className="font-mono text-[10px] text-inkMuted">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markAsRead(n._id)}
                  className="border-2 border-ink px-3 py-1 font-mono text-[10px] uppercase hover:bg-ink hover:text-bgBase"
                >
                  Read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}