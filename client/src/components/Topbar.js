import React from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/formatters';

export default function Topbar({ title, onMenuClick, navigate }) {
  const { user } = useAuth();
  return (
    <div className="topbar">
      <button
        className="btn btn-icon btn-outline menu-btn"
        onClick={onMenuClick}
        style={{ display: 'flex' }}
      >
        ☰
      </button>
      <span className="topbar-title">{title}</span>
      <div className="topbar-actions">
        <button
          className="btn btn-icon btn-outline"
          onClick={() => navigate('notifications')}
          style={{ position: 'relative' }}
        >
          🔔
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 7, height: 7,
            background: 'var(--rose)',
            borderRadius: '50%',
            border: '2px solid #fff',
          }} />
        </button>
        <button
          className="avatar"
          onClick={() => navigate('profile')}
          style={{
            width: 34, height: 34,
            background: user?.avatar_color || 'var(--navy)',
            fontSize: 11, border: 'none', cursor: 'pointer',
          }}
        >
          {initials(user?.first_name, user?.last_name)}
        </button>
      </div>
    </div>
  );
}
