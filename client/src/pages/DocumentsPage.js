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
function detectNameInFile(filename, members) {
  const fn = (filename || '').toLowerCase();
  const matched = members.find(m => fn.includes(m.first_name.toLowerCase()));
  return matched || null;
}

function guessCat(name) {
  const n = name.toLowerCase();
  if (n.includes('passport') || n.includes('ssn') || n.includes('license') || n.includes('driver')) return 'identity';
  if (n.includes('birth_cert') || n.includes('birth certificate')) return 'identity';
  if (n.includes('insurance') || n.includes('policy')) return 'insurance';
  if (n.includes('deed') || n.includes('property') || n.includes('mortgage')) return 'property';
  if (n.includes('1099') || n.includes('1040') || n.includes('w-2') || n.includes('w2')) return 'finance';
  if (n.includes('medical') || n.includes('health') || n.includes('medicare') || n.includes('prescription')) return 'medical';
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
  const [fileDetectedName, setFileDetectedName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState('');
  const [uploadStep, setUploadStep] = useState(1);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResults, setAiResults] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [activeMenu, setActiveMenu] = useState(null);
  const [hoverDoc, setHoverDoc] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [scores, setScores] = useState(null);
  const hoverTimeout = useRef(null);
  const fileInputRef = useRef();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleClick = () => setActiveMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { api.get('/family/members').then(r => { setMembers(r.data); }).catch(()=>{}); }, []);
  useEffect(() => { loadDocs(); }, [cat, debouncedSearch, statusFilter]);
  useEffect(() => {
    api.get('/documents/scores').then(r => setScores(r.data)).catch(err => console.error('Scores fetch failed:', err));
  }, []);

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

  const handleFile = async (file) => {
    if (!file) return;
    setPendingFile(file);
    setShowUpload(true);
    setUploadStep(0);
    setAnalyzing(true);
    setAiResults(null);
    setFileDetectedName('');
    setSelectedMember('');
    setUploadForm(f => ({
      ...f,
      name: file.name.startsWith('scan_') ? 'Scanned Document' : file.name.replace(/\.[^.]+$/, ''),
      category: 'other',
      notes: '',
    }));

    try {
      const fd = new FormData();
      fd.append('file', file);
      const resp = await api.post('/documents/analyze', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const r = resp.data;
      setAiResults(r);

      if (r.matchedMemberId) setSelectedMember(r.matchedMemberId);
      if (r.category && r.category !== 'other') {
        setUploadForm(f => ({ ...f, category: r.category }));
      } else {
        const cat = guessCat(file.name);
        if (cat !== 'other') setUploadForm(f => ({ ...f, category: cat }));
      }
      if (r.nameWarning) setFileDetectedName(r.detectedName || '');
      if (r.type && r.type !== 'Document' && r.type !== 'Unknown Document') {
        const mName = r.matchedMemberName || '';
        setUploadForm(f => ({ ...f, name: r.type + (mName ? ' — ' + mName : '') }));
      }
    } catch (e) {
      console.error('AI analysis failed, using filename fallback:', e);
      const fname = file.name.toLowerCase().replace(/\.[^.]+$/, '');
      const match = members.find(m => fname.includes(m.first_name.toLowerCase()));
      if (match) setSelectedMember(match.id);
      const cat = guessCat(file.name);
      if (cat !== 'other') setUploadForm(f => ({ ...f, category: cat }));
    }

    setAnalyzing(false);
    setUploadStep(2);
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
      // Auto-update from backend AI detection
      if (resp.data.autoMatchedId && !selectedMember) {
        setSelectedMember(resp.data.autoMatchedId);
      }
      if (resp.data.aiSummary?.category && resp.data.aiSummary.category !== 'other' && uploadForm.category === 'other') {
        setUploadForm(f => ({ ...f, category: resp.data.aiSummary.category }));
      }
      loadDocs();
    } catch (e) {
      const errMsg = e.response?.data?.error || e.message || 'Upload failed';
      console.error('Upload error:', e);
      setUploadError(errMsg);
    }
    finally { setUploading(false); }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      setCameraStream(stream);
      setShowCamera(true);
      setCapturedImage(null);
    } catch (err) {
      alert('Camera access denied. Please allow camera permission in your browser settings to use AI Scan.');
    }
  };

  // Attach stream to video when showCamera changes (iOS-safe — video ref ready after render)
  useEffect(() => {
    if (showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.setAttribute('autoplay', '');
      videoRef.current.setAttribute('playsinline', '');
      videoRef.current.setAttribute('muted', '');
      videoRef.current.play().catch(() => {});
    }
  }, [showCamera, cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Limit max dimension to 1600px to keep file size reasonable
    const maxDim = 1600;
    let w = video.videoWidth || 1280;
    let h = video.videoHeight || 720;

    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((maxDim / w) * h);
        w = maxDim;
      } else {
        w = Math.round((maxDim / h) * w);
        h = maxDim;
      }
    }

    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.85)); // 85% quality is enough for OCR
    video.pause();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {});
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setCapturedImage(null);
  };

  const acceptPhoto = () => {
    if (!capturedImage) return;
    fetch(capturedImage)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], 'scan_' + Date.now() + '.jpg', { type: 'image/jpeg' });
        stopCamera();
        handleFile(file);
      });
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
    setSelectedMember('');
    setFileDetectedName('');
    setAiResults(null);
    setAnalyzing(false);
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

  const handleDocHover = (e, d) => {
    clearTimeout(hoverTimeout.current);
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimeout.current = setTimeout(() => {
      const popupWidth = 320;
      const popupHeight = 400;

      let x = rect.left + (rect.width / 2) - (popupWidth / 2);

      if (x < 10) x = 10;
      if (x + popupWidth > window.innerWidth - 10) x = window.innerWidth - popupWidth - 10;

      let y = rect.bottom + 8;
      if (y + popupHeight > window.innerHeight) {
        y = rect.top - popupHeight - 8;
      }
      if (y < 10) y = 10;

      setHoverPos({ x, y });
      setHoverDoc(d);
    }, 400);
  };

  const handleDocLeave = () => {
    clearTimeout(hoverTimeout.current);
    setHoverDoc(null);
  };

  const DocMenu = ({ d }) => (
    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === d.id ? null : d.id); }}
        style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt3)' }}
        title="More actions">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
      </button>
      {activeMenu === d.id && (
        <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 140, padding: '4px 0', animation: 'fadeIn 150ms ease' }}>
          <button onClick={() => { setActiveMenu(null); viewDoc(d); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--txt)', textAlign: 'left' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <button onClick={() => { setActiveMenu(null); downloadDoc(d); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--txt)', textAlign: 'left' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </button>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <button onClick={() => { setActiveMenu(null); setDeleteTarget(d); }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626', textAlign: 'left' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="page-inner">
      {toast && (
        <div className="card" style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--green-bg)', border: '1px solid var(--green-border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>{toast}</span>
        </div>
      )}
      <PageHeader title="Family Documents" sub={`${stats.total || 0} documents · 12 categories · Last AI scan 2 hours ago`}>
        <button className="btn btn-outline" style={{gap:6}} onClick={() => setShowFilter(!showFilter)}>&#9776; Filter</button>
        <button className="btn btn-accent" style={{gap:6}} onClick={startCamera}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          AI Scan
        </button>
        <button className="btn btn-brand" onClick={openUploadFlow} style={{gap:6}}>+ Upload</button>
      </PageHeader>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '0 16px', height: 44, boxShadow: 'var(--shadow-xs)' }}>
          <span style={{color:'var(--txt4)'}}>&#128269;</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents, IDs, certificates..." aria-label="Search documents" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: 'var(--txt)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
        {scores && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: scores.overallScore >= 80 ? '#d1fae5' : scores.overallScore >= 60 ? '#fef3c7' : '#fee2e2', borderRadius: 20, fontSize: 12, fontWeight: 700, color: scores.overallScore >= 80 ? '#065f46' : scores.overallScore >= 60 ? '#92400e' : '#991b1b' }} title="Document completeness across all family members">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
            <span>Overall Document Score: {scores.overallScore}%</span>
          </div>
        )}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
          <button onClick={() => setViewMode('card')} style={{ padding: '6px 10px', border: 'none', background: viewMode === 'card' ? 'var(--accent)' : 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Card view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'card' ? '#fff' : 'var(--txt3)'} strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
          <button onClick={() => setViewMode('list')} style={{ padding: '6px 10px', border: 'none', borderLeft: '1px solid var(--border)', background: viewMode === 'list' ? 'var(--accent)' : 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="List view">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'list' ? '#fff' : 'var(--txt3)'} strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
          </button>
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
            <div className="doc-table-desktop" style={{ display: viewMode === 'list' ? 'block' : 'none' }}>
            <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Document</th><th>Status</th><th>Category</th><th>Expiry</th><th>Uploaded</th><th style={{textAlign:'right'}}>Actions</th></tr>
              </thead>
              <tbody>
                {Object.entries(grouped).map(([name, group]) => (
                  <React.Fragment key={name}>
                    <tr><td colSpan={6} style={{ padding: 0 }}>
                      <div className="doc-member-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {group.avatar_url ? (
                          <img src={group.avatar_url} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', background: group.color || '#e5e7eb' }} />
                        ) : (
                          <div className="avatar" style={{ width: 24, height: 24, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          </div>
                        )}
                        <span>{name}</span>
                        {(() => {
                          const ms = scores?.memberScores?.find(x => x.memberName === name);
                          if (!ms) return null;
                          const color = ms.score >= 80 ? '#059669' : ms.score >= 60 ? '#d97706' : '#dc2626';
                          const bg = ms.score >= 80 ? '#d1fae5' : ms.score >= 60 ? '#fef3c7' : '#fee2e2';
                          const tooltip = ms.missing.length > 0 ? 'Missing: ' + ms.missing.join(', ') : 'All essential documents present';
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: bg, color, marginLeft: 8 }} title={tooltip}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                              Score: {ms.score}%
                            </span>
                          );
                        })()}
                      </div>
                    </td></tr>
                    {group.docs.map(d => {
                      const ai = parseAi(d);
                      return (
                        <tr key={d.id}
                          onClick={(e) => {
                            if (window.innerWidth <= 768) {
                              e.stopPropagation();
                              if (hoverDoc && hoverDoc.id === d.id) {
                                setHoverDoc(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const popupHeight = 400;
                                let y = rect.bottom + 8;
                                if (y + popupHeight > window.innerHeight) y = rect.top - popupHeight - 8;
                                if (y < 10) y = 10;
                                setHoverPos({ x: (window.innerWidth - 320) / 2, y });
                                setHoverDoc(d);
                              }
                            }
                          }}
                          onMouseEnter={(e) => { if (window.innerWidth > 768) handleDocHover(e, d); }}
                          onMouseLeave={() => { if (window.innerWidth > 768) handleDocLeave(); }}
                        >
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
                          <td style={{ fontSize: 12, color: 'var(--txt3)', textTransform: 'capitalize' }}>{d.category}</td>
                          <td style={{ fontSize: 13, color: 'var(--txt3)' }}>{d.expiry_date ? fmtDate(d.expiry_date) : 'N/A'}</td>
                          <td>
                            {d.created_at ? fmtDate(d.created_at) : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <DocMenu d={d} />
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

            {viewMode === 'card' && (
              <div className="doc-card-grid">
                {Object.entries(grouped).map(([name, group]) => (
                  <React.Fragment key={name}>
                    <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0 6px' }}>
                      {group.avatar_url ? (
                        <img src={group.avatar_url} alt={name} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        </div>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>{name}</span>
                      <span style={{ fontSize: 11, color: 'var(--txt4)' }}>({group.docs.length} docs)</span>
                      {(() => {
                        const ms = scores?.memberScores?.find(x => x.memberName === name);
                        if (!ms) return null;
                        const color = ms.score >= 80 ? '#059669' : ms.score >= 60 ? '#d97706' : '#dc2626';
                        const bg = ms.score >= 80 ? '#d1fae5' : ms.score >= 60 ? '#fef3c7' : '#fee2e2';
                        const tooltip = ms.missing.length > 0 ? 'Missing: ' + ms.missing.join(', ') : 'All essential documents present';
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: bg, color, marginLeft: 8 }} title={tooltip}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                            Score: {ms.score}%
                          </span>
                        );
                      })()}
                    </div>
                    {group.docs.map(d => {
                      const ai = parseAi(d);
                      return (
                        <div key={d.id} className="doc-card" onClick={(e) => {
                          if (window.innerWidth <= 768) {
                            e.stopPropagation();
                            if (hoverDoc && hoverDoc.id === d.id) {
                              setHoverDoc(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const popupHeight = 400;
                              let y = rect.bottom + 10;
                              if (y + popupHeight > window.innerHeight) y = rect.top - popupHeight - 10;
                              if (y < 10) y = 10;
                              setHoverPos({ x: (window.innerWidth - 320) / 2, y });
                              setHoverDoc(d);
                            }
                          } else {
                            viewDoc(d);
                          }
                        }} onMouseEnter={(e) => { if (window.innerWidth > 768) handleDocHover(e, d); }} onMouseLeave={() => { if (window.innerWidth > 768) handleDocLeave(); }}>
                          <div className="doc-card-icon">{catIcon(d.category)}</div>
                          <div className="doc-card-body">
                            <div className="doc-card-name">{d.name}</div>
                            {ai?.type && <div className="doc-card-type">{ai.type}</div>}
                            <div className="doc-card-details">
                              <span>Expiry: {d.expiry_date ? fmtDate(d.expiry_date) : 'N/A'}</span>
                              <span>Uploaded: {d.created_at ? fmtDate(d.created_at) : '—'}</span>
                            </div>
                            <div className="doc-card-meta">
                              <Badge color={statusColor(d.status)}>{statusLabel(d.status)}</Badge>
                              <span className="doc-card-category">{d.category}</span>
                            </div>
                          </div>
                          {/* Action icons — top right on hover */}
                          <div style={{ position: 'absolute', top: 8, right: 8 }}>
                            <DocMenu d={d} />
                          </div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            )}

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
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <DocMenu d={d} />
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
              {uploadStep === 4 && null}
              {uploadStep === 2 && <button className="btn btn-outline" onClick={closeUploadFlow}>Cancel</button>}
              {uploadStep === 2 && <button className="btn btn-teal" onClick={submitUpload} disabled={!selectedMember || uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>}
              {uploadStep === 4 && <button className="btn btn-teal" onClick={closeUploadFlow}>Done</button>}
            </>
          )}
        >
          {uploadStep > 0 && <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 12, fontWeight: 600 }}>{uploadStep === 2 ? 'Select Member' : uploadStep === 4 ? 'Complete' : ''}</div>}
          {uploadError && <div role="alert" style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: 'var(--red)', fontSize: 13 }}>{uploadError}</div>}

          {uploadStep === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ width: 56, height: 56, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg, #0a9e9e, #3883f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease infinite' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--txt)', marginBottom: 6 }}>AI Processing...</div>
              <div style={{ fontSize: 12, color: 'var(--txt3)' }}>Scanning document · Extracting text · Detecting fields</div>
            </div>
          )}

          {uploadStep === 1 && (
            <div className="dropzone" onClick={() => fileInputRef.current && fileInputRef.current.click()} role="button" tabIndex={0}>
              <div className="dropzone-icon">&#8679;</div>
              <div className="dropzone-title">{pendingFile ? pendingFile.name : 'Select a file'}</div>
              <div className="dropzone-sub">PDF, JPG, PNG, DOC, DOCX, TXT</div>
            </div>
          )}

          {uploadStep === 2 && (
            <div>
              {aiResults && aiResults.type && aiResults.type !== 'Document' && aiResults.type !== 'Unknown Document' && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: '#d1fae5', border: '1px solid #10b981', borderRadius: 8, fontSize: 13, color: '#065f46' }}>
                  🤖 <strong>AI Detected: {aiResults.type}</strong>
                  {aiResults.matchedMemberName && <span> — Owner: <strong>{aiResults.matchedMemberName}</strong></span>}
                  {typeof aiResults.confidence === 'number' && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>({Math.round(aiResults.confidence * 100)}%)</span>}
                </div>
              )}

              {/* OCR failed completely */}
              {aiResults && (!aiResults.type || aiResults.type === 'Unknown Document' || aiResults.type === 'Document') && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                  ⚠️ <strong>AI couldn't detect the document type.</strong> Please select the member and category manually.
                </div>
              )}

              {/* OCR low confidence */}
              {aiResults && aiResults.confidence && aiResults.confidence < 0.6 && aiResults.type && aiResults.type !== 'Unknown Document' && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                  ⚠️ <strong>Low AI confidence ({Math.round(aiResults.confidence * 100)}%).</strong> Please verify the member and category below.
                </div>
              )}

              {/* API error — no aiResults at all */}
              {!aiResults && !analyzing && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
                  ❌ <strong>AI analysis failed.</strong> Please select member and category manually.
                </div>
              )}
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
                <button className="btn btn-outline" style={{ justifyContent: 'flex-start', borderStyle: 'dashed', color: 'var(--accent)' }} onClick={() => { closeUploadFlow(); navigate && navigate('add-member'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  + Add New Member
                </button>
              </div>
              {fileDetectedName && !selectedMember && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 13, color: '#92400e', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>"{fileDetectedName}" doesn't match any family member</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Select an existing member above or add a new one</div>
                  </div>
                </div>
              )}
              {!selectedMember && !fileDetectedName && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#e0f2fe', border: '1px solid #0ea5e9', borderRadius: 8, fontSize: 12, color: '#0c4a6e' }}>
                  Select the family member this document belongs to. AI will verify the owner after upload.
                </div>
              )}
              {(() => {
                const detectedMember = detectNameInFile(pendingFile?.name || '', members);
                if (detectedMember && selectedMember && detectedMember.id !== selectedMember) {
                  const selectedName = members.find(m => m.id === selectedMember);
                  return (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                      <strong>⚠ Name mismatch:</strong> Document filename contains "<strong>{detectedMember.first_name} {detectedMember.last_name}</strong>" but you selected "<strong>{selectedName?.first_name} {selectedName?.last_name}</strong>". Are you sure?
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {false && uploadStep === 3 && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Select Category</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {CATS.filter(c => c.id !== 'all' && c.id !== 'certificates').map(c => (
                  <button key={c.id} className={`btn ${uploadForm.category === c.id ? 'btn-teal' : 'btn-outline'}`} onClick={() => setUploadForm(f => ({ ...f, category: c.id }))}>
                    <span>{c.icon}</span> {c.label.split(' ')[0]}
                  </button>
                ))}
              </div>
              {uploadForm.category === 'other' && aiResults && (!aiResults.category || aiResults.category === 'other') && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
                  AI couldn't auto-detect the category. Please select one above.
                </div>
              )}
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

                {/* AI Detection Results */}
                {uploadedDoc?.aiSummary && (
                  <div style={{ marginBottom: 14 }}>
                    {uploadedDoc.aiSummary.type && uploadedDoc.aiSummary.type !== 'Document' && uploadedDoc.aiSummary.type !== 'Unknown Document' && (
                      <div style={{ padding: '10px 14px', background: '#d1fae5', border: '1px solid #10b981', borderRadius: 8, fontSize: 13, color: '#065f46', marginBottom: 8 }}>
                        <strong>🤖 AI Detected:</strong> {uploadedDoc.aiSummary.type}
                        {uploadedDoc.aiSummary.confidence && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>({Math.round(uploadedDoc.aiSummary.confidence * 100)}% confidence)</span>}
                      </div>
                    )}
                    {uploadedDoc.autoMatchedMember && (
                      <div style={{ padding: '8px 14px', background: '#d1fae5', border: '1px solid #10b981', borderRadius: 8, fontSize: 12, color: '#065f46', marginBottom: 8 }}>
                        ✅ Auto-matched owner: <strong>{uploadedDoc.autoMatchedMember}</strong>
                      </div>
                    )}
                    {uploadedDoc.nameWarning && (
                      <div style={{ padding: '8px 14px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, fontSize: 12, color: '#92400e', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚠️ {uploadedDoc.nameWarning}</span>
                        <button className="btn btn-xs btn-outline" style={{ flexShrink: 0 }} onClick={() => { closeUploadFlow(); navigate && navigate('add-member'); }}>Add Member</button>
                      </div>
                    )}
                    {uploadedDoc.aiSummary.fields && uploadedDoc.aiSummary.fields.length > 0 && (
                      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: 'var(--surface2)', fontSize: 11, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Extracted Fields</div>
                        {uploadedDoc.aiSummary.fields.map((f, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                            <span style={{ color: 'var(--txt3)', minWidth: 100 }}>{f.key}</span>
                            <span style={{ fontWeight: 600, color: 'var(--txt)', flex: 1, textAlign: 'right' }}>{f.value}</span>
                            <span style={{
                              marginLeft: 8, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                              background: f.confidence >= 0.9 ? '#d1fae5' : f.confidence >= 0.7 ? '#fef3c7' : '#fee2e2',
                              color: f.confidence >= 0.9 ? '#065f46' : f.confidence >= 0.7 ? '#92400e' : '#991b1b'
                            }}>{Math.round(f.confidence * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {uploadedDoc.ocrText && (
                      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--txt4)' }}>
                        OCR extracted {uploadedDoc.ocrText.length} characters
                      </div>
                    )}
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

                {aiFields.length === 0 && legacyPairs.length > 0 && (
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
      {showCamera && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#111', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Scan Document</span>
            <button onClick={stopCamera} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>&times;</button>
          </div>

          {/* Camera / Preview */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Corner bracket alignment guide */}
                <div style={{ position: 'absolute', inset: '8%', border: '2.5px dashed rgba(10,158,158,0.7)', borderRadius: 16, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', width: 30, height: 30, top: -2, left: -2, borderTop: '4px solid #0a9e9e', borderLeft: '4px solid #0a9e9e', borderRadius: '8px 0 0 0' }}></div>
                  <div style={{ position: 'absolute', width: 30, height: 30, top: -2, right: -2, borderTop: '4px solid #0a9e9e', borderRight: '4px solid #0a9e9e', borderRadius: '0 8px 0 0' }}></div>
                  <div style={{ position: 'absolute', width: 30, height: 30, bottom: -2, left: -2, borderBottom: '4px solid #0a9e9e', borderLeft: '4px solid #0a9e9e', borderRadius: '0 0 0 8px' }}></div>
                  <div style={{ position: 'absolute', width: 30, height: 30, bottom: -2, right: -2, borderBottom: '4px solid #0a9e9e', borderRight: '4px solid #0a9e9e', borderRadius: '0 0 8px 0' }}></div>
                </div>
                <div style={{ position: 'absolute', bottom: 90, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 13, fontWeight: 600, background: 'rgba(0,0,0,0.6)', padding: '6px 16px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  Align document within frame
                </div>
              </>
            ) : (
              <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#111' }} />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Bottom Controls */}
          <div style={{ padding: '16px 24px 28px', background: '#111', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 24, flexShrink: 0 }}>
            {!capturedImage ? (
              <button onClick={capturePhoto} aria-label="Capture" style={{
                width: 68, height: 68, borderRadius: '50%', border: '5px solid #fff',
                background: 'transparent', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
              }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff' }}></div>
              </button>
            ) : (
              <>
                <button onClick={retakePhoto} style={{
                  padding: '12px 28px', background: '#333', color: '#fff', border: 'none',
                  borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  minHeight: 48, WebkitTapHighlightColor: 'transparent'
                }}>Retake</button>
                <button onClick={acceptPhoto} style={{
                  padding: '12px 28px', background: '#0a9e9e', color: '#fff', border: 'none',
                  borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  minHeight: 48, WebkitTapHighlightColor: 'transparent'
                }}>Use Photo</button>
              </>
            )}
          </div>
        </div>
      )}

      {hoverDoc && window.innerWidth <= 768 && (
        <div onClick={() => setHoverDoc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998 }} />
      )}
      {hoverDoc && (
        <div className="doc-hover-popup" style={{
          position: 'fixed',
          top: Math.min(hoverPos.y, window.innerHeight - 350),
          left: Math.min(hoverPos.x, window.innerWidth - 340),
          zIndex: 9999,
        }} onMouseEnter={() => clearTimeout(hoverTimeout.current)} onMouseLeave={() => { if (window.innerWidth > 768) handleDocLeave(); }}>
          {window.innerWidth <= 768 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt)' }}>Document Details</span>
              <button onClick={(e) => { e.stopPropagation(); setHoverDoc(null); }} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--txt3)', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>&times;</button>
            </div>
          )}
          <div className="doc-hover-preview">
            {(() => {
              const previewPath = hoverDoc.file_path
                ? (hoverDoc.file_path.endsWith('.svg') ? '/doc-previews/' : '/uploads/') + hoverDoc.file_path
                : null;
              if (previewPath) {
                return <img src={previewPath} alt={hoverDoc.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }} />;
              }
              return (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4f8, #e8edf3)' }}>
                  <span style={{ fontSize: 44 }}>{catIcon(hoverDoc.category)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt3)', marginTop: 6 }}>{(() => { const ai = parseAi(hoverDoc); return ai?.type || hoverDoc.name; })()}</span>
                </div>
              );
            })()}
          </div>
          <div className="doc-hover-details">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt)', marginBottom: 8 }}>{hoverDoc.name}</div>
            {(() => {
              const ai = parseAi(hoverDoc);
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ai?.type && (
                    <div className="doc-hover-row">
                      <span className="doc-hover-label">Type</span>
                      <span className="doc-hover-value">{ai.type}</span>
                    </div>
                  )}
                  <div className="doc-hover-row">
                    <span className="doc-hover-label">Status</span>
                    <Badge color={statusColor(hoverDoc.status)}>{statusLabel(hoverDoc.status)}</Badge>
                  </div>
                  <div className="doc-hover-row">
                    <span className="doc-hover-label">Category</span>
                    <span className="doc-hover-value" style={{ textTransform: 'capitalize' }}>{hoverDoc.category}</span>
                  </div>
                  <div className="doc-hover-row">
                    <span className="doc-hover-label">Expiry</span>
                    <span className="doc-hover-value">{hoverDoc.expiry_date ? fmtDate(hoverDoc.expiry_date) : 'N/A'}</span>
                  </div>
                  <div className="doc-hover-row">
                    <span className="doc-hover-label">Uploaded</span>
                    <span className="doc-hover-value">{hoverDoc.created_at ? fmtDate(hoverDoc.created_at) : '—'}</span>
                  </div>
                  <div className="doc-hover-row">
                    <span className="doc-hover-label">File Size</span>
                    <span className="doc-hover-value">{hoverDoc.file_size || '—'}</span>
                  </div>
                  {ai?.fields && ai.fields.length > 0 && (
                    <>
                      <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>AI Extracted Fields</div>
                      {ai.fields.slice(0, 4).map((f, i) => (
                        <div key={i} className="doc-hover-row">
                          <span className="doc-hover-label">{f.key}</span>
                          <span className="doc-hover-value">{f.value}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
          {window.innerWidth <= 768 && (
            <div style={{ display: 'flex', gap: 12, padding: '10px 14px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
              <button onClick={(e) => { e.stopPropagation(); setHoverDoc(null); viewDoc(hoverDoc); }} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="View">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setHoverDoc(null); downloadDoc(hoverDoc); }} style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Download">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
