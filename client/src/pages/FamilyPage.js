import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Avatar } from '../components/UI';
import { fmtK } from '../utils/formatters';
export default function FamilyPage({ navigate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/family/members')
      .then(r => setMembers(r.data))
      .catch(() => setError('Failed to load family members'))
      .finally(() => setLoading(false));
  }, []);

  const deleteMember = async (id) => {
    if (!window.confirm('Remove this member? This action can be reversed by an admin.')) return;
    try {
      await api.delete('/family/members/'+id);
      setMembers(m => m.filter(x => x.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  return (
    <div className="page-inner">
      <PageHeader title="Family" sub={members.length+' members in your LINIO'}>
        <button className="btn btn-teal" onClick={() => navigate('add-member')}>+ Add Member</button>
      </PageHeader>
      {error && (
        <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>
      )}
      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--txt3)' }}>Loading members...</div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {members.map(m => (
            <div key={m.id} className="card member-card" onClick={() => navigate('edit-member',m)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') navigate('edit-member',m); }} aria-label={`Edit ${m.first_name} ${m.last_name}`}>
              <Avatar firstName={m.first_name} lastName={m.last_name} color={m.avatar_color||'var(--accent)'} size={60} avatarUrl={m.avatar_url} />
              <div className="member-card-name">{m.first_name} {m.last_name}</div>
              <div className="member-card-sub">{m.relation||m.role}</div>
              <div className="member-card-stats">
                <div className="member-stat"><div className="member-stat-val">{m.doc_count||0}</div><div className="member-stat-lbl">Docs</div></div>
                <div className="member-stat"><div className="member-stat-val" style={{ fontSize:11, textTransform:'capitalize' }}>{m.role}</div><div className="member-stat-lbl">Role</div></div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                <button className="btn btn-outline btn-sm" style={{ flex:1 }} onClick={e=>{ e.stopPropagation(); navigate('edit-member',m); }}>Edit</button>
                <button className="btn btn-outline btn-sm" style={{ color:'var(--red)' }} onClick={e=>{ e.stopPropagation(); deleteMember(m.id); }} aria-label={`Remove ${m.first_name} ${m.last_name}`}>Remove</button>
              </div>
            </div>
          ))}
          <button className="card" onClick={() => navigate('add-member')} style={{ minHeight:190, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer', background:'var(--surface2)', border:'2px dashed var(--border2)', borderRadius:'var(--r-lg)' }} aria-label="Add new family member">
            <span style={{ fontSize:30, color:'var(--txt4)', lineHeight:1 }}>+</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--txt3)' }}>Add Family Member</span>
          </button>
        </div>
      )}
    </div>
  );
}
