import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader } from '../components/UI';
const COLORS = ['#0a9e9e','#057a55','#c27803','#c81e1e','#6c2bd9','#3b82f6','#0694a2','#d97706'];
export default function AddMemberPage({ navigate, editMember }) {
  const isEdit = !!editMember;
  const [form, setForm] = useState({
    firstName: editMember?.first_name||'', lastName: editMember?.last_name||'',
    email: editMember?.email||'', phone: editMember?.phone||'',
    role: editMember?.role||'member', relation: editMember?.relation||'',
    dateOfBirth: editMember?.date_of_birth||'', avatarColor: editMember?.avatar_color||'#0a9e9e',
  });
  const [perms, setPerms] = useState({
    vault: editMember?.vault || 'own',
    portfolio: editMember?.portfolio || 'none',
    insights: editMember?.insights || 'none',
    family_mgmt: editMember?.family_mgmt || 'none',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const updP = k => e => setPerms(p=>({...p,[k]:e.target.value}));

  // Load permissions from editMember if editing
  useEffect(() => {
    if (editMember) {
      setPerms({
        vault: editMember.vault || 'own',
        portfolio: editMember.portfolio || 'none',
        insights: editMember.insights || 'none',
        family_mgmt: editMember.family_mgmt || 'none',
      });
    }
  }, [editMember]);

  const handleSubmit = async () => {
    if (!form.firstName.trim()||!form.lastName.trim()||!form.email.trim()) {
      setError('First name, last name and email are required.');
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSaving(true); setError(''); setSuccessMsg('');
    try {
      const payload = {...form,permissions:perms};
      if (isEdit) {
        await api.put('/family/members/'+editMember.id,payload);
      } else {
        const res = await api.post('/family/members',payload);
        // Show the temp password to the admin
        if (res.data?.tempPassword) {
          setSuccessMsg(`Member added. Temporary password: ${res.data.tempPassword} — share this securely with the new member.`);
          setTimeout(() => navigate('family'), 3000);
          return;
        }
      }
      navigate('family');
    } catch(e) { setError(e.response?.data?.error||'An error occurred.'); } finally { setSaving(false); }
  };
  return (
    <div className="page-inner" style={{maxWidth:760}}>
      <PageHeader title={isEdit?'Edit - '+editMember.first_name+' '+editMember.last_name:'Add Family Member'} sub={isEdit?'Update member details and permissions':'Invite a new member to your FamilyOS'}>
        <button className="btn btn-outline" onClick={()=>navigate('family')}>Cancel</button>
        <button className="btn btn-teal" onClick={handleSubmit} disabled={saving}>{saving?'Saving...':isEdit?'Save Changes':'Send Invitation'}</button>
      </PageHeader>
      {error&&(<div role="alert" style={{background:'var(--red-bg)',border:'1px solid var(--red-border)',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'var(--red)',fontSize:13}}>{error}</div>)}
      {successMsg&&(<div role="status" style={{background:'var(--green-bg)',border:'1px solid var(--green-border)',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'var(--green)',fontSize:13}}>{successMsg}</div>)}
      <div className="card" style={{marginBottom:14}}>
        <div className="sec-bar sec-bar-teal">Personal Details</div>
        <div style={{padding:20}}>
          <div className="form-grid-2">
            {[['First Name','firstName','text','First name'],['Last Name','lastName','text','Last name'],['Email','email','email','email@example.com'],['Phone','phone','tel','Phone number'],['Date of Birth','dateOfBirth','date','']].map(([l,k,t,ph]) => (
              <div className="form-group" key={k}>
                <label className="form-label" htmlFor={'member-'+k}>{l}</label>
                <input id={'member-'+k} type={t} className="form-input" value={form[k]||''} onChange={upd(k)} placeholder={ph} readOnly={isEdit && k === 'email'}  style={isEdit && k === 'email' ? {background:'var(--surface2)',cursor:'not-allowed'} : {}}/>
              </div>
            ))}
            <div className="form-group">
              <label className="form-label" htmlFor="member-relation">Relation</label>
              <select id="member-relation" className="form-select" value={form.relation} onChange={upd('relation')}>
                <option value="">Select...</option>
                {['self','spouse','son','daughter','father','mother','sibling','advisor','other'].map(r=>(<option key={r} value={r} style={{textTransform:'capitalize'}}>{r}</option>))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="member-role">Role</label>
              <select id="member-role" className="form-select" value={form.role} onChange={upd('role')}>
                {['admin','co-admin','member','advisor','view-only'].map(r=>(<option key={r} value={r}>{r}</option>))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Avatar Color</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}} role="radiogroup" aria-label="Avatar color">
                {COLORS.map(c=>(<button key={c} onClick={()=>setForm(f=>({...f,avatarColor:c}))} role="radio" aria-checked={form.avatarColor===c} aria-label={`Color ${c}`} style={{width:26,height:26,borderRadius:'50%',background:c,cursor:'pointer',border:form.avatarColor===c?'3px solid var(--txt)':'2px solid transparent',outline:'none'}}/>))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div className="sec-bar sec-bar-blue">Access Permissions</div>
        <div style={{padding:20}}>
          {[['Document Vault','vault',['full','view','own','none'],'Controls access to the document vault'],['Portfolio','portfolio',['full','view','none'],'Controls access to financial portfolio'],['AI Insights','insights',['full','view','none'],'Controls access to AI insights'],['Family Mgmt','family_mgmt',['admin','co-admin','none'],'Controls ability to manage family members']].map(([l,k,opts,desc]) => (
            <div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <span style={{fontSize:14,fontWeight:500}}>{l}</span>
                <div style={{fontSize:11,color:'var(--txt4)',marginTop:2}}>{desc}</div>
              </div>
              <select className="form-select" value={perms[k]} onChange={updP(k)} style={{width:130,height:34}} aria-label={`${l} permission`}>
                {opts.map(o=>(<option key={o} value={o}>{o}</option>))}
              </select>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:20}}>
        <p style={{fontSize:13,color:'var(--txt2)',marginBottom:16}}>
          {isEdit?'Changes will take effect immediately.':'An email invitation will be sent with a temporary password. The new member should change their password on first login.'}
        </p>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-outline" onClick={()=>navigate('family')}>Cancel</button>
          <button className="btn btn-teal" onClick={handleSubmit} disabled={saving}>{saving?'Saving...':isEdit?'Save Changes':'Send Invitation'}</button>
        </div>
      </div>
    </div>
  );
}
