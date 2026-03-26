const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks
router.get('/', auth, (req, res) => {
  try {
    const db = getDb();
    const tasks = db.prepare(`
      SELECT t.*, u.first_name || ' ' || u.last_name as assignee_name
      FROM tasks t LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.family_id=?
      ORDER BY t.is_done ASC, t.is_urgent DESC, t.priority ASC
    `).all(req.user.family_id);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post('/', auth, (req, res) => {
  try {
    const db = getDb();
    const { title, due_date, is_urgent, assigned_to } = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO tasks (id, family_id, assigned_to, title, due_date, is_urgent) VALUES (?, ?, ?, ?, ?, ?)`).run(id, req.user.family_id, assigned_to || req.user.id, title, due_date, is_urgent ? 1 : 0);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', auth, (req, res) => {
  try {
    const db = getDb();
    const { title, is_done, is_urgent, due_date } = req.body;
    db.prepare(`UPDATE tasks SET title=?, is_done=?, is_urgent=?, due_date=?, updated_at=datetime('now') WHERE id=? AND family_id=?`).run(title, is_done ? 1 : 0, is_urgent ? 1 : 0, due_date, req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`DELETE FROM tasks WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
