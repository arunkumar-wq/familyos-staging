import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/formatters';
import api from '../utils/api';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'documents',  label: 'Documents',   icon: 'documents', badgeKey: 'expiring', badgeColor: 'blue' },
      { id: 'portfolio',  label: 'Portfolio',   icon: 'portfolio' },
      { id: 'family',     label: 'Family',      icon: 'family' },
      { id: 'insights',   label: 'AI Insights', icon: 'insights', badgeKey: 'insights', badgeColor: 'amber' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'audit',         label: 'Vault Audit', icon: 'audit' },
      { id: 'calendar',      label: 'Calendar',    icon: 'calendar' },
      { id: 'notifications', label: 'Alerts',      icon: 'bell', badgeKey: 'alerts', badgeColor: 'blue' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ],
  },
];

const PATHS = {
  dashboard: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  documents: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8',
  portfolio: 'M18 20V10m-6 10V4M6 20v-6',
  family: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 2a4 4 0 00-4 4v2h8v-2a4 4 0 00-4-4z',
  insights: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  audit: 'M12 2l9 4v6c0 5.25-3.75 10.15-9 11.5C6.75 22.15 3 17.25 3 12V6l9-4z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  bell: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9m-4.27 13a2 2 0 01-3.46 0',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.07-1.54a7.08 7.08 0 00.07-1 6.76 6.76 0 00-.07-.93l2.02-1.58a.5.5 0 00.12-.63l-1.91-3.31a.5.5 0 00-.61-.22l-2.39.96a7.12 7.12 0 00-1.6-.93l-.36-2.54a.49.49 0 00-.49-.42h-3.82a.49.49 0 00-.49.42l-.36 2.54a7.28 7.28 0 00-1.61.93l-2.38-.96a.5.5 0 00-.61.22l-1.92 3.31a.49.49 0 00.12.63l2.03 1.58a7.32 7.32 0 000 1.86L2.08 15.12a.49.49 0 00-.12.63l1.92 3.31a.5.5 0 00.61.22l2.38-.96c.5.35 1.04.64 1.61.93l.36 2.54c.07.24.28.42.49.42h3.82c.22 0 .42-.18.49-.42l.36-2.54a7.07 7.07 0 001.6-.93l2.39.96a.5.5 0 00.61-.22l1.91-3.31a.49.49 0 00-.12-.63l-2.02-1.54z',
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
};

function SvgIcon({ name, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] || PATHS.home} />
    </svg>
  );
}

export default function Sidebar({ page, navigate, mobile, onClose }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [counts, setCounts] = useState({});
  const show = !collapsed || mobile;

  // Fetch real badge counts
  useEffect(() => {
    Promise.all([
      api.get('/alerts').catch(() => ({ data: [] })),
      api.get('/documents/stats').catch(() => ({ data: {} })),
    ]).then(([alertsRes, docsRes]) => {
      const unreadAlerts = (alertsRes.data || []).filter(a => !a.is_read).length;
      const expiringDocs = (docsRes.data?.byStatus || []).find(s => s.status === 'expiring')?.c || 0;
      setCounts({
        alerts: unreadAlerts,
        expiring: expiringDocs,
        insights: 0, // No real insights endpoint yet
      });
    });
  }, [page]); // Refresh when page changes

  return (
    <aside
      className={`sidebar${mobile ? ' mobile-open' : ''}${collapsed && !mobile ? ' collapsed' : ''}`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <SvgIcon name="home" size={18} />
        </div>
        {show && <span className="sidebar-logo-text">LINIO</span>}
        {!mobile && (
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '\u203A' : '\u2039'}
          </button>
        )}
        {mobile && (
          <button
            className="sidebar-collapse-btn"
            onClick={onClose}
            style={{ marginLeft: 'auto' }}
            title="Close menu"
            aria-label="Close menu"
          >
            &times;
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {show && (
              <div className="sidebar-section-label">{section.label}</div>
            )}
            {section.items.map(item => {
              const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
              return (
                <button
                  key={item.id}
                  className={`nav-item${page === item.id ? ' active' : ''}`}
                  onClick={() => navigate(item.id)}
                  title={item.label}
                  aria-current={page === item.id ? 'page' : undefined}
                  style={collapsed && !mobile ? { justifyContent: 'center', padding: 0 } : {}}
                >
                  <span className="nav-item-icon">
                    <SvgIcon name={item.icon} size={16} />
                  </span>
                  {show && (
                    <>
                      <span className="nav-item-label">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className={`nav-badge nav-badge-${item.badgeColor}`}>
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <button
          className="sidebar-user-btn"
          onClick={() => navigate('profile')}
          aria-label="Edit profile"
        >
          <div
            className="avatar"
            style={{
              width: 32,
              height: 32,
              background: user?.avatar_color || 'var(--blue)',
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {initials(user?.first_name, user?.last_name)}
          </div>
          {show && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar-user-name">
                {user?.first_name} {user?.last_name}
              </div>
              <div className="sidebar-user-sub">
                {user?.role} &middot; Pro
              </div>
            </div>
          )}
          {show && (
            <span style={{ color: 'rgba(255,255,255,.28)', fontSize: 11 }}>
              &rsaquo;
            </span>
          )}
        </button>
        {show && (
          <button
            onClick={logout}
            aria-label="Sign out"
            style={{
              width: '100%',
              marginTop: 4,
              height: 30,
              background: 'rgba(220,38,38,.12)',
              color: 'rgba(252,165,165,.9)',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
