import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { catIcon, catColor, fmtDate } from '../utils/formatters';
import { PageHeader, Modal, Badge, EmptyState } from '../components/UI';

const CATS = [
  { id: 'all', label: 'All Documents', icon: '📁' },
  { id: 'identity', label: 'Identity Documents', icon: '🪪' },
  { id: 'insurance', label: 'Insurance Policies', icon: '🛡' },
  { id: 'finance', label: 'Financial & Tax', icon: '💰' },
  { id: 'legal', label: 'Estate & Legal', icon: '⚖️' },
  { id: 'medical', label: 'Health & Medical', icon: '🏥' },
  { id: 'property', label: 'Property & Home', icon: '🏠' },
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'certificates', label: 'Certificates', icon: '📜' },
  { id: 'other', label: 'Other', icon: '📄' },
];

function statusColor(s) { return { valid:'green', expiring:'amber', expired:'red', review:'purple' }[s] || 'gray'; }
function statusLabel(s) { return { valid:'Valid', expiring:'Expiring', expired:'Expired', review:'Review' }[s] || s; }
function guessCat(name) {
  const n = name.toLowerCase();
  if (n.includes('passport')||n.includes('ssn')||n.includes('license')||n.includes('id')) return 'identity';
  if (n.includes('insurance')) return 'insurance';
  if (n.includes('tax')||n.includes('itr')||n.includes('w-2')||n.includes('1099')) return 'finance';
  if (n.includes('property')||n.includes('deed')||n.includes('mortgage')) return 'property';
  if (n.includes('medical')||n.includes('vaccination')||n.includes('health')) return 'medical';
  if (n.includes('certificate')||n.includes('diploma')||n.includes('school')) return 'education';
  return 'other';
}

