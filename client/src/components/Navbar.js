import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials, fmtDate } from '../utils/formatters';
import api from '../utils/api';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z' },
  { id: 'documents', label: 'Documents', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8' },
  { id: 'portfolio', label: 'Net Worth', icon: 'M18 20V10m-6 10V4M6 20v-6' },
  { id: 'family', label: 'Family', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 2a4 4 0 00-4 4v2h8v-2a4 4 0 00-4-4z' },
];

const MORE_ITEMS = [
  { id: 'calendar', label: 'Calendar', icon: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z' },
  { id: 'insights', label: 'AI Insights', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { id: 'audit', label: 'Vault Audit', icon: 'M12 2l9 4v6c0 5.25-3.75 10.15-9 11.5C6.75 22.15 3 17.25 3 12V6l9-4z' },
];

const SEV_DOT = { critical: '#dc2626', warning: '#d97706', info: '#0a9e9e', success: '#059669' };

export default function Navbar({ page, navigate }) {
  const { user, family, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get('/alerts').then(r => {
      const data = r.data || [];
      setAlerts(data.slice(0, 5));
      setUnreadCount(data.filter(a => !a.is_read).length);
    }).catch(() => {});
  }, [page]);

  const closeAll = () => { setMoreOpen(false); setUserMenu(false); setBellOpen(false); };
  const handleNav = (id) => { navigate(id); setMobileOpen(false); closeAll(); };

  const dismissAlert = async (id) => {
    setAlerts(a => a.filter(x => x.id !== id));
    setUnreadCount(c => Math.max(0, c - 1));
    api.put('/alerts/' + id + '/dismiss').catch(() => {});
  };

  const isMoreActive = MORE_ITEMS.some(m => m.id === page) || page === 'notifications';

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-logo" onClick={() => handleNav('dashboard')}>
        <div className="navbar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10"/></svg>
        </div>
        <div>
          <div className="navbar-logo-text">LINIO</div>
          <div className="navbar-logo-sub">Wealth Management</div>
        </div>
      </div>

      <div className={`navbar-nav${mobileOpen ? ' mobile-open' : ''}`}>
        {NAV_ITEMS.map(item => (
          <button key={item.id} className={`navbar-link${page === item.id ? ' active' : ''}`} onClick={() => handleNav(item.id)} aria-current={page === item.id ? 'page' : undefined}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon}/></svg>
            {item.label}
          </button>
        ))}
        <div className="navbar-more-wrap" style={{position:'relative'}}>
          <button className={`navbar-link${isMoreActive ? ' active' : ''}`} onClick={() => { setMoreOpen(!moreOpen); setUserMenu(false); setBellOpen(false); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>
            More
          </button>
          {moreOpen && (
            <div className="navbar-dropdown">
              {MORE_ITEMS.map(item => (
                <button key={item.id} className={`navbar-dropdown-item${page === item.id ? ' active' : ''}`} onClick={() => handleNav(item.id)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon}/></svg>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="navbar-mobile-extra">
          {MORE_ITEMS.map(item => (
            <button key={item.id} className={`navbar-link${page === item.id ? ' active' : ''}`} onClick={() => handleNav(item.id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon}/></svg>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="navbar-right">
        {/* Bell Icon */}
        <button className="navbar-bell" onClick={e => { e.stopPropagation(); setBellOpen(!bellOpen); setUserMenu(false); setMoreOpen(false); }} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          {unreadCount > 0 && <span className="navbar-bell-dot">{unreadCount}</span>}
        </button>

        {/* User Menu */}
        <div className="navbar-user" onClick={() => { setUserMenu(!userMenu); setMoreOpen(false); setBellOpen(false); }} style={{position:'relative'}}>
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={user.first_name} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', background: user?.avatar_color || '#e5e7eb' }} />
          ) : (
            <div className="avatar" style={{ width: 30, height: 30, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
          )}
          <span className="navbar-user-name">{family?.name || 'Family'}</span>
          <span className="navbar-user-chevron">&#9662;</span>
          {userMenu && (
            <div className="navbar-dropdown" style={{right:0,left:'auto'}}>
              <button className="navbar-dropdown-item" onClick={()=>{closeAll();navigate('profile');}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                Edit Profile
              </button>
              <button className="navbar-dropdown-item" onClick={()=>{closeAll();navigate('settings');}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Settings
              </button>
              <div className="divider" style={{margin:'4px 12px'}}/>
              <button className="navbar-dropdown-item" onClick={logout} style={{color:'var(--red)'}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
        <button className="navbar-mobile-btn" onClick={() => { setMobileOpen(!mobileOpen); closeAll(); }} aria-label="Toggle menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={mobileOpen ? 'M18 6L6 18M6 6l12 12' : 'M3 12h18M3 6h18M3 18h18'}/></svg>
        </button>
      </div>

      {(moreOpen || userMenu || bellOpen) && (
        <div style={{position:'fixed',inset:0,zIndex:150}} onClick={closeAll} />
      )}

      {bellOpen && (
        <div className="navbar-bell-dropdown" onClick={e => e.stopPropagation()}>
          <div style={{padding:'12px 16px 8px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--txt)'}}>Notifications</span>
            <button className="btn btn-xs btn-outline" onClick={() => handleNav('notifications')}>View All</button>
          </div>
          {alerts.length === 0 ? (
            <div style={{padding:'24px 16px',textAlign:'center',color:'var(--txt4)',fontSize:13}}>No new notifications</div>
          ) : alerts.map(a => (
            <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',transition:'background .15s'}} onClick={() => handleNav('notifications')}>
              <div style={{width:8,height:8,borderRadius:'50%',background:SEV_DOT[a.severity]||'#0a9e9e',marginTop:5,flexShrink:0}} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:'var(--txt)',lineHeight:1.3,marginBottom:2}}>{a.title}</div>
                <div style={{fontSize:11,color:'var(--txt4)'}}>{fmtDate(a.created_at)}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); dismissAlert(a.id); }} style={{background:'none',border:'none',color:'var(--txt4)',cursor:'pointer',fontSize:14,padding:'0 2px',flexShrink:0,lineHeight:1}} aria-label="Dismiss">&times;</button>
            </div>
          ))}
          <div style={{padding:'8px 16px'}}>
            <button className="btn btn-sm btn-teal" style={{width:'100%'}} onClick={() => handleNav('notifications')}>See All Alerts</button>
          </div>
        </div>
      )}
    </nav>
  );
}
