import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtINR, fmtK, fmtDate } from '../utils/formatters';
import { StatCard, CardHeader } from '../components/UI';

Chart.register(...registerables);

const DOC_HEALTH_COLORS = { valid: '#059669', expiring: '#d97706', expired: '#dc2626' };
const SEV_COLOR = { critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)', success: 'var(--green)' };
const MEMBER_COLORS = ['#0891b2', '#059669', '#d97706', '#7c3aed', '#dc2626', '#2563eb'];

export default function DashboardPage({ navigate }) {
  const { user } = useAuth();
  const [summary, setSummary]   = useState(null);
  const [tasks,   setTasks]     = useState([]);
  const [alerts,  setAlerts]    = useState([]);
  const [members, setMembers]   = useState([]);
  const [docStats, setDocStats] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading,   setLoading] = useState(true);
  const [error,     setError]   = useState('');
  const lineRef  = useRef(); const lineChart  = useRef();
  const donutRef = useRef(); const donutChart = useRef();
  const docRef   = useRef(); const docChart   = useRef();
  const barRef   = useRef(); const barChart   = useRef();

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/tasks'),
      api.get('/alerts'),
      api.get('/family/members'),
      api.get('/documents/stats').catch(() => ({ data: null })),
      api.get('/portfolio/summary').catch(() => ({ data: null })),
    ]).then(([s, t, a, m, ds, pf]) => {
      setSummary(s.data);
      setTasks(t.data.slice(0, 5));
      setAlerts(a.data.filter(x => !x.is_read).slice(0, 5));
      setMembers(m.data.slice(0, 6));
      setDocStats(ds.data);
      setPortfolio(pf.data);
    }).catch(err => {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
    }).finally(() => setLoading(false));
  }, []);

  // Line chart — Net Worth trend
  useEffect(() => {
    if (!summary?.snapshots?.length || !lineRef.current) return;
    if (lineChart.current) lineChart.current.destroy();
    const ctx  = lineRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(37,99,235,.15)');
    grad.addColorStop(1, 'rgba(37,99,235,0)');
    lineChart.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: summary.snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-IN', { month: 'short' })),
        datasets: [{ data: summary.snapshots.map(s => +(s.net_worth / 100000).toFixed(1)), borderColor: '#2563eb', backgroundColor: grad, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#2563eb', pointBorderColor: '#fff', pointBorderWidth: 2, borderWidth: 2.5 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8', callback: v => 'Rs.' + v + 'L' } } } },
    });
    return () => { if (lineChart.current) lineChart.current.destroy(); };
  }, [summary]);

  // Donut chart — Asset Allocation (from real portfolio data)
  useEffect(() => {
    if (!donutRef.current || !portfolio?.allocation?.length) return;
    if (donutChart.current) donutChart.current.destroy();
    const alloc = portfolio.allocation;
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels: alloc.map(a => a.category), datasets: [{ data: alloc.map(a => +a.percentage), backgroundColor: ['#1d4ed8', '#0891b2', '#d97706', '#7c3aed', '#dc2626', '#059669', '#f59e0b'].slice(0, alloc.length), borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, cutout: '72%', plugins: { legend: { display: false } } },
    });
    return () => { if (donutChart.current) donutChart.current.destroy(); };
  }, [portfolio]);

  // Donut chart — Document Health
  useEffect(() => {
    if (!docRef.current) return;
    if (docChart.current) docChart.current.destroy();
    const byStatus = docStats?.byStatus || [];
    const valid    = byStatus.find(x => x.status === 'valid')?.c    || 0;
    const expiring = byStatus.find(x => x.status === 'expiring')?.c || 0;
    const expired  = byStatus.find(x => x.status === 'expired')?.c  || 0;
    docChart.current = new Chart(docRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels: ['Valid', 'Expiring', 'Expired'], datasets: [{ data: [valid || 1, expiring, expired], backgroundColor: [DOC_HEALTH_COLORS.valid, DOC_HEALTH_COLORS.expiring, DOC_HEALTH_COLORS.expired], borderWidth: 0 }] },
      options: { responsive: true, cutout: '70%', plugins: { legend: { display: false } } },
    });
    return () => { if (docChart.current) docChart.current.destroy(); };
  }, [docStats, loading]);

  // Bar chart — Liability Breakdown
  useEffect(() => {
    if (!barRef.current) return;
    if (barChart.current) barChart.current.destroy();
    const liabs = portfolio?.liabilities || [];
    if (liabs.length === 0) return;
    const labels = liabs.map(l => l.name || l.category);
    const values = liabs.map(l => +(l.balance / 100000).toFixed(1));
    const colors = ['#2563eb', '#d97706', '#059669', '#7c3aed', '#dc2626'];
    barChart.current = new Chart(barRef.current.getContext('2d'), {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderRadius: 4, borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } }, y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 }, color: '#94a3b8', callback: v => v + 'L' } } } },
    });
    return () => { if (barChart.current) barChart.current.destroy(); };
  }, [portfolio, loading]);

  const toggleTask = useCallback(async (task) => {
    const upd = { ...task, is_done: !task.is_done };
    setTasks(ts => ts.map(t => t.id === task.id ? upd : t));
    try {
      await api.put('/tasks/' + task.id, upd);
    } catch {
      // Revert on failure
      setTasks(ts => ts.map(t => t.id === task.id ? task : t));
    }
  }, []);

  const dismissAlert = useCallback(async (id) => {
    const prev = alerts;
    setAlerts(a => a.filter(x => x.id !== id));
    try {
      await api.put('/alerts/' + id + '/dismiss');
    } catch {
      setAlerts(prev);
    }
  }, [alerts]);

  const stats   = summary?.stats || {};
  const nw      = stats.netWorth || 0;
  const h       = new Date().getHours();
  const greet   = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const byStatus = docStats?.byStatus || [];
  const docValid    = byStatus.find(x => x.status === 'valid')?.c    || 0;
  const docExpiring = byStatus.find(x => x.status === 'expiring')?.c || 0;
  const docExpired  = byStatus.find(x => x.status === 'expired')?.c  || 0;
  const docTotal    = docValid + docExpiring + docExpired;
  const today   = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const allocData = portfolio?.allocation || [];

  return (
    <div className="page-inner">

      {/* ── 1. GREETING SECTION ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--txt3)', marginBottom: 4 }}>{today}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--txt)', lineHeight: 1.2 }}>
          {greet}, {user?.first_name || 'there'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 4 }}>
          Your family overview is ready. {stats.alertsCount || 0} alerts need attention.
        </div>
      </div>

      {/* ── AI INSIGHTS STRIP ── */}
      {(stats.expiringCount > 0 || stats.pendingTasks > 0) && (
        <div className="insight-strip">
          <div className="insight-strip-icon">*</div>
          <div className="insight-strip-text">
            <strong>{stats.expiringCount || 0} documents expiring &mdash; {stats.pendingTasks || 0} pending tasks</strong>
            <p>Review your vault and calendar for upcoming deadlines</p>
          </div>
          <div className="insight-strip-actions">
            <button className="strip-btn-white" onClick={() => navigate('insights')}>View All</button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--red)', fontSize: 13 }}>{error}</div>
      )}

      {/* ── 2. STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard accent="blue"  icon="Rs" iconBg="var(--blue-bg)"  label="Net Worth"    value={loading ? '...' : fmtK(nw)} sub="Total family net worth" />
        <StatCard accent="green" icon="+"  iconBg="var(--green-bg)" label="Total Assets" value={loading ? '...' : fmtK(stats.totalAssets || 0)} sub="Across all classes" />
        <StatCard accent="red"   icon="-"  iconBg="var(--red-bg)"   label="Liabilities"  value={loading ? '...' : fmtK(stats.totalLiabilities || 0)} sub="Loans and EMIs" subDown />
        <StatCard accent="amber" icon="#"  iconBg="var(--amber-bg)" label="Documents"    value={loading ? '...' : (stats.docsCount || 0)} sub={`${stats.expiringCount || 0} expiring soon`} />
      </div>

      {/* ── 3. CHARTS ROW 1: Line chart + Asset Allocation donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        <div className="card card-blue">
          <div className="chart-header">
            <div>
              <div className="chart-title">Net Worth Performance</div>
              <div className="chart-subtitle">Monthly trend &mdash; last 12 months</div>
            </div>
          </div>
          <div style={{ padding: '8px 20px 20px', height: 220 }}><canvas ref={lineRef} /></div>
        </div>
        <div className="card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Asset Allocation</div>
              <div className="chart-subtitle">Portfolio breakdown</div>
            </div>
          </div>
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <canvas ref={donutRef} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--txt4)', fontWeight: 600 }}>TOTAL</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{fmtK(nw)}</span>
                </div>
              </div>
            </div>
            {allocData.map((a, i) => (
              <div key={a.category} className="alloc-row">
                <div className="alloc-dot" style={{ background: ['#1d4ed8', '#0891b2', '#d97706', '#7c3aed', '#dc2626', '#059669', '#f59e0b'][i % 7] }} />
                <span className="alloc-name">{a.category.replace('-', ' ')}</span>
                <span className="alloc-pct">{a.percentage}%</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 0 16px' }} />
        </div>
      </div>

      {/* ── 4. CHARTS ROW 2: Document Health donut + Liability Breakdown bar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Document Health */}
        <div className="card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Document Health</div>
              <div className="chart-subtitle">{docTotal} total documents</div>
            </div>
            <button className="btn btn-xs btn-outline" onClick={() => navigate('documents')}>View All</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 20px 20px' }}>
            <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
              <canvas ref={docRef} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)' }}>{docTotal}</span>
                <span style={{ fontSize: 10, color: 'var(--txt4)' }}>total</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Valid', docValid, DOC_HEALTH_COLORS.valid, 'var(--green)'], ['Expiring', docExpiring, DOC_HEALTH_COLORS.expiring, 'var(--amber)'], ['Expired', docExpired, DOC_HEALTH_COLORS.expired, 'var(--red)']].map(([label, count, dotColor, textColor]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor }} />
                    <span style={{ fontSize: 12, color: 'var(--txt2)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Liability Breakdown */}
        <div className="card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Liability Breakdown</div>
              <div className="chart-subtitle">Outstanding loans by type</div>
            </div>
            <button className="btn btn-xs btn-outline" onClick={() => navigate('portfolio')}>View All</button>
          </div>
          <div style={{ padding: '8px 20px 20px', height: 170 }}>
            <canvas ref={barRef} />
          </div>
        </div>
      </div>

      {/* ── 5. FAMILY MEMBERS & TASKS + AI ALERTS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Family Members & Pending Tasks */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <CardHeader
              title="Family Members"
              action={<button className="btn btn-xs btn-outline" onClick={() => navigate('family')}>View All</button>}
            />
          </div>
          <div style={{ padding: '12px 16px 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {loading ? (
              <div style={{ fontSize: 12, color: 'var(--txt4)', padding: '4px 0' }}>Loading...</div>
            ) : members.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--txt4)' }}>No members yet</div>
            ) : members.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.avatar_color || MEMBER_COLORS[i % MEMBER_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate('family')}>
                  {((m.first_name || '')[0] || '') + ((m.last_name || '')[0] || '')}
                </div>
                <span style={{ fontSize: 10, color: 'var(--txt3)', maxWidth: 40, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.first_name}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0 0', padding: '10px 16px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--txt4)', marginBottom: 8 }}>Pending Tasks</div>
            {loading ? (
              <div style={{ fontSize: 12, color: 'var(--txt4)' }}>Loading...</div>
            ) : tasks.filter(t => !t.is_done).length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--txt4)' }}>All tasks complete</div>
            ) : tasks.filter(t => !t.is_done).map(task => (
              <div key={task.id} className="task-item" onClick={() => toggleTask(task)}>
                <div className="task-check" />
                <span className="task-title">{task.title}</span>
                {task.due_date && (
                  <span className="task-due" style={{ color: new Date(task.due_date) < new Date() ? 'var(--red)' : 'var(--txt4)' }}>
                    {fmtDate(task.due_date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI-Generated Tasks & Alerts */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <CardHeader
              title="Recent Alerts"
              action={<button className="btn btn-xs btn-outline" onClick={() => navigate('notifications')}>View All</button>}
            />
          </div>
          <div style={{ paddingTop: 8 }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>Loading...</div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>
                <div style={{ fontSize: 13 }}>All clear - no urgent alerts</div>
              </div>
            ) : alerts.map(alert => {
              const dotColor = SEV_COLOR[alert.severity] || 'var(--blue)';
              return (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'default' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 2, lineHeight: 1.3 }}>{alert.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt3)', lineHeight: 1.4 }}>{(alert.message || alert.description || '').slice(0, 80)}{(alert.message || alert.description || '').length > 80 ? '...' : ''}</div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--txt4)', cursor: 'pointer', padding: '0 2px', fontSize: 14, flexShrink: 0, lineHeight: 1 }}
                    title="Dismiss"
                    aria-label="Dismiss alert"
                  >&times;</button>
                </div>
              );
            })}
            <div style={{ padding: '10px 16px', borderTop: alerts.length ? 'none' : '1px solid var(--border)' }}>
              <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => navigate('insights')}>
                View All AI Insights
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
