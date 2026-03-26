import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/UI';

export default function EditProfilePage({ navigate }) {
  const { user, updateMe } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    date_of_birth: user?.date_of_birth || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      await updateMe(form);
      setMsg('✅ Profile updated successfully.');
    } catch (e) {
      setMsg('❌ Failed to update profile.');
    } finally { setSaving(false); }
  };

  return (
    <div className="page-inner" style={{ maxWidth: 680 }}>
      <PageHeader title="Edit Profile" sub="Update your personal information">
        <button className="btn btn-outline" onClick={() => navigate('settings')}>Cancel</button>
        <button className="btn btn-teal" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </PageHeader>

      {msg && (
        <div style={{ background: msg.startsWith('✅') ? 'var(--teal-bg)' : 'var(--rose-bg)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(7,185,138,.3)' : 'var(--rose)'}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: msg.startsWith('✅') ? 'var(--teal)' : 'var(--rose)' }}>
          {msg}
        </div>
      )}

      {/* Avatar + photo */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Profile Photo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div className="avatar" style={{ width: 80, height: 80, background: user?.avatar_color || 'var(--navy)', fontSize: 26 }}>
            {(user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')}
          </div>
          <div>
            <button className="btn btn-outline btn-sm" style={{ marginBottom: 8 }}>📷 Change Photo</button>
            <p style={{ fontSize: 12, color: 'var(--txt3)' }}>JPG or PNG, max 5 MB</p>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 18 }}>Personal Information</div>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input className="form-input" value={form.first_name} onChange={upd('first_name')} placeholder="First name" />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input className="form-input" value={form.last_name} onChange={upd('last_name')} placeholder="Last name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" value={user?.email || ''} readOnly style={{ background: 'var(--surface2)', cursor: 'not-allowed' }} title="Email cannot be changed" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={form.phone} onChange={upd('phone')} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input type="date" className="form-input" value={form.date_of_birth} onChange={upd('date_of_birth')} />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <input className="form-input" value={user?.role?.toUpperCase() || 'ADMIN'} readOnly style={{ background: 'var(--surface2)', cursor: 'not-allowed' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline" onClick={() => navigate('settings')}>Cancel</button>
          <button className="btn btn-teal" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="card" style={{ padding: 24, borderColor: 'rgba(244,63,94,.2)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--rose)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Danger Zone</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Change Password</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)' }}>Update your account password securely</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('settings')}>Change →</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--rose)' }}>Delete Account</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)' }}>Permanently delete your FamilyOS account and all data</div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Are you sure? This action cannot be undone.') && alert('Contact support to delete your account.')}>Delete</button>
        </div>
      </div>
    </div>
  );
}
