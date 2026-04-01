import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/UI';
export default function EditProfilePage({ navigate }) {
  const { user, updateMe } = useAuth();
  const [form, setForm] = useState({first_name:user?.first_name||'',last_name:user?.last_name||'',phone:user?.phone||'',date_of_birth:user?.date_of_birth||''});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const upd = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const handleSave = async () => {
    setSaving(true); setMsg('');
    try { await updateMe(form); setMsg('Profile updated successfully.'); }
    catch(e) { setMsg('Failed to update profile.'); }
    finally { setSaving(false); }
  };
  const isSuccess = msg&&!msg.startsWith('Failed');
  return (
    <div className="page-inner" style={{maxWidth:680}}>
      <PageHeader title="Edit Profile" sub="Update your personal information">
        <button className="btn btn-outline" onClick={()=>navigate('settings')}>Cancel</button>
        <button className="btn btn-teal" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save Changes'}</button>
      </PageHeader>
      {msg&&(<div style={{background:isSuccess?'var(--green-bg)':'var(--red-bg)',border:'1px solid '+(isSuccess?'var(--green-border)':'var(--red-border)'),borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:isSuccess?'var(--green)':'var(--red)'}}>{msg}</div>)}
      <div className="card" style={{marginBottom:14}}>
        <div className="sec-bar sec-bar-teal">Profile Photo</div>
        <div style={{padding:20}}>
          <div style={{display:'flex',alignItems:'center',gap:18}}>
            <div className="avatar" style={{width:80,height:80,background:user?.avatar_color||'var(--brand)',fontSize:26}}>
              {(user?.first_name?.[0]||'')+(user?.last_name?.[0]||'')}
            </div>
            <button className="btn btn-outline btn-sm">Change Photo</button>
          </div>
        </div>
      </div>
      <div className="card" style={{marginBottom:14}}>
        <div className="sec-bar sec-bar-navy">Personal Information</div>
        <div style={{padding:20}}>
          <div className="form-grid-2">
            {[['First Name','first_name','text'],['Last Name','last_name','text'],['Phone Number','phone','tel'],['Date of Birth','date_of_birth','date']].map(([l,k,t]) => (
              <div className="form-group" key={k}>
                <label className="form-label">{l}</label>
                <input type={t} className="form-input" value={form[k]} onChange={upd(k)}/>
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email||''} readOnly style={{background:'var(--surface2)',cursor:'not-allowed'}}/>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <input className="form-input" value={(user?.role||'').toUpperCase()} readOnly style={{background:'var(--surface2)',cursor:'not-allowed'}}/>
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button className="btn btn-outline" onClick={()=>navigate('settings')}>Cancel</button>
            <button className="btn btn-teal" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save Changes'}</button>
          </div>
        </div>
      </div>
      <div className="card" style={{borderColor:'rgba(220,38,38,.2)'}}>
        <div className="sec-bar" style={{background:'var(--red)'}}>Danger Zone</div>
        <div style={{padding:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderBottom:'1px solid var(--border)'}}>
            <div><div style={{fontSize:14,fontWeight:600}}>Change Password</div><div style={{fontSize:12,color:'var(--txt3)'}}>Update your account password securely</div></div>
            <button className="btn btn-outline btn-sm">Change</button>
          </div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 0'}}>
            <div><div style={{fontSize:14,fontWeight:600,color:'var(--red)'}}>Delete Account</div><div style={{fontSize:12,color:'var(--txt3)'}}>Permanently delete your account and all data</div></div>
            <button className="btn btn-danger btn-sm">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}