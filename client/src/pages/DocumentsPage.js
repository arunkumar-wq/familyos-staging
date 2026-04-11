import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { catIcon, fmtDate } from '../utils/formatters';
import { PageHeader, Modal, Badge, EmptyState } from '../components/UI';
import { useAuth } from '../context/AuthContext';

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
  if (n.includes('passport') || n.includes('ssn') || n.includes('license') || n.includes('driver')) return 'identity';
  if (n.includes('birth_cert') || n.includes('birth certificate')) return 'identity';
  if (n.includes('insurance') || n.includes('policy_')) return 'insurance';
  if (n.includes('tax_') || n.includes('w-2') || n.includes('w2_') || n.includes('1099') || n.includes('1040')) return 'tax';
  if (n.includes('deed') || n.includes('property_') || n.includes('mortgage')) return 'property';
  if (n.includes('medical_') || n.includes('health_') || n.includes('medicare') || n.includes('prescription')) return 'medical';
  if (n.includes('diploma') || n.includes('transcript')) return 'education';
  return 'other';
}

export default function DocumentsPage({ navigate }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [stats, setStats] = useState({});
  const [cat, setCat] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ name: '', category: 'other', notes: '' });
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [scanning, setScanning] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { api.get('/family/members').then(r => { setMembers(r.data); }).catch(()=>{}); }, []);
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
    // Auto-detect member from filename
    const fname = file.name.toLowerCase();
    const matchedMember = members.find(m => fname.includes(m.first_name.toLowerCase()));
    if (matchedMember) {
      setSelectedMember(matchedMember.id);
    }
    setUploadStep(2);
    setShowUpload(true);
  };

  const submitUpload = async () => {
    if (!pendingFile || !selectedMember || !uploadForm.category) return;
    setUploading(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('file', pendingFile); fd.append('name', uploadForm.name);
    fd.append('category', uploadForm.category); fd.append('notes', uploadForm.notes);
    fd.append('ownerId', selectedMember);
    try {
      const resp = await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const ai = resp.data?.aiSummary || resp.data?.ai_summary;
      const fieldCount = ai && ai.extractedFields ? Object.keys(ai.extractedFields).length : 0;
      setToast(fieldCount ? `Document uploaded! AI extracted ${fieldCount} fields.` : 'Document uploaded!');
      setTimeout(() => setToast(''), 4000);
      setUploadedDoc(resp.data);
      setUploadStep(4);
      if (resp.data.aiSummary?.category && resp.data.aiSummary.category !== 'other') {
        setUploadForm(f => ({ ...f, category: resp.data.aiSummary.category }));
      }
      loadDocs();
    } catch (e) { setUploadError(e.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const runAiScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); loadDocs(); }, 2000);
  };

  const viewDoc = (d) => {
    setViewingDoc(d);
  };

  const downloadDoc = async (d) => {
    try {
      const resp = await api.get('/documents/' + d.id + '/download', { responseType: 'blob' });
      const blob = resp.data;
      const filename = d.original_name || d.name || 'document';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
    } catch(err) {
      console.error('Download error:', err);
      alert('Download failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const deleteDoc = async (id, name) => {
    await api.delete('/documents/' + id).catch(() => {}); loadDocs();
  };

  const openUploadFlow = () => {
    setUploadError('');
    setUploadedDoc(null);
    setUploadStep(1);
    setShowUpload(true);
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const closeUploadFlow = () => {
    setShowUpload(false);
    setPendingFile(null);
    setUploadedDoc(null);
    setUploadError('');
    setUploadStep(1);
  };

  const parseAi = (d) => {
    try { return d.ai_summary ? JSON.parse(d.ai_summary) : null; } catch { return null; }
  };

  const extractedEntries = (ai) => {
    if (!ai) return [];
    const src = ai.extractedFields || ai.fields || {};
    if (Array.isArray(src)) return src.map((v, i) => [`Field ${i + 1}`, String(v)]);
    return Object.entries(src).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
  };

  // Group docs by member
  const grouped = {};
  docs.forEach(d => {
    const key = d.member_name || 'Unknown';
    if (!grouped[key]) grouped[key] = { docs: [], color: d.avatar_color || '#1a3a5c', avatar_url: d.avatar_url || null };
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
      {toast && (
        <div className="card" style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{toast}</span>
        </div>
      )}
      <PageHeader title="Family Documents" sub={`${stats.total || 0} documents · 12 categories · Last AI scan 2 hours ago`}>
        <button className="btn btn-outline" style={{gap:6}} onClick={() => setShowFilter(!showFilter)}>&#9776; Filter</button>
        <button className="btn btn-teal" style={{gap:6}} onClick={runAiScan} disabled={scanning}>{scanning ? 'Scanning...' : '\u2728 AI Scan'}</button>
        <button className="btn btn-brand" onClick={openUploadFlow} style={{gap:6}}>+ Upload</button>
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
            <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Document</th><th>Status</th><th>Expiry</th><th>AI</th><th>Uploaded</th><th style={{textAlign:'right'}}>Actions</th></tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([name, group]) => (
                  <React.Fragment key={name}>
                    <tr><td colSpan={6} style={{ padding: 0 }}>
                      <div className="doc-member-row">
                        {group.avatar_url ? (
                          <img src={group.avatar_url} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', background: group.color || '#e5e7eb' }} />
                        ) : (
                          <div className="avatar" style={{ width: 24, height: 24, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          </div>
                        )}
                        {name}
                      </div>
                    </td></tr>
                    {group.docs.map(d => {
                      const ai = parseAi(d);
                      return (
                        <tr key={d.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 16 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 'var(--r-md)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{catIcon(d.category)}</div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13 }}>{d.name}</div>
                                {ai?.type && <div style={{ fontSize: 11, color: 'var(--txt4)', marginTop: 2 }}>{ai.type}</div>}
                              </div>
                            </div>
                          </td>
                          <td><Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge></td>
                          <td style={{ fontSize: 13, color: 'var(--txt3)' }}>{d.expiry_date ? fmtDate(d.expiry_date) : 'N/A'}</td>
                          <td>
                            {d.ai_analyzed && ai?.confidence ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{Math.round(ai.confidence * 100)}%</span>
                                <div className="progress-track" style={{ width: 50 }}>
                                  <div className="progress-fill" style={{ width: (ai.confidence * 100) + '%', background: 'var(--accent)' }} />
                                </div>
                              </div>
                            ) : '—'}
                          </td>
                          <td>
                            {d.created_at ? fmtDate(d.created_at) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button className="btn btn-xs btn-teal" onClick={() => viewDoc(d)}>View</button>
                              <button className="btn btn-xs btn-outline" onClick={() => downloadDoc(d)}>Download</button>
                              <button className="btn btn-xs" style={{ background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }} onClick={() => setDeleteTarget(d)}>Delete</button>
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
            </div>

            {/* Mobile Card List */}
            <div className="doc-cards-mobile">
              {Object.entries(grouped).map(([name, group]) => (
                <React.Fragment key={name}>
                  <div className="doc-member-row">
                    {group.avatar_url ? (
                      <img src={group.avatar_url} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', background: group.color || '#e5e7eb' }} />
                    ) : (
                      <div className="avatar" style={{ width: 24, height: 24, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                    )}
                    {name}
                  </div>
                  {group.docs.map(d => {
                    const ai = parseAi(d);
                    return (
                      <div key={d.id} className="doc-mobile-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{catIcon(d.category)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13, lineHeight: 1.3 }}>{d.name}</div>
                            {ai?.type && <div style={{ fontSize: 11, color: 'var(--txt4)', marginTop: 2 }}>{ai.type}</div>}
                          </div>
                          <Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
                          <span>Expiry: {d.expiry_date ? fmtDate(d.expiry_date) : 'N/A'}</span>
                          {d.created_at && <span> · Uploaded: {fmtDate(d.created_at)}</span>}
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
                          <button className="btn btn-sm" style={{ flex: 1, background: 'var(--red)', color: '#fff', borderColor: 'var(--red)' }} onClick={() => setDeleteTarget(d)}>Delete</button>
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

      <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt" onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
      {showUpload && (
        <Modal title="Upload Document" onClose={closeUploadFlow} maxWidth={500}
          footer={(
            <>
              {uploadStep > 1 && uploadStep < 4 && <button className="btn btn-outline" onClick={() => setUploadStep(s => s - 1)}>Back</button>}
              {uploadStep < 3 && <button className="btn btn-outline" onClick={closeUploadFlow}>Cancel</button>}
              {uploadStep === 2 && <button className="btn btn-teal" onClick={() => setUploadStep(3)} disabled={!selectedMember}>Next</button>}
              {uploadStep === 3 && <button className="btn btn-teal" onClick={submitUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>}
              {uploadStep === 4 && <button className="btn btn-teal" onClick={closeUploadFlow}>Done</button>}
            </>
          )}
        >
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 12, fontWeight: 600 }}>Step {uploadStep} of 4</div>
          {uploadError && <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: 'var(--red)', fontSize: 13 }}>{uploadError}</div>}

          {uploadStep === 1 && (
            <div className="dropzone" onClick={() => fileInputRef.current && fileInputRef.current.click()} role="button" tabIndex={0}>
              <div className="dropzone-icon">&#8679;</div>
              <div className="dropzone-title">{pendingFile ? pendingFile.name : 'Select a file'}</div>
              <div className="dropzone-sub">PDF, JPG, PNG, DOC, DOCX, TXT</div>
            </div>
          )}

          {uploadStep === 2 && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Select Family Member</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {members.map(m => (
                  <button key={m.id} className={`btn ${selectedMember === m.id ? 'btn-teal' : 'btn-outline'}`} style={{ justifyContent: 'flex-start' }} onClick={() => setSelectedMember(m.id)}>
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt={m.first_name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', background: m.avatar_color || '#e5e7eb' }} />
                    ) : (
                      <span className="avatar" style={{ width: 24, height: 24, background: '#e5e7eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </span>
                    )}
                    {m.first_name} {m.last_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {uploadStep === 3 && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Select Category</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CATS.filter(c => c.id !== 'all' && c.id !== 'certificates').map(c => (
                  <button key={c.id} className={`btn ${uploadForm.category === c.id ? 'btn-teal' : 'btn-outline'}`} onClick={() => setUploadForm(f => ({ ...f, category: c.id }))}>
                    <span>{c.icon}</span> {c.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {uploadStep === 4 && uploadedDoc && (() => {
            const ai = uploadedDoc.aiSummary || parseAi(uploadedDoc) || {};
            const aiFields = Array.isArray(ai.fields) ? ai.fields : [];
            const legacyPairs = aiFields.length === 0 ? extractedEntries(ai) : [];
            const ocrConf = typeof ai.ocrConfidence === 'number' ? Math.round(ai.ocrConfidence) : null;
            const confBadge = (c) => {
              const pct = Math.round((c || 0) * 100);
              let bg = '#dc2626', color = '#fff';
              if (pct >= 90) { bg = '#059669'; color = '#fff'; }
              else if (pct >= 70) { bg = '#fbbf24'; color = '#1f2937'; }
              return <span style={{ background: bg, color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>{pct}%</span>;
            };
            return (
              <div>
                <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Document Uploaded Successfully!</div>

                {uploadedDoc.autoMatchedMember && (
                  <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, color: 'var(--green)', fontSize: 12, fontWeight: 600 }}>
                    ✓ Auto-matched to {uploadedDoc.autoMatchedMember}
                  </div>
                )}
                {uploadedDoc.nameWarning && (
                  <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 8, padding: '8px 12px', marginBottom: 10, color: 'var(--amber)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span>⚠ {uploadedDoc.nameWarning}</span>
                    <button className="btn btn-xs btn-outline" style={{ flexShrink: 0 }} onClick={() => { closeUploadFlow(); navigate && navigate('add-member'); }}>Add member</button>
                  </div>
                )}

                {ocrConf !== null && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: 'var(--txt3)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>OCR Quality</span><span style={{ fontWeight: 700 }}>{ocrConf}%</span>
                    </div>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${ocrConf}%`, background: ocrConf >= 70 ? 'var(--green)' : ocrConf >= 40 ? '#fbbf24' : 'var(--red)' }} /></div>
                  </div>
                )}

                <div style={{ fontSize: 11, color: 'var(--txt4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Detected: {ai.type || 'Document'}</div>

                {aiFields.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    {aiFields.map((f, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr auto', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--txt3)', fontWeight: 600 }}>{f.key}</span>
                        <input type="text" defaultValue={f.value} style={{ height: 28, fontSize: 12, border: '1px solid var(--border)', borderRadius: 4, padding: '0 6px', width: '100%', background: 'var(--surface)', color: 'var(--txt)' }} />
                        {confBadge(f.confidence)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ai-result-box">
                    {legacyPairs.map(([k, v]) => <div key={k} className="ai-field"><strong>{k}:</strong> {String(v)}</div>)}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}
      {viewingDoc && (() => {
        const ai = parseAi(viewingDoc);
        return (
          <Modal title="Document Details" onClose={() => setViewingDoc(null)} maxWidth={500}
            footer={<><button className="btn btn-outline" onClick={() => { downloadDoc(viewingDoc); }}>Download</button><button className="btn btn-teal" onClick={() => setViewingDoc(null)}>Close</button></>}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{catIcon(viewingDoc.category)}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--txt)' }}>{viewingDoc.name}</div>
                <div style={{ fontSize: 12, color: 'var(--txt3)' }}>{viewingDoc.member_name || 'Unknown member'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[['Category', viewingDoc.category], ['Status', statusLabel(viewingDoc.status)], ['Upload Date', viewingDoc.created_at ? fmtDate(viewingDoc.created_at) : 'N/A'], ['File Size', viewingDoc.file_size || 'N/A']].map(([k, v]) => (
                <div key={k} style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r-md)' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--txt4)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', textTransform: 'capitalize' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}><Badge color={statusColor(viewingDoc.status)}>{statusLabel(viewingDoc.status)}</Badge></div>
            {ai && ai.confidence && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--txt3)' }}>AI Confidence: {Math.round(ai.confidence * 100)}%</div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(ai.confidence * 100)}%`, background: 'var(--accent)' }} /></div>
              </div>
            )}
            {ai && (
              <div className="ai-result-box">
                <div className="ai-result-title">AI Analysis</div>
                {Object.entries(ai).filter(([k]) => !['confidence', 'extractedFields', 'fields'].includes(k)).map(([k, v]) => (
                  <div key={k} className="ai-field" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span style={{ fontWeight: 600 }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        );
      })()}
      {deleteTarget && (
        <Modal
          title="Delete Document"
          onClose={() => setDeleteTarget(null)}
          maxWidth={400}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#dc2626', color: '#fff', borderColor: '#dc2626' }}
                onClick={async () => { await deleteDoc(deleteTarget.id, deleteTarget.name); setDeleteTarget(null); }}
              >
                Delete
              </button>
            </>
          }
        >
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🗑️</div>
            <p style={{ fontSize: 14, color: 'var(--txt2)', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
