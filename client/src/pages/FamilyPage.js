import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Badge, Avatar } from '../components/UI';

export default function FamilyPage({ navigate }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/family/members')
      .then(r => setMembers(Array.isArray(r.data) ? r.data : []))
      .catch(err => console.error('Family members fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const scoreColor = s => s >= 80 ? 'var(--teal)' : s >= 60 ? 'var(--amber)' : 'var(--rose)';
  const roleColor = r => ({ admin: 'navy', 'co-admin': 'violet', member: 'amber', advisor: 'blue', 'view-only': 'navy' }[r] || 'navy');

  return (
    <div className="page-inner">
      <PageHeader title="Family Management" sub="Roles, permissions, and shared access">
        <button className="btn btn-outline">⚙ Manage Roles</button>
        <button className="btn btn-teal" onClick={() => navigate('add-member')}>+ Add Member</button>
      </PageHeader>

      {/* AI strip */}
      <div className="insight-strip" style={{ marginBottom: 20 }}>
        <div className="insight-strip-icon">✨</div>
        <div className="insight-strip-text">
          <strong>Vault Audit: 3 documents missing for Arjun</strong>
          <p>Sunita's identity docs up to date · Maya profile 92% complete</p>
        </div>
        <div className="insight-strip-actions">
          <button className="strip-btn-teal" onClick={() => navigate('audit')}>View Audit →</button>
        </div>
      </div>

      {/* Member cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18, marginBottom: 24 }}>
        {members.map(m => (
          <div key={m.id} className="card member-card">
            <Avatar firstName={m.first_name} lastName={m.last_name} color={m.avatar_color} size={64} />
            <div className="member-card-name">{m.first_name} {m.last_name}</div>
            <div className="member-card-sub">{m.relation} · {m.role}</div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <Badge color={roleColor(m.role)}>{m.role}</Badge>
              <Badge color="teal">📄 {m.doc_count}</Badge>
            </div>
            <div className="member-card-stats">
              <div className="member-stat">
                <div className="member-stat-val" style={{ color: scoreColor(m.score || 70) }}>{m.score || 70}%</div>
                <div className="member-stat-lbl">Profile</div>
              </div>
              <div className="member-stat">
                <div className="member-stat-val">{m.vault}</div>
                <div className="member-stat-lbl">Vault</div>
              </div>
              <div className="member-stat">
                <div className="member-stat-val">{m.portfolio}</div>
                <div className="member-stat-lbl">Finance</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'center' }}>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('edit-member', m)}>Edit</button>
              <button className="btn btn-outline btn-sm">View Docs</button>
            </div>
          </div>
        ))}

        {/* Invite card */}
        <div
          className="card"
          onClick={() => navigate('add-member')}
          style={{ border: '2px dashed var(--border2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 280, transition: 'all .15s', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = 'var(--teal-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 12 }}>+</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)', marginBottom: 4 }}>Invite a member</div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', textAlign: 'center', maxWidth: 160 }}>Family, advisors, or trusted contacts</div>
        </div>
      </div>

      {/* Permissions table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Access Permissions</span>
          <button className="btn btn-outline btn-sm">Edit Roles</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              {['Member','Document Vault','Portfolio','AI Insights','Family Mgmt','Last Active'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar firstName={m.first_name} lastName={m.last_name} color={m.avatar_color} size={26} />
                      <span style={{ fontWeight: 600 }}>{m.first_name} {m.last_name}</span>
                    </div>
                  </td>
                  <td><Badge color={m.vault==='full'?'teal':m.vault==='view'?'blue':'amber'}>{m.vault}</Badge></td>
                  <td><Badge color={m.portfolio==='full'?'teal':m.portfolio==='view'?'blue':'rose'}>{m.portfolio}</Badge></td>
                  <td><Badge color={m.insights==='full'?'teal':m.insights==='view'?'blue':'rose'}>{m.insights}</Badge></td>
                  <td><Badge color={m.family_mgmt==='admin'?'navy':m.family_mgmt==='co-admin'?'violet':'rose'}>{m.family_mgmt}</Badge></td>
                  <td style={{ fontSize: 12, color: 'var(--txt3)' }}>{m.last_login ? new Date(m.last_login).toLocaleDateString('en-IN') : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
