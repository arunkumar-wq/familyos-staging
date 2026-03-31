import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Badge } from '../components/UI';
import { fmtDate } from '../utils/formatters';

export default function NotificationsPage() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    api.get('/alerts').then(r => setAlerts(r.data)).finally(() => setLoading(false));
  }, []);

  const dismiss = async (id) => {
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_read: true } : x));
    await api.put(`/alerts/${id}/dismiss`).catch(() => {});
  };

  const dismissAll = async () => {
    const unread = alerts.filter(a => !a.is_read);
    setAlerts(a => a.map(x => ({ ...x, is_read: true })));
    await Promise.all(unread.map(u => api.put(`/alerts/${u.id}/dismiss`).catch(() => {})));
  };

  const sevColor = s => ({ critical: 'red', warning: 'amber', info: 'blue', success: 'green' }[s] || 'gray');
  const sevDotColor = s => ({ critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)', success: 'var(--green)' }[s] || 'var(--txt4)');

  const filtered = alerts.filter(a => {
    if (filter === 'unread')  return !a.is_read;
    if (filter === 'urgent')  return a.severity === 'critical';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div className="page-inner" style={{ maxWidth: 800 }}>
      <PageHeader title="Alerts &amp; Notifications" sub={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}>
        <button className="btn btn-outline" onClick={dismissAll}>Mark all read</button>
      </PageHeader>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['all', 'unread', 'urgent'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              height: 32, padding: '0 16px', borderRadius: 20,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${filter === f ? 'var(--blue)' : 'var(--border)'}`,
              background: filter === f ? 'var(--blue)' : 'var(--surface)',
              color: filter === f ? '#fff' : 'var(--txt2)',
              textTransform: 'capitalize',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>All clear!</div>
        ) : (
          filtered.map(a => (
            <div
              key={a.id}
              className={`alert-item${a.is_read ? ' read' : ''}`}
              onClick={() => !a.is_read && dismiss(a.id)}
            >
              <div className="alert-dot" style={{ background: sevDotColor(a.severity) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)' }}>{a.title}</span>
                  {!a.is_read && <Badge color={sevColor(a.severity)}>{a.severity}</Badge>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 4 }}>{a.message}</div>
                <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{fmtDate(a.created_at)}</div>
              </div>
              {!a.is_read && (
                <button
                  onClick={e => { e.stopPropagation(); dismiss(a.id); }}
                  style={{ background: 'none', border: 'none', color: 'var(--txt4)', cursor: 'pointer', padding: '0 4px', fontSize: 14 }}
                >
                  &#x2715;
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
