import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader } from '../components/UI';

export default function NotificationsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/alerts').then(r => setAlerts(r.data)).finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    setAlerts(a => a.map(x => x.id === id ? { ...x, is_read: 1 } : x));
    await api.put(`/alerts/${id}/read`).catch(() => {});
  };

  const dismiss = async (id) => {
    setAlerts(a => a.filter(x => x.id !== id));
    await api.put(`/alerts/${id}/dismiss`).catch(() => {});
  };

  const markAllRead = async () => {
    setAlerts(a => a.map(x => ({ ...x, is_read: 1 })));
    await api.put('/alerts/read-all').catch(() => {});
  };

  const typeColor = t => ({ urgent: 'var(--rose)', warning: 'var(--amber)', success: 'var(--teal)', info: 'var(--blue)' }[t] || 'var(--blue)');
  const typeBorder = t => ({ urgent: 'var(--rose)', warning: 'var(--amber)', success: 'var(--teal)', info: 'var(--blue)' }[t] || 'var(--blue)');
  const typeIcon = t => ({ urgent: '🚨', warning: '⚠️', success: '✅', info: 'ℹ️' }[t] || '🔔');
  const typeBg = t => ({ urgent: 'var(--rose-bg)', warning: 'var(--amber-bg)', success: 'var(--teal-bg)', info: 'var(--blue-bg)' }[t] || 'var(--blue-bg)');

  const unread = alerts.filter(a => !a.is_read).length;

  return (
    <div className="page-inner" style={{ maxWidth: 780 }}>
      <PageHeader title="Notifications" sub={`${unread} unread · ${alerts.length} total`}>
        <button className="btn btn-outline btn-sm" onClick={markAllRead}>Mark all read</button>
      </PageHeader>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['All', alerts.length], ['Urgent', alerts.filter(a => a.type === 'urgent').length], ['Unread', unread]].map(([l, c]) => (
          <button key={l} style={{ height: 30, padding: '0 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1.5px solid var(--border)', background: l === 'All' ? 'var(--navy)' : 'var(--surface)', color: l === 'All' ? '#fff' : 'var(--txt2)', cursor: 'pointer' }}>
            {l} {c > 0 && <span style={{ marginLeft: 4, background: l === 'All' ? 'rgba(255,255,255,.2)' : 'var(--border)', borderRadius: 10, padding: '1px 6px' }}>{c}</span>}
          </button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading…</div>}
      {!loading && alerts.length === 0 && (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt2)' }}>All caught up!</div>
          <div style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 4 }}>No notifications right now</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {alerts.map(n => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            style={{
              background: '#fff',
              borderRadius: 'var(--r)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${typeBorder(n.type)}`,
              padding: '16px 20px',
              display: 'flex',
              gap: 14,
              cursor: 'pointer',
              opacity: n.is_read ? 0.6 : 1,
              boxShadow: n.is_read ? 'none' : 'var(--shadow)',
              transition: 'all .15s',
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: typeBg(n.type), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {n.icon || typeIcon(n.type)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: n.is_read ? 400 : 600, color: 'var(--txt)', marginBottom: 3 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: 'var(--txt2)', lineHeight: 1.5 }}>{n.description}</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 5 }}>
                {n.type.toUpperCase()} · {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(n.type), alignSelf: 'flex-end' }} />}
              <button
                onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)', fontSize: 16, padding: '2px 6px', borderRadius: 4 }}
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
