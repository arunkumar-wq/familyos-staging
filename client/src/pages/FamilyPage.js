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
              {/* Desktop layout */}
              <div className="member-desktop">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Avatar firstName={m.first_name} lastName={m.last_name} color={m.avatar_color||'var(--accent)'} size={56} avatarUrl={m.avatar_url} />
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button className="member-icon-btn" onClick={() => navigate('edit-member', m)} aria-label="Edit" title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="member-icon-btn member-icon-btn-danger" onClick={() => deleteMember(m.id)} aria-label="Remove" title="Remove">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)' }}>{m.first_name} {m.last_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt3)', textTransform: 'capitalize', marginTop: 2 }}>{m.relation || '—'}</div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--txt3)' }}>Docs</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{m.doc_count || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--txt3)' }}>Role</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)', textTransform: 'capitalize' }}>{m.role}</span>
                  </div>
                </div>
              </div>

              {/* Mobile layout */}
              <div className="member-mobile">
                <Avatar firstName={m.first_name} lastName={m.last_name} color={m.avatar_color||'var(--accent)'} size={42} avatarUrl={m.avatar_url} />
                <div className="member-card-info">
                  <div className="member-card-name">{m.first_name} {m.last_name}</div>
                  <div className="member-card-sub">{m.relation||m.role}</div>
                </div>
                <div className="member-card-meta">
                  <span className="member-doc-count">{m.doc_count||0} <small>docs</small></span>
                  <span className="member-role-badge" style={{ background: m.role === 'admin' ? '#0a9e9e' : m.role === 'co-admin' ? '#3883f6' : m.role === 'view-only' ? '#9ca3af' : '#e5e7eb', color: ['admin','co-admin','view-only'].includes(m.role) ? '#fff' : 'var(--txt2)' }}>{m.role === 'view-only' ? 'Viewer' : m.role}</span>
                </div>
                <div className="member-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="member-icon-btn" onClick={() => navigate('edit-member', m)} aria-label="Edit" title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="member-icon-btn member-icon-btn-danger" onClick={() => deleteMember(m.id)} aria-label="Remove" title="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
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
