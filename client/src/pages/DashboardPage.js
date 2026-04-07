import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtK, fmtDate, fmtDateFull } from '../utils/formatters';

Chart.register(...registerables);

const SEV_STYLES = {
  critical: { bg: '#dc2626', label: 'High' },
  warning:  { bg: '#d97706', label: 'Med' },
  info:     { bg: '#0a9e9e', label: 'Info' },
  success:  { bg: '#059669', label: 'AI' },
};

export default function DashboardPage({ navigate }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [members, setMembers] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const lineRef = useRef(); const lineChart = useRef();
  const donutRef = useRef(); const donutChart = useRef();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/tasks'),
      api.get('/alerts'),
      api.get('/family/members'),
      api.get('/portfolio/summary').catch(() => ({ data: null })),
    ]).then(([s, t, a, m, pf]) => {
      setSummary(s.data);
      setTasks(t.data.slice(0, 5));
      setAlerts(a.data.filter(x => !x.is_read).slice(0, 5));
      setMembers(m.data.slice(0, 5));
      setPortfolio(pf.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Portfolio Performance Line Chart
  useEffect(() => {
    if (!summary?.snapshots?.length || !lineRef.current) return;
    if (lineChart.current) lineChart.current.destroy();
    const ctx = lineRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 220);
    grad.addColorStop(0, 'rgba(10,158,158,.12)');
    grad.addColorStop(1, 'rgba(10,158,158,0)');
    lineChart.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: summary.snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short' })),
        datasets: [{
          data: summary.snapshots.map(s => s.net_worth),
          borderColor: '#0a9e9e', backgroundColor: grad, fill: true, tension: 0.4,
          pointRadius: 3, pointBackgroundColor: '#0a9e9e', pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtK(ctx.raw) } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#9ca3af' } },
          y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 }, color: '#9ca3af', callback: v => fmtK(v) } }
        }
      },
    });
    return () => { if (lineChart.current) lineChart.current.destroy(); };
  }, [summary]);

  // Asset Allocation Donut
  useEffect(() => {
    if (!donutRef.current || !portfolio?.allocation?.length) return;
    if (donutChart.current) donutChart.current.destroy();
    const alloc = portfolio.allocation;
    const colors = ['#3883f6', '#1e429f', '#059669', '#d97706', '#6b7280'];
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels: alloc.map(a => a.category.replace('-',' ')), datasets: [{ data: alloc.map(a => +a.percentage), backgroundColor: colors.slice(0, alloc.length), borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } },
    });
    return () => { if (donutChart.current) donutChart.current.destroy(); };
  }, [portfolio]);

  const stats = summary?.stats || {};
  const nw = stats.netWorth || 0;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const allocData = portfolio?.allocation || [];
  const allocColors = ['#3883f6', '#1e429f', '#059669', '#d97706', '#6b7280'];

  return (
    <div className="page-inner">
      {/* Greeting */}
      <div className="dash-greeting">
        <h1 className="dash-greeting-title">
          {greet}, {user?.first_name || 'there'}
        </h1>
        <p className="dash-greeting-sub">
          Your family overview for {fmtDateFull(new Date())}
        </p>
      </div>

      {/* Stat Cards Row */}
      <div className="dash-stats-grid">
        {[
          { label: 'Total Net Worth', value: loading ? '...' : fmtK(nw), badge: '+5.3%', badgeColor: 'green', sub: '\u2191 $142K vs last quarter', subClass: 'up', accent: '#0a9e9e',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0a9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
          { label: 'Documents', value: loading ? '...' : (stats.docsCount || 0), badge: `${stats.expiringCount || 0} expiring`, badgeColor: 'amber', sub: 'Across 12 categories', accent: '#3883f6',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3883f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8m8 4H8"/></svg> },
          { label: 'Family Members', value: loading ? '...' : (stats.membersCount || 0), badge: 'Active', badgeColor: 'green', sub: 'All access verified', accent: '#7c3aed',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
          { label: 'AI Alerts', value: loading ? '...' : (stats.alertsCount || 0), badge: alerts.filter(a=>a.severity==='critical').length > 0 ? `${alerts.filter(a=>a.severity==='critical').length} urgent` : null, badgeColor: 'red', sub: 'Action required', accent: '#dc2626',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> },
        ].map(card => (
          <div key={card.label} className="card dash-stat-card" style={{ borderLeft: `3px solid ${card.accent}` }}>
            <div className="dash-stat-card-top">
              <div className="dash-stat-card-icon" style={{ background: card.accent + '12' }}>{card.icon}</div>
              <div className="dash-stat-card-info">
                <div className="dash-stat-card-label">{card.label}</div>
                <div className="dash-stat-card-row">
                  <span className="dash-stat-card-value">{card.value}</span>
                  {card.badge && <span className={`badge badge-${card.badgeColor}`} style={{fontSize:10}}>{card.badge}</span>}
                </div>
              </div>
            </div>
            <div className={`dash-stat-card-sub${card.subClass ? ' ' + card.subClass : ''}`}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts + Alerts Row */}
      <div className="dash-grid-2">
        {/* Portfolio Performance */}
        <div className="card">
          <div style={{ padding: '18px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-label">Portfolio Performance</div>
            <select style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '4px 8px', fontSize: 12, background: 'var(--surface)', color: 'var(--txt2)' }}>
              <option>Net Worth</option>
            </select>
          </div>
          <div className="dash-chart-wrap"><canvas ref={lineRef} /></div>
        </div>

        {/* AI Alerts Grid */}
        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}>
            <div className="section-label">AI-Generated Tasks &amp; Alerts</div>
          </div>
          <div className="ai-alerts-grid">
            {alerts.slice(0, 4).map((a) => {
              const sev = SEV_STYLES[a.severity] || SEV_STYLES.info;
              return (
                <div key={a.id} className="ai-alert-card" style={{ background: sev.bg, color: '#fff' }}>
                  <div className="ai-alert-card-header">
                    <span className="ai-alert-card-title">{a.title}</span>
                    <span className="ai-alert-badge">{sev.label}</span>
                  </div>
                  <div className="ai-alert-card-body">{a.description || a.title}</div>
                </div>
              );
            })}
            {tasks.filter(t => !t.is_done).slice(0, 1).map(t => (
              <div key={t.id} className="ai-alert-card" style={{ background: 'var(--surface2)', color: 'var(--txt)', border: '1px solid var(--border)' }}>
                <div className="ai-alert-card-header">
                  <span className="ai-alert-card-title">{t.title}</span>
                  <span className="ai-alert-badge" style={{ background: 'var(--border2)', color: 'var(--txt3)' }}>Todo</span>
                </div>
                <div className="ai-alert-card-body">{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Allocation + Family Row */}
      <div className="dash-grid-2">
        {/* Asset Allocation */}
        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}><div className="section-label">Asset Allocation</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '0 20px 20px' }}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}><canvas ref={donutRef} /></div>
            <div style={{ flex: 1 }}>
              {allocData.map((a, i) => (
                <div key={a.category} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: allocColors[i % allocColors.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--txt2)', textTransform: 'capitalize' }}>{a.category.replace('-', ' ')}</span>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{a.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Family Members */}
        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}><div className="section-label">Family Members</div></div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: '0 20px 24px', flexWrap: 'wrap' }}>
            {members.map(m => (
              <div key={m.id} style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('family')}>
                <div className="avatar" style={{ width: 52, height: 52, background: m.avatar_color || '#1a3a5c', fontSize: 16, margin: '0 auto 8px' }}>
                  {((m.first_name||'')[0]||'')+((m.last_name||'')[0]||'')}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{m.first_name}</div>
                <div style={{ fontSize: 11, color: 'var(--txt4)', textTransform: 'capitalize' }}>{m.role === 'admin' ? 'Owner' : m.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
