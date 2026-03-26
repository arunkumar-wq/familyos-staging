import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { fmtK, fmtDate } from '../utils/formatters';
import { StatCard, PageHeader } from '../components/UI';

Chart.register(...registerables);

const ALLOC = [
  { name: 'Real Estate', pct: 38, color: '#0f1f3d' },
  { name: 'Equities', pct: 32, color: '#07b98a' },
  { name: 'Fixed Income', pct: 18, color: '#f59e0b' },
  { name: 'Cash', pct: 8, color: '#7c3aed' },
  { name: 'Other', pct: 4, color: '#f43f5e' },
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
      .then(([s, t, a]) => { setSummary(s.data); setTasks(t.data); setAlerts(a.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!summary?.snapshots?.length || !lineRef.current) return;
    if (lineChart.current) lineChart.current.destroy();
    const ctx = lineRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(7,185,138,.18)');
    grad.addColorStop(1, 'rgba(7,185,138,0)');
    lineChart.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: summary.snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-IN', { month: 'short' })),
        datasets: [{ data: summary.snapshots.map(s => +(s.net_worth / 100000).toFixed(1)), borderColor: '#07b98a', backgroundColor: grad, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#07b98a', borderWidth: 2 }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#8fa3c7' } },
        y: { grid: { color: 'rgba(15,31,61,.05)' }, ticks: { font: { size: 10 }, color: '#8fa3c7', callback: v => '₹' + v + 'L' } },
      }},
    });
    return () => { if (lineChart.current) lineChart.current.destroy(); };
  }, [summary]);

  useEffect(() => {
    if (!donutRef.current) return;
    if (donutChart.current) donutChart.current.destroy();
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels: ALLOC.map(a => a.name), datasets: [{ data: ALLOC.map(a => a.pct), backgroundColor: ALLOC.map(a => a.color), borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, cutout: '70%', plugins: { legend: { display: false } } },
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

  return (
    <div className="page-inner">
      <PageHeader title={`Good morning, ${user?.first_name} ☀`} sub="Here's your family command center overview">
        <button className="btn btn-outline" onClick={() => navigate('documents')}>📤 Upload Doc</button>
        <button className="btn btn-teal" onClick={() => navigate('insights')}>✨ AI Insights</button>
      </PageHeader>

      {/* AI Insight strip */}
      <div className="insight-strip">
        <div className="insight-strip-icon">✨</div>
        <div className="insight-strip-text">
          <strong>6 AI insights need your attention today</strong>
          <p>Passport expiring in 47 days · Property tax due in 12 days</p>
        </div>
        <div className="insight-strip-actions">
          <button className="strip-btn-ghost">Dismiss</button>
          <button className="strip-btn-teal" onClick={() => navigate('insights')}>View All →</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard icon="₹" iconBg="var(--teal-bg)" label="Net Worth" value={loading ? '…' : fmtK(stats.netWorth || 0)} sub="+₹52,400 this month" subUp />
        <StatCard icon="📄" iconBg="var(--blue-bg)" label="Documents" value={loading ? '…' : (stats.docsCount || 0)} sub={`${stats.expiringCount || 0} need attention`} />
        <StatCard icon="⚠" iconBg="var(--amber-bg)" label="Alerts" value={loading ? '…' : (stats.alertsCount || 0)} sub="2 urgent this week" />
        <StatCard icon="👥" iconBg="var(--violet-bg)" label="Family" value={loading ? '…' : (stats.membersCount || 0)} sub="Members active" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="chart-header">
            <span className="chart-label">Net Worth Trend</span>
            <select style={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', background: 'var(--surface2)', outline: 'none', color: 'var(--txt2)' }}>
              <option>12 months</option><option>6 months</option>
            </select>
          </div>
          <div style={{ padding: '12px 20px 20px', height: 200 }}><canvas ref={lineRef} /></div>
        </div>
        <div className="card">
          <div className="chart-header"><span className="chart-label">Asset Allocation</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', padding: '8px 20px 18px', gap: 16 }}>
            <div style={{ width: 140, height: 140 }}><canvas ref={donutRef} /></div>
            <div>{ALLOC.map(a => (
              <div key={a.name} className="alloc-row">
                <div className="alloc-dot" style={{ background: a.color }} />
                <span className="alloc-name">{a.name}</span>
                <span className="alloc-pct">{a.pct}%</span>
              </div>
            ))}</div>
          </div>
        </div>
      </div>

      {/* Bottom 3-col */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        {/* Alerts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Alerts</span>
            <button onClick={() => navigate('notifications')} style={{ fontSize: 12, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all</button>
          </div>
          {alerts.slice(0, 4).map(a => (
            <div key={a.id} className="alert-item" onClick={() => dismissAlert(a.id)}>
              <div className="alert-dot" style={{ background: a.type === 'urgent' ? 'var(--rose)' : a.type === 'warning' ? 'var(--amber)' : 'var(--teal)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--txt)', lineHeight: 1.4 }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{a.icon} {a.type}</div>
              </div>
            </div>
          ))}
          {!loading && !alerts.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>No active alerts 🎉</div>}
        </div>

        {/* Tasks */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Tasks</span>
            <button style={{ fontSize: 12, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
          </div>
          {tasks.slice(0, 7).map(t => (
            <div key={t.id} className="task-item" onClick={() => toggleTask(t)}>
              <div className={`task-check${t.is_done ? ' done' : ''}`}>{t.is_done ? '✓' : ''}</div>
              <span className={`task-title${t.is_done ? ' done' : ''}`}>{t.title}</span>
              <span className="task-due" style={{ color: t.is_urgent && !t.is_done ? 'var(--rose)' : 'var(--txt3)' }}>
                {t.due_date ? fmtDate(t.due_date) : '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Quick actions + activity */}
        <div className="card">
          <div style={{ padding: '16px 20px 10px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px 16px' }}>
            {[['📤','Upload Doc','documents'],['📷','Scan Doc','documents'],['📊','Portfolio','portfolio'],['👥','Add Member','add-member'],['🛡','Vault Audit','audit'],['✨','AI Insights','insights']].map(([ic,lb,pg]) => (
              <button key={lb} className="quick-action" onClick={() => navigate(pg)}>
                <span className="quick-action-icon">{ic}</span>{lb}
              </button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Recent Activity</div>
            {(summary?.recentActivity || []).slice(0, 4).map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>📄</div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--txt)' }}>{a.action.replace(/\./g, ' ')}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{a.user_name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
