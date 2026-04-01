import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Badge, StatCard } from '../components/UI';

// Default insights — will be shown alongside any real alerts
const STATIC_INSIGHTS = [
  { id:'s1',sev:'warning',tag:'REVIEW',tagClr:'amber',bdrClr:'var(--amber)',title:'Review your will and estate documents',body:'Legal experts recommend reviewing wills every 3-5 years, especially after major life changes like property acquisition or family changes.',actions:[['outline','View Documents']] },
  { id:'s2',sev:'info',tag:'OPTIMIZE',tagClr:'blue',bdrClr:'var(--blue)',title:'Check FD rates for better returns',body:'Interest rates change frequently. Compare your current FD rates with the latest offerings from major banks to maximize returns.',actions:[['outline','View Portfolio']] },
];

export default function InsightsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/alerts')
      .then(r => setAlerts(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Build insights from real alerts + static suggestions
  const urgentAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info' || a.severity === 'success');

  const dynamicInsights = alerts.filter(a => !a.is_dismissed).map(a => ({
    id: a.id,
    sev: a.severity === 'critical' ? 'urgent' : a.severity === 'warning' ? 'warning' : 'info',
    tag: a.severity === 'critical' ? 'URGENT' : a.severity === 'warning' ? 'REVIEW' : 'INFO',
    tagClr: a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'teal',
    bdrClr: a.severity === 'critical' ? 'var(--red)' : a.severity === 'warning' ? 'var(--amber)' : 'var(--teal)',
    title: a.title,
    body: a.description || a.message || '',
    actions: [['outline', 'View Details']],
  }));

  const allInsights = [...dynamicInsights, ...STATIC_INSIGHTS];

  return (
    <div className="page-inner" style={{ maxWidth:900 }}>
      <PageHeader title="AI Insights" sub="Proactive intelligence across your vault and finances">
        <button className="btn btn-outline">Preferences</button>
        <button className="btn btn-teal">Run Analysis</button>
      </PageHeader>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:14, marginBottom:22 }}>
        <StatCard icon="!" iconBg="var(--red-bg)"    label="Urgent"       value={urgentAlerts.length}  sub="Action required"   accent="red"    />
        <StatCard icon="~" iconBg="var(--amber-bg)"  label="Warnings"     value={warningAlerts.length}  sub="Review recommended" accent="amber"  />
        <StatCard icon="*" iconBg="var(--teal-bg)"   label="Suggestions"  value={allInsights.length}  sub="Insights available" subUp accent="teal" />
        <StatCard icon="+" iconBg="var(--purple-bg)" label="Total Alerts" value={alerts.length} sub="All time"        accent="purple" />
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading insights...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {allInsights.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>No insights at this time. Everything looks good!</div>
          ) : allInsights.map(ins => (
            <div key={ins.id} className="card insight-card" style={{ borderLeftColor:ins.bdrClr }}>
              <div style={{ display:'flex', gap:14, padding:16 }}>
                <div className="insight-icon" style={{ background:'var(--'+ins.tagClr+'-bg)', flexShrink:0 }} aria-hidden="true">
                  {ins.sev==='urgent'?'!':ins.sev==='warning'?'~':'*'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                    <Badge color={ins.tagClr}>{ins.tag}</Badge>
                  </div>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--txt)', marginBottom:6 }}>{ins.title}</div>
                  <div style={{ fontSize:13, color:'var(--txt2)', lineHeight:1.6, marginBottom:12 }}>{ins.body}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {ins.actions.map(([v,label]) => (
                      <button key={label} className={'btn btn-'+(v==='primary'?'primary':'outline')+' btn-sm'}>{label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
