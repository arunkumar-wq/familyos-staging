import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { catIcon, catColor, fmtDate } from '../utils/formatters';
import { PageHeader, Modal, Badge, EmptyState } from '../components/UI';

const CATS = ['all','identity','finance','property','insurance','legal','education','medical','tax','other'];

function statusColor(s) {
  if (s === 'valid') return 'green';
  if (s === 'expiring') return 'amber';
  if (s === 'expired') return 'red';
  if (s === 'review') return 'purple';
  return 'gray';
}
function statusLabel(s) {
  if (s === 'valid') return 'Valid';
  if (s === 'expiring') return 'Expiring Soon';
  if (s === 'expired') return 'Expired';
  if (s === 'review') return 'Review Needed';
  return 'Unknown';
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
  const l = filename.toLowerCase();
  if (l.includes('passport')) return { type: 'Passport', issuer: 'MEA India', expiryDate: '2029-06-14', confidence: 0.97, fields: ['Document type: Passport', 'Issued by: MEA India', 'Expiry: 14 Jun 2029'] };
  if (l.includes('aadhaar')) return { type: 'Aadhaar Card', issuer: 'UIDAI', expiryDate: null, confidence: 0.99, fields: ['Document type: Aadhaar', 'Issuer: UIDAI', 'Valid: Lifetime'] };
  return { type: 'Document', issuer: 'Unknown', expiryDate: null, confidence: 0.80, fields: ['Document detected', 'Category: ' + category] };
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
  const fileInputRef = useRef();
  const [pendingFile, setPendingFile] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load members once
  useEffect(() => {
    api.get('/family/members').then(r => { setMembers(r.data); if (r.data[0]) setSelectedMember(r.data[0].id); }).catch(() => {});
  }, []);

  // Load docs when filter/search changes
  useEffect(() => {
    loadDocs();
  }, [cat, debouncedSearch]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (cat !== 'all') params.category = cat;
      if (debouncedSearch) params.search = debouncedSearch;
      const [docsRes, statsRes] = await Promise.all([api.get('/documents', { params }), api.get('/documents/stats')]);
      setDocs(docsRes.data); setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally { setLoading(false); }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setPendingFile(file);
    setUploadForm(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, ''), category: guessCat(file.name) }));
    setUploading(true); setAiResult(null); setUploadError('');
    setTimeout(() => { setAiResult(simulateAI(file.name, guessCat(file.name))); setUploading(false); }, 1800);
  };

  const submitUpload = async () => {
    if (!pendingFile) return;
    setUploadError('');
    const fd = new FormData();
    fd.append('file', pendingFile);
    fd.append('name', uploadForm.name);
    fd.append('category', uploadForm.category);
    fd.append('notes', uploadForm.notes);
    fd.append('ownerId', selectedMember);
    if (aiResult) fd.append('aiSummary', JSON.stringify(aiResult));
    try {
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false); setPendingFile(null); setAiResult(null); loadDocs();
    } catch (e) {
      setUploadError(e.response?.data?.error || 'Upload failed. Please try again.');
    }
  };

  const deleteDoc = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete('/documents/' + id);
      loadDocs();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="page-inner">
      <PageHeader title="Document Vault" sub={(stats.total || 0) + ' documents - AI-managed - AES-256 encrypted'}>
        <button className="btn btn-teal" onClick={() => { setShowUpload(true); setAiResult(null); setPendingFile(null); setUploading(false); setUploadError(''); }}>+ Upload Document</button>
      </PageHeader>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '14px 0', marginBottom: 20 }}>
        {[['Total', stats.total || 0],['AI Filed', stats.aiAnalyzed || 0],['Expiring', (stats.byStatus || []).find(x=>x.status==='expiring')?.c || 0],['Review Needed', (stats.byStatus || []).find(x=>x.status==='review')?.c || 0]].map(([l,v],i) => (
          <div key={l} style={{ textAlign: 'center', padding: '0 20px', borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: i===2?'var(--amber)':i===3?'var(--red)':'var(--txt)' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '0 12px', height: 38, flex: 1, minWidth: 200 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." aria-label="Search documents" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ height: 30, padding: '0 14px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 600, border: cat===c?'1.5px solid var(--navy)':'1.5px solid var(--border)', background: cat===c?'var(--navy)':'var(--surface)', color: cat===c?'#fff':'var(--txt2)', cursor: 'pointer', transition: 'all var(--dur)', textTransform: 'capitalize', fontFamily: 'inherit' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--txt3)' }}>Loading documents...</div>
      ) : docs.length === 0 ? (
        <EmptyState icon="F" title="No documents found" sub={search ? 'Try a different search' : 'Upload your first document to get started'} />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Document</th><th>Member</th><th>Category</th><th>Status</th><th>Expiry</th><th>Size</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {docs.map(d => {
                let ai = null;
                try { ai = d.ai_summary ? JSON.parse(d.ai_summary) : null; } catch {}
                const soonExpiry = d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 90 * 86400000);
                return (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 'var(--r-md)', background: 'var(--' + catColor(d.category) + '-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{catIcon(d.category)}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--txt)', fontSize: 13 }}>{d.name}</div>
                          {ai?.type && <div style={{ fontSize: 11, color: 'var(--txt4)' }}>{ai.type}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{d.member_name || '--'}</td>
                    <td><Badge color="gray">{d.category}</Badge></td>
                    <td><Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge></td>
                    <td style={{ fontSize: 13, color: soonExpiry ? 'var(--amber)' : 'var(--txt3)' }}>{d.expiry_date ? fmtDate(d.expiry_date) : '--'}</td>
                    <td style={{ fontSize: 12, color: 'var(--txt4)' }}>{d.file_size || '--'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {d.ai_analyzed ? <Badge color="purple">AI</Badge> : null}
                        <button className="btn btn-xs btn-outline" onClick={() => deleteDoc(d.id)} style={{ color: 'var(--red)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <Modal title="Upload Document" onClose={() => { setShowUpload(false); setPendingFile(null); setAiResult(null); setUploadError(''); }} maxWidth={580}
          footer={pendingFile && !uploading ? (
            <>
              <button className="btn btn-outline" onClick={() => { setShowUpload(false); setPendingFile(null); setAiResult(null); }}>Cancel</button>
              <button className="btn btn-teal" onClick={submitUpload}>Save to Vault</button>
            </>
          ) : undefined}
        >
          {uploadError && (
            <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: 'var(--red)', fontSize: 13 }}>{uploadError}</div>
          )}
          {!pendingFile && !uploading && !aiResult && (
            <div className={dragging ? 'dropzone active' : 'dropzone'}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload area - click or drop files"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current.click(); }}
            >
              <div className="dropzone-icon">^</div>
              <div className="dropzone-title">Drop files here or click to browse</div>
              <div className="dropzone-sub">PDF, JPG, PNG, DOCX - up to 50 MB</div>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc" onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} aria-label="File upload" />
            </div>
          )}
          {uploading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt)' }}>AI is reading your document...</p>
              <p style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 6 }}>Extracting dates, expiry, and key details</p>
            </div>
          )}
          {aiResult && pendingFile && (
            <div>
              <div className="ai-result-box">
                <div className="ai-result-title">AI Analysis Complete - {Math.round(aiResult.confidence * 100)}% confidence</div>
                {aiResult.fields.map((f, i) => <div key={i} className="ai-field">{f}</div>)}
                {aiResult.expiryDate && <div className="ai-field" style={{ color: 'var(--amber)', fontWeight: 600 }}>Expiry detected: {fmtDate(aiResult.expiryDate)}</div>}
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Document Name</label>
                  <input className="form-input" value={uploadForm.name} onChange={e => setUploadForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))}>
                    {CATS.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
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
    </div>
  );
}
