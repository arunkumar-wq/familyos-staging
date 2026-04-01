import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Badge } from '../components/UI';
export default function AuditPage() {
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/family/audit')
      .then(r => setAudit(Array.isArray(r.data)?r.data:[]))
      .catch(e => console.error('Audit error',e))
      .finally(() => setLoading(false));
  }, []);
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
        <button className="btn btn-outline">Export</button>
        <button className="btn btn-teal">Re-run Audit</button>
      </PageHeader>
      <div className="card" style={{marginBottom:14}}>
        <div className="sec-bar sec-bar-teal">Family Vault Score</div>
        <div style={{padding:24}}>
          <div className="audit-ring-wrap">
            <div style={{textAlign:'center',flexShrink:0}}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="52" fill="none" stroke="var(--border)" strokeWidth="10"/>
                <circle cx="65" cy="65" r="52" fill="none" stroke={scoreColor(familyScore)} strokeWidth="10" strokeDasharray={dash} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 65 65)" style={{transition:'stroke-dashoffset .8s'}}/>
                <text x="65" y="62" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="28" fill="#111827">{familyScore}</text>
                <text x="65" y="78" textAnchor="middle" fontFamily="DM Sans,sans-serif" fontSize="11" fill="#9ca3af">out of 100</text>
              </svg>
              <div style={{fontSize:13,fontWeight:700,marginTop:6,color:scoreColor(familyScore)}}>{scoreLabel}</div>
            </div>
            <div style={{flex:1,minWidth:200}}>
              <h2 style={{fontSize:20,marginBottom:8}}>Vault is {familyScore}% complete</h2>
              <p style={{fontSize:13,color:'var(--txt2)',marginBottom:16}}>
                {totalDocs} documents across {audit.length} members.{totalMissing>0?' '+totalMissing+' missing categories identified.':' All critical categories are covered.'}
              </p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
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
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                {CATS.map(c=><th key={c}>{CAT_LABELS[c]}</th>)}
                <th>Score</th>
                <th style={{textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(m => (
                <tr key={m.id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div className="avatar" style={{width:28,height:28,background:'var(--navy)',fontSize:10}}>
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
                  <td style={{textAlign:'right'}}><button className="btn btn-outline btn-sm">Upload Missing</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}