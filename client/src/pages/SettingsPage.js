import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Badge } from '../components/UI';
import api from '../utils/api';

export default function SettingsPage({ navigate }) {
  const { user, family } = useAuth();
  const [tab, setTab] = useState('profile');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [notifs, setNotifs] = useState({
    docExpiry: true, aiAutoFile: true, portfolio: true, familyAccess: false, weeklyDigest: true,
  });

  const TABS = [['profile','👤 Profile'],['security','🔒 Security'],['notifications','🔔 Notifications'],['integrations','🔗 Integrations'],['billing','💳 Billing']];

  const changePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg('Passwords do not match.'); return; }
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('✅ Password updated successfully.');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      setPwMsg('❌ ' + (e.response?.data?.error || 'Error updating password.'));
    }
  };

  return (
    <div className="page-inner" style={{ maxWidth: 900 }}>
      <PageHeader title="Settings" sub="Account, security, notifications, and integrations" />

      <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 24 }}>
        {/* Tab list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(([id, label]) => (
            <button key={id} className={`settings-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {/* PROFILE */}
          {tab === 'profile' && (
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Personal Info</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div className="avatar" style={{ width: 64, height: 64, background: user?.avatar_color || 'var(--navy)', fontSize: 22 }}>
                    {(user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')}
                  </div>
                  <button className="btn btn-outline btn-sm">Change photo</button>
                </div>
                <div className="form-grid-2">
                  {[['First Name', user?.first_name], ['Last Name', user?.last_name], ['Email', user?.email], ['Phone', user?.phone || '']].map(([l, v]) => (
                    <div key={l} className="form-group">
                      <label className="form-label">{l}</label>
                      <input className="form-input" defaultValue={v || ''} />
                    </div>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={() => navigate('profile')}>Edit Full Profile →</button>
              </div>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Subscription</div>
                <div style={{ background: 'var(--navy)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18 }}>{family?.plan?.toUpperCase() || 'Pro'} Plan</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>₹1,299/month · Renews Apr 1, 2025</div>
                  </div>
                  <Badge color="teal">Active</Badge>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {tab === 'security' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Change Password</div>
              {[['Current Password','currentPassword'],['New Password','newPassword'],['Confirm New Password','confirm']].map(([l,k]) => (
                <div key={k} className="form-group">
                  <label className="form-label">{l}</label>
                  <input type="password" className="form-input" value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))} placeholder="••••••••" />
                </div>
              ))}
              {pwMsg && <div style={{ fontSize: 13, marginBottom: 12, color: pwMsg.startsWith('✅') ? 'var(--teal)' : 'var(--rose)' }}>{pwMsg}</div>}
              <button className="btn btn-primary" onClick={changePassword}>Update Password</button>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 24, paddingTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Two-Factor Authentication</div>
                {[['Authenticator App','Google Auth or Authy','green'],['SMS Backup',user?.phone || '+91 XXXXX XXXXX','amber']].map(([t,s,c]) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>{t}</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{s}</div></div>
                    <Badge color={c}>{c === 'green' ? '✓ Enabled' : 'Set up'}</Badge>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Active Sessions</div>
                {[['Chrome · MacOS','Mumbai, IN · Current session'],['FamilyOS iOS App','Last active 2h ago · Noida, IN']].map(([d,s]) => (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <div><div style={{ fontSize: 14, fontWeight: 500 }}>{d}</div><div style={{ fontSize: 12, color: 'var(--txt3)' }}>{s}</div></div>
                    <button className="btn btn-outline btn-sm">Revoke</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Notification Preferences</div>
              {[
                ['docExpiry','Document Expiry Reminders','90, 30, 14 days before expiry'],
                ['aiAutoFile','AI Auto-filing Confirmations','When AI files a document for you'],
                ['portfolio','Portfolio Alerts','Market moves, rebalancing, milestones'],
                ['familyAccess','Family Access Events','When a member uploads or views docs'],
                ['weeklyDigest','Weekly Digest Email','Sunday morning summary of the week'],
              ].map(([k,t,s]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt2)' }}>{s}</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0, cursor: 'pointer' }}>
                    <input type="checkbox" checked={notifs[k]} onChange={e => setNotifs(n => ({ ...n, [k]: e.target.checked }))} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', inset: 0, background: notifs[k] ? 'var(--teal)' : 'var(--border2)', borderRadius: 24, transition: '.2s' }}>
                      <span style={{ position: 'absolute', width: 18, height: 18, background: '#fff', borderRadius: '50%', top: 3, left: notifs[k] ? 23 : 3, transition: '.2s', boxShadow: '0 1px 4px rgba(0,0,0,.2)' }} />
                    </span>
                  </label>
                </div>
              ))}
              <button className="btn btn-primary" style={{ marginTop: 16 }}>Save Preferences</button>
            </div>
          )}

          {/* INTEGRATIONS */}
          {tab === 'integrations' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Connected Accounts</div>
              {[
                ['🏦','Zerodha','Portfolio sync · Last synced 1h ago','green'],
                ['🏦','SBI NetBanking','FD & savings sync · Active','green'],
                ['📧','Gmail','Auto-detect documents from email','amber'],
                ['☁','Google Drive','Import existing documents','amber'],
                ['📱','DigiLocker','Official govt document import','rose'],
              ].map(([ic,name,sub,status]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: status === 'green' ? 'var(--teal-bg)' : status === 'amber' ? 'var(--amber-bg)' : 'var(--rose-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{ic}</div>
                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div><div style={{ fontSize: 12, color: 'var(--txt2)' }}>{sub}</div></div>
                  </div>
                  {status === 'green' ? <Badge color="green">✓ Connected</Badge> : <button className="btn btn-outline btn-sm">Connect</button>}
                </div>
              ))}
            </div>
          )}

          {/* BILLING */}
          {tab === 'billing' && (
            <div>
              <div className="card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Choose Plan</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ padding: 20, background: 'var(--navy)', borderRadius: 14, color: '#fff' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, marginBottom: 4 }}>Pro Plan</div>
                    <div style={{ fontSize: 30, fontWeight: 600, marginBottom: 10 }}>₹1,299<span style={{ fontSize: 14, fontWeight: 400, opacity: .6 }}>/mo</span></div>
                    {['Unlimited documents','6 family members','AI auto-filing','Portfolio tracking','Priority support'].map(f => (
                      <div key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', marginBottom: 5 }}>✓ {f}</div>
                    ))}
                    <Badge color="teal" style={{ marginTop: 12 }}>Current Plan</Badge>
                  </div>
                  <div style={{ padding: 20, border: '1.5px dashed var(--border2)', borderRadius: 14 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--navy)', marginBottom: 4 }}>Family Plan</div>
                    <div style={{ fontSize: 30, fontWeight: 600, color: 'var(--navy)', marginBottom: 10 }}>₹2,499<span style={{ fontSize: 14, fontWeight: 400, color: 'var(--txt2)' }}>/mo</span></div>
                    {['Everything in Pro','12 family members','Advisor access','Dedicated support','Custom branding'].map(f => (
                      <div key={f} style={{ fontSize: 12, color: 'var(--txt2)', marginBottom: 5 }}>✓ {f}</div>
                    ))}
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>Upgrade →</button>
                  </div>
                </div>
              </div>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Payment Method</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 28, background: 'var(--navy)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>VISA</div>
                    <span style={{ fontSize: 14 }}>Visa ending in 4242 · Expires 12/27</span>
                  </div>
                  <button className="btn btn-outline btn-sm">Update</button>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Recent Invoices</div>
                  {[['Mar 2025','₹1,299','Paid'],['Feb 2025','₹1,299','Paid'],['Jan 2025','₹1,299','Paid']].map(([d,a,s]) => (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13 }}>{d}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{a}</span>
                      <Badge color="green">{s}</Badge>
                      <button className="btn btn-outline btn-sm">📥 PDF</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
