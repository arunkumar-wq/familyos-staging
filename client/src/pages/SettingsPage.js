import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/UI';
const TABS = ['Profile','Security','Notifications','Family','Billing'];
export default function SettingsPage({ navigate }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('Profile');
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  return (
    <div className="page-inner">
      <PageHeader title="Settings" sub="Manage your account and preferences" />
      <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20 }}>
        <div className="card" style={{ padding:10, alignSelf:'start' }}>
          <div style={{ padding:'8px 10px 4px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--brand)' }}>Account</div>
          {TABS.map(t => (<button key={t} className={'settings-tab'+(tab===t?' active':'')} onClick={() => setTab(t)}>{t}</button>))}
          <div className="divider" />
          <button className="settings-tab" onClick={logout} style={{ color:'var(--red)' }}>Sign Out</button>
        </div>
        <div>
          {saved&&(<div style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:'var(--r-md)', padding:'10px 16px', marginBottom:16, color:'var(--green)', fontSize:13 }}>Settings saved successfully.</div>)}
          {tab==='Profile'&&(
            <div className="card" style={{ overflow:'hidden' }}>
              <div className="sec-bar sec-bar-teal">Profile Information</div>
              <div style={{ padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:22 }}>
                  <div className="avatar" style={{ width:68, height:68, background:user?.avatar_color||'var(--brand)', fontSize:22 }}>{(user?.first_name?.[0]||'')+(user?.last_name?.[0]||'')}</div>
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
                {[['Password','Change your account password','Change Password'],['Two-Factor Auth','Add an extra layer of security','Enable 2FA'],['Active Sessions','Manage devices with access','View Sessions']].map(([t,d,btn]) => (
                  <div key={t} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
                    <div><div style={{ fontSize:14, fontWeight:600 }}>{t}</div><div style={{ fontSize:12, color:'var(--txt3)', marginTop:2 }}>{d}</div></div>
                    <button className="btn btn-outline btn-sm">{btn}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tab==='Notifications'&&(
            <div className="card" style={{ overflow:'hidden' }}>
              <div className="sec-bar sec-bar-orange">Notification Preferences</div>
              <div style={{ padding:20 }}>
                {[['Document Expiry Alerts','Get notified 90, 30, and 7 days before documents expire'],['AI Insight Alerts','Receive proactive AI recommendations'],['Portfolio Changes','Track significant portfolio movements'],['Family Activity','Know when family members upload or edit documents'],['Email Digest','Weekly summary of your FamilyOS activity']].map(([t,d]) => (
                  <div key={t} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                    <div><div style={{ fontSize:14, fontWeight:500 }}>{t}</div><div style={{ fontSize:12, color:'var(--txt3)', marginTop:2 }}>{d}</div></div>
                    <div style={{ width:42, height:22, background:'var(--brand)', borderRadius:11, position:'relative', cursor:'pointer' }}><div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:3, right:3 }} /></div>
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
                <div style={{ background:'var(--brand-light)', border:'1px solid var(--teal-border)', borderRadius:'var(--r-lg)', padding:18, marginBottom:18 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'var(--brand)', marginBottom:4 }}>FamilyOS Pro</div>
                  <div style={{ fontSize:13, color:'var(--txt2)', marginBottom:10 }}>Unlimited documents, AI insights, 10 family members</div>
                  <div style={{ fontSize:22, fontWeight:700, color:'var(--txt)' }}>Rs.999<span style={{ fontSize:13, fontWeight:400, color:'var(--txt3)' }}>/month</span></div>
                </div>
                <div style={{ fontSize:13, color:'var(--txt3)' }}>Next billing date: May 1, 2026</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}