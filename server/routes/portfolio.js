const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

const VALID_ASSET_CATEGORIES = ['real-estate', 'equities', 'fixed-income', 'cash', 'gold', 'crypto', 'mf', 'other'];
const VALID_LIABILITY_CATEGORIES = ['mortgage', 'auto', 'personal', 'education', 'credit-card', 'other'];

// GET /api/portfolio/summary
router.get('/summary', auth, (req, res) => {
  try {
    const db = getDb();
    const fid = req.user.family_id;

    // Check portfolio permission
    if (req.user.portfolio === 'none') {
      return res.status(403).json({ error: 'No portfolio access' });
    }

    const assets = db.prepare(`SELECT * FROM assets WHERE family_id=? ORDER BY value DESC`).all(fid);
    const liabilities = db.prepare(`SELECT * FROM liabilities WHERE family_id=? ORDER BY balance DESC`).all(fid);
    const snapshots = db.prepare(`SELECT * FROM net_worth_snapshots WHERE family_id=? ORDER BY snapshot_date ASC LIMIT 12`).all(fid);

    const totalAssets = assets.reduce((s, a) => s + (a.value || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + (l.balance || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    // Allocation breakdown
    const allocationMap = {};
    assets.forEach(a => {
      allocationMap[a.category] = (allocationMap[a.category] || 0) + (a.value || 0);
    });
    const allocation = Object.entries(allocationMap).map(([cat, val]) => ({
      category: cat,
      value: val,
      percentage: totalAssets > 0 ? ((val / totalAssets) * 100).toFixed(1) : 0,
    }));

    res.json({ assets, liabilities, snapshots, totalAssets, totalLiabilities, netWorth, allocation });
  } catch (err) {
    console.error('GET /portfolio/summary error:', err.message);
    res.status(500).json({ error: 'Failed to load portfolio' });
  }
});

// POST /api/portfolio/assets
router.post('/assets', auth, (req, res) => {
  try {
    if (req.user.portfolio !== 'full') {
      return res.status(403).json({ error: 'No permission to modify portfolio' });
    }
    const db = getDb();
    const { name, subtitle, category, value, institution, notes } = req.body;

    // Validate
    if (!name || typeof name !== 'string' || name.length > 255) {
      return res.status(400).json({ error: 'Valid asset name is required' });
    }
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 999999999999) {
      return res.status(400).json({ error: 'Value must be a valid positive number' });
    }
    const validCategory = VALID_ASSET_CATEGORIES.includes(category) ? category : 'other';

    const id = uuidv4();
    db.prepare(`INSERT INTO assets (id, family_id, name, subtitle, category, value, institution, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, req.user.family_id, name.slice(0, 255), (subtitle || '').slice(0, 255), validCategory, numValue, (institution || '').slice(0, 255), (notes || '').slice(0, 1000)
    );
    res.status(201).json({ id, name, subtitle, category: validCategory, value: numValue, institution, notes });
  } catch (err) {
    console.error('POST /portfolio/assets error:', err.message);
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// PUT /api/portfolio/assets/:id
router.put('/assets/:id', auth, (req, res) => {
  try {
    if (req.user.portfolio !== 'full') {
      return res.status(403).json({ error: 'No permission to modify portfolio' });
    }
    const db = getDb();
    const { name, subtitle, category, value, institution, notes } = req.body;
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < 0) {
      return res.status(400).json({ error: 'Value must be a valid positive number' });
    }
    const validCategory = VALID_ASSET_CATEGORIES.includes(category) ? category : 'other';
    db.prepare(`UPDATE assets SET name=?, subtitle=?, category=?, value=?, institution=?, notes=?, last_updated=datetime('now') WHERE id=? AND family_id=?`).run(
      (name || '').slice(0, 255), (subtitle || '').slice(0, 255), validCategory, numValue, (institution || '').slice(0, 255), (notes || '').slice(0, 1000), req.params.id, req.user.family_id
    );
    res.json({ success: true });
  } catch (err) {
    console.error('PUT /portfolio/assets/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/portfolio/assets/:id
router.delete('/assets/:id', auth, (req, res) => {
  try {
    if (req.user.portfolio !== 'full') {
      return res.status(403).json({ error: 'No permission to modify portfolio' });
    }
    const db = getDb();
    db.prepare(`DELETE FROM assets WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /portfolio/assets/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// POST /api/portfolio/liabilities
router.post('/liabilities', auth, (req, res) => {
  try {
    if (req.user.portfolio !== 'full') {
      return res.status(403).json({ error: 'No permission to modify portfolio' });
    }
    const db = getDb();
    const { name, subtitle, category, balance, interest_rate, emi, institution } = req.body;

    if (!name || typeof name !== 'string' || name.length > 255) {
      return res.status(400).json({ error: 'Valid liability name is required' });
    }
    const numBalance = Number(balance);
    if (isNaN(numBalance) || numBalance < 0) {
      return res.status(400).json({ error: 'Balance must be a valid positive number' });
    }
    const validCategory = VALID_LIABILITY_CATEGORIES.includes(category) ? category : 'other';

    const id = uuidv4();
    db.prepare(`INSERT INTO liabilities (id, family_id, name, subtitle, category, balance, interest_rate, emi, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, req.user.family_id, name.slice(0, 255), (subtitle || '').slice(0, 255), validCategory, numBalance, Number(interest_rate) || 0, Number(emi) || 0, (institution || '').slice(0, 255)
    );
    res.status(201).json({ id });
  } catch (err) {
    console.error('POST /portfolio/liabilities error:', err.message);
    res.status(500).json({ error: 'Failed to add liability' });
  }
});

// DELETE /api/portfolio/liabilities/:id
router.delete('/liabilities/:id', auth, (req, res) => {
  try {
    if (req.user.portfolio !== 'full') {
      return res.status(403).json({ error: 'No permission to modify portfolio' });
    }
    const db = getDb();
    db.prepare(`DELETE FROM liabilities WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /portfolio/liabilities/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete liability' });
  }
});

module.exports = router;
