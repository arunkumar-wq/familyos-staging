import React, { useState } from 'react';
import api from '../utils/api';
import { PageHeader } from '../components/UI';

const COLORS = ['#1a56db','#057a55','#c27803','#c81e1e','#6c2bd9','#3b82f6','#0694a2','#d97706'];

export default function AddMemberPage({ navigate, editMember }) {
  const isEdit = !!editMember;
  const [form, setForm] = useState({
    firstName: editMember?.first_name || '',
    lastName:  editMember?.last_name  || '',
    email:     editMember?.email      || '',
    phone:     editMember?.phone      || '',
    role:      editMember?.role       || 'member',
    relation:  editMember?.relation   || '',
    dateOfBirth:  editMember?.date_of_birth  || '',
    avatarColor:  editMember?.avatar_color   || '#1a56db',
  });
  const [perms, setPerms] = useState({
    vault:       'own',
    portfolio:   'none',
    insights:    'none',
    family_mgmt: 'none',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const upd  = k => e => setForm(f  => ({ ...f,  [k]: e.target.value }));
  const updP = k => e => setPerms(p => ({ ...p,  [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      setError('First name, last name and email are required.');
      return;
    }
    setSaving(true); setError('');
    try {
      const payload = { ...form, permissions: perms };
      if (isEdit) await api.put(`/family/members/${editMember.id}`, payload);
      else        await api.post('/family/members', payload);
      navigate('family');
    } catch (e) {
      setError(e.response?.data?.error || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-inner" style={{ maxWidth: 760 }}>
      <PageHeader
        title={isEdit ? `Edit - ${editMember.first_name} ${editMember.last_name}` : 'Add Family Member'}
        sub={isEdit ? 'Update member details and permissions' : 'Invite a new member to your FamilyOS'}
      >
        <button className="btn btn-outline" onClick={() => navigate('family')}>Cancel</button>
        <button className="btn btn-teal"    onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Send Invitation'}
        </button>
      </PageHeader>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Personal details */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Personal Details</div>
        <div className="form-grid-2">
          {[
            ['First Name', 'firstName', 'text',  'Arun'],
            ['Last Name',  'lastName',  'text',  'Kumar'],
            ['Email',      'email',     'email', 'email@example.com'],
            ['Phone',      'phone',     'tel',   '+91 XXXXX XXXXX'],
            ['Date of Birth', 'dateOfBirth', 'date', ''],
          ].map(([l, k, t, ph]) => (
            <div className="form-group" key={k}>
              <label className="form-label">{l}</label>
              <input type={t} className="form-input" value={form[k] || ''} onChange={upd(k)} placeholder={ph} />
            </div>
          ))}
          <div className="form-group">
            <label className="form-label">Relation</label>
            <select className="form-select" value={form.relation} onChange={upd('relation')}>
              <option value="">Select...</option>
              {['self','spouse','son','daughter','father','mother','sibling','advisor','other'].map(r => (
                <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={upd('role')}>
              {['admin','co-admin','member','advisor','view-only'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Avatar Color</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, avatarColor: c }))}
                  style={{
                    width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: form.avatarColor === c ? '3px solid var(--teal)' : '2px solid transparent',
                    outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Access Permissions</div>
        {[
          ['Document Vault', 'vault',       ['full','view','own','none']],
          ['Portfolio',      'portfolio',   ['full','view','none']],
          ['AI Insights',    'insights',    ['full','view','none']],
          ['Family Mgmt',    'family_mgmt', ['admin','co-admin','none']],
        ].map(([l, k, opts]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{l}</span>
            <select className="form-select" value={perms[k]} onChange={updP(k)} style={{ width: 130, height: 34 }}>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="card" style={{ padding: 24 }}>
        <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16 }}>
          {isEdit
            ? 'Changes will take effect immediately.'
            : 'An email invitation will be sent. Temporary password: familyos123'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => navigate('family')}>Cancel</button>
          <button className="btn btn-teal" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
}
