import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/formatters';
import api from '../utils/api';

export default function Topbar({ title, onMenuClick, navigate }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get('/alerts')
      .then(r => {
        const unread = (r.data || []).filter(a => !a.is_read).length;
        setUnreadCount(unread);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="topbar">
      <button
        className="btn btn-icon btn-outline menu-btn"
        onClick={onMenuClick}
        style={{ display: 'flex' }}
        aria-label="Open menu"
      >
        &#9776;
      </button>
      <span className="topbar-title">{title}</span>
      <div className="topbar-actions">
        <button
          className="btn btn-icon btn-outline"
          onClick={() => navigate('notifications')}
          style={{ position: 'relative' }}
          title="Notifications"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          &#128276;
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 7, right: 7,
              width: 7, height: 7,
              background: 'var(--red)', borderRadius: '50%',
              border: '2px solid #fff',
            }} aria-hidden="true" />
          )}
        </button>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.first_name} onClick={() => navigate('profile')} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', border: 'none', background: user?.avatar_color || '#e5e7eb' }} />
        ) : (
          <button className="avatar" onClick={() => navigate('profile')} aria-label="Edit profile" style={{ width: 36, height: 36, background: '#e5e7eb', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
