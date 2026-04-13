import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PageHeader, Badge, StatCard } from '../components/UI';

// Default insights — will be shown alongside any real alerts
const STATIC_INSIGHTS = [
  { id:'s1',sev:'warning',tag:'REVIEW',tagClr:'amber',bdrClr:'var(--amber)',title:'Review your will and estate documents',body:'Legal experts recommend reviewing wills every 3-5 years, especially after major life changes like property acquisition or family changes.',actions:[['outline','View Documents','documents']] },
  { id:'s2',sev:'info',tag:'OPTIMIZE',tagClr:'blue',bdrClr:'var(--blue)',title:'Check FD rates for better returns',body:'Interest rates change frequently. Compare your current FD rates with the latest offerings from major banks to maximize returns.',actions:[['outline','View Portfolio','portfolio']] },
];

export default function InsightsPage({ navigate }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [prefs, setPrefs] = useState({
    alertTypes: { passport: true, insurance: true, portfolio: true, tax: true, documents: true, estate: true },
    frequency: 'realtime',
    memberScope: 'all',
    selectedMembers: [],
  });
  const [members, setMembers] = useState([]);

  useEffect(() => {
    api.get('/alerts')
      .then(r => setAlerts(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get('/family/members').then(r => setMembers(r.data || [])).catch(() => {});
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
    actions: [['outline', 'View Details', 'notifications']],
  }));

  const allInsights = [...dynamicInsights, ...STATIC_INSIGHTS];

  const severityGroups = {
    urgent: allInsights.filter(i => i.sev === 'urgent'),
    high: allInsights.filter(i => i.sev === 'warning'),
    medium: allInsights.filter(i => i.sev === 'info'),
    low: allInsights.filter(i => !['urgent','warning','info'].includes(i.sev)),
  };

  const runFullAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisResults(null);
    const steps = [
      'Scanning documents...',
      'Checking expiry dates...',
      'Analyzing missing documents...',
      'Reviewing portfolio...',
      'Generating recommendations...',
    ];
    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setAnalysisProgress(steps[stepIdx]);
        stepIdx++;
      }
    }, 600);
    try {
      const resp = await api.post('/alerts/analyze');
      setAnalysisResults(resp.data);
      const alertsResp = await api.get('/alerts');
      setAlerts(alertsResp.data || []);
    } catch (e) {
      console.error('Analysis failed:', e);
    }
    clearInterval(progressInterval);
    setAnalysisProgress('');
    setAnalyzing(false);
  };

  const renderSection = (label, color, badge, iconSvg, items, sevClass) => {
    if (!items.length) return null;
    return (
      <div className="severity-section">
        <div className="severity-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="severity-dot" style={{ background: color }} />
            <span className="severity-title">{label}</span>
          </div>
          <span className="severity-badge" style={{ background: color }}>{items.length}</span>
        </div>
        {items.map(ins => (
          <div key={ins.id} className={`card insight-card ${sevClass}`}>
            <div className="insight-card-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div className="severity-icon" style={{ background: color + '18', color }}>{iconSvg}</div>
                <Badge color={badge}>{label.toUpperCase()}</Badge>
              </div>
              <div className="insight-card-title">{ins.title}</div>
              <div className="insight-card-body">{ins.body}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {ins.actions.map(([v, lbl, target]) => (
                  <button key={lbl} className="btn btn-outline btn-xs" onClick={() => navigate && target && navigate(target)}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const svgUrgent = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>;
  const svgHigh = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
  const svgMedium = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
  const svgLow = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>;

  return (
    <div className="page-inner" style={{ maxWidth:1100 }}>
      <PageHeader title="AI Insights" sub="Proactive intelligence across your vault and finances">
        <button className="btn btn-outline" onClick={() => setShowPrefs(!showPrefs)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          Preferences
        </button>
        <button className="btn btn-teal" onClick={runFullAnalysis} disabled={analyzing}>
          {analyzing ? (
            <><span className="btn-spinner" /> {analysisProgress || 'Analyzing...'}</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> Run Analysis</>
          )}
        </button>
      </PageHeader>
      <div className="mini-stats-strip">
        {[
          { label: 'Urgent', value: severityGroups.urgent.length, color: '#dc2626' },
          { label: 'High', value: severityGroups.high.length, color: '#f59e0b' },
          { label: 'Medium', value: severityGroups.medium.length, color: '#0a9e9e' },
          { label: 'Low', value: severityGroups.low.length, color: '#059669' },
          { label: 'Total', value: allInsights.length, color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} className="mini-stat">
            <span className="mini-stat-value" style={{color:s.color}}>{s.value}</span>
            <span className="mini-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
      {analysisResults && (
        <div className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #0a9e9e, #3883f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Analysis Complete</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                {analysisResults.summary.documentsScanned} docs scanned · {analysisResults.summary.membersAnalyzed} members · {analysisResults.summary.assetsReviewed} assets
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {analysisResults.summary.critical > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{analysisResults.summary.critical}</div>
                  <div style={{ fontSize: 9, opacity: 0.8 }}>CRITICAL</div>
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{analysisResults.summary.totalFindings}</div>
                <div style={{ fontSize: 9, opacity: 0.8 }}>FINDINGS</div>
              </div>
              <button onClick={() => setAnalysisResults(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
            </div>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {analysisResults.results.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate && navigate(r.action)}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  background: r.severity === 'critical' ? '#dc2626' : r.severity === 'warning' ? '#f59e0b' : r.severity === 'success' ? '#059669' : '#0a9e9e'
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{r.body}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" strokeWidth="2" style={{ flexShrink: 0, marginTop: 4 }}><path d="M9 18l6-6-6-6"/></svg>
              </div>
            ))}
          </div>
        </div>
      )}
      {showPrefs && (
        <div className="card prefs-panel" style={{ marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>Alert Preferences</span>
            <button onClick={() => setShowPrefs(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--txt3)', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
          </div>
          <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

            {/* Column 1: Alert Types */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Alert Types</div>
              {[
                { key: 'passport', label: 'Passport & ID Expiry', icon: '🪪' },
                { key: 'insurance', label: 'Insurance Reminders', icon: '🛡' },
                { key: 'portfolio', label: 'Portfolio Alerts', icon: '📈' },
                { key: 'tax', label: 'Tax Deadlines', icon: '💰' },
                { key: 'documents', label: 'Missing Documents', icon: '📄' },
                { key: 'estate', label: 'Estate Planning', icon: '⚖️' },
              ].map(t => (
                <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <input type="checkbox" checked={prefs.alertTypes[t.key]} onChange={() => setPrefs(p => ({ ...p, alertTypes: { ...p.alertTypes, [t.key]: !p.alertTypes[t.key] } }))}
                    style={{ width: 16, height: 16, accentColor: '#0a9e9e', cursor: 'pointer' }} />
                  <span>{t.icon}</span>
                  <span style={{ color: 'var(--txt)' }}>{t.label}</span>
                </label>
              ))}
            </div>

            {/* Column 2: Notification Frequency */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Notification Frequency</div>
              {[
                { key: 'realtime', label: 'Real-time', desc: 'Instant alerts for urgent items' },
                { key: 'daily', label: 'Daily Digest', desc: 'Summary every morning at 8 AM' },
                { key: 'weekly', label: 'Weekly Summary', desc: 'Every Monday morning' },
                { key: 'monthly', label: 'Monthly Report', desc: 'First of every month' },
              ].map(f => (
                <label key={f.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                  <input type="radio" name="frequency" checked={prefs.frequency === f.key} onChange={() => setPrefs(p => ({ ...p, frequency: f.key }))}
                    style={{ marginTop: 3, accentColor: '#0a9e9e', cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 1 }}>{f.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Column 3: Family Member Scope */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Family Member Scope</div>
              {[
                { key: 'all', label: 'All Members' },
                { key: 'selected', label: 'Selected Members Only' },
              ].map(s => (
                <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="scope" checked={prefs.memberScope === s.key} onChange={() => setPrefs(p => ({ ...p, memberScope: s.key }))}
                    style={{ accentColor: '#0a9e9e', cursor: 'pointer' }} />
                  <span style={{ color: 'var(--txt)' }}>{s.label}</span>
                </label>
              ))}

              {prefs.memberScope === 'selected' && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {members.map(m => (
                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: prefs.selectedMembers.includes(m.id) ? '#e0f5f5' : 'transparent', border: '1px solid ' + (prefs.selectedMembers.includes(m.id) ? '#0a9e9e' : 'var(--border)'), transition: 'all 150ms' }}>
                      <input type="checkbox" checked={prefs.selectedMembers.includes(m.id)}
                        onChange={() => setPrefs(p => ({
                          ...p,
                          selectedMembers: p.selectedMembers.includes(m.id)
                            ? p.selectedMembers.filter(id => id !== m.id)
                            : [...p.selectedMembers, m.id]
                        }))}
                        style={{ accentColor: '#0a9e9e', cursor: 'pointer' }} />
                      {m.avatar_url && <img src={m.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />}
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--txt)' }}>{m.first_name} {m.last_name}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Save button */}
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-teal btn-sm" style={{ width: '100%' }} onClick={() => { setShowPrefs(false); }}>Save Preferences</button>
                <div style={{ fontSize: 10, color: 'var(--txt4)', textAlign: 'center', marginTop: 6 }}>Settings are saved locally for this session</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading insights...</div>
      ) : allInsights.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>No insights at this time. Everything looks good!</div>
      ) : (
        <div className="insights-2col">
          <div className="insights-col">
            {renderSection('Urgent', '#dc2626', 'red', svgUrgent, severityGroups.urgent, 'severity-urgent')}
            {renderSection('High', '#f59e0b', 'amber', svgHigh, severityGroups.high, 'severity-high')}
          </div>
          <div className="insights-col">
            {renderSection('Medium', '#0a9e9e', 'teal', svgMedium, severityGroups.medium, 'severity-medium')}
            {renderSection('Low', '#059669', 'green', svgLow, severityGroups.low, 'severity-low')}
          </div>
        </div>
      )}
    </div>
  );
}
