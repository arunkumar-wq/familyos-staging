import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/formatters';

const NAV_SECTIONS = [
  { label: 'Overview', items: [
    { id: 'dashboard', icon: '⊞', label: 'Dashboard' },
  ]},
  { label: 'Manage', items: [
    { id: 'documents', icon: '👴', label: 'Documents', badge: 3, badgeColor: 'blue' },
    { id: 'portfolio', icon: '📊', label: 'Portfolio' },
    { id: 'family',    icon: '👘‍👚', label: 'Family' },
    { id: 'insights',  icon: '✨', label: 'AI Insights', badge: 5, badgeColor: 'amber' },
  ]},
  { label: 'Tools', items: [
    { id: 'audit',         icon: '🛡',  label: 'Vault Audit' },
    { id: 'calendar',      icon: '📅', label: 'Calendar' },
    { id: 'notifications', icon: '🔔', label: 'Alerts', badge: 2, badgeColor: 'blue' },
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
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🡐 
        </div>
        {show && <span className="sidebar-logo-text">FamilyOS</span>}
        {!mobile && (
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)} title="Toggle">
            {collapsed ? '→' : '☰'}
          </button>
        )}
        {mobile && <button className="sidebar-collapse-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
</button>}
      </div>

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
                style={collapsed && !mobile ? { justifyContent: 'center', padding: 0 } : {}}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {show && (
                  <>
                    <span className="nav-item-label">{item.label}</span>
                    {item.badge && <span className={`nav-badge nav-badge-${item.badgeColor}`}>{item.badge}</span>}
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user">
        <button className="sidebar-user-btn" onClick={() => navigate('profile')}>
          <div className="avatar" style={{ width: 32, height: 32, background: user?.avatar_color || 'var(--blue)', fontSize: 11, flexShrink: 0 }}>
            {initials(user?.first_name, user?.last_name)}
          </div>
          {show && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-user-sub">{user?.role} · Pro</div>
            </div>
          )}
          {show && <span style={{ color: 'rgba(255,255,255,.28)', fontSize: 11 }}>⋯�/span>}
        </button>
        {show && (
          <button onClick={logout} style={{ width: '100%', marginTop: 4, height: 30, background: 'rgba(220,38,38,.12)', color: 'rgba(252,165,165,.9)', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
