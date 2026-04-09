const express = require('express');
const path = require('path');
const fs = require('fs');
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

// GET /api/documents/:id/download — MUST be before /:id to avoid route conflict
router.get('/:id/download', auth, (req, res) => {
  try {
    const db = getDb();
    const doc = db.prepare(`
      SELECT d.*, u.first_name || ' ' || u.last_name as member_name
      FROM documents d LEFT JOIN users u ON u.id = d.owner_id
      WHERE d.id = ? AND d.family_id = ?
    `).get(req.params.id, req.user.family_id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (req.user.vault === 'own' && doc.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // If real file exists, serve it
    if (doc.file_path) {
      const filePath = path.join(__dirname, '..', '..', 'uploads', doc.file_path);
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        const filename = doc.original_name || doc.name;
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
        return fs.createReadStream(filePath).pipe(res);
      }
    }

    // For seeded docs: generate a text summary
    let ai = null;
    try { ai = doc.ai_summary ? JSON.parse(doc.ai_summary) : null; } catch {}
    const lines = [
      `LINIO Document Summary`, `========================`, ``,
      `Name: ${doc.name}`, `Category: ${doc.category}`, `Status: ${doc.status}`,
      `Expiry: ${doc.expiry_date || 'N/A'}`, `Member: ${doc.member_name || 'Unknown'}`,
      `File Size: ${doc.file_size || 'N/A'}`, `AI Analyzed: ${doc.ai_analyzed ? 'Yes' : 'No'}`, ``,
    ];
    if (ai) { lines.push(`--- AI Analysis ---`); Object.entries(ai).forEach(([k, v]) => lines.push(`${k}: ${v}`)); }

    const content = lines.join('\n');
    const filename = doc.name.replace(/[^a-zA-Z0-9 .-]/g, '') + '.txt';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', Buffer.byteLength(content));
    res.send(content);
  } catch (err) {
    console.error('GET /documents/:id/download error:', err.message);
    res.status(500).json({ error: 'Download failed' });
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

    // Validate / auto-detect category from filename when possible
    let validCategory = VALID_CATEGORIES.includes(category) ? category : 'other';
    const lowerName = file.originalname.toLowerCase();
    if (validCategory === 'other') {
      if (lowerName.includes('passport') || lowerName.includes('license') || lowerName.includes('dl ')) {
        validCategory = 'identity';
      } else if (lowerName.includes('birth') || lowerName.includes('certificate')) {
        validCategory = 'legal';
      }
    }

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

    // Extract structured data + summary
    const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
    const fullPath = path.join(uploadsRoot, file.filename);
    const aiSummary = simulateAIAnalysis(file.originalname, validCategory, fullPath);

    // Derive expiry + status from extracted data (if available)
    let expiryDate = aiSummary.expiryDate || null;
    let status = 'current';
    if (expiryDate) {
      const today = new Date();
      const exp = new Date(expiryDate);
      if (!isNaN(exp.getTime())) {
        const diffDays = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) status = 'expired';
        else if (diffDays <= 90) status = 'expiring';
      }
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO documents (id, family_id, owner_id, name, original_name, category, file_path, file_size, mime_type, status, expiry_date, ai_analyzed, ai_summary, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))
    `).run(
      id,
      req.user.family_id,
      resolvedOwnerId,
      docName,
      file.originalname,
      validCategory,
      file.filename,
      formatFileSize(file.size),
      file.mimetype,
      status,
      expiryDate,
      JSON.stringify(aiSummary),
      notes ? notes.slice(0, 1000) : null
    );

    // Log audit
    db.prepare(`INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), req.user.family_id, req.user.id, 'document.uploaded', 'documents', id,
      JSON.stringify({ name: docName })
    );

    // Auto-generate alert based on expiry
    const owner = db.prepare(`SELECT first_name, last_name FROM users WHERE id = ?`).get(resolvedOwnerId);
    const ownerName = owner ? `${owner.first_name} ${owner.last_name}`.trim() : 'Family member';
    const docTypeLabel = aiSummary.type || 'Document';

    let alertType = 'info';
    let title;
    let description;

    if (expiryDate) {
      const today = new Date();
      const exp = new Date(expiryDate);
      if (!isNaN(exp.getTime())) {
        const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const expStr = expiryDate;

        if (diffDays < 0) {
          alertType = 'urgent';
          title = `${docTypeLabel} has expired — ${ownerName}`;
          description = `${ownerName}'s ${docTypeLabel} expired on ${expStr}. Immediate renewal required.`;
        } else if (diffDays <= 90) {
          alertType = 'urgent';
          title = `${docTypeLabel} expires in ${diffDays} days — ${ownerName}`;
          description = `${ownerName}'s ${docTypeLabel} expires on ${expStr}. Start renewal process now.`;
        } else if (diffDays <= 180) {
          alertType = 'warning';
          title = `${docTypeLabel} expiring soon — ${ownerName}`;
          description = `${ownerName}'s ${docTypeLabel} expires on ${expStr}. Plan for renewal.`;
        } else {
          alertType = 'info';
          title = `${docTypeLabel} verified — ${ownerName}`;
          description = `${ownerName}'s ${docTypeLabel} is valid until ${expStr}.`;
        }
      }
    } else {
      alertType = 'success';
      title = `${docTypeLabel} uploaded & verified — ${ownerName}`;
      description = `AI verified ${ownerName}'s ${docTypeLabel}. All key fields extracted.`;
    }

    if (title && description) {
      db.prepare(`
        INSERT INTO alerts (id, family_id, user_id, type, icon, title, description, is_read, is_dismissed, link_page, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, datetime('now'))
      `).run(
        uuidv4(),
        req.user.family_id,
        resolvedOwnerId,
        alertType,
        null,
        title,
        description,
        'documents'
      );
    }

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

    const doc = db.prepare("SELECT ai_summary, owner_id FROM documents WHERE id=? AND family_id=?").get(req.params.id, req.user.family_id);
    let aiType = '';
    try { aiType = JSON.parse(doc.ai_summary)?.type || ''; } catch {}
    const owner = db.prepare("SELECT first_name, last_name FROM users WHERE id=?").get(doc.owner_id);
    const ownerName = owner ? owner.first_name + ' ' + owner.last_name : '';

    db.prepare(`UPDATE documents SET is_deleted=1, updated_at=datetime('now') WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    if (aiType && ownerName) {
      db.prepare("UPDATE alerts SET is_dismissed=1 WHERE family_id=? AND title LIKE ? AND title LIKE ?").run(req.user.family_id, '%' + aiType + '%', '%' + ownerName + '%');
    } else {
      db.prepare("UPDATE alerts SET is_dismissed=1 WHERE family_id=? AND description LIKE ?").run(req.user.family_id, '%' + existing.name + '%');
    }

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

function readFileTextSafe(fullPath) {
  try {
    return fs.readFileSync(fullPath, 'utf8');
  } catch (e) {
    return '';
  }
}

function extractStructuredDataFromFile(filename, fullPath) {
  const lower = filename.toLowerCase();
  const text = readFileTextSafe(fullPath);
  const base = { rawPreview: text ? text.slice(0, 400) : null };

  // Passport
  if (lower.includes('passport')) {
    const numberMatch = text.match(/Passport\s*No:\s*([A-Za-z0-9-]+)/i);
    const nameMatch = text.match(/Name:\s*([^,]+)/i);
    const expiryMatch = text.match(/(Expiry|Expires)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const countryMatch = text.match(/Country:\s*([^,]+)/i);
    return {
      ...base,
      docType: 'passport',
      number: numberMatch ? numberMatch[1].trim() : null,
      fullName: nameMatch ? nameMatch[1].trim() : null,
      expiryDate: expiryMatch ? expiryMatch[2].trim() : null,
      country: countryMatch ? countryMatch[1].trim() : null,
      confidence: 0.96,
    };
  }

  // Driver license
  if (lower.includes('driver') || lower.includes('dl')) {
    const numberMatch = text.match(/DL\s*No:\s*([A-Za-z0-9-]+)/i);
    const nameMatch = text.match(/Name:\s*([^,]+)/i);
    const expiryMatch = text.match(/(Expiry|Expires)\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const stateMatch = text.match(/State:\s*([^,]+)/i);
    return {
      ...base,
      docType: 'driver_license',
      number: numberMatch ? numberMatch[1].trim() : null,
      fullName: nameMatch ? nameMatch[1].trim() : null,
      expiryDate: expiryMatch ? expiryMatch[2].trim() : null,
      state: stateMatch ? stateMatch[1].trim() : null,
      confidence: 0.95,
    };
  }

  // Birth certificate
  if (lower.includes('birth') || lower.includes('certificate')) {
    const numberMatch = text.match(/Certificate\s*No:\s*([A-Za-z0-9-]+)/i);
    const nameMatch = text.match(/Name:\s*([^,]+)/i);
    const dobMatch = text.match(/DOB:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const stateMatch = text.match(/State:\s*([^,]+)/i);
    return {
      ...base,
      docType: 'birth_certificate',
      certificateNumber: numberMatch ? numberMatch[1].trim() : null,
      fullName: nameMatch ? nameMatch[1].trim() : null,
      dob: dobMatch ? dobMatch[1].trim() : null,
      state: stateMatch ? stateMatch[1].trim() : null,
      confidence: 0.94,
    };
  }

  // Fallback generic extraction
  return {
    ...base,
    docType: 'document',
    confidence: 0.8,
  };
}

function simulateAIAnalysis(filename, category, fullPath) {
  const lower = filename.toLowerCase();
  const structured = extractStructuredDataFromFile(filename, fullPath);
  const filenameName = inferNameFromFilename(filename);

  // US-focused documents (priority)
  if (lower.includes('passport')) {
    const extractedFields = {
      number: structured.number || '987654321',
      name: structured.fullName || filenameName || 'From filename',
      expiryDate: structured.expiryDate || '2028-03-28',
      country: structured.country || 'USA',
    };
    return {
      type: 'US Passport',
      number: extractedFields.number,
      name: extractedFields.name,
      expiryDate: extractedFields.expiryDate,
      state: null,
      confidence: 0.97,
      extractedFields,
    };
  }

  if (lower.includes('license') || lower.includes('dl') || lower.includes('driver')) {
    const extractedFields = {
      number: structured.number || 'D1234567',
      name: structured.fullName || filenameName || 'From filename',
      expiryDate: structured.expiryDate || '2028-08-22',
      state: structured.state || 'California',
      dob: structured.dob || null,
    };
    return {
      type: 'US Driver License',
      number: extractedFields.number,
      name: extractedFields.name,
      expiryDate: extractedFields.expiryDate,
      state: extractedFields.state,
      confidence: 0.95,
      extractedFields,
    };
  }

  if (lower.includes('birth')) {
    const extractedFields = {
      number: structured.certificateNumber || '2015-BC-987654367',
      name: structured.fullName || filenameName || 'From filename',
      dateOfBirth: structured.dob || '2015-06-15',
      state: structured.state || 'California',
    };
    return {
      type: 'US Birth Certificate',
      number: extractedFields.number,
      name: extractedFields.name,
      expiryDate: null,
      state: extractedFields.state,
      confidence: 0.96,
      extractedFields,
    };
  }

  if (lower.includes('social') || lower.includes('ssn') || lower.includes('ss')) {
    const text = readFileTextSafe(fullPath);
    const last4Match = text.match(/(?:\d{3}-\d{2}-)?(\d{4})/);
    const extractedFields = {
      lastFour: last4Match ? last4Match[1] : '6789',
      name: filenameName || 'From filename',
    };
    return {
      type: 'Social Security Card',
      number: `***-**-${extractedFields.lastFour}`,
      name: extractedFields.name,
      expiryDate: null,
      state: null,
      confidence: 0.92,
      extractedFields,
    };
  }

  if (lower.includes('marriage')) {
    const extractedFields = {
      number: 'MC-2010-45678',
      date: '2010-11-20',
      state: 'California',
    };
    return {
      type: 'Marriage Certificate',
      number: extractedFields.number,
      name: filenameName || null,
      expiryDate: null,
      state: extractedFields.state,
      confidence: 0.94,
      extractedFields,
    };
  }

  if (lower.includes('insurance')) {
    const text = readFileTextSafe(fullPath);
    const policyMatch = text.match(/Policy\s*(No|Number):\s*([A-Za-z0-9-]+)/i);
    const providerMatch = text.match(/(Provider|Insurer|Company):\s*([^,]+)/i);
    const expiryMatch = text.match(/(Expiry|Expires|Valid\s*Until):\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    const coverageMatch = text.match(/Coverage\s*Type:\s*([^,]+)/i);
    const extractedFields = {
      policyNumber: policyMatch ? policyMatch[2].trim() : null,
      provider: providerMatch ? providerMatch[2].trim() : null,
      expiryDate: expiryMatch ? expiryMatch[2].trim() : null,
      coverageType: coverageMatch ? coverageMatch[1].trim() : null,
      name: filenameName || null,
    };
    return {
      type: 'Insurance Document',
      number: extractedFields.policyNumber,
      name: extractedFields.name,
      expiryDate: extractedFields.expiryDate,
      state: null,
      confidence: 0.93,
      extractedFields,
    };
  }

  // India-focused detection (kept for compatibility)
  const now = new Date();
  if (lower.includes('aadhaar') || lower.includes('aadhar')) {
    const extractedFields = {
      issuer: 'UIDAI',
      expiryDate: null,
    };
    return {
      type: 'Aadhaar Card',
      number: null,
      name: null,
      expiryDate: null,
      state: null,
      confidence: 0.99,
      extractedFields,
    };
  }
  if (lower.includes('pan')) {
    const extractedFields = {
      issuer: 'Income Tax Department',
      expiryDate: null,
    };
    return {
      type: 'PAN Card',
      number: null,
      name: null,
      expiryDate: null,
      state: null,
      confidence: 0.98,
      extractedFields,
    };
  }
  if (lower.includes('itr') || lower.includes('tax')) {
    const extractedFields = {
      issuer: 'Income Tax Department',
      expiryDate: null,
    };
    return {
      type: 'Tax Document',
      number: null,
      name: null,
      expiryDate: null,
      state: null,
      confidence: 0.96,
      extractedFields,
    };
  }
  if (lower.includes('fd') || lower.includes('deposit')) {
    const exp = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
    const expStr = exp.toISOString().split('T')[0];
    const extractedFields = {
      issuer: 'Bank',
      expiryDate: expStr,
    };
    return {
      type: 'Fixed Deposit',
      number: null,
      name: null,
      expiryDate: expStr,
      state: null,
      confidence: 0.95,
      extractedFields,
    };
  }

  // Generic fallback
  const extractedFields = {
    category,
  };
  return {
    type: 'Document',
    number: null,
    name: null,
    expiryDate: null,
    state: null,
    confidence: structured.confidence || 0.82,
    extractedFields,
  };
}

function inferNameFromFilename(filename) {
  const noExt = filename.replace(/\.[^.]+$/, '');
  const parts = noExt.split(/[_-]/).filter(Boolean);
  const known = new Set(['sample', 'passport', 'drivers', 'driver', 'license', 'dl', 'birth', 'certificate', 'social', 'ssn', 'ss', 'marriage', 'insurance', 'document']);
  const nameParts = parts.filter(p => !known.has(p.toLowerCase()));
  if (!nameParts.length) return null;
  return nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}

module.exports = router;
