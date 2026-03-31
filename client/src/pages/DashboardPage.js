import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtINR, fmtK, fmtDate } from '../utils/formatters';
import { StatCard, PageHeader, CardHeader } from '../components/UI';

Chart.register(...registerables);

const ALLOC = [
  { name: 'Real Estate',  pct: 38, color: '#1d4ed8' },
  { name: 'Equities',     pct: 32, color: '#0891b2' },
  { name: 'Fixed Income', pct: 18, color: '#d97706' },
  { name: 'Cash',         pct: 8,  color: '#7c3aed' },
  { name: 'Other',        pct: 4,  color: '#dc2626' },
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
      .then(([s, t, a]) => { setSummary(s.data); setTasks(t.data.slice(0, 5)); setAlerts(a.data.filter(x => !x.is_read).slice(0, 4)); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!summary?.snapshots?.length || !lineRef.current) return;
    if (lineChart.current) lineChart.current.destroy();
    const ctx = lineRef.current.getContext('2d');
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

  useEffect(() => {
    if (!donutRef.current) return;
    if (donutChart.current) donutChart.current.destroy();
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels: ALLOC.map(a => a.name), datasets: [{ data: ALLOC.map(a => a.pct), backgroundColor: ALLOC.map(a => a.color), borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, cutout: '72%', plugins: { legend: { display: false } } },
    });
    return () => { if (donutChart.current) donutChart.current.destroy(); };
  }, [summary]);

  const toggleTask = async (task) => {
    const upd = { ...task, is_done: !task.is_done };
    setTasks(ts => ts.map(t => t.id === task.id ? upd : t));
    await api.put('/tasks/' + task.id, upd).catch(() => {});
  };
  const dismissAlert = async (id) => {
    setAlerts(a => a.filter(x => x.id !== id));
    await api.put('/alerts/' + id + '/dismiss').catch(() => {});
  };

  const stats = summary?.stats || {};
  const nw = stats.netWorth || 0;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-inner">
      <div className="nw-banner">
        <div className="nw-greeting">{greet}, {user?.first_name}</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="nw-label">Total Net Worth</div>
            <div className="nw-value">{loading ? '--' : fmtINR(nw)}</div>
            <div className="nw-change">+Rs.52,400 this month / +2.1%</div>
          </div>
        </div>
        <div className="nw-stats">
          <div><div className="nw-stat-label">Documents</div><div className="nw-stat-val">{stats.documents || 247}</div><div className="nw-stat-sub">12 categories</div></div>
          <div><div className="nw-stat-label">Family Members</div><div className="nw-stat-val">{stats.familyMembers || 5}</div><div className="nw-stat-sub">3 with access</div></div>
          <div><div className="nw-stat-label">Active Alerts</div><div className="nw-stat-val" style={{ color: '#fcd34d' }}>{stats.alerts || 3}</div><div className="nw-stat-sub">Needs attention</div></div>
          <div><div className="nw-stat-label">AI Insights</div><div className="nw-stat-val" style={{ color: '#6ee7b7' }}>6</div><div className="nw-stat-sub">New today</div></div>
        </div>
      </div>

      <div className="insight-strip">
        <div className="insight-strip-icon">*</div>
        <div className="insight-strip-text">
          <strong>6 AI insights need your attention today</strong>
          <p>Passport expiring in 47 days - Property tax due in 12 days - SIP rebalancing recommended</p>
        </div>
        <div className="insight-strip-actions">
          <button className="strip-btn-ghost">Dismiss</button>
          <button className="strip-btn-white" onClick={() => navigate('insights')}>View All</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard accent="blue"  icon="Rs" iconBg="var(--blue-bg)"   label="Net Worth"    value={loading ? '...' : fmtK(nw)} sub="+Rs.52,400 this month" subUp />
        <StatCard accent="green" icon="+"  iconBg="var(--green-bg)"  label="Total Assets" value={loading ? '...' : fmtK(stats.assets || 0)} sub="Across all classes" />
        <StatCard accent="red"   icon="-"  iconBg="var(--red-bg)"    label="Liabilities"  value={loading ? '...' : fmtK(stats.liabilities || 0)} sub="Loans and EMIs" subDown />
        <StatCard accent="amber" icon="#"  iconBg="var(--amber-bg)"  label="Documents"    value={stats.documents || 247} sub="3 expiring soon" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
        <div className="card card-blue">
          <div className="chart-header">
            <div>
              <div className="chart-title">Net Worth Performance</div>
              <div className="chart-subtitle">Monthly trend - last 12 months</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['6M','1Y','3Y'].map(p => <button key={p} className="btn btn-xs btn-outline">{p}</button>)}
            </div>
          </div>
          <div style={{ padding: '8px 20px 20px', height: 220 }}><canvas ref={lineRef} /></div>
        </div>
        <div className="card">
          <div className="chart-header"><div><div className="chart-title">Asset Allocation</div><div className="chart-subtitle">Portfolio breakdown</div></div></div>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <CardHeader title="Pending Tasks" action={<button className="btn btn-xs btn-blue" onClick={() => navigate('calendar')}>+ Add</button>} />
          </div>
          <div style={{ paddingTop: 12 }}>
            {loading ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>Loading...</div>
            : tasks.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>No tasks</div>
            : tasks.map(task => (
              <div key={task.id} className="task-item" onClick={() => toggleTask(task)}>
                <div className={'task-check' + (task.is_done ? ' done' : '')}>{task.is_done ? 'v' : ''}</div>
                <span className={'task-title' + (task.is_done ? ' done' : '')}>{task.title}</span>
                {task.due_date && <span className="task-due" style={{ color: new Date(task.due_date) < new Date() ? 'var(--red)' : 'var(--txt4)' }}>{fmtDate(task.due_date)}</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header" style={{ paddingBottom: 0 }}>
            <CardHeader title="Recent Alerts" action={<button className="btn btn-xs btn-outline" onClick={() => navigate('notifications')}>View All</button>} />
          </div>
          <div style={{ paddingTop: 12 }}>
            {alerts.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--txt4)' }}>All clear</div>
            : alerts.map(alert => {
              const c = { critical: 'var(--red)', warning: 'var(--amber)', info: 'var(--blue)', success: 'var(--green)' }[alert.severity] || 'var(--blue)';
              return (
                <div key={alert.id} className="alert-item">
                  <div className="alert-dot" style={{ background: c }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', marginBottom: 2 }}>{alert.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--txt3)' }}>{(alert.message || '').slice(0, 60)}...</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); dismissAlert(alert.id); }} style={{ background: 'none', border: 'none', color: 'var(--txt4)', cursor: 'pointer', padding: '0 4px', fontSize: 14 }}>x</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="section-label" style={{ marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {[['Upload Doc','documents'],['Add Member','add-member'],['Portfolio','portfolio'],['AI Insights','insights'],['Calendar','calendar'],['Vault Audit','audit']].map(([l, p]) => (
            <button key={p} className="quick-action" onClick={() => navigate(p)}>
              <span className="quick-action-icon">+</span>{l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}