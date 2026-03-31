import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Badge, Avatar } from '../components/UI';

export default function AuditPage() {
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/family/audit')
      .then(r => setAudit(Array.isArray(r.data) ? r.data : []))
      .catch(err => console.error('Audit fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  const familyScore = audit.length ? Math.round(audit.reduce((s, m) => s + m.score, 0) / audit.length) : 0;
  const scoreColor = s => s >= 80 ? 'var(--teal)' : s >= 60 ? 'var(--amber)' : 'var(--red)';
  const dash = 2 * Math.PI * 52;
  const offset = dash * (1 - familyScore / 100);

  const CATS = ['identity','legal','medical','finance','insurance'];
  const catLabel = { identity: 'Identity', legal: 'Legal', medical: 'Medical', finance: 'Finance', insurance: 'Insurance' };

  const totalDocs = audit.reduce((s, m) => s + m.totalDocs, 0);
  const totalMissing = audit.reduce((s, m) => s + m.missingCategories.length, 0);

  return (
    <div className="page-inner" style={{ maxWidth: 1100 }}>
      <PageHeader title="Vault Audit" sub="AI-powered completeness check for your family's document health">
        <button className="btn btn-outline">📥 Export Report</button>
        <button className="btn btn-teal">✨ Re-run Audit</button>
      </PageHeader>

      {/* Score banner */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div className="audit-ring-wrap">
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="52" fill="none" stroke="rgba(15,31,61,.08)" strokeWidth="10" />
              <circle cx="65" cy="65" r="52" fill="none" stroke={scoreColor(familyScore)} strokeWidth="10"
                strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round"
                transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset .8s ease' }} />
              <text x="65" y="59" textAnchor="middle" fontFamily="Playfair Display,serif" fontSize="28" fill="#0f1f3d">{familyScore}</text>
              <text x="65" y="76" textAnchor="middle" fontFamily="Plus Jakarta Sans,sans-serif" fontSize="11" fill="#8fa3c7">out of 100</text>
            </svg>
            <div className="audit-ring-label" style={{ color: scoreColor(familyScore) }}>
              {familyScore >= 80 ? 'Good Standing' : familyScore >= 60 ? 'Needs Attention' : 'Action Required'}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 style={{ fontSize: 20, color: 'var(--navy)', marginBottom: 7 }}>
              Your family vault is {familyScore}% complete
            </h2>
            <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 18 }}>
              AI reviewed {totalDocs} documents across {audit.length} family members.
              {totalMissing > 0 ? ` Completing ${totalMissing} missing categories will raise your score significantly.` : ' All critical categories are covered — great work!'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                [totalDocs, 'Filed', 'teal'],
                [totalMissing, 'Missing', 'amber'],
                [audit.filter(m => m.score < 60).length, 'At Risk', 'rose'],
                [audit.filter(m => m.score >= 80).length, 'Complete', 'green'],
              ].map(([v, l, c]) => (
                <div key={l} style={{ textAlign: 'center', padding: 12, background: `var(--${c}-bg)`, borderRadius: 10 }}>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: `var(--${c})` }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt2)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per-member table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Member Document Health</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading audit…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  {CATS.map(c => <th key={c}>{catLabel[c]}</th>)}
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {audit.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ width: 28, height: 28, background: 'var(--navy)', fontSize: 10 }}>
                          {(m.first_name?.[0] || '') + (m.last_name?.[0] || '')}
                        </div>
                        <span style={{ fontWeight: 600 }}>{m.first_name} {m.last_name}</span>
                      </div>
                    </td>
                    {CATS.map(c => {
                      const has = (m.categoryBreakdown[c] || 0) > 0;
                      return (
                        <td key={c}>
                          <Badge color={has ? 'green' : 'rose'}>
                            {has ? `✓ ${m.categoryBreakdown[c]}` : '✕ Missing'}
                          </Badge>
                        </td>
                      );
                    })}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-track" style={{ width: 60 }}>
                          <div className="progress-fill" style={{ width: m.score + '%', background: scoreColor(m.score) }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(m.score) }}>{m.score}%</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm">📤 Upload Missing</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Missing categories list */}
      {audit.some(m => m.missingCategories.length > 0) && (
        <div className="card">
          <div style={{ padding: '16px 20px 14px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Action Items</span>
          </div>
          {audit.filter(m => m.missingCategories.length > 0).map(m => (
            m.missingCategories.map(cat => (
              <div key={m.id + cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--rose-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📄</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      Missing: {catLabel[cat]} document for {m.first_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>
                      {cat === 'identity' ? 'Aadhaar / PAN / Passport' :
                       cat === 'legal' ? 'Birth certificate / Will / POA' :
                       cat === 'medical' ? 'Health records / Vaccination' :
                       cat === 'finance' ? 'Bank statement / ITR' :
                       'Insurance policy document'}
                    </div>
                  </div>
                </div>
                <button className="btn btn-teal btn-sm">📤 Upload</button>
              </div>
            ))
          ))}
        </div>
      )}
    </div>
  );
}
