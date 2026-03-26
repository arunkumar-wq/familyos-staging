const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/alerts
router.get('/', auth, (req, res) => {
  try {
    const db = getDb();
    const alerts = db.prepare(`SELECT * FROM alerts WHERE family_id=? AND is_dismissed=0 ORDER BY created_at DESC`).all(req.user.family_id);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE alerts SET is_read=1 WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:id/dismiss
router.put('/:id/dismiss', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE alerts SET is_dismissed=1 WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/read-all
router.put('/read-all', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE alerts SET is_read=1 WHERE family_id=?`).run(req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
