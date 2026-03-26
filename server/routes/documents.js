const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/documents
router.get('/', auth, (req, res) => {
  try {
    const db = getDb();
    const { category, status, member, search } = req.query;
    let query = `
      SELECT d.*, u.first_name || ' ' || u.last_name as member_name, u.avatar_color
      FROM documents d
      LEFT JOIN users u ON u.id = d.owner_id
      WHERE d.family_id = ? AND d.is_deleted = 0
    `;
    const params = [req.user.family_id];

    if (category && category !== 'all') { query += ` AND d.category = ?`; params.push(category); }
    if (status && status !== 'all') { query += ` AND d.status = ?`; params.push(status); }
    if (member && member !== 'all') { query += ` AND d.owner_id = ?`; params.push(member); }
    if (search) { query += ` AND d.name LIKE ?`; params.push(`%${search}%`); }

    query += ` ORDER BY d.created_at DESC`;

    const docs = db.prepare(query).all(...params);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/stats
router.get('/stats', auth, (req, res) => {
  try {
    const db = getDb();
    const fid = req.user.family_id;
    const total = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE family_id=? AND is_deleted=0`).get(fid).c;
    const byStatus = db.prepare(`SELECT status, COUNT(*) as c FROM documents WHERE family_id=? AND is_deleted=0 GROUP BY status`).all(fid);
    const byCategory = db.prepare(`SELECT category, COUNT(*) as c FROM documents WHERE family_id=? AND is_deleted=0 GROUP BY category`).all(fid);
    const aiAnalyzed = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE family_id=? AND ai_analyzed=1`).get(fid).c;
    res.json({ total, byStatus, byCategory, aiAnalyzed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id
router.get('/:id', auth, (req, res) => {
  try {
    const db = getDb();
    const doc = db.prepare(`
      SELECT d.*, u.first_name || ' ' || u.last_name as member_name
      FROM documents d LEFT JOIN users u ON u.id = d.owner_id
      WHERE d.id = ? AND d.family_id = ?
    `).get(req.params.id, req.user.family_id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/upload
router.post('/upload', auth, upload.single('file'), (req, res) => {
  try {
    const db = getDb();
    const { name, category, ownerId, notes } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Simulate AI analysis
    const aiSummary = simulateAIAnalysis(file.originalname, category);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO documents (id, family_id, owner_id, name, original_name, category, file_path, file_size, mime_type, ai_analyzed, ai_summary, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))
    `).run(
      id, req.user.family_id,
      ownerId || req.user.id,
      name || file.originalname,
      file.originalname,
      category || 'other',
      file.filename,
      formatFileSize(file.size),
      file.mimetype,
      JSON.stringify(aiSummary),
      notes || null
    );

    // Log audit
    db.prepare(`INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), req.user.family_id, req.user.id, 'document.uploaded', 'documents', id,
      JSON.stringify({ name: name || file.originalname })
    );

    const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(id);
    res.status(201).json({ ...doc, aiSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/documents/:id
router.put('/:id', auth, (req, res) => {
  try {
    const db = getDb();
    const { name, category, status, expiry_date, notes, owner_id } = req.body;
    db.prepare(`
      UPDATE documents SET name=?, category=?, status=?, expiry_date=?, notes=?, owner_id=?, updated_at=datetime('now')
      WHERE id=? AND family_id=?
    `).run(name, category, status, expiry_date, notes, owner_id, req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE documents SET is_deleted=1 WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── HELPERS ─────────────────────────────────────────────────────────
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function simulateAIAnalysis(filename, category) {
  const lower = filename.toLowerCase();
  const now = new Date();

  if (lower.includes('passport')) {
    const exp = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
    return { type: 'Passport', issuer: 'Ministry of External Affairs', expiryDate: exp.toISOString().split('T')[0], confidence: 0.97, fields: ['Document Number', 'Date of Issue', 'Expiry Date', 'Nationality'] };
  }
  if (lower.includes('aadhaar') || lower.includes('aadhar')) {
    return { type: 'Aadhaar Card', issuer: 'UIDAI', expiryDate: null, confidence: 0.99, fields: ['Aadhaar Number', 'Name', 'DOB', 'Address'] };
  }
  if (lower.includes('pan')) {
    return { type: 'PAN Card', issuer: 'Income Tax Department', expiryDate: null, confidence: 0.98, fields: ['PAN Number', 'Name', 'DOB', 'Father Name'] };
  }
  if (lower.includes('insurance')) {
    const exp = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    return { type: 'Insurance Policy', issuer: 'Insurance Company', expiryDate: exp.toISOString().split('T')[0], confidence: 0.94, fields: ['Policy Number', 'Insured Name', 'Premium', 'Expiry Date'] };
  }
  if (lower.includes('itr') || lower.includes('tax')) {
    return { type: 'Tax Document', issuer: 'Income Tax Department', expiryDate: null, confidence: 0.96, fields: ['Assessment Year', 'Income', 'Tax Paid', 'Refund Amount'] };
  }
  if (lower.includes('fd') || lower.includes('deposit')) {
    const exp = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    return { type: 'Fixed Deposit', issuer: 'Bank', expiryDate: exp.toISOString().split('T')[0], confidence: 0.95, fields: ['FD Number', 'Principal', 'Interest Rate', 'Maturity Date'] };
  }

  const cats = { finance: 'Financial Document', identity: 'Identity Document', property: 'Property Document', insurance: 'Insurance Document', legal: 'Legal Document', medical: 'Medical Document', education: 'Educational Document', tax: 'Tax Document' };
  return { type: cats[category] || 'Document', issuer: 'Unknown', expiryDate: null, confidence: 0.82, fields: ['Document detected — manual review recommended'] };
}

module.exports = router;
