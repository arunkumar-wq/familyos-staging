const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

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
    res.status(500).json({ error: err.message });
  }
});

// POST /api/family/members
router.post('/members', auth, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'co-admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const db = getDb();
    const { firstName, lastName, email, phone, role, relation, dateOfBirth, avatarColor, permissions } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'firstName, lastName and email are required' });
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email=?`).get(email.toLowerCase());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const userId = uuidv4();
    const tempPassword = bcrypt.hashSync('familyos123', 10);

    db.prepare(`
      INSERT INTO users (id, family_id, first_name, last_name, email, phone, password_hash, role, relation, date_of_birth, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, req.user.family_id,
      firstName, lastName,
      email.toLowerCase(), phone || null,
      tempPassword,
      role || 'member', relation || null,
      dateOfBirth || null,
      avatarColor || '#0f1f3d'
    );

    const p = permissions || {};
    db.prepare(`
      INSERT INTO permissions (id, user_id, vault, portfolio, insights, family_mgmt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, p.vault || 'own', p.portfolio || 'none', p.insights || 'none', p.family_mgmt || 'none');

    db.prepare(`
      INSERT INTO audit_log (id, family_id, user_id, action, entity_type, entity_id, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.user.family_id, req.user.id, 'member.added', 'users', userId,
      JSON.stringify({ name: `${firstName} ${lastName}` }));

    res.status(201).json({ userId, message: 'Member added. Temporary password: familyos123' });
  } catch (err) {
    console.error('POST /members error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/family/members/:id
router.put('/members/:id', auth, (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, email, phone, role, relation, dateOfBirth, avatarColor, permissions } = req.body;

    db.prepare(`
      UPDATE users
      SET first_name=?, last_name=?, email=?, phone=?, role=?, relation=?,
          date_of_birth=?, avatar_color=?, updated_at=datetime('now')
      WHERE id=? AND family_id=?
    `).run(
      firstName, lastName,
      email ? email.toLowerCase() : null,
      phone || null, role || 'member', relation || null,
      dateOfBirth || null, avatarColor || '#0f1f3d',
      req.params.id, req.user.family_id
    );

    if (permissions) {
      db.prepare(`
        UPDATE permissions
        SET vault=?, portfolio=?, insights=?, family_mgmt=?, updated_at=datetime('now')
        WHERE user_id=?
      `).run(permissions.vault, permissions.portfolio, permissions.insights, permissions.family_mgmt, req.params.id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /members/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/family/members/:id
router.delete('/members/:id', auth, (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }
    const db = getDb();
    db.prepare(`UPDATE users SET is_active=0 WHERE id=? AND family_id=?`)
      .run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /members/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/family/audit
router.get('/audit', auth, (req, res) => {
  try {
    const db = getDb();
    const fid = req.user.family_id;

    // Fetch all active family members
    const members = db.prepare(`
      SELECT u.id, u.first_name, u.last_name, u.avatar_color
      FROM users u
      WHERE u.family_id = ? AND u.is_active = 1
      ORDER BY u.created_at ASC
    `).all(fid);

    const CATEGORIES = ['identity', 'legal', 'medical', 'finance', 'insurance'];

    const results = members.map(m => {
      // Safe per-member document fetch
      let docsByCategory = [];
      try {
        docsByCategory = db.prepare(`
          SELECT category, COUNT(*) as c
          FROM documents
          WHERE owner_id = ? AND is_deleted = 0
          GROUP BY category
        `).all(m.id);
      } catch (e) {
        console.error(`Doc fetch failed for member ${m.id}:`, e.message);
      }

      // Build category map
      const catMap = {};
      docsByCategory.forEach(d => {
        if (d.category) catMap[d.category] = d.c;
      });

      const totalDocs          = Object.values(catMap).reduce((a, b) => a + b, 0);
      const filled             = CATEGORIES.filter(c => (catMap[c] || 0) > 0).length;
      const score              = Math.round((filled / CATEGORIES.length) * 100);
      const missingCategories  = CATEGORIES.filter(c => !(catMap[c] > 0));

      return {
        id:               m.id,
        first_name:       m.first_name,
        last_name:        m.last_name,
        avatar_color:     m.avatar_color || '#0f1f3d',
        totalDocs,
        categoryBreakdown: catMap,
        score,
        missingCategories,
      };
    });

    res.json(results);
  } catch (err) {
    console.error('GET /audit error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