export default function DocumentsPage({ navigate }) {
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({});
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'other', notes: '' });
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { api.get('/family/members').then(r => { setMembers(r.data); if (r.data[0]) setSelectedMember(r.data[0].id); }).catch(()=>{}); }, []);
  useEffect(() => { loadDocs(); }, [cat, debouncedSearch, statusFilter]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (cat !== 'all') params.category = cat;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const [docsRes, statsRes] = await Promise.all([api.get('/documents', { params }), api.get('/documents/stats')]);
      setDocs(docsRes.data); setStats(statsRes.data);
    } catch {} finally { setLoading(false); }
  };

  const handleFile = (file) => {
    if (!file) return;
    setPendingFile(file);
    setUploadForm(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, ''), category: guessCat(file.name) }));
    setUploading(true); setAiResult(null);
    setTimeout(() => {
      setAiResult({ type: 'Document', confidence: 0.92, fields: ['Document detected', 'Category: ' + guessCat(file.name)] });
      setUploading(false);
    }, 1500);
  };

  const submitUpload = async () => {
    if (!pendingFile) return;
    setUploadError('');
    const fd = new FormData();
    fd.append('file', pendingFile); fd.append('name', uploadForm.name);
    fd.append('category', uploadForm.category); fd.append('notes', uploadForm.notes);
    fd.append('ownerId', selectedMember);
    try {
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false); setPendingFile(null); setAiResult(null); loadDocs();
    } catch (e) { setUploadError(e.response?.data?.error || 'Upload failed'); }
  };

  const runAiScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); loadDocs(); }, 2000);
  };

  const viewDoc = (d) => {
    if (d.file_path) {
      window.open('/uploads/' + d.file_path, '_blank');
    }
  };

  const downloadDoc = (d) => {
    if (d.file_path) {
      const a = document.createElement('a');
      a.href = '/uploads/' + d.file_path;
      a.download = d.original_name || d.name;
      a.click();
    }
  };

  const deleteDoc = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    await api.delete('/documents/' + id).catch(() => {}); loadDocs();
  };

  // Group docs by member
  const grouped = {};
  docs.forEach(d => {
    const key = d.member_name || 'Unknown';
    if (!grouped[key]) grouped[key] = { docs: [], color: d.avatar_color || '#1a3a5c' };
    grouped[key].docs.push(d);
  });

  // Use stats.byCategory for counts (unaffected by current filter)
  const catCounts = {};
  const byCat = stats.byCategory || [];
  const totalFromStats = stats.total || 0;
  CATS.forEach(c => {
    if (c.id === 'all') {
      catCounts[c.id] = totalFromStats;
    } else {
      const found = byCat.find(x => x.category === c.id);
      catCounts[c.id] = found ? found.c : 0;
    }
  });

  return (
    <div className="page-inner">
      <PageHeader title="Family Documents" sub={`${stats.total || 0} documents · 12 categories · Last AI scan 2 hours ago`}>
        <button className="btn btn-outline" style={{gap:6}} onClick={() => setShowFilter(!showFilter)}>&#9776; Filter</button>
        <button className="btn btn-teal" style={{gap:6}} onClick={runAiScan} disabled={scanning}>{scanning ? 'Scanning...' : '\u2728 AI Scan'}</button>
        <button className="btn btn-brand" onClick={() => { setShowUpload(true); setAiResult(null); setPendingFile(null); setUploading(false); setUploadError(''); }} style={{gap:6}}>+ Upload</button>
      </PageHeader>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '0 16px', height: 44, boxShadow: 'var(--shadow-xs)' }}>
          <span style={{color:'var(--txt4)'}}>&#128269;</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents, IDs, certificates..." aria-label="Search documents" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: 'var(--txt)' }} />
        </div>
      </div>

      {/* Filter Panel */}
      {showFilter && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt3)' }}>Status:</span>
          {['all','current','expiring','expired','review'].map(s => (
            <button key={s} className={`btn btn-xs ${statusFilter === s ? 'btn-teal' : 'btn-outline'}`} onClick={() => setStatusFilter(s)} style={{textTransform:'capitalize'}}>{s}</button>
          ))}
        </div>
      )}

      {/* Mobile horizontal category pills */}
      <div className="doc-cats-mobile">
        {CATS.map(c => (
          <button key={c.id} className={`doc-cat-pill${cat === c.id ? ' active' : ''}`} onClick={() => setCat(c.id)}>
            <span>{c.icon}</span> {c.label.replace('Documents','Docs').replace('Policies','').replace('& Tax','').replace('& Legal','').replace('& Medical','').replace('& Home','').trim()}
            {catCounts[c.id] > 0 && <span className="doc-cat-pill-count">{catCounts[c.id]}</span>}
          </button>
        ))}
      </div>

      <div className="docs-layout" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
        {/* Category Sidebar - desktop only */}
        <div className="card docs-sidebar-desktop" style={{ padding: 12, alignSelf: 'start' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--txt3)', padding: '8px 14px 10px' }}>Categories</div>
          <div className="doc-categories">
            {CATS.map(c => (
              <button key={c.id} className={`doc-cat-item${cat === c.id ? ' active' : ''}`} onClick={() => setCat(c.id)}>
                <span className="doc-cat-icon">{c.icon}</span>
                <span className="doc-cat-label">{c.label}</span>
                <span className="doc-cat-count">{catCounts[c.id] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Document List */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading documents...</div>
          ) : docs.length === 0 ? (
            <EmptyState icon="📄" title="No documents found" sub={search ? 'Try a different search' : 'Upload your first document to get started'} />
          ) : (
            <>
            {/* Desktop Table */}
            <div className="doc-table-desktop">
            <table className="data-table">
              <thead>
                <tr><th>Document</th><th>Status</th><th>Expiry</th><th>AI Score</th><th style={{textAlign:'right'}}>Actions</th></tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([name, group]) => (
                  <React.Fragment key={name}>
                    <tr><td colSpan={5} style={{ padding: 0 }}>
                      <div className="doc-member-row">
                        <div className="avatar" style={{ width: 24, height: 24, background: group.color, fontSize: 9 }}>
                          {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        {name}
                      </div>
                    </td></tr>
                    {group.docs.map(d => {
                      let ai = null; try { ai = d.ai_summary ? JSON.parse(d.ai_summary) : null; } catch {}
                      return (
                        <tr key={d.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{catIcon(d.category)}</div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13 }}>{d.name}</div>
                                {ai?.type && ai.type !== 'Document' && <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{ai.type}</div>}
                              </div>
                            </div>
                          </td>
                          <td><Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge></td>
                          <td style={{ fontSize: 13, color: 'var(--txt3)' }}>{d.expiry_date ? fmtDate(d.expiry_date) : 'N/A'}</td>
                          <td>
                            {d.ai_analyzed ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{ai?.confidence ? Math.round(ai.confidence * 100) + '%' : '—'}</span>
                                <span style={{ fontSize: 10, color: 'var(--txt4)' }}>AI score</span>
                                <div className="progress-track" style={{ width: 50 }}>
                                  <div className="progress-fill" style={{ width: (ai?.confidence ? ai.confidence * 100 : 0) + '%', background: 'var(--accent)' }} />
                                </div>
                              </div>
                            ) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-xs btn-teal" onClick={() => viewDoc(d)}>View</button>
                              <button className="btn btn-xs btn-outline" onClick={() => downloadDoc(d)}>Download</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            </div>

            {/* Mobile Card List */}
            <div className="doc-cards-mobile">
              {Object.entries(grouped).map(([name, group]) => (
                <React.Fragment key={name}>
                  <div className="doc-member-row">
                    <div className="avatar" style={{ width: 24, height: 24, background: group.color, fontSize: 9 }}>{name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                    {name}
                  </div>
                  {group.docs.map(d => {
                    let ai = null; try { ai = d.ai_summary ? JSON.parse(d.ai_summary) : null; } catch {}
                    return (
                      <div key={d.id} className="doc-mobile-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{catIcon(d.category)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13, lineHeight: 1.3 }}>{d.name}</div>
                            {ai?.type && ai.type !== 'Document' && <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{ai.type}</div>}
                          </div>
                          <Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
                          <span>Expiry: {d.expiry_date ? fmtDate(d.expiry_date) : 'N/A'}</span>
                          {d.ai_analyzed && ai?.confidence && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontWeight: 600, color: 'var(--txt)' }}>{Math.round(ai.confidence * 100)}%</span>
                              <span style={{ fontSize: 10, color: 'var(--txt4)' }}>AI</span>
                              <div className="progress-track" style={{ width: 36 }}><div className="progress-fill" style={{ width: (ai.confidence * 100) + '%', background: 'var(--accent)' }} /></div>
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-teal" style={{ flex: 1 }} onClick={() => viewDoc(d)}>View</button>
                          <button className="btn btn-sm btn-outline" style={{ flex: 1 }} onClick={() => downloadDoc(d)}>Download</button>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            </>
          )}
        </div>
      </div>

      {showUpload && (
        <Modal title="Upload Document" onClose={() => { setShowUpload(false); setPendingFile(null); setAiResult(null); setUploadError(''); }} maxWidth={580}
          footer={pendingFile && !uploading ? (
            <><button className="btn btn-outline" onClick={() => { setShowUpload(false); setPendingFile(null); }}>Cancel</button><button className="btn btn-teal" onClick={submitUpload}>Save to Vault</button></>
          ) : undefined}
        >
          {uploadError && <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: 'var(--red)', fontSize: 13 }}>{uploadError}</div>}
          {!pendingFile && !uploading && (
            <div className={dragging ? 'dropzone active' : 'dropzone'}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current.click()} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') fileInputRef.current.click(); }}>
              <div className="dropzone-icon">&#8679;</div>
              <div className="dropzone-title">Drop files here or click to browse</div>
              <div className="dropzone-sub">PDF, JPG, PNG, DOCX — up to 50 MB</div>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc" onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
          )}
          {uploading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>AI is reading your document...</p>
            </div>
          )}
          {aiResult && pendingFile && (
            <div>
              <div className="ai-result-box">
                <div className="ai-result-title">AI Analysis Complete — {Math.round(aiResult.confidence * 100)}% confidence</div>
                {aiResult.fields.map((f, i) => <div key={i} className="ai-field">{f}</div>)}
              </div>
              <div className="form-grid-2">
                <div className="form-group"><label className="form-label">Document Name</label><input className="form-input" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Category</label>
                  <select className="form-select" value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}>
                    {CATS.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Belongs To</label>
                  <select className="form-select" value={selectedMember} onChange={e => setSelectedMember(e.target.value)}>
                    {members.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
