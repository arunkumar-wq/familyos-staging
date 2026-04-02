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
      options: { responsive: true, cutout: '68%', plugins: { legend: { display: false } } },
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--txt)' }}>
          {greet}, {user?.first_name || 'there'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--txt3)', marginTop: 4 }}>
          Your family overview for {fmtDateFull(new Date())}
        </p>
      </div>

      {/* Stat Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card stat-card">
          <div className="stat-card-label">Total Net Worth</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-card-value">{loading ? '...' : fmtK(nw)}</div>
            <span className="badge badge-green" style={{fontSize:11}}>+5.3%</span>
          </div>
          <div className="stat-card-sub up">&#8593; $142K vs last quarter</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Documents</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-card-value">{loading ? '...' : stats.docsCount || 0}</div>
            <span className="badge badge-amber" style={{fontSize:11}}>{stats.expiringCount || 0} expiring</span>
          </div>
          <div className="stat-card-sub">Across 12 categories</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">Family Members</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-card-value">{loading ? '...' : stats.membersCount || 0}</div>
            <span className="badge badge-green" style={{fontSize:11}}>Active</span>
          </div>
          <div className="stat-card-sub">All access verified</div>
        </div>
        <div className="card stat-card">
          <div className="stat-card-label">AI Alerts</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="stat-card-value">{loading ? '...' : stats.alertsCount || 0}</div>
            {alerts.filter(a=>a.severity==='critical').length > 0 && (
              <span className="badge badge-red" style={{fontSize:11}}>{alerts.filter(a=>a.severity==='critical').length} urgent</span>
            )}
          </div>
          <div className="stat-card-sub">Action required</div>
        </div>
      </div>

      {/* Charts + Alerts Row */}
      <div className="dash-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Portfolio Performance */}
        <div className="card">
          <div style={{ padding: '18px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-label">Portfolio Performance</div>
            <select style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '4px 8px', fontSize: 12, background: 'var(--surface)', color: 'var(--txt2)' }}>
              <option>Net Worth</option>
            </select>
          </div>
          <div style={{ padding: '0 20px 20px', height: 240 }}><canvas ref={lineRef} /></div>
        </div>

        {/* AI Alerts Grid */}
        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}>
            <div className="section-label">AI-Generated Tasks &amp; Alerts</div>
          </div>
          <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {alerts.slice(0, 4).map((a) => {
              const sev = SEV_STYLES[a.severity] || SEV_STYLES.info;
              return (
                <div key={a.id} className="ai-alert-card" style={{ background: sev.bg, color: '#fff' }}>
                  <div className="alert-severity">{sev.label}</div>
                  <div className="ai-alert-card-title">{a.title}</div>
                  <div className="ai-alert-card-body">{a.title}</div>
                </div>
              );
            })}
            {tasks.filter(t => !t.is_done).slice(0, 1).map(t => (
              <div key={t.id} className="ai-alert-card" style={{ background: 'var(--surface2)', color: 'var(--txt)', border: '1px solid var(--border)' }}>
                <div className="alert-severity" style={{ background: 'var(--border)' }}>Todo</div>
                <div className="ai-alert-card-title">{t.title}</div>
                <div className="ai-alert-card-body">{t.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Allocation + Family Row */}
      <div className="dash-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
