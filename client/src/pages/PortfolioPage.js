import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import api from '../utils/api';
import { fmtK, fmtUSD, assetColor } from '../utils/formatters';
import { PageHeader, Badge, Modal } from '../components/UI';
Chart.register(...registerables);

export default function PortfolioPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24M');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: '', subtitle: '', category: 'equities', value: '', currency: 'USD', institution: ''
  });
  const [addingAsset, setAddingAsset] = useState(false);
  const aiFileInputRef = useRef(null);
  const [aiImportFile, setAiImportFile] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const lineRef = useRef(); const lineChart = useRef();

  useEffect(() => { api.get('/portfolio/summary').then(r => setData(r.data)).catch(()=>{}).finally(() => setLoading(false)); }, []);

  const reloadData = () => {
    api.get('/portfolio/summary').then(r => setData(r.data)).catch(()=>{});
  };

  const addAsset = async () => {
    if (!assetForm.name.trim() || !assetForm.value) return;
    setAddingAsset(true);
    try {
      await api.post('/portfolio/assets', {
        name: assetForm.name.trim(),
        subtitle: assetForm.subtitle,
        category: assetForm.category,
        value: parseFloat(assetForm.value),
        currency: assetForm.currency,
        institution: assetForm.institution
      });
      setShowAddAsset(false);
      setAssetForm({ name: '', subtitle: '', category: 'equities', value: '', currency: 'USD', institution: '' });
      reloadData();
    } catch (e) {
      alert('Failed to add asset: ' + (e.response?.data?.error || e.message));
    }
    setAddingAsset(false);
  };

  const runAIImport = async () => {
    if (!aiImportFile) {
      if (aiFileInputRef.current) aiFileInputRef.current.click();
      return;
    }

    setAiImporting(true);

    const fd = new FormData();
    fd.append('file', aiImportFile);

    try {
      const resp = await api.post('/portfolio/ai-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { totalExtracted } = resp.data;

      setShowAIImport(false);
      setAiImportFile(null);
      reloadData();

      if (totalExtracted === 0) {
        alert('Could not detect any assets. Try a clearer statement or add manually.');
      }
    } catch (e) {
      alert('AI Import failed: ' + (e.response?.data?.error || e.message));
    }
    setAiImporting(false);
  };

  const resetPortfolio = async () => {
    setResetting(true);
    try {
      await api.post('/portfolio/reset');
      setShowResetConfirm(false);
      reloadData();
    } catch (e) {
      alert('Reset failed: ' + (e.response?.data?.error || e.message));
    }
    setResetting(false);
  };

  const handleAiFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAiImportFile(file);
    }
  };

  // Net Worth Trend
  useEffect(() => {
    if (!data?.snapshots?.length || !lineRef.current) return;
    if (lineChart.current) lineChart.current.destroy();
    const periodMap = { '6M': 6, '12M': 12, '24M': 24, 'ALL': 999 };
    const sliceCount = periodMap[period] || 24;
    const snapshots = data.snapshots.slice(-sliceCount);
    const ctx = lineRef.current.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 250);
    grad.addColorStop(0, 'rgba(10,158,158,.1)'); grad.addColorStop(1, 'rgba(10,158,158,0)');
    lineChart.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: snapshots.map(s => new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short' })),
        datasets: [
          { label: 'Net Worth', data: snapshots.map(s => s.net_worth), borderColor: '#0a9e9e', backgroundColor: grad, fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2.5 },
          { label: 'Assets', data: snapshots.map(s => s.total_assets), borderColor: '#3883f6', borderDash: [], tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
          { label: 'Liabilities', data: snapshots.map(s => s.total_liabilities), borderColor: '#dc2626', borderDash: [5, 5], tension: 0.4, pointRadius: 0, borderWidth: 1.5 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true, padding: 16 } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtK(c.raw) } } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#9ca3af' } }, y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 10 }, color: '#9ca3af', callback: v => fmtK(v) } } },
      },
    });
    return () => { if (lineChart.current) lineChart.current.destroy(); };
  }, [data, period]);

  if (loading) return <div className="page-inner"><div style={{ padding: 60, textAlign: 'center', color: 'var(--txt3)' }}>Loading portfolio...</div></div>;

  const allocColors = { equities: '#0a9e9e', 'real-estate': '#1e429f', 'fixed-income': '#d97706', cash: '#059669', crypto: '#dc2626', gold: '#f59e0b', other: '#6b7280' };

  return (
    <div className="page-inner">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="dash-greeting-title" style={{ margin: 0 }}>Net Worth &amp; Financial Portfolio</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setShowResetConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', borderColor: '#fecaca' }} title="Delete all user-added assets (keep demo data)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            Reset
          </button>
          <button className="btn btn-outline" onClick={() => setShowAIImport(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            AI Import
          </button>
          <button className="btn btn-teal" onClick={() => setShowAddAsset(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Add Asset
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="nw-banner">
        <div className="nw-stat-box assets">
          <div className="nw-stat-box-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10m-6 10V4M6 20v-6"/></svg>
            Total Assets
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'auto'}}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </div>
          <div className="nw-stat-box-value">{fmtUSD(data?.totalAssets || 0)}</div>
          <div className="nw-stat-box-change" style={{color:'#6ee7b7'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>
            $178,200 (6.5%)
          </div>
        </div>
        <div className="nw-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="14 7 19 12 14 17"/></svg>
        </div>
        <div className="nw-stat-box liabilities">
          <div className="nw-stat-box-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            Total Liabilities
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'auto'}}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </div>
          <div className="nw-stat-box-value">{fmtUSD(data?.totalLiabilities || 0)}</div>
          <div className="nw-stat-box-change" style={{color:'#fca5a5'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m7-7l-7 7-7-7"/></svg>
            $22,100 (2.8%)
          </div>
        </div>
        <div className="nw-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><line x1="5" y1="8" x2="19" y2="8"/></svg>
        </div>
        <div className="nw-stat-box net">
          <div className="nw-stat-box-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Net Worth
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'auto'}}><path d="M12 2l9 4v6c0 5.25-3.75 10.15-9 11.5C6.75 22.15 3 17.25 3 12V6l9-4z"/></svg>
          </div>
          <div className="nw-stat-box-value">{fmtUSD(data?.netWorth || 0)}</div>
          <div className="nw-stat-box-change" style={{color:'#93c5fd'}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>
            $200,300 (7.5%)
          </div>
        </div>
      </div>

      {/* Chart + Accounts */}
      <div className="dash-grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div style={{ padding: '18px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="section-label">Net Worth Trend (24 Months)</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['6M', '12M', '24M', 'ALL'].map(p => (
                <button key={p} className={`btn btn-xs ${p === period ? 'btn-teal' : 'btn-outline'}`} onClick={() => setPeriod(p)}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 20px 20px', height: 280 }}><canvas ref={lineRef} /></div>
        </div>

        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}><div className="section-label">Accounts &amp; Assets</div></div>
          <div style={{ padding: '0 20px 20px' }}>
            {(data?.assets || []).map(a => {
              const iconMap = {
                equities: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
                'real-estate': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10"/></svg>,
                cash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
                crypto: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>,
                'fixed-income': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l9 4v6c0 5.25-3.75 10.15-9 11.5C6.75 22.15 3 17.25 3 12V6l9-4z"/></svg>,
                gold: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
              };
              return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: assetColor(a.category), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {iconMap[a.category] || iconMap.cash}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{a.subtitle || a.category}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtUSD(a.value)}</div>
                </div>
              </div>
            );})}
          </div>
        </div>
      </div>

      {/* AI Insights + Allocation */}
      <div className="dash-grid-2">
        <div className="card">
          <div style={{ padding: '18px 20px 14px' }}><div className="section-label">AI Portfolio Insights</div></div>
          <div style={{ padding: '0 20px 20px' }}>
            {[
              { color: '#059669', bg: 'var(--green-bg)', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>, title: 'Rebalancing Recommended', body: 'Tech sector 8% above target. Shift to international equities.' },
              { color: '#0a9e9e', bg: 'var(--teal-bg)', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a9e9e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>, title: 'Tax-Loss Harvesting', body: '$4,200 harvestable crypto losses to offset capital gains.' },
              { color: '#dc2626', bg: 'var(--red-bg)', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01"/></svg>, title: 'Risk Alert', body: 'Emergency fund covers 2.8 months. Target: 6 months.' },
            ].map((ins, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, borderLeft: `3px solid ${ins.color}`, padding: '10px 14px', marginBottom: 8, borderRadius: '0 var(--r-md) var(--r-md) 0', background: 'var(--surface2)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: ins.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ins.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: ins.color }}>{ins.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 2 }}>{ins.body}</div>
                </div>
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

      {showAddAsset && (
        <Modal title="Add New Asset" onClose={() => setShowAddAsset(false)} footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowAddAsset(false)}>Cancel</button>
            <button className="btn btn-teal" onClick={addAsset} disabled={!assetForm.name.trim() || !assetForm.value || addingAsset}>
              {addingAsset ? 'Adding...' : 'Add Asset'}
            </button>
          </>
        }>
          <div className="form-group">
            <label className="form-label">Asset Name</label>
            <input className="form-input" value={assetForm.name} onChange={e => setAssetForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Vanguard Brokerage" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" value={assetForm.subtitle} onChange={e => setAssetForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g., Taxable Stocks + ETFs" />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={assetForm.category} onChange={e => setAssetForm(f => ({ ...f, category: e.target.value }))}>
                <option value="equities">Equities / Stocks</option>
                <option value="real-estate">Real Estate</option>
                <option value="fixed-income">Fixed Income</option>
                <option value="cash">Cash / Savings</option>
                <option value="crypto">Crypto</option>
                <option value="gold">Gold / Precious Metals</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Value (USD)</label>
              <input type="number" className="form-input" value={assetForm.value} onChange={e => setAssetForm(f => ({ ...f, value: e.target.value }))} placeholder="100000" min="0" step="1" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Institution (optional)</label>
            <input className="form-input" value={assetForm.institution} onChange={e => setAssetForm(f => ({ ...f, institution: e.target.value }))} placeholder="e.g., Charles Schwab, Chase Bank" />
          </div>
        </Modal>
      )}

      {showResetConfirm && (
        <Modal title="Reset Portfolio" onClose={() => !resetting && setShowResetConfirm(false)} footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowResetConfirm(false)} disabled={resetting}>Cancel</button>
            <button className="btn" style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }} onClick={resetPortfolio} disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Portfolio'}
            </button>
          </>
        }>
          <div style={{ padding: '14px 16px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>This will delete all your added assets</div>
                <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                  Assets added via "Add Asset" and "AI Import" will be permanently deleted. Original demo data will remain.
                </div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6 }}>
            <strong>Deleted:</strong> All user-added assets<br/>
            <strong>Kept:</strong> Demo portfolio data (Schwab, Apple, TSLA, Bitcoin, Home, etc.)
          </div>
        </Modal>
      )}

      {showAIImport && (
        <Modal title="AI Import Assets" onClose={() => !aiImporting && setShowAIImport(false)} footer={
          !aiImporting ? (
            <>
              <button className="btn btn-outline" onClick={() => { setShowAIImport(false); setAiImportFile(null); }}>Cancel</button>
              <button className="btn btn-teal" onClick={runAIImport} disabled={!aiImportFile}>
                {aiImportFile ? 'Import with AI' : 'Upload File First'}
              </button>
            </>
          ) : null
        }>
          {!aiImporting ? (
            <div>
              <input
                type="file"
                ref={aiFileInputRef}
                onChange={handleAiFileSelect}
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }}
              />

              <div style={{ padding: '14px 16px', background: '#e0f5f0', border: '1px solid #0a9e9e', borderRadius: 8, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 6 }}>🤖 How AI Import Works</div>
                <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.6 }}>
                  Upload a bank or brokerage statement (PDF/image). AI will automatically extract all accounts, holdings, and balances — then add them to your portfolio.
                </div>
              </div>

              {!aiImportFile ? (
                <button
                  onClick={() => aiFileInputRef.current?.click()}
                  style={{
                    width: '100%', padding: '30px 20px', border: '2px dashed var(--border2)',
                    borderRadius: 12, background: 'var(--surface2)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    transition: 'all 150ms'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0a9e9e'; e.currentTarget.style.background = '#e0f5f0'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surface2)'; }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt)' }}>Click to upload statement</div>
                  <div style={{ fontSize: 11, color: 'var(--txt4)' }}>PDF, JPG, or PNG · Max 10MB</div>
                </button>
              ) : (
                <div style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{aiImportFile.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{(aiImportFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button onClick={() => setAiImportFile(null)} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--txt3)', cursor: 'pointer', padding: 4 }}>&times;</button>
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--txt4)', marginTop: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
                💡 Tip: Use your most recent monthly statement for the most accurate import
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 30 }}>
              <div style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg, #0a9e9e, #3883f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease infinite' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)', marginBottom: 6 }}>AI Analyzing Statement...</div>
              <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Extracting accounts · Reading balances · Detecting holdings</div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
