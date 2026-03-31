import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtINR, fmtK, fmtDate } from '../utils/formatters';
import { StatCard, PageHeader, CardHeader } from '../components/UI';

Chart.register(...registerables);

const ALLOC = [
  { name: 'Real Estate',   pct: 38, color: '#1a56db' },
  { name: 'Equities',      pct: 32, color: '#0694a2' },
  { name: 'Fixed Income',  pct: 18, color: '#c27803' },
  { name: 'Cash',          pct: 8,  color: '#6c2bd9' },
  { name: 'Other',         pct: 4,  color: '#c81e1e' },
];

export default function DashboardPage({ navigate }) {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const lineRef = useRef(); const lineChart = useRef();
  const donutRef = useRef(); const donutChart = useRef();

  useEffect(() => {
    Promise.all([api.get('/dashboard/summary'), api.get('/tasks'), api.get('/alerts')])
      .then(([s, t, a]) => { setSummary(s.data); setTasks(t.data.slice(0,5)); setAlerts(a.data.filter(x=>!x.is_read).slice(0,4)); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!summary?.snapshots?.length || !lineRef.current) return;
    if (lineChart.current) lineChart.current.destroy();
    const ctx = lineRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(26,86,219,.15)');
    grad.addColorStop(1, 'rgba(26,86,219,0)');
    lineChart.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: summary.snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-IN', { month: 'short' })),
        datasets: [{
          data: summary.snapshots.map(s => +(s.net_worth / 100000).toFixed(1)),
          borderColor: '#1a56db', backgroundColor: grad,
          fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: '#1a56db', pointBorderColor: '#fff', pointBorderWidth: 2,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => '₹' + ctx.parsed.y + 'L' } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: 'DM Sans' }, color: '#9ca3af' } },
          y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11, family: 'DM Sans' }, color: '#9ca3af', callback: v => '₹' + v + 'L' } },
        },
      },
    });
    return () => { if (lineChart.current) lineChart.current.destroy(); };
  }, [summary]);

  useEffect(() => {
    if (!donutRef.current) return;
    if (donutChart.current) donutChart.current.destroy();
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ALLOC.map(a => a.name),
        datasets: [{ data: ALLOC.map(a => a.pct), backgroundColor: ALLOC.map(a => a.color), borderWidth: 0, hoverOffset: 4 }],
      },
      options: { responsive: true, cutout: '72%', plugins: { legend: { display: false } } },
    });
    return () => { if (donutChart.current) donutChart.current.destroy(); };
  }, [summary]);

  const toggleTask = async (task) => {
    const updated = { ...task, is_done: !task.is_done };
    setTasks(ts => ts.map(t => t.id === task.id ? updated : t));
    await api.put(`/tasks/${task.id}`, updated).catch(() => {});
  };

  const dismissAlert = async (id) => {
    setAlerts(a => a.filter(x => x.id !== id));
    await api.put(`/alerts/${id}/dismiss`).catch(() => {});
  };

  const stats = summary?.stats || {};
  const nw = stats.netWorth || 0;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-inner">
      {/* NET WORTH BANNER */}
      <div className="nw-banner">
        <div className="nw-greeting">{greeting}, {user?.first_name} 👋</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="nw-label">Total Net Worth</div>
            <div className="nw-value">{loading ? '—' : fmtINR(nw)}</div>
            <div className="nw-change">↑ ₹52,400 this month · +2.1%</div>
          </div>
        </div>
        <div className="nw-stats">
          <div>
            <div className="nw-stat-label">Documents</div>
            <div className="nw-stat-val">{stats.documents || 247}</div>
            <div className="nw-stat-sub">12 categories</div>
          </div>
          <div>
            <div className="nw-stat-label">Family Members</div>
            <div className="nw-stat-val">{stats.familyMembers || 5}</div>
            <div className="nw-stat-sub">3 with access</div>
          </div>
          <div>
            <div className="nw-stat-label">Active Alerts</div>
            <div className="nw-stat-val" style={{ color: '#fcd34d' }}>{stats.alerts || 3}</div>
            <div className="nw-stat-sub">Needs attention</div>
          </div>
          <div>
            <div className="nw-stat-label">AI Insights</div>
            <div className="nw-stat-val" style={{ color: '#6ee7b7' }}>6</div>
            <div className="nw-stat-sub">New today</div>
          </div>
        </div>
      </div>

      {/* AI INSIGHT STRIP */}
      <div className="insight-strip">
        <div className="insight-strip-icon">✦</div>
        <div className="insight-strip-text">
          <strong>6 AI insights need your attention today</strong>
          <p>Passport expiring in 47 days · Property tax due in 12 days · SIP rebalancing recommended</p>
        </div>
        <div className="insight-strip-actions">
          <button className="strip-btn-ghost">Dismiss</button>
          <button className="strip-btn-white" onClick={() => navigate('insights')}>View All →</button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard accent="blue" icon="₹" iconBg="var(--blue-light)" label="Net Worth"
          value={loading ? '…' : fmtK(nw)} sub="+₹52,400 this month" subUp />
        <StatCard accent="green" icon="📈" iconBg="var(--green-bg)" label="Total Assets"
          value={loading ? '…' : fmtK(stats.assets || 0)} sub="Across all classes" />
        <StatCard accent="red" icon="💳" iconBg="var(--red-bg)" label="Liabilities"
          value={loading ? '…' : fmtK(stats.liabilities || 0)} sub="Loans & EMIs" subDown />
        <StatCard accent="amber" icon="🗂" iconBg="var(--amber-bg)" label="Documents"
          value={stats.documents || 247} sub="3 expiring soon" />
      </div>

      {/* CHARTS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        {/* Performance Chart */}
        <div className="card card-blue">
          <div className="chart-header">
            <div>
              <div className="chart-title">Net Worth Performance</div>
              <div className="chart-subtitle">Monthly trend — last 12 months</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['6M','1Y','3Y'].map(p => (
                <button key={p} className="btn btn-xs btn-outline">{p}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '8px 20px 20px', height: 220 }}>
            <canvas ref={lineRef} />
          </div>
        </div>

        {/* Asset Allocation */}
        <div className="card">
          <div className="chart-header">
            <div>
              <div className="chart-title">Asset Allocation</div>
              <div className="chart-subtitle">Portfolio breakdown</div>
            </div>
          </div>
          <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <canvas ref={donutRef} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--txt4)', fontWeight: 600 }}>TOTAL</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)' }}>{fmtK(nw)}</span>
                </div>
              </div>
            </div>
            {ALLOC.map(a => (
              <div key={a.name} className="alloc-row">
                <div className="alloc-dot" style={{ background: a.color }} />
                <span className="alloc-name">{a.name}</span>
                <span className="alloc-pct">{a.pct}%</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 0 16px' }} />
        </div>
      </div>

      {/* TASKS + ALERTS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Tasks */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <CardHeader title="Pending Tasks" action={
              <button className="btn btn-xs btn-blue" onClick={() => navigate('calendar')}>+ Add</button>
            } />
          </div>
          <div style={{ paddingTop: 12 }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>Loading…</div>
            ) : tasks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>No tasks 🎉</div>
            ) : tasks.map(task => (
              <div key={task.id} className="task-item" onClick={() => toggleTask(task)}>
                <div className={`task-check${task.is_done ? ' done' : ''}`}>
                  {task.is_done ? '✓' : ''}
                </div>
                <span className={`task-title${task.is_done ? ' done' : ''}`}>{task.title}</span>
                {task.due_date && (
                  <span className="task-due" style={{ color: new Date(task.due_date) < new Date() ? 'var(--red)' : 'var(--txt4)' }}>
                    {fmtDate(task.due_date)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <CardHeader title="Recent Alerts" action={
              <button className="btn btn-xs btn-outline" onClick={() => navigate('notifications')}>View All</button>
            } />
          </div>
          <div style={{ paddingTop: 12 }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>All clear ✓</div>
            ) : alerts.map(alert => {
              const colors = { critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)', success: 'var(--green)' };
              const color = colors[alert.severity] || 'var(--blue)';
              return (
                <div key={alert.id} className="alert-item">
                  <div className="alert-dot" style={{ background: color }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>{alert.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt3)' }}>{alert.message?.slice(0,60)}…</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dismissAlert(alert.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--txt4)', cursor: 'pointer', padding: '0 4px', fontSize: 14 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="card" style={{ padding: 20 }}>
        <div className="section-label" style={{ marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[
            { icon: '📤', label: 'Upload Doc', page: 'documents' },
            { icon: '👤', label: 'Add Member', page: 'add-member' },
            { icon: '📊', label: 'Portfolio', page: 'portfolio' },
            { icon: '✦', label: 'AI Insights', page: 'insights' },
            { icon: '🗓', label: 'Calendar', page: 'calendar' },
            { icon: '🛡', label: 'Vault Audit', page: 'audit' },
          ].map(a => (
            <button key={a.page} className="quick-action" onClick={() => navigate(a.page)}>
              <span className="quick-action-icon">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
