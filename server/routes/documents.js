const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');
const { requirePermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const VALID_CATEGORIES = ['identity', 'finance', 'property', 'insurance', 'legal', 'education', 'medical', 'tax', 'other'];
const VALID_STATUSES = ['current', 'expiring', 'expired', 'review'];

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

    // Enforce vault permission: 'own' users can only see their own documents
    if (req.user.vault === 'own') {
      query += ` AND d.owner_id = ?`;
      params.push(req.user.id);
    }

    if (category && category !== 'all' && VALID_CATEGORIES.includes(category)) {
      query += ` AND d.category = ?`;
      params.push(category);
    }
    if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
      query += ` AND d.status = ?`;
      params.push(status);
    }
    if (member && member !== 'all') {
      query += ` AND d.owner_id = ?`;
      params.push(member);
    }
    if (search && search.length <= 200) {
      query += ` AND d.name LIKE ?`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY d.created_at DESC`;

    const docs = db.prepare(query).all(...params);
    res.json(docs);
  } catch (err) {
    console.error('GET /documents error:', err.message);
    res.status(500).json({ error: 'Failed to load documents' });
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
    const aiAnalyzed = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE family_id=? AND ai_analyzed=1 AND is_deleted=0`).get(fid).c;
    res.json({ total, byStatus, byCategory, aiAnalyzed });
  } catch (err) {
    console.error('GET /documents/stats error:', err.message);
    res.status(500).json({ error: 'Failed to load document stats' });
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

    // Enforce vault 'own' permission
    if (req.user.vault === 'own' && doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    res.json(doc);
  } catch (err) {
    console.error('GET /documents/:id error:', err.message);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

// POST /api/documents/upload
router.post('/upload', auth, upload.single('file'), (req, res) => {
  try {
    const db = getDb();
    const { name, category, ownerId, notes } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Validate category
    const validCategory = VALID_CATEGORIES.includes(category) ? category : 'other';

    // Validate ownerId belongs to same family
    let resolvedOwnerId = req.user.id;
    if (ownerId && ownerId !== req.user.id) {
      const owner = db.prepare(`SELECT id FROM users WHERE id = ? AND family_id = ? AND is_active = 1`).get(ownerId, req.user.family_id);
      if (owner) {
        resolvedOwnerId = ownerId;
      }
    }

    // Validate name length
    const docName = (name || file.originalname).slice(0, 255);

    // Simulate AI analysis
    const aiSummary = simulateAIAnalysis(file.originalname, validCategory);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO documents (id, family_id, owner_id, name, original_name, category, file_path, file_size, mime_type, ai_analyzed, ai_summary, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))
    `).run(
      id, req.user.family_id,
      resolvedOwnerId,
      docName,
      file.originalname,
      validCategory,
      file.filename,
      formatFileSize(file.size),
      file.mimetype,
      JSON.stringify(aiSummary),
      notes ? notes.slice(0, 1000) : null
    );

    // Log audit
    db.prepare(`INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), req.user.family_id, req.user.id, 'document.uploaded', 'documents', id,
      JSON.stringify({ name: docName })
    );

    const doc = db.prepare(`SELECT * FROM documents WHERE id = ?`).get(id);
    res.status(201).json({ ...doc, aiSummary });
  } catch (err) {
    console.error('POST /documents/upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// PUT /api/documents/:id
router.put('/:id', auth, (req, res) => {
  try {
    const db = getDb();
    const { name, category, status, expiry_date, notes, owner_id } = req.body;

    // Verify document belongs to family
    const existing = db.prepare(`SELECT owner_id FROM documents WHERE id = ? AND family_id = ?`).get(req.params.id, req.user.family_id);
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    // Enforce vault 'own' permission
    if (req.user.vault === 'own' && existing.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Validate category and status
    const validCategory = category && VALID_CATEGORIES.includes(category) ? category : undefined;
    const validStatus = status && VALID_STATUSES.includes(status) ? status : undefined;

    // Validate owner_id belongs to same family
    let resolvedOwnerId = existing.owner_id;
    if (owner_id && owner_id !== existing.owner_id) {
      const owner = db.prepare(`SELECT id FROM users WHERE id = ? AND family_id = ? AND is_active = 1`).get(owner_id, req.user.family_id);
      if (owner) resolvedOwnerId = owner_id;
    }

    db.prepare(`
      UPDATE documents SET name=?, category=?, status=?, expiry_date=?, notes=?, owner_id=?, updated_at=datetime('now')
      WHERE id=? AND family_id=?
    `).run(
      name ? name.slice(0, 255) : null,
      validCategory, validStatus,
      expiry_date || null,
      notes ? notes.slice(0, 1000) : null,
      resolvedOwnerId,
      req.params.id, req.user.family_id
    );

    // Audit log
    db.prepare(`INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), req.user.family_id, req.user.id, 'document.updated', 'documents', req.params.id,
      JSON.stringify({ name })
    );

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /documents/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', auth, (req, res) => {
  try {
    const db = getDb();

    // Verify document exists and check ownership
    const existing = db.prepare(`SELECT owner_id, name FROM documents WHERE id = ? AND family_id = ?`).get(req.params.id, req.user.family_id);
    if (!existing) return res.status(404).json({ error: 'Document not found' });

    if (req.user.vault === 'own' && existing.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    db.prepare(`UPDATE documents SET is_deleted=1, updated_at=datetime('now') WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);

    // Audit log
    db.prepare(`INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), req.user.family_id, req.user.id, 'document.deleted', 'documents', req.params.id,
      JSON.stringify({ name: existing.name })
    );

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /documents/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete document' });
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
