import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/UI';
import api from '../utils/api';

const TABS = ['Profile','Security','Notifications','Family','Billing'];

export default function SettingsPage({ navigate }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('Profile');
  const [saved, setSaved] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    docExpiry: true,
    aiInsights: true,
    portfolio: true,
    familyActivity: true,
    emailDigest: false,
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const toggleNotif = (key) => {
    setNotifPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const changePassword = async () => {
    setPwMsg(''); setPwError('');
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwError('All fields are required'); return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters'); return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match'); return;
    }
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      setPwError(e.response?.data?.error || 'Failed to change password');
    }
  };

  const NOTIF_ITEMS = [
    ['Document Expiry Alerts','Get notified 90, 30, and 7 days before documents expire','docExpiry'],
    ['AI Insight Alerts','Receive proactive AI recommendations','aiInsights'],
    ['Portfolio Changes','Track significant portfolio movements','portfolio'],
    ['Family Activity','Know when family members upload or edit documents','familyActivity'],
    ['Email Digest','Weekly summary of your LINIO activity','emailDigest'],
  ];

  return (
    <div className="page-inner">
      <PageHeader title="Settings" sub="Manage your account and preferences" />
      <div className="settings-layout">
        {/* Desktop sidebar */}
        <div className="card settings-sidebar" style={{ padding:10, alignSelf:'start' }}>
          <div style={{ padding:'8px 10px 4px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--accent)' }}>Account</div>
          {TABS.map(t => (<button key={t} className={'settings-tab'+(tab===t?' active':'')} onClick={() => setTab(t)}>{t}</button>))}
          <div className="divider" />
          <button className="settings-tab" onClick={logout} style={{ color:'var(--red)' }}>Sign Out</button>
        </div>
        {/* Mobile horizontal tabs */}
        <div className="settings-tabs-mobile">
          {TABS.map(t => (<button key={t} className={'settings-pill'+(tab===t?' active':'')} onClick={() => setTab(t)}>{t}</button>))}
        </div>
        <div className="settings-content">
          {saved&&(<div role="status" style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:'var(--r-md)', padding:'10px 16px', marginBottom:16, color:'var(--green)', fontSize:13 }}>Settings saved successfully.</div>)}
          {tab==='Profile'&&(
            <div className="card" style={{ overflow:'hidden' }}>
              <div className="sec-bar sec-bar-teal">Profile Information</div>
              <div style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:22 }}>
                  <div className="avatar" style={{ width:68, height:68, background:user?.avatar_color||'var(--accent)', fontSize:22 }}>{(user?.first_name?.[0]||'')+(user?.last_name?.[0]||'')}</div>
                  <div>
                    <div style={{ fontSize:17, fontWeight:700 }}>{user?.first_name} {user?.last_name}</div>
                    <div style={{ fontSize:13, color:'var(--txt3)', marginTop:2 }}>{user?.email}</div>
                    <button className="btn btn-outline btn-sm" style={{ marginTop:8 }} onClick={() => navigate('profile')}>Edit Profile</button>
                  </div>
                </div>
                <div className="form-grid-2">
                  {[['First Name',user?.first_name],['Last Name',user?.last_name],['Email',user?.email],['Phone',user?.phone||'--'],['Role',user?.role],['Member Since','2024']].map(([l,v]) => (
                    <div key={l} className="form-group"><label className="form-label">{l}</label><input className="form-input" defaultValue={v||''} readOnly style={{ background:'var(--surface2)', cursor:'not-allowed' }} /></div>
                  ))}
                </div>
                <button className="btn btn-teal" onClick={() => navigate('profile')}>Edit Profile</button>
              </div>
            </div>
          )}
          {tab==='Security'&&(
            <div className="card" style={{ overflow:'hidden' }}>
              <div className="sec-bar sec-bar-navy">Security Settings</div>
              <div style={{ padding:20 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Change Password</div>
                  {pwMsg && <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:8, padding:'10px 14px', marginBottom:12, color:'var(--green)', fontSize:13 }}>{pwMsg}</div>}
                  {pwError && <div role="alert" style={{ background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:8, padding:'10px 14px', marginBottom:12, color:'var(--red)', fontSize:13 }}>{pwError}</div>}
                  <div className="form-grid-2" style={{ marginBottom: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <input type="password" className="form-input" value={pwForm.currentPassword} onChange={e => setPwForm(f=>({...f,currentPassword:e.target.value}))} autoComplete="current-password" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input type="password" className="form-input" value={pwForm.newPassword} onChange={e => setPwForm(f=>({...f,newPassword:e.target.value}))} autoComplete="new-password" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input type="password" className="form-input" value={pwForm.confirmPassword} onChange={e => setPwForm(f=>({...f,confirmPassword:e.target.value}))} autoComplete="new-password" />
                    </div>
                  </div>
                  <button className="btn btn-teal btn-sm" onClick={changePassword}>Update Password</button>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  {[['Two-Factor Auth','Add an extra layer of security','Coming Soon'],['Active Sessions','Manage devices with access','Coming Soon']].map(([t,d,btn]) => (
                    <div key={t} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
                      <div><div style={{ fontSize:14, fontWeight:600 }}>{t}</div><div style={{ fontSize:12, color:'var(--txt3)', marginTop:2 }}>{d}</div></div>
                      <button className="btn btn-outline btn-sm" disabled>{btn}</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab==='Notifications'&&(
            <div className="card" style={{ overflow:'hidden' }}>
              <div className="sec-bar sec-bar-orange">Notification Preferences</div>
              <div style={{ padding:20 }}>
                {NOTIF_ITEMS.map(([t,d,key]) => (
                  <div key={key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                    <div><div style={{ fontSize:14, fontWeight:500 }}>{t}</div><div style={{ fontSize:12, color:'var(--txt3)', marginTop:2 }}>{d}</div></div>
                    <label style={{ position: 'relative', display: 'inline-block', width: 42, height: 22, cursor: 'pointer' }}>
                      <input type="checkbox" checked={notifPrefs[key]} onChange={() => toggleNotif(key)} style={{ opacity: 0, width: 0, height: 0 }} aria-label={t} />
                      <span style={{ position:'absolute', inset:0, background: notifPrefs[key] ? 'var(--accent)' : 'var(--border2)', borderRadius:11, transition:'background .2s' }}>
                        <span style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:3, transition:'left .2s', left: notifPrefs[key] ? 23 : 3 }} />
                      </span>
                    </label>
                  </div>
                ))}
                <button className="btn btn-teal" style={{ marginTop:18 }} onClick={save}>Save Preferences</button>
              </div>
            </div>
          )}
          {tab==='Family'&&(
            <div className="card" style={{ overflow:'hidden' }}>
              <div className="sec-bar sec-bar-blue">Family Settings</div>
              <div style={{ padding:20 }}>
                <div style={{ fontSize:14, color:'var(--txt2)', marginBottom:18 }}>Manage your family members, permissions and shared access.</div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-teal" onClick={() => navigate('family')}>Manage Family</button>
                  <button className="btn btn-outline" onClick={() => navigate('add-member')}>+ Add Member</button>
                </div>
              </div>
            </div>
          )}
          {tab==='Billing'&&(
            <div className="card" style={{ overflow:'hidden' }}>
              <div className="sec-bar sec-bar-teal">Billing and Plan</div>
              <div style={{ padding:20 }}>
                <div style={{ background:'var(--accent-light)', border:'1px solid var(--teal-border)', borderRadius:'var(--r-lg)', padding:18, marginBottom:18 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--accent)', marginBottom:4 }}>LINIO Pro</div>
                  <div style={{ fontSize:13, color:'var(--txt2)', marginBottom:10 }}>Unlimited documents, AI insights, 10 family members</div>
                  <div style={{ fontSize:22, fontWeight:700, color:'var(--txt)' }}>$9.99<span style={{ fontSize:13, fontWeight:400, color:'var(--txt3)' }}>/month</span></div>
                </div>
                <div style={{ fontSize:13, color:'var(--txt3)' }}>Billing is managed through your subscription provider.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
