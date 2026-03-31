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
      type: 'bar', data: { labels: data.snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-IN', { month: 'short' })),
        datasets: [{ label: 'Assets (₹L)', data: data.snapshots.map(s => +(s.total_assets / 100000).toFixed(0)), backgroundColor: '#1a56db' },
        { label: 'Liabilities', data: data.snapshots.map(s => +(s.total_liabilities / 100000).toFixed(0)), backgroundColor: 'rgba(244,63,94,.6)' }]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9aa3c7' } }, y: { ticks: { font: { size: 10 }, color: '#9aa3c7', callback: v => '₹' + v + 'L' } } } },
    });
    return () => { if (barChart.current) barChart.current.destroy(); };
  }, [data]);

  useEffect(() => {
    if (!data?.allocation?.length || !donutRef.current) return;
    if (donutChart.current) donutChart.current.destroy();
    donutChart.current = new Chart(donutRef.current.getContext('2d'), {
      type: 'doughnut',
      data: { labels: data.allocation.map(a => a.category), datasets: [{ data: data.allocation.map(a => +a.percentage), backgroundColor: data.allocation.map(a => assetColor(a.category)), borderWidth: 0 }] },
      options: { responsive: true, cutout: '70%', plugins: { legend: { display: false } } },
    });
    return () => { if (donutChart.current) donutChart.current.destroy(); };
  }, [data]);

  if (loading) return <div className="page-inner"><div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)' }}>Looding…</div></div>;

  return (
    <div className="page-inner">
      <PageHeader title="Portfolio" sub="Net worth tracker · Real-time">
        <button className="btn btn-outline">+ Add Asset</button>
        <button className="btn btn-teal">⚙ Connect Account</button>
      </PageHeader>
      <div className="nw-banner-port">
        <div className="nw-label">Total Net Worth</div>
        <div className="nw-value">{fmtK(data?.netWorth || 0)}</div>
        <div className="nw-change">▲ ₹52,400 (+2.9%) this month</div>
        <div className="nw-stats">
          {[['Total Assets', fmtK(data?.totalAssets || 0)], ['Liabilities', fmtK(data?.totalLiabilities || 0)], ['Assets', (data?.assets || []).length+' items'], ['Liabilities', (data?.liabilities || []).length+' items']].map(([l,v])=>(
            <div key={l}><div className="nw-stat-label">{l}</div><div className="nw-stat-val">{v}</div></div>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="chart-header"><span className="chart-title">Assets vs Liabilities</span></div>
          <div style={{ padding: '0 20px 20px', height: 220 }}><canvas ref={barRef} /></div>
        </div>
        <div className="card">
          <div className="chart-header"><span className="chart-title">Allocation</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', padding: '0 20px 20px', gap: 16 }}>
            <div style={{ width: 130, height: 130 }}><canvas ref={donutRef} /></div>
            <div>{(data?.allocation || []).map(a => (
              <div key={a.category} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: assetColor(a.category), display: 'inline-block' }} />
                    {a.category.replace('-', ' ')}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{a.percentage}%</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: a.percentage+'%', background: assetColor(a.category) }} /></div>
              </div>
            ))}</div>
          </div>
        </div>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Assets</span>
          <button className="btn btn-primary btn-sm">+ Add Asset</button>
        </div>
        <table className="data-table">
          <thead><tr>{['Asset','Category','Value','Allocation','Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{(data?.assets || []).map(a => (
            <tr key={a.id}>
              <td><div style={{ fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 11, color: 'var(--txt4)' }}>{a.subtitle}</div></td>
              <td><Badge color="gray">{a.category.replace('-',' ')}</Badge></td>
              <td style={{ fontWeight: 600 }}>{fmtK(a.value)}</td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="progress-track" style={{ flex: 1, minWidth: 40 }}><div className="progress-fill" style={{ width: ((a.value/(data?.totalAssets||1))*100).toFixed(0)+'%', background: '#1a56db' }} /></div>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{((a.value/(data?.totalAssets||1))*100).toFixed(0)}%</span>
                </div>
              </td>
              <td><button className="btn btn-outline btn-sm">Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
