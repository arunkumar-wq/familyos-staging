import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/formatters';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z' },
  { id: 'documents', label: 'Documents', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8m8 4H8m2-8H8' },
  { id: 'portfolio', label: 'Net Worth', icon: 'M18 20V10m-6 10V4M6 20v-6' },
  { id: 'family', label: 'Family', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 2a4 4 0 00-4 4v2h8v-2a4 4 0 00-4-4z' },
];

export default function Navbar({ page, navigate }) {
  const { user, family, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  const handleNav = (id) => {
    navigate(id);
    setMobileOpen(false);
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-logo" onClick={() => navigate('dashboard')}>
        <div className="navbar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10"/></svg>
        </div>
        <div>
          <div className="navbar-logo-text">FamilyOS</div>
          <div className="navbar-logo-sub">Wealth Management</div>
        </div>
      </div>

      <div className={`navbar-nav${mobileOpen ? ' mobile-open' : ''}`}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`navbar-link${page === item.id ? ' active' : ''}`}
            onClick={() => handleNav(item.id)}
            aria-current={page === item.id ? 'page' : undefined}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon}/></svg>
            {item.label}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        <div className="navbar-user" onClick={() => setUserMenu(!userMenu)} style={{position:'relative'}}>
          <div className="avatar" style={{ width: 30, height: 30, background: user?.avatar_color || '#1a3a5c', fontSize: 11 }}>
            {initials(user?.first_name, user?.last_name)}
          </div>
          <span className="navbar-user-name">{family?.name || 'Family'}</span>
          <span className="navbar-user-chevron">&#9662;</span>
          {userMenu && (
            <div style={{position:'absolute',top:'100%',right:0,marginTop:6,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',boxShadow:'var(--shadow-lg)',minWidth:180,zIndex:200,overflow:'hidden'}}>
              <button onClick={()=>{setUserMenu(false);navigate('profile');}} style={{display:'block',width:'100%',padding:'10px 16px',border:'none',background:'none',textAlign:'left',fontSize:13,color:'var(--txt2)',cursor:'pointer',fontFamily:'inherit'}}>Edit Profile</button>
              <button onClick={()=>{setUserMenu(false);navigate('settings');}} style={{display:'block',width:'100%',padding:'10px 16px',border:'none',background:'none',textAlign:'left',fontSize:13,color:'var(--txt2)',cursor:'pointer',fontFamily:'inherit'}}>Settings</button>
              <div className="divider" style={{margin:'4px 0'}}/>
              <button onClick={logout} style={{display:'block',width:'100%',padding:'10px 16px',border:'none',background:'none',textAlign:'left',fontSize:13,color:'var(--red)',cursor:'pointer',fontFamily:'inherit'}}>Sign Out</button>
            </div>
          )}
        </div>
        <button className="navbar-mobile-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={mobileOpen ? 'M18 6L6 18M6 6l12 12' : 'M3 12h18M3 6h18M3 18h18'}/></svg>
        </button>
      </div>
    </nav>
  );
}
