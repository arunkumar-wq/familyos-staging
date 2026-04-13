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
    actions: [['outline', 'View Details', 'notifications']],
  }));

  const allInsights = [...dynamicInsights, ...STATIC_INSIGHTS];

  const severityGroups = {
    urgent: allInsights.filter(i => i.sev === 'urgent'),
    high: allInsights.filter(i => i.sev === 'warning'),
    medium: allInsights.filter(i => i.sev === 'info'),
    low: allInsights.filter(i => !['urgent','warning','info'].includes(i.sev)),
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
        <button className="btn btn-outline" onClick={() => navigate && navigate('settings')}>Preferences</button>
        <button className="btn btn-teal" onClick={() => { setAnalyzing(true); api.get('/alerts').then(r => setAlerts(r.data || [])).finally(() => setAnalyzing(false)); }} disabled={analyzing}>{analyzing ? 'Analyzing...' : 'Run Analysis'}</button>
      </PageHeader>
      <div className="mini-stats-strip">
        {[
          { label: 'Urgent', value: urgentAlerts.length, color: 'var(--red)' },
          { label: 'Warnings', value: warningAlerts.length, color: 'var(--amber)' },
          { label: 'Suggestions', value: allInsights.length, color: 'var(--accent)' },
          { label: 'Total', value: alerts.length, color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} className="mini-stat">
            <span className="mini-stat-value" style={{color:s.color}}>{s.value}</span>
            <span className="mini-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
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
