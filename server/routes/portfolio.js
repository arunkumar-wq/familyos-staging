const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/portfolio/summary
router.get('/summary', auth, (req, res) => {
  try {
    const db = getDb();
    const fid = req.user.family_id;

    const assets = db.prepare(`SELECT * FROM assets WHERE family_id=? ORDER BY value DESC`).all(fid);
    const liabilities = db.prepare(`SELECT * FROM liabilities WHERE family_id=? ORDER BY balance DESC`).all(fid);
    const snapshots = db.prepare(`SELECT * FROM net_worth_snapshots WHERE family_id=? ORDER BY snapshot_date ASC LIMIT 12`).all(fid);

    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
    const netWorth = totalAssets - totalLiabilities;

    // Allocation breakdown
    const allocationMap = {};
    assets.forEach(a => {
      allocationMap[a.category] = (allocationMap[a.category] || 0) + a.value;
    });
    const allocation = Object.entries(allocationMap).map(([cat, val]) => ({
      category: cat,
      value: val,
      percentage: totalAssets > 0 ? ((val / totalAssets) * 100).toFixed(1) : 0,
    }));

    res.json({ assets, liabilities, snapshots, totalAssets, totalLiabilities, netWorth, allocation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio/assets
router.post('/assets', auth, (req, res) => {
  try {
    const db = getDb();
    const { name, subtitle, category, value, institution, notes } = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO assets (id, family_id, name, subtitle, category, value, institution, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.user.family_id, name, subtitle, category, value, institution, notes);
    res.status(201).json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/portfolio/assets/:id
router.put('/assets/:id', auth, (req, res) => {
  try {
    const db = getDb();
    const { name, subtitle, category, value, institution, notes } = req.body;
    db.prepare(`UPDATE assets SET name=?, subtitle=?, category=?, value=?, institution=?, notes=?, last_updated=datetime('now') WHERE id=? AND family_id=?`).run(name, subtitle, category, value, institution, notes, req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/portfolio/assets/:id
router.delete('/assets/:id', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`DELETE FROM assets WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/portfolio/liabilities
router.post('/liabilities', auth, (req, res) => {
  try {
    const db = getDb();
    const { name, subtitle, category, balance, interest_rate, emi, institution } = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO liabilities (id, family_id, name, subtitle, category, balance, interest_rate, emi, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, req.user.family_id, name, subtitle, category, balance, interest_rate, emi, institution);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/portfolio/liabilities/:id
router.delete('/liabilities/:id', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`DELETE FROM liabilities WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
