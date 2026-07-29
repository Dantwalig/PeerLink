import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const LABELS = {
  BOOKING_CONFIRMED: 'Booking confirmed',
  NEW_BOOKING_REQUEST: 'New booking request',
  SESSION_CONFIRMED: 'Session confirmed',
  SESSION_CANCELLED: 'Session cancelled',
  SESSION_COMPLETED: 'Session completed',
  SESSION_LOCATION_UPDATED: 'Location updated',
  PAYMENT_FAILED: 'Payment failed',
  GROUP_JOIN_REQUEST: 'Group join request',
  GROUP_JOIN_APPROVED: 'Added to group',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api('/notifications/mine').then(setNotifications).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err.message);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Notifications</h1>
        {unreadCount > 0 && <button className="secondary" onClick={markAllRead}>Mark all as read</button>}
      </div>
      <p className="subtitle">{unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}</p>

      {error && <p className="error">{error}</p>}
      {notifications.length === 0 && <p className="muted">No notifications yet.</p>}

      {notifications.map((n) => (
        <div
          className="card"
          key={n.id}
          style={{ borderLeft: n.isRead ? undefined : '3px solid var(--primary)', cursor: n.isRead ? 'default' : 'pointer' }}
          onClick={() => !n.isRead && markRead(n.id)}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="badge">{LABELS[n.type] || n.type}</span>
            {!n.isRead && <span className="muted">tap to mark read</span>}
          </div>
          <p style={{ margin: '6px 0 2px' }}>{n.message}</p>
          <p className="muted">{new Date(n.sentAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
