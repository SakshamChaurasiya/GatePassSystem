import { useEffect, useState } from 'react';
import { Bell, Loader2, AlertTriangle, LogOut, LogIn, Info } from 'lucide-react';
import { getNotifications, markNotificationRead } from '../services/passService';
import { formatISTDateTime } from '../utils/dateUtils';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {}
  };

  useEffect(() => { fetchNotifs(); }, []);
  useEffect(() => {
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const unread = notifications.filter(n => !n.isRead).length;

  const handleRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const getIcon = (type) => {
    switch (type) {
      case 'OVERDUE': return <AlertTriangle size={14} color="#ef4444" />;
      case 'LATE_RETURN': return <AlertTriangle size={14} color="#f59e0b" />;
      case 'STUDENT_OUT': return <LogOut size={14} color="#f59e0b" />;
      case 'STUDENT_IN': return <LogIn size={14} color="#22c55e" />;
      default: return <Info size={14} color="#3b82f6" />;
    }
  };

  const fmtTime = formatISTDateTime;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '8px'
      }}>
        <Bell size={20} color="var(--text-secondary)" />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px', width: '18px', height: '18px',
            borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: '10px',
            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '42px', right: 0, width: '340px', maxHeight: '420px',
          overflowY: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', zIndex: 1000
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700 }}>Notifications</h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{unread} unread</span>
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No notifications</p>
          ) : (
            notifications.slice(0, 20).map(n => (
              <div key={n._id} onClick={() => !n.isRead && handleRead(n._id)}
                style={{
                  padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
                  cursor: n.isRead ? 'default' : 'pointer',
                  background: n.isRead ? 'transparent' : 'rgba(59,130,246,0.04)',
                  display: 'flex', gap: '10px', alignItems: 'flex-start'
                }}>
                <div style={{ marginTop: '2px', flexShrink: 0 }}>{getIcon(n.type)}</div>
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.4' }}>{n.message}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{fmtTime(n.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
