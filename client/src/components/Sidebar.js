import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/formatters';

const NAV_SECTIONS = [
  { label: 'Overview', items: [
    { id: 'dashboard', icon: 'grid', label: 'Dashboard' },
  ]},
  { label: 'Manage', items: [
    { id: 'documents',  icon: 'folder', label: 'Documents',     badge: 3, badgeColor: 'blue' },
    { id: 'portfolio',  icon: 'chart',  label: 'Portfolio' },
    { id: 'family',     icon: 'family', label: 'Family' },
    { id: 'insights',   icon: 'spark',  label: 'AI Insights',   badge: 5, badgeColor: 'amber' },
  ]},
  { label: 'Tools', items: [
    { id: 'audit',         icon: 'shield', label: 'Vault Audit' },
    { id: 'calendar',      icon: 'cal',    label: 'Calendar' },
    { id: 'notifications', icon: 'bell',   label: 'Alerts',     badge: 2, badgeColor: 'blue' },
  ]},
  { label: 'Account', items: [
    { id: 'settings', icon: 'gear', label: 'Settings' },
  ]},
];

const ICON_MAP = {
  grid: 'M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  family: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  spark: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  shield: 'M12 2l9 4v6c0 5.25-3.75 10.15-9 11.5C6.75 22.15 3 17.25 3 12V6l9-4z',
  cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z',
};

function NavIcon({ name }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_MAP[name] || ''} />
    </svg>
  );
}

export default function Sidebar({ page, navigate, mobile, onClose }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const show = !collapsed || mobile;

  return (
    <aside className={`sidebar${mobile ? ' mobile-open' : ''}${collapsed && !mobile ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        {show && <span className="sidebar-logo-text">FamilyOS</span>}
        {!mobile && (
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(c => !c)} title="Toggle">
            {collapsed ? '>' : '<'}
          </button>
        )}
        {mobile && (
          <button className="sidebar-collapse-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>x</button>
        )}
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
                <span className="nav-item-icon"><NavIcon name={item.icon} /></span>
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

      <div className="sidebar-user">
        <button className="sidebar-user-btn" onClick={() => navigate('profile')}>
          <div className="avatar" style={{ width: 32, height: 32, background: user?.avatar_color || 'var(--blue)', fontSize: 11, flexShrink: 0 }}>
            {initials(user?.first_name, user?.last_name)}
          </div>
          {show && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-user-sub">{user?.role} &middot; Pro</div>
            </div>
          )}
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
