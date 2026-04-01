const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

const VALID_ROLES = ['admin', 'co-admin', 'member', 'advisor', 'view-only'];
const VALID_RELATIONS = ['self', 'spouse', 'son', 'daughter', 'father', 'mother', 'sibling', 'advisor', 'other'];
const VALID_VAULT = ['full', 'view', 'own', 'none'];
const VALID_PORTFOLIO = ['full', 'view', 'none'];
const VALID_INSIGHTS = ['full', 'view', 'none'];
const VALID_FAMILY_MGMT = ['admin', 'co-admin', 'none'];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Generate a random temporary password
function generateTempPassword() {
  return crypto.randomBytes(12).toString('base64url');
}

// GET /api/family/members
router.get('/members', auth, (req, res) => {
  try {
    const db = getDb();
    const members = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.role, u.relation,
             u.date_of_birth, u.avatar_color, u.last_login, u.created_at,
             p.vault, p.portfolio, p.insights, p.family_mgmt,
             (SELECT COUNT(*) FROM documents d WHERE d.owner_id = u.id AND d.is_deleted=0) as doc_count
      FROM users u
      LEFT JOIN permissions p ON p.user_id = u.id
      WHERE u.family_id = ? AND u.is_active = 1
      ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'co-admin' THEN 1 ELSE 2 END ASC,
               u.created_at ASC
    `).all(req.user.family_id);
    res.json(members);
  } catch (err) {
    console.error('GET /members error:', err.message);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

// POST /api/family/members
router.post('/members', auth, requireRole('admin', 'co-admin'), (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, email, phone, role, relation, dateOfBirth, avatarColor, permissions } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName and email are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ error: 'Name too long' });
    }
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (relation && !VALID_RELATIONS.includes(relation)) {
      return res.status(400).json({ error: 'Invalid relation' });
    }
    // Co-admins cannot create admin users
    if (req.user.role === 'co-admin' && role === 'admin') {
      return res.status(403).json({ error: 'Co-admins cannot create admin users' });
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email=?`).get(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const userId = uuidv4();
    const tempPw = generateTempPassword();
    const tempPasswordHash = bcrypt.hashSync(tempPw, 10);

    db.prepare(`
      INSERT INTO users (id, family_id, first_name, last_name, email, phone, password_hash, role, relation, date_of_birth, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, req.user.family_id,
      firstName.trim(), lastName.trim(),
      email.toLowerCase().trim(), phone || null,
      tempPasswordHash,
      role || 'member', relation || null,
      dateOfBirth || null,
      avatarColor || '#0f1f3d'
    );

    // Validate permission values
    const p = permissions || {};
    const vault = VALID_VAULT.includes(p.vault) ? p.vault : 'own';
    const portfolio = VALID_PORTFOLIO.includes(p.portfolio) ? p.portfolio : 'none';
    const insights = VALID_INSIGHTS.includes(p.insights) ? p.insights : 'none';
    const family_mgmt = VALID_FAMILY_MGMT.includes(p.family_mgmt) ? p.family_mgmt : 'none';

    db.prepare(`
      INSERT INTO permissions (id, user_id, vault, portfolio, insights, family_mgmt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, vault, portfolio, insights, family_mgmt);

    db.prepare(`
      INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.family_id, req.user.id, 'member.added', 'users', userId,
      JSON.stringify({ name: `${firstName.trim()} ${lastName.trim()}` }));

    res.status(201).json({ userId, tempPassword: tempPw, message: 'Member added successfully. Share the temporary password securely with the new member.' });
  } catch (err) {
    console.error('POST /members error:', err.message);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// PUT /api/family/members/:id
router.put('/members/:id', auth, requireRole('admin', 'co-admin'), (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, email, phone, role, relation, dateOfBirth, avatarColor, permissions } = req.body;

    // Validate role
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (relation && !VALID_RELATIONS.includes(relation)) {
      return res.status(400).json({ error: 'Invalid relation' });
    }

    // Co-admins cannot promote to admin or edit admins
    const target = db.prepare(`SELECT role FROM users WHERE id = ? AND family_id = ?`).get(req.params.id, req.user.family_id);
    if (!target) return res.status(404).json({ error: 'Member not found' });

    if (req.user.role === 'co-admin') {
      if (target.role === 'admin') {
        return res.status(403).json({ error: 'Co-admins cannot edit admin users' });
      }
      if (role === 'admin') {
        return res.status(403).json({ error: 'Co-admins cannot promote users to admin' });
      }
    }

    // Prevent self-demotion for admin (must have at least one admin)
    if (req.params.id === req.user.id && req.user.role === 'admin' && role && role !== 'admin') {
      const adminCount = db.prepare(`SELECT COUNT(*) as c FROM users WHERE family_id = ? AND role = 'admin' AND is_active = 1`).get(req.user.family_id).c;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the only admin' });
      }
    }

    db.prepare(`
      UPDATE users
      SET first_name=?, last_name=?, email=?, phone=?, role=?, relation=?,
          date_of_birth=?, avatar_color=?, updated_at=datetime('now')
      WHERE id=? AND family_id=?
    `).run(
      firstName, lastName,
      email ? email.toLowerCase().trim() : null,
      phone || null, role || 'member', relation || null,
      dateOfBirth || null, avatarColor || '#0f1f3d',
      req.params.id, req.user.family_id
    );

    if (permissions) {
      // Validate permission values
      const vault = VALID_VAULT.includes(permissions.vault) ? permissions.vault : undefined;
      const portfolio = VALID_PORTFOLIO.includes(permissions.portfolio) ? permissions.portfolio : undefined;
      const insights = VALID_INSIGHTS.includes(permissions.insights) ? permissions.insights : undefined;
      const family_mgmt = VALID_FAMILY_MGMT.includes(permissions.family_mgmt) ? permissions.family_mgmt : undefined;

      if (vault !== undefined) {
        db.prepare(`
          UPDATE permissions
          SET vault=?, portfolio=?, insights=?, family_mgmt=?, updated_at=datetime('now')
          WHERE user_id=? AND user_id IN (SELECT id FROM users WHERE family_id=?)
        `).run(vault, portfolio, insights, family_mgmt, req.params.id, req.user.family_id);
      }
    }

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.family_id, req.user.id, 'member.updated', 'users', req.params.id,
      JSON.stringify({ name: `${firstName} ${lastName}` }));

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /members/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/family/members/:id
router.delete('/members/:id', auth, requireRole('admin', 'co-admin'), (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    const db = getDb();

    // Co-admins cannot remove admins
    const target = db.prepare(`SELECT role, first_name, last_name FROM users WHERE id = ? AND family_id = ?`).get(req.params.id, req.user.family_id);
    if (!target) return res.status(404).json({ error: 'Member not found' });
    if (req.user.role === 'co-admin' && target.role === 'admin') {
      return res.status(403).json({ error: 'Co-admins cannot remove admin users' });
    }

    db.prepare(`UPDATE users SET is_active=0, updated_at=datetime('now') WHERE id=? AND family_id=?`)
      .run(req.params.id, req.user.family_id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.family_id, req.user.id, 'member.removed', 'users', req.params.id,
      JSON.stringify({ name: `${target.first_name} ${target.last_name}` }));

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /members/:id error:', err.message);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/family/audit
router.get('/audit', auth, (req, res) => {
  try {
    const db = getDb();
    const fid = req.user.family_id;

    const CATEGORIES = ['identity', 'legal', 'medical', 'finance', 'insurance'];
    const CAT_LABELS = { identity: 'Identity', legal: 'Legal', medical: 'Medical', finance: 'Finance', insurance: 'Insurance' };

    // Single query to get all members with their document category counts
    const members = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.avatar_color
      FROM users u
      WHERE u.family_id = ? AND u.is_active = 1
      ORDER BY u.created_at ASC
    `).all(fid);

    const docCounts = db.prepare(`
      SELECT d.owner_id, d.category, COUNT(*) as c
      FROM documents d
      JOIN users u ON u.id = d.owner_id AND u.family_id = ?
      WHERE d.is_deleted = 0
      GROUP BY d.owner_id, d.category
    `).all(fid);

    // Build lookup: { userId: { category: count } }
    const countMap = {};
    for (const row of docCounts) {
      if (!countMap[row.owner_id]) countMap[row.owner_id] = {};
      countMap[row.owner_id][row.category] = row.c;
    }

    const results = members.map(m => {
      const catMap = countMap[m.id] || {};
      const totalDocs = Object.values(catMap).reduce((a, b) => a + b, 0);
      const filled = CATEGORIES.filter(c => (catMap[c] || 0) > 0).length;
      const score = Math.round((filled / CATEGORIES.length) * 100);
      const missingCategories = CATEGORIES.filter(c => !(catMap[c] > 0));

      return {
        id: m.id,
        first_name: m.first_name,
        last_name: m.last_name,
        avatar_color: m.avatar_color || '#0f1f3d',
        totalDocs,
        categoryBreakdown: catMap,
        score,
        missingCategories,
      };
    });

    res.json(results);
  } catch (err) {
    console.error('GET /audit error:', err.message);
    res.status(500).json({ error: 'Failed to load audit data' });
  }
});

module.exports = router;
