import React, { useState } from 'react';
import api from '../utils/api';
import { PageHeader } from '../components/UI';

const COLORS = ['#0f1f3d','#07b98a','#f59e0b','#f43f5e','#7c3aed','#3b82f6','#16a34a','#d97706'];

export default function AddMemberPage({ navigate, editMember }) {
  const isEdit = !!editMember;
  const [form, setForm] = useState({ firstName: editMember?.first_name || '', lastName: editMember?.last_name || '', email: editMember?.email || '', phone: editMember?.phone || '', role: editMember?.role || 'member', relation: editMember?.relation || '', dateOfBirth: editMember?.date_of_birth || '', avatarColor: editMember?.avatar_color || '#1a56db' });
  const [perms, setPerms] = useState({ vault: 'own', portfolio: 'none', insights: 'none', family_mgmt: 'none' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const upd = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const updP = k => e => setPerms(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email) { setError('Required: First name, last name, email.'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) await api.put(`/family/members/${editMember.id}`, { ...form, permissions: perms });
      else await api.post('/family/members', { ...form, permissions: perms });
      navigate('family');
    } catch (e) { setError(e.response?.data?.error || 'An error occurred.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-inner" style={{ maxWidth: 760 }}>
      <PageHeader title={isEdit ? 'Edit Member' : 'Add Family Member'} sub={isEdit ? 'Update member details' : 'Invite a new member to FamilyOS'}>
        <button className="btn btn-outline" onClick={() => navigate('family')}>Cancel</button>
        <button className="btn btn-teal" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : isEdit ? '✳ Save Changes' : '📧 Send Invitation'}</button>
      </PageHeader>
      {error && <div style={{ background: 'var(--red-bg)', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Personal Details</div>
        <div className="form-grid-2">
          {[['First Name','firstName','text','Arun'],['Last Name','lastName','text','Kumar'],['Email','email','email','email@example.com'],['Phone','phone','tel','+91'],['Date of Birth','dateOfBirth','date','']].map(([l,k,t,ph])=>(
            <div className="form-group" key={k}><label className="form-label">{l}</label><input type={t} className="form-input" value={form[k]||''} onChange={upd(k)} placeholder={ph} /></div>
          ))}
          <div className="form-group"><label className="form-label">Relation</label><select className="form-select" value={form.relation} onChange={upd('relation')}><option value="">Select...</option>{['self','spouse','son','daughter','father','mother','sibling','advisor','other'].map(r=><option key={r} value={r}>{r}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={form.role} onChange={upd('role')}>{['admin','co-admin','member','advisor','view-only'].map(r=><option key={r} value={r}>{r}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Avatar Color</label><div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>{COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,avatarColor:c}))} style={{width:26,height:26,borderRadius:'50%',background:c,border:form.avatarColor===c?'3px solid var(--teal)':'2px solid transparent',cursor:'pointer'}} />)}</div></div>
        </div>
      </div>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>Permissions</div>
        {[['Document Vault','vault',['full','view','own','none']],['Portfolio','portfolio',['full','view','none']],['AI Insights','insights',['full','view','none']],['Family Mgmt','family_mgmt',['admin','co-admin','none']]].map(([l,k,opts])=>(
          <div key={k} style={{display:'flex',alignItems:'center'justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
            <span style={{fontSize:14,fontWeight:500}}>{l}</span>
            <select className="form-select" value={perms[k]} onChange={updP(k)} style={{width:130,height:32}}>{opts.map(o=<><option key={o} value={o}>{o}</option>)}</select>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:24}}>
        <p style={{fontSize:13,color:'var(--txt2)',marginBottom:16}}>
          {isEdit ? 'Changes take effect immediately.' : 'An email invitation will be sent. Temporary password: familyos123'}
        </p>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-outline" onClick={()=>navigate('family')}>Cancel</button>
          <button className="btn btn-teal" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : isEdit ? '✓ Save Changes' : '📧 Send Invitation'}</button>
        </div>
      </div>
    </div>
  );
}
