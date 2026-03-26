import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/formatters';

const NAV_SECTIONS = [
  { label: 'Overview', items: [
    { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  ]},
  { label: 'Manage', items: [
    { id: 'documents', icon: '🗄', label: 'Documents', badge: 3, badgeColor: 'teal' },
    { id: 'portfolio', icon: '📊', label: 'Portfolio' },
    { id: 'family',    icon: '👨‍👩‍👧‍👦', label: 'Family' },
    { id: 'insights',  icon: '✨', label: 'AI Insights', badge: 5, badgeColor: 'amber' },
  ]},
  { label: 'Tools', items: [
    { id: 'audit',         icon: '🛡',  label: 'Vault Audit' },
    { id: 'calendar',      icon: '📅', label: 'Calendar' },
    { id: 'notifications', icon: '🔔', label: 'Notifications', badge: 2, badgeColor: 'teal' },
  ]},
  { label: 'Account', items: [
    { id: 'settings', icon: '⚙', label: 'Settings' },
  ]},
];

export default function Sidebar({ page, navigate, mobile, onClose }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const show = !collapsed || mobile;

  return (
    <aside className={`sidebar${mobile ? ' mobile-open' : ''}${collapsed && !mobile ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⌂</div>
        {show && <span className="sidebar-logo-text">FamilyOS</span>}
        {!mobile && (
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)} title="Toggle sidebar">
            {collapsed ? '→' : '☰'}
          </button>
        )}
        {mobile && (
          <button className="sidebar-collapse-btn" onClick={onClose} title="Close" style={{ marginLeft: 'auto' }}>✕</button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {show && <div className="sidebar-section-label">{section.label}</div>}
            {section.items.map(item => (
              <button
                key={item.id}
                className={`nav-item${page === item.id ? ' active' : ''}`}
                onClick={() => navigate(item.id)}
                title={item.label}
                style={collapsed && !mobile ? { justifyContent: 'center', paddingLeft: 0 } : {}}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {show && (
                  <>
                    <span className="nav-item-label">{item.label}</span>
                    {item.badge && (
                      <span className={`nav-badge nav-badge-${item.badgeColor}`}>{item.badge}</span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-user">
        <button className="sidebar-user-btn" onClick={() => navigate('profile')}>
          <div
            className="avatar"
            style={{ width: 30, height: 30, background: user?.avatar_color || 'var(--teal)', fontSize: 11 }}
          >
            {initials(user?.first_name, user?.last_name)}
          </div>
          {show && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-user-sub">{user?.role} · Pro</div>
            </div>
          )}
          {show && <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 12 }}>⋯</span>}
        </button>
        {show && (
          <button
            onClick={logout}
            style={{ width: '100%', marginTop: 4, height: 32, background: 'rgba(244,63,94,.1)', color: 'rgba(244,63,94,.8)', border: 'none', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
