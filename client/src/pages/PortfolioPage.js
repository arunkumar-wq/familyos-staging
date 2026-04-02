import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { fmtK, fmtUSD, assetColor } from '../utils/formatters';
import { PageHeader, Badge } from '../components/UI';
Chart.register(...registerables);

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const lineRef = useRef(); const lineChart = useRef();

  useEffect(() => { api.get('/portfolio/summary').then(r => setData(r.data)).catch(()=>{}).finally(() => setLoading(false)); }, []);

  // Net Worth Trend
  useEffect(() => {
    if (!data?.snapshots?.length || !lineRef.current) return;
    if (lineChart.current) lineChart.current.destroy();
    const ctx = lineRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 250);
    grad.addColorStop(0, 'rgba(10,158,158,.1)'); grad.addColorStop(1, 'rgba(10,158,158,0)');
    lineChart.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short' })),
        datasets: [
          { label: 'Net Worth', data: data.snapshots.map(s => s.net_worth), borderColor: '#0a9e9e', backgroundColor: grad, fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2.5 },
          { label: 'Assets', data: data.snapshots.map(s => s.total_assets), borderColor: '#3883f6', borderDash: [], tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
          { label: 'Liabilities', data: data.snapshots.map(s => s.total_liabilities), borderColor: '#dc2626', borderDash: [5, 5], tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true, padding: 16 } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtK(c.raw) } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af' } }, y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 }, color: '#9ca3af', callback: v => fmtK(v) } } },
      },
    });
    return () => { if (lineChart.current) lineChart.current.destroy(); };
  }, [data]);

  if (loading) return <div className="page-inner"><div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)' }}>Loading portfolio...</div></div>;

  const allocColors = { equities: '#0a9e9e', 'real-estate': '#1e429f', 'fixed-income': '#d97706', cash: '#059669', crypto: '#dc2626', gold: '#f59e0b', other: '#6b7280' };

  return (
    <div className="page-inner">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 24 }}>Net Worth &amp; Financial Portfolio</h1>

      {/* Hero Banner */}
      <div className="nw-banner">
        <div className="nw-stat-box assets">
          <div className="nw-stat-box-label">&#128200; Total Assets</div>
          <div className="nw-stat-box-value">{fmtUSD(data?.totalAssets || 0)}</div>
          <div className="nw-stat-box-change">&#8593; $178,200 (6.5%)</div>
        </div>
        <div className="nw-arrow">&minus; &gt;</div>
        <div className="nw-stat-box liabilities">
          <div className="nw-stat-box-label">&#128201; Total Liabilities</div>
          <div className="nw-stat-box-value">{fmtUSD(data?.totalLiabilities || 0)}</div>
          <div className="nw-stat-box-change">&#8595; $22,100 (2.8%)</div>
        </div>
        <div className="nw-arrow">= &gt;</div>
        <div className="nw-stat-box net">
          <div className="nw-stat-box-label">&#128176; Net Worth</div>
          <div className="nw-stat-box-value">{fmtUSD(data?.netWorth || 0)}</div>
          <div className="nw-stat-box-change">&#8593; $200,300 (7.5%)</div>
        </div>
      </div>

      {/* Chart + Accounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div style={{ padding: '18px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-label">Net Worth Trend (24 Months)</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['6M', '12M', '24M', 'ALL'].map(p => (
                <button key={p} className={`btn btn-xs ${p === '24M' ? 'btn-teal' : 'btn-outline'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 20px 20px', height: 280 }}><canvas ref={lineRef} /></div>
        </div>

        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}><div className="section-label">Accounts &amp; Assets</div></div>
          <div style={{ padding: '0 20px 20px' }}>
            {(data?.assets || []).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: assetColor(a.category), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>
                  {a.category === 'equities' ? '📈' : a.category === 'real-estate' ? '🏠' : a.category === 'cash' ? '💵' : a.category === 'crypto' ? '₿' : '💰'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{a.subtitle || a.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtUSD(a.value)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights + Allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}><div className="section-label">AI Portfolio Insights</div></div>
          <div style={{ padding: '0 20px 20px' }}>
            {[
              { color: '#059669', title: 'Rebalancing Recommended', body: 'Tech sector 8% above target. Shift to international equities.' },
              { color: '#0a9e9e', title: 'Tax-Loss Harvesting', body: '$4,200 harvestable crypto losses to offset capital gains.' },
              { color: '#dc2626', title: 'Risk Alert', body: 'Emergency fund covers 2.8 months. Target: 6 months.' },
            ].map((ins, i) => (
              <div key={i} style={{ borderLeft: `3px solid ${ins.color}`, padding: '10px 14px', marginBottom: 8, borderRadius: '0 var(--r-md) var(--r-md) 0', background: 'var(--surface2)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: ins.color }}>{ins.title}</div>
                <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>{ins.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}><div className="section-label">Allocation vs. Target</div></div>
          <div style={{ padding: '0 20px 20px' }}>
            {(data?.allocation || []).map(a => {
              const target = { equities: 50, 'real-estate': 26, 'fixed-income': 8, cash: 19, crypto: 4 }[a.category] || 10;
              return (
                <div key={a.category} className="alloc-bar-row">
                  <div className="alloc-bar-label" style={{ textTransform: 'capitalize' }}>{a.category.replace('-', ' ')}</div>
                  <div className="alloc-bar-track">
                    <div className="alloc-bar-fill" style={{ width: a.percentage + '%', background: allocColors[a.category] || '#6b7280' }} />
                    <div className="alloc-bar-target" style={{ left: target + '%' }} />
                  </div>
                  <div className="alloc-bar-value">Target: {target}%</div>
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--txt4)' }}>
              <span>&#9632; Target</span>
              <span style={{ color: 'var(--accent)' }}>&#9632; Actual</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
