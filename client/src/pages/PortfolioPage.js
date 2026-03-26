import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { fmtK, fmtINR, assetColor } from '../utils/formatters';
import { PageHeader, Badge, StatCard } from '../components/UI';

Chart.register(...registerables);

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const barRef = useRef(); const barChart = useRef();
  const donutRef = useRef(); const donutChart = useRef();

  useEffect(() => {
    api.get('/portfolio/summary').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data?.snapshots?.length || !barRef.current) return;
    if (barChart.current) barChart.current.destroy();
    barChart.current = new Chart(barRef.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })),
        datasets: [
          { label: 'Assets (₹L)', data: data.snapshots.map(s => +(s.total_assets / 100000).toFixed(0)), backgroundColor: '#07b98a' },
          { label: 'Liabilities (₹L)', data: data.snapshots.map(s => +(s.total_liabilities / 100000).toFixed(0)), backgroundColor: 'rgba(244,63,94,.6)' },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 11 }, usePointStyle: true } } }, scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#8fa3c7' } },
        y: { grid: { color: 'rgba(15,31,61,.05)' }, ticks: { font: { size: 10 }, color: '#8fa3c7', callback: v => '₹' + v + 'L' } },
      }},
    });
    return () => { if (barChart.current) barChart.current.destroy(); };
  }, [data]);

  useEffect(() => {
    if (!data?.allocation?.length || !donutRef.current) return;
    if (donutChart.current) donutChart.current.destroy();
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: data.allocation.map(a => a.category),
        datasets: [{ data: data.allocation.map(a => +a.percentage), backgroundColor: data.allocation.map(a => assetColor(a.category)), borderWidth: 0, hoverOffset: 4 }],
      },
      options: { responsive: true, cutout: '70%', plugins: { legend: { display: false } } },
    });
    return () => { if (donutChart.current) donutChart.current.destroy(); };
  }, [data]);

  if (loading) return <div className="page-inner"><div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)' }}>Loading portfolio…</div></div>;

  return (
    <div className="page-inner">
      <PageHeader title="Portfolio Dashboard" sub="Net worth tracker · Real-time">
        <button className="btn btn-outline">📥 Export</button>
        <button className="btn btn-outline">+ Add Asset</button>
        <button className="btn btn-teal">🔗 Connect Account</button>
      </PageHeader>

      {/* Hero banner */}
      <div className="nw-banner">
        <div className="nw-label">Total Net Worth</div>
        <div className="nw-value">{fmtK(data?.netWorth || 0)}</div>
        <div className="nw-change">▲ ₹52,400 (+2.9%) this month</div>
        <div className="nw-stats">
          {[['Total Assets', fmtK(data?.totalAssets || 0), '▲ +₹48K this month'],
            ['Total Liabilities', fmtK(data?.totalLiabilities || 0), '▼ -₹3.8K this month'],
            ['Annual Income', '₹24.0 L', 'Salary + returns'],
            ['Savings Rate', '34%', '▲ +2% from last yr']].map(([l,v,s]) => (
            <div key={l}>
              <div className="nw-stat-label">{l}</div>
              <div className="nw-stat-val">{v}</div>
              <div className="nw-stat-sub">{s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="chart-header">
            <span className="chart-label">Assets vs Liabilities</span>
            <select style={{ fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', background: 'var(--surface2)', outline: 'none', color: 'var(--txt2)' }}>
              <option>12 months</option>
            </select>
          </div>
          <div style={{ padding: '12px 20px 20px', height: 200 }}><canvas ref={barRef} /></div>
        </div>
        <div className="card">
          <div className="chart-header"><span className="chart-label">Asset Allocation</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', padding: '8px 20px 18px', gap: 16 }}>
            <div style={{ width: 140, height: 140 }}><canvas ref={donutRef} /></div>
            <div>
              {(data?.allocation || []).map(a => (
                <div key={a.category} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: assetColor(a.category), display: 'inline-block' }} />
                      {a.category.replace('-', ' ')}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{fmtK(a.value)}</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: a.percentage + '%', background: assetColor(a.category) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assets table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Assets</span>
          <button className="btn btn-outline btn-sm">+ Add Asset</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              {['Asset','Category','Current Value','Allocation','Actions'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(data?.assets || []).map(a => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{a.subtitle}</div>
                  </td>
                  <td><Badge color={a.category === 'equities' ? 'teal' : a.category === 'real-estate' ? 'amber' : a.category === 'cash' ? 'violet' : 'navy'}>{a.category.replace('-', ' ')}</Badge></td>
                  <td style={{ fontWeight: 600 }}>{fmtK(a.value)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="progress-track" style={{ flex: 1, minWidth: 60 }}>
                        <div className="progress-fill" style={{ width: ((a.value / (data?.totalAssets || 1)) * 100).toFixed(0) + '%', background: 'var(--navy)' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{((a.value / (data?.totalAssets || 1)) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm">Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: 'var(--rose)', borderColor: 'var(--rose)' }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liabilities table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Liabilities</span>
          <button className="btn btn-outline btn-sm">+ Add Liability</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              {['Liability','Type','Balance','Rate','Monthly EMI','Actions'].map(h => <th key={h}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(data?.liabilities || []).map(l => (
                <tr key={l.id}>
                  <td><div style={{ fontWeight: 600 }}>{l.name}</div><div style={{ fontSize: 11, color: 'var(--txt3)' }}>{l.subtitle}</div></td>
                  <td><Badge color="amber">{l.category}</Badge></td>
                  <td style={{ fontWeight: 600 }}>{fmtK(l.balance)}</td>
                  <td style={{ color: 'var(--txt2)' }}>{l.interest_rate}%</td>
                  <td><Badge color="navy">{fmtINR(l.emi)}</Badge></td>
                  <td><button className="btn btn-outline btn-sm">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
