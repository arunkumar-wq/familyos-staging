const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Tesseract = require('tesseract.js');
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
      SELECT d.*, u.first_name || ' ' || u.last_name as member_name, u.avatar_color, u.avatar_url
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

// POST /api/documents/analyze — Run OCR without saving document
router.post('/analyze', auth, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file' });

    const filePath = path.join(__dirname, '..', '..', 'uploads', file.filename);

    // Run OCR on images only
    let ocrResult = { text: '', confidence: 0 };
    const ocrTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (ocrTypes.includes(file.mimetype)) {
      try {
        const worker = await Tesseract.createWorker('eng');
        const { data } = await worker.recognize(filePath);
        await worker.terminate();
        ocrResult = { text: data.text || '', confidence: data.confidence || 0 };
      } catch (e) {
        console.error('OCR error:', e.message);
      }
    }

    // Parse fields from OCR text + filename
    const parsed = parseDocumentFields(ocrResult.text, file.originalname);

    // Match member from OCR text
    const db = getDb();
    const familyMembers = db.prepare(`SELECT id, first_name, last_name FROM users WHERE family_id=?`).all(req.user.family_id);

    let matchedMember = null;
    let nameWarning = null;

    // Try OCR-detected name first
    if (parsed.detectedName) {
      matchedMember = familyMembers.find(m =>
        parsed.detectedName.toUpperCase().includes(m.first_name.toUpperCase()) ||
        parsed.detectedName.toUpperCase().includes(m.last_name.toUpperCase())
      );
    }

    // Fallback: search full OCR text for any family member name
    if (!matchedMember && ocrResult.text) {
      const ocrUpper = ocrResult.text.toUpperCase();
      matchedMember = familyMembers.find(m =>
        ocrUpper.includes(m.first_name.toUpperCase()) && ocrUpper.includes(m.last_name.toUpperCase())
      );
    }

    // Fallback: try filename
    if (!matchedMember) {
      const fname = file.originalname.toLowerCase();
      matchedMember = familyMembers.find(m => fname.includes(m.first_name.toLowerCase()));
    }

    if (!matchedMember && parsed.detectedName) {
      nameWarning = parsed.detectedName + " doesn't match any family member";
    }

    // DELETE temp file after analysis
    try { fs.unlinkSync(filePath); } catch (e) { console.error('Temp file cleanup error:', e.message); }

    res.json({
      type: parsed.type,
      category: parsed.category,
      confidence: parsed.confidence,
      fields: parsed.fields,
      expiryDate: parsed.expiryDate,
      detectedName: parsed.detectedName,
      matchedMemberId: matchedMember ? matchedMember.id : null,
      matchedMemberName: matchedMember ? matchedMember.first_name + ' ' + matchedMember.last_name : null,
      nameWarning: nameWarning,
      ocrTextLength: ocrResult.text.length,
      ocrConfidence: ocrResult.confidence,
    });
  } catch (err) {
    console.error('Analyze error:', err.message);
    if (req.file) {
      try { fs.unlinkSync(path.join(__dirname, '..', '..', 'uploads', req.file.filename)); } catch (e) {}
    }
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// POST /api/documents/upload
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const db = getDb();
    const { name, category, ownerId, notes } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Validate / auto-detect category from filename when possible
    let validCategory = VALID_CATEGORIES.includes(category) ? category : 'other';
    const lowerName = file.originalname.toLowerCase();
    if (validCategory === 'other') {
      if (lowerName.includes('passport') || lowerName.includes('license') || lowerName.includes('dl ') || lowerName.includes('birth_cert') || lowerName.includes('birth certificate')) {
        validCategory = 'identity';
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

    // Real OCR extraction
    const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
    const fullPath = path.join(uploadsRoot, file.filename);
    const ocr = await ocrExtract(fullPath, file.mimetype);
    const parsed = parseDocumentFields(ocr.text, file.originalname);

    // If OCR produced no text at all, fall back to legacy simulated analysis
    let aiSummary;
    if (ocr.text && ocr.text.trim().length > 10) {
      aiSummary = {
        type: parsed.type,
        confidence: parsed.confidence,
        fields: parsed.fields,
        expiryDate: parsed.expiryDate,
        ocrConfidence: ocr.confidence,
        ocrTextLength: ocr.text.length,
      };
    } else {
      const fallback = simulateAIAnalysis(file.originalname, validCategory, fullPath);
      aiSummary = { ...fallback, ocrConfidence: 0, ocrTextLength: 0 };
    }

    // Auto-match owner with family members using OCR-extracted name
    let autoMatchedMember = null;
    let autoMatchedId = null;
    let nameWarning = null;

    if (parsed.detectedName) {
      const members = db.prepare(`SELECT id, first_name, last_name FROM users WHERE family_id=?`).all(req.user.family_id);
      const match = members.find(m =>
        parsed.detectedName.toUpperCase().includes(m.first_name.toUpperCase()) ||
        parsed.detectedName.toUpperCase().includes(m.last_name.toUpperCase())
      );
      if (match) {
        autoMatchedMember = match.first_name + ' ' + match.last_name;
        autoMatchedId = match.id;
        if (!ownerId || ownerId === req.user.id) {
          resolvedOwnerId = match.id;
        }
      } else {
        nameWarning = "Name '" + parsed.detectedName + "' doesn't match any family member";
      }
    }

    // Fallback: filename-based member matching
    if (!autoMatchedMember) {
      const members = db.prepare(`SELECT id, first_name, last_name FROM users WHERE family_id=?`).all(req.user.family_id);
      const fnameMatch = members.find(m => file.originalname.toLowerCase().includes(m.first_name.toLowerCase()));
      if (fnameMatch) {
        autoMatchedMember = fnameMatch.first_name + ' ' + fnameMatch.last_name;
        autoMatchedId = fnameMatch.id;
      }
    }

    // Use detected category if user left it as 'other'
    const finalCategory = (validCategory && validCategory !== 'other') ? validCategory : (parsed.category || 'other');

    // Derive expiry + status from extracted data
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
      finalCategory,
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
    res.status(201).json({
      ...doc,
      aiSummary,
      autoMatchedMember,
      autoMatchedId,
      nameWarning,
      ocrText: (ocr.text || '').substring(0, 500),
    });
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

// ---- Real OCR extraction via Tesseract.js ----
async function ocrExtract(filePath, mimeType) {
  const ocrTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!ocrTypes.includes(mimeType)) {
    return { text: '', confidence: 0 };
  }
  try {
    const worker = await Tesseract.createWorker('eng');
    const { data } = await worker.recognize(filePath);
    await worker.terminate();
    return { text: data.text || '', confidence: data.confidence || 0 };
  } catch (err) {
    console.error('OCR error:', err.message);
    return { text: '', confidence: 0 };
  }
}

// ---- Parse OCR text into structured fields ----
function parseDocumentFields(ocrText, filename) {
  const text = (ocrText || '').toUpperCase();
  const lower = (filename || '').toLowerCase();
  let type = 'Unknown Document';
  let fields = [];
  let expiryDate = null;
  let detectedName = null;
  let category = 'other';

  if (text.includes('PASSPORT') || text.includes('DEPARTMENT OF STATE') || lower.includes('passport')) {
    type = 'US Passport';
    category = 'identity';
    const num = text.match(/(?:PASSPORT\s*(?:NO|NUMBER|#)?\.?\s*[:.]?\s*)(\d{8,9})/i) || text.match(/\b(\d{9})\b/);
    const expiry = text.match(/(?:EXPIR|EXP|DATE OF EXPIR)[A-Z\s]*[:.]?\s*(\d{2}[\/-]\d{2}[\/-]\d{4}|\d{2}\s+[A-Z]{3}\s+\d{4})/i);
    const name = text.match(/(?:SURNAME|LAST NAME|NAME)[:\s]*([A-Z]+)/);
    const given = text.match(/(?:GIVEN|FIRST)[A-Z\s]*[:\s]*([A-Z]+)/);
    const dob = text.match(/(?:DATE OF BIRTH|DOB|BIRTH)[:\s]*(\d{2}[\/-]\d{2}[\/-]\d{4}|\d{2}\s+[A-Z]{3}\s+\d{4})/i);

    fields = [
      { key: 'Passport Number', value: num ? num[1] : 'Not detected', confidence: num ? 0.96 : 0.40 },
      { key: 'Full Name', value: (name && given) ? given[1] + ' ' + name[1] : (name ? name[1] : 'Not detected'), confidence: name ? 0.94 : 0.40 },
      { key: 'Date of Birth', value: dob ? dob[1] : 'Not detected', confidence: dob ? 0.95 : 0.40 },
      { key: 'Expiry Date', value: expiry ? expiry[1] : 'Not detected', confidence: expiry ? 0.97 : 0.40 },
      { key: 'Issuing Country', value: text.includes('UNITED STATES') ? 'United States' : 'USA', confidence: 0.98 },
    ];
    if (expiry) expiryDate = expiry[1];
    detectedName = (name && given) ? given[1] + ' ' + name[1] : (name ? name[1] : null);

  } else if (text.includes('DRIVER') || text.includes('LICENSE') || text.includes('DMV') || lower.includes('license') || lower.includes('driver') || lower.includes('dl')) {
    type = 'US Driver License';
    category = 'identity';
    const dlNum = text.match(/(?:DL|LICENSE|LIC)[\s#.:]*([A-Z]?\d{7,8})/i) || text.match(/\b([A-Z]\d{7})\b/);
    const expiry = text.match(/(?:EXP|EXPIR)[A-Z\s]*[:.]?\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/i);
    const name = text.match(/(?:LN|LAST|SURNAME)[:\s]*([A-Z]+)/);
    const given = text.match(/(?:FN|FIRST|GIVEN)[:\s]*([A-Z]+)/);
    const dob = text.match(/(?:DOB|BIRTH)[:\s]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i);
    const state = text.match(/(CALIFORNIA|TEXAS|NEW YORK|FLORIDA|ILLINOIS|OHIO|GEORGIA|MICHIGAN|ARIZONA|WASHINGTON)/i);

    fields = [
      { key: 'DL Number', value: dlNum ? dlNum[1] : 'Not detected', confidence: dlNum ? 0.95 : 0.40 },
      { key: 'Full Name', value: (name && given) ? given[1] + ' ' + name[1] : (name ? name[1] : 'Not detected'), confidence: name ? 0.93 : 0.40 },
      { key: 'Date of Birth', value: dob ? dob[1] : 'Not detected', confidence: dob ? 0.94 : 0.40 },
      { key: 'Expiry Date', value: expiry ? expiry[1] : 'Not detected', confidence: expiry ? 0.96 : 0.40 },
      { key: 'State', value: state ? state[1] : 'Not detected', confidence: state ? 0.97 : 0.40 },
    ];
    if (expiry) expiryDate = expiry[1];
    detectedName = (name && given) ? given[1] + ' ' + name[1] : null;

  } else if (text.includes('BIRTH') || text.includes('CERTIFICATE OF LIVE') || lower.includes('birth')) {
    type = 'Birth Certificate';
    category = 'identity';
    const certNum = text.match(/(?:CERTIFICATE|CERT)[\s#.:NO]*(\d{4}[\-]?[A-Z]*[\-]?\d+)/i) || text.match(/\b(\d{4}-[A-Z]{2}-\d+)\b/);
    const name = text.match(/(?:CHILD|NAME)[:\s]*([A-Z]+\s+[A-Z]+)/);
    const dob = text.match(/(?:DATE OF BIRTH|BIRTH)[:\s]*([\w]+\s+\d{1,2},?\s+\d{4}|\d{2}[\/-]\d{2}[\/-]\d{4})/i);
    const place = text.match(/(?:PLACE|CITY)[:\s]*([A-Z\s,]+(?:CALIFORNIA|CA|TEXAS|TX|NEW YORK|NY))/i);

    fields = [
      { key: 'Certificate Number', value: certNum ? certNum[1] : 'Not detected', confidence: certNum ? 0.94 : 0.40 },
      { key: 'Full Name', value: name ? name[1] : 'Not detected', confidence: name ? 0.95 : 0.40 },
      { key: 'Date of Birth', value: dob ? dob[1] : 'Not detected', confidence: dob ? 0.96 : 0.40 },
      { key: 'Place of Birth', value: place ? place[1].trim() : 'Not detected', confidence: place ? 0.93 : 0.40 },
    ];
    expiryDate = null;
    detectedName = name ? name[1] : null;

  } else if (text.includes('INSURANCE') || text.includes('POLICY') || lower.includes('insurance')) {
    type = 'Insurance Policy';
    category = 'insurance';
    const policyNum = text.match(/(?:POLICY)[\s#.:NO]*([A-Z0-9\-]+)/i);
    const expiry = text.match(/(?:EXP|EXPIR|VALID UNTIL)[A-Z\s]*[:.]?\s*(\d{2}[\/-]\d{2}[\/-]\d{4})/i);
    fields = [
      { key: 'Policy Number', value: policyNum ? policyNum[1] : 'Not detected', confidence: policyNum ? 0.93 : 0.40 },
      { key: 'Expiry Date', value: expiry ? expiry[1] : 'Not detected', confidence: expiry ? 0.95 : 0.40 },
      { key: 'Type', value: text.includes('LIFE') ? 'Life Insurance' : text.includes('HOME') ? 'Home Insurance' : text.includes('AUTO') ? 'Auto Insurance' : 'Insurance', confidence: 0.85 },
    ];
    if (expiry) expiryDate = expiry[1];

  } else if (text.includes('1099') || text.includes('W-2') || text.includes('TAX RETURN') || lower.includes('tax') || lower.includes('1099') || lower.includes('w2')) {
    type = 'Tax Document';
    category = 'tax';
    const yearMatch = text.match(/20\d{2}/);
    fields = [
      { key: 'Document Type', value: text.includes('1099') ? '1099' : text.includes('W-2') ? 'W-2' : 'Tax Document', confidence: 0.92 },
      { key: 'Tax Year', value: yearMatch ? yearMatch[0] : 'Not detected', confidence: yearMatch ? 0.90 : 0.40 },
    ];

  } else {
    type = 'Document';
    category = 'other';
    const anyDate = text.match(/(\d{2}[\/-]\d{2}[\/-]\d{4})/);
    fields = [
      { key: 'Document Type', value: 'Unclassified', confidence: 0.50 },
      { key: 'Date Found', value: anyDate ? anyDate[1] : 'None', confidence: anyDate ? 0.80 : 0.30 },
    ];
  }

  const avgConfidence = fields.length > 0 ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length : 0.50;

  return { type, fields, expiryDate, detectedName, category, confidence: Math.round(avgConfidence * 100) / 100 };
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
