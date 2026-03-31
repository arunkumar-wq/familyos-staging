import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { catIcon, catColor, fmtDate } from '../utils/formatters';
import { PageHeader, Modal, Badge, EmptyState } from '../components/UI';

const CATS = ['all','identity','finance','property','insurance','legal','education','medical','tax','other'];

export default function DocumentsPage({ navigate }) {
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({});
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'other', notes: '' });
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const fileInputRef = useRef();
  const [pendingFile, setPendingFile] = useState(null);

  useEffect(() => {
    loadDocs();
    api.get('/family/members').then(r => { setMembers(r.data); if (r.data[0]) setSelectedMember(r.data[0].id); });
  }, [cat, search]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (cat !== 'all') params.category = cat;
      if (search) params.search = search;
      const [docsRes, statsRes] = await Promise.all([api.get('/documents', { params }), api.get('/documents/stats')]);
      setDocs(docsRes.data);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setPendingFile(file);
    setUploadForm(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, ''), category: guessCat(file.name) }));
    setUploading(true);
    setAiResult(null);
    // Simulate AI analysis (2s delay)
    setTimeout(() => {
      setAiResult(simulateAI(file.name, uploadForm.category));
      setUploading(false);
    }, 2000);
  };

  const submitUpload = async () => {
    if (!pendingFile) return;
    const fd = new FormData();
    fd.append('file', pendingFile);
    fd.append('name', uploadForm.name);
    fd.append('category', uploadForm.category);
    fd.append('notes', uploadForm.notes);
    fd.append('ownerId', selectedMember);
    await api.post('/documents/upload', fd);
    setShowUpload(false); setPendingFile(null); setAiResult(null);
    loadDocs();
  };

  const deleteDoc = async (id) => {
    if (!window.confirm('Move this document to trash?')) return;
    await api.delete(`/documents/${id}`);
    setDocs(d => d.filter(x => x.id !== id));
  };

  const statusColor = s => ({ current: 'green', expiring: 'amber', expired: 'rose', review: 'amber' }[s] || 'navy');
  const statusLabel = s => ({ current: '✓ Current', expiring: '⏰ Expiring', expired: '✕ Expired', review: '⚠ Review' }[s] || s);

  return (
    <div className="page-inner">
      <PageHeader title="Document Vault" sub={`${stats.total || 0} documents · AI-managed · AES-256 encrypted`}>
        <button className="btn btn-outline" onClick={() => { setShowScan(true); setScanStep(0); }}>📷 Scan</button>
        <button className="btn btn-teal" onClick={() => { setShowUpload(true); setAiResult(null); setPendingFile(null); setUploading(false); }}>+ Upload</button>
      </PageHeader>

      {/* Stats bar */}
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '14px 0', marginBottom: 20 }}>
        {[['📁', stats.total || 0, 'Total'],['✨', stats.aiAnalyzed || 0, 'AI Filed'],['⏰', (stats.byStatus || []).find(x=>x.status==='expiring')?.c || 0, 'Expiring'],['⚠', (stats.byStatus || []).find(x=>x.status==='review')?.c || 0, 'Review Needed']].map(([ic,v,l],i) => (
          <div key={l} style={{ textAlign: 'center', padding: '0 20px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: i===2?'var(--amber)':i===3?'var(--red)':'var(--txt)' }}>{ic} {v}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', height: 38, flex: 1, minWidth: 200 }}>
          <span style={{ color: 'var(--txt3)' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: 'var(--txt)', background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{ height: 30, padding: '0 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1.5px solid ${cat===c?'var(--navy)':'var(--border)'}`, background: cat===c?'var(--navy)':'var(--surface)', color: cat===c?'#fff':'var(--txt2)', cursor: 'pointer', transition: 'all .15s', textTransform: 'capitalize' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Doc grid */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading…</div>
      ) : docs.length === 0 ? (
        <EmptyState icon="📄" title="No documents found" sub={search ? 'Try a different search' : 'Upload your first document to get started'} />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Member</th>
                <th>Category</th>
                <th>Status</th>
                <th>Expiry</th>
                <th>Size</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => {
                const ai = d.ai_summary ? JSON.parse(d.ai_summary) : null;
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: `var(--${catColor(d.category)}-bg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{catIcon(d.category)}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13 }}>{d.name}</div>
                          {ai?.type && <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{ai.type}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{d.member_name || '—'}</td>
                    <td><Badge color="gray">{d.category}</Badge></td>
                    <td><Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge></td>
                    <td style={{ fontSize: 13, color: d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 90*86400000) ? 'var(--amber)' : 'var(--txt3)' }}>
                      {d.expiry_date ? fmtDate(d.expiry_date) : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--txt4)' }}>{d.file_size || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {d.ai_analyzed && <Badge color="purple">✨ AI</Badge>}
                        <button className="btn btn-xs btn-blue">View</button>
                        <button className="btn btn-xs btn-outline" onClick={() => deleteDoc(d.id)} style={{ color: 'var(--red)' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Upload Modal */}
      {showUpload && (
        <Modal title="Upload Document" onClose={() => { setShowUpload(false); setPendingFile(null); setAiResult(null); }} maxWidth={580}
          footer={pendingFile && !uploading && (
            <>
              <button className="btn btn-outline" onClick={() => { setShowUpload(false); setPendingFile(null); setAiResult(null); }}>Cancel</button>
              <button className="btn btn-teal" onClick={submitUpload}>✓ Save to Vault</button>
            </>
          )}>
          {!pendingFile && !uploading && !aiResult && (
            <div
              className={`drop-zone${dragging ? ' active' : ''}`}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current.click()}
            >
              <div className="drop-zone-icon">📤</div>
              <div className="drop-zone-title">Drop files here or click to browse</div>
              <div className="drop-zone-sub">PDF, JPG, PNG, DOCX — up to 50 MB</div>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc" onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}
          {uploading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', animation: 'pulse 1s infinite' }}>✨</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt)' }}>AI is reading your document…</p>
              <p style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 6 }}>Extracting dates, expiry, and key details</p>
              <div style={{ marginTop: 20, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: '70%', height: '100%', background: 'var(--teal)', borderRadius: 2, animation: 'shimmer 1.5s ease infinite' }} />
              </div>
            </div>
          )}
          {aiResult && pendingFile && (
            <div>
              <div className="ai-result-box">
                <div className="ai-result-title">✨ AI Analysis Complete — {Math.round(aiResult.confidence * 100)}% confidence</div>
                {aiResult.fields.map((f, i) => <div key={i} className="ai-field">{f}</div>)}
                {aiResult.expiryDate && <div className="ai-field" style={{ color: 'var(--amber)', fontWeight: 600 }}>📅 Expiry detected: {fmtDate(aiResult.expiryDate)}</div>}
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Document Name</label>
                  <input className="form-input" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}>
                    {CATS.filter(c => c !== 'all').map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Belongs To</label>
                  <select className="form-select" value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
                    {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Detected Type</label>
                  <input className="form-input" value={aiResult.type} readOnly style={{ background: 'var(--surface2)' }} />
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Scan Modal */}
      {showScan && (
        <Modal title="Scan Document" onClose={() => { setShowScan(false); setScanStep(0); }} maxWidth={460}>
          {scanStep === 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 260, height: 200, background: '#111827', borderRadius: 14, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, var(--teal), transparent)', animation: 'scanLine 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 48, opacity: .6 }}>📷</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>Camera preview</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 20 }}>Position your document within the frame and capture</p>
              <button className="btn btn-teal" onClick={() => setScanStep(1)}>📷 Capture</button>
            </div>
          )}
          {scanStep === 1 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--purple-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px', animation: 'pulse 1s infinite' }}>✨</div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt)' }}>AI scanning document…</p>
              <p style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 6 }}>OCR + document recognition + field extraction</p>
              <button className="btn btn-teal" style={{ marginTop: 24 }} onClick={() => { setShowScan(false); setScanStep(0); setShowUpload(true); setPendingFile(null); setAiResult(simulateAI('scanned_document.jpg', 'identity')); setUploading(false); }}>Continue to Upload →</button>
            </div>
          )}
          <style>{`@keyframes scanLine{0%{top:0}50%{top:calc(100% - 3px)}100%{top:0}}`}</style>
        </Modal>
      )}
    </div>
  );
}

function guessCat(name) {
  const n = name.toLowerCase();
  if (n.includes('passport') || n.includes('aadhaar') || n.includes('pan') || n.includes('licence')) return 'identity';
  if (n.includes('insurance')) return 'insurance';
  if (n.includes('itr') || n.includes('tax')) return 'tax';
  if (n.includes('property') || n.includes('deed') || n.includes('loan')) return 'property';
  if (n.includes('medical') || n.includes('vaccination')) return 'medical';
  if (n.includes('marksheet') || n.includes('certificate') || n.includes('school')) return 'education';
  return 'other';
}

function simulateAI(filename, category) {
  const lower = filename.toLowerCase();
  if (lower.includes('passport')) return { type: 'Passport', issuer: 'MEA India', expiryDate: '2029-06-14', confidence: 0.97, fields: ['Document type: Passport', 'Issued by: MEA India', 'Expiry: 14 Jun 2029'] };
  if (lower.includes('aadhaar')) return { type: 'Aadhaar Card', issuer: 'UIDAI', expiryDate: null, confidence: 0.99, fields: ['Document type: Aadhaar', 'Issuer: UIDAI', 'Valid: Lifetime'] };
  if (lower.includes('insurance')) return { type: 'Insurance Policy', issuer: 'Insurer', expiryDate: new Date(Date.now() + 365*86400000).toISOString().split('T')[0], confidence: 0.94, fields: ['Document type: Insurance Policy', 'Premium detected', 'Expiry date extracted'] };
  if (lower.includes('itr') || lower.includes('tax')) return { type: 'Tax Return', issuer: 'Income Tax Dept', expiryDate: null, confidence: 0.96, fields: ['Document type: ITR', 'Assessment year detected', 'Tax amount found'] };
  return { type: 'Document', issuer: 'Unknown', expiryDate: null, confidence: 0.80, fields: ['Document detected', 'Category: ' + category, 'Manual review recommended'] };
}
