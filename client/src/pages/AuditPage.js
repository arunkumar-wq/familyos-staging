import React, { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { PageHeader, Badge } from '../components/UI';
export default function AuditPage({ navigate }) {
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rerunning, setRerunning] = useState(false);

  useEffect(() => {
    api.get('/family/audit')
      .then(r => setAudit(Array.isArray(r.data)?r.data:[]))
      .catch(e => setError('Failed to load audit data'))
      .finally(() => setLoading(false));
  }, []);

  const rerunAudit = () => {
    setRerunning(true); setError('');
    api.get('/family/audit')
      .then(r => setAudit(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Audit failed'))
      .finally(() => setRerunning(false));
  };

  const exportAudit = () => {
    const rows = [['Member','Identity','Legal','Medical','Finance','Insurance','Score']];
    audit.forEach(m => {
      rows.push([m.first_name + ' ' + m.last_name, ...['identity','legal','medical','finance','insurance'].map(c => m.categoryBreakdown[c] || 0), m.score + '%']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vault-audit.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const familyScore = audit.length ? Math.round(audit.reduce((s,m)=>s+m.score,0)/audit.length) : 0;
  const scoreColor = s => s>=80?'var(--green)':s>=60?'var(--amber)':'var(--red)';
  const dash = 2*Math.PI*52;
  const offset = dash*(1-familyScore/100);
  const CATS = ['identity','legal','medical','finance','insurance'];
  const CAT_LABELS = {identity:'Identity',legal:'Legal',medical:'Medical',finance:'Finance',insurance:'Insurance'};
  const totalDocs = audit.reduce((s,m)=>s+m.totalDocs,0);
  const totalMissing = audit.reduce((s,m)=>s+m.missingCategories.length,0);
  const scoreLabel = familyScore>=80?'Good Standing':familyScore>=60?'Needs Attention':'Action Required';
  return (
    <div className="page-inner">
      <PageHeader title="Vault Audit" sub="AI-powered document vault health check">
        <button className="btn btn-outline" onClick={exportAudit}>Export CSV</button>
        <button className="btn btn-teal" onClick={rerunAudit} disabled={rerunning}>{rerunning ? 'Running...' : 'Re-run Audit'}</button>
      </PageHeader>
      {error && (
        <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>
      )}
      <div className="card" style={{marginBottom:14}}>
        <div className="sec-bar sec-bar-teal">Family Vault Score</div>
        <div style={{padding:24}}>
          <div className="audit-ring-wrap">
            <div style={{textAlign:'center',flexShrink:0}}>
              <svg width="130" height="130" viewBox="0 0 130 130" role="img" aria-label={`Vault score: ${familyScore} out of 100`}>
                <circle cx="65" cy="65" r="52" fill="none" stroke="var(--border)" strokeWidth="10"/>
                <circle cx="65" cy="65" r="52" fill="none" stroke={scoreColor(familyScore)} strokeWidth="10" strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:'stroke-dashoffset .8s'}}/>
                <text x="65" y="62" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="28" fill="var(--txt)">{familyScore}</text>
                <text x="65" y="78" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="11" fill="var(--txt3)">out of 100</text>
              </svg>
              <div style={{fontSize:13,fontWeight:700,marginTop:6,color:scoreColor(familyScore)}}>{scoreLabel}</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{fontSize:20,marginBottom:8}}>Vault is {familyScore}% complete</h2>
              <p style={{fontSize:13,color:'var(--txt2)',marginBottom:16}}>
                {totalDocs} documents across {audit.length} members.{totalMissing>0?' '+totalMissing+' missing categories identified.':' All critical categories are covered.'}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(80px, 1fr))',gap:10}}>
                {[[totalDocs,'Filed','teal'],[totalMissing,'Missing','amber'],[audit.filter(m=>m.score<60).length,'At Risk','red'],[audit.filter(m=>m.score>=80).length,'Complete','green']].map(([v,l,c]) => (
                  <div key={l} style={{textAlign:'center',padding:12,background:'var(--'+c+'-bg)',borderRadius:8,border:'1px solid var(--'+c+'-border)'}}>
                    <div style={{fontSize:22,fontWeight:700,color:'var(--'+c+')'}}>{v}</div>
                    <div style={{fontSize:11,color:'var(--txt3)'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{overflow:'hidden'}}>
        <div className="sec-bar sec-bar-navy">Member Document Health</div>
        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'var(--txt3)'}}>Loading...</div>
        ) : audit.length === 0 ? (
          <div style={{padding:40,textAlign:'center',color:'var(--txt3)'}}>No family members found. Add members to see audit data.</div>
        ) : (
          <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <table className="data-table" style={{minWidth:700}}>
            <thead>
              <tr>
                <th scope="col">Member</th>
                {CATS.map(c=><th key={c} scope="col">{CAT_LABELS[c]}</th>)}
                <th scope="col">Score</th>
                <th scope="col" style={{textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="avatar" style={{width:28,height:28,background:m.avatar_color||'var(--navy)',fontSize:10}}>
                        {(m.first_name?.[0]||'')+(m.last_name?.[0]||'')}
                      </div>
                      <span style={{fontWeight:600}}>{m.first_name} {m.last_name}</span>
                    </div>
                  </td>
                  {CATS.map(c => {
                    const has = (m.categoryBreakdown[c]||0)>0;
                    return (
                      <td key={c}><Badge color={has?'green':'red'}>{has?'+ '+m.categoryBreakdown[c]:'Missing'}</Badge></td>
                    );
                  })}
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="progress-track" style={{width:60}}><div className="progress-fill" style={{width:m.score+'%',background:scoreColor(m.score)}}/></div>
                      <span style={{fontSize:12,fontWeight:700,color:scoreColor(m.score)}}>{m.score}%</span>
                    </div>
                  </td>
                  <td style={{textAlign:'right'}}><button className="btn btn-outline btn-sm" onClick={() => navigate && navigate('documents')}>Upload Missing</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
