const express = require('express');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/summary
router.get('/summary', auth, (req, res) => {
  try {
    const db = getDb();
    const fid = req.user.family_id;

    const totalAssets = db.prepare(`SELECT COALESCE(SUM(value),0) as total FROM assets WHERE family_id=?`).get(fid).total;
    const totalLiabilities = db.prepare(`SELECT COALESCE(SUM(balance),0) as total FROM liabilities WHERE family_id=?`).get(fid).total;
    const netWorth = totalAssets - totalLiabilities;

    const docsCount = db.prepare(`SELECT COUNT(*) as cnt FROM documents WHERE family_id=? AND is_deleted=0`).get(fid).cnt;
    const expiringCount = db.prepare(`SELECT COUNT(*) as cnt FROM documents WHERE family_id=? AND status IN ('expiring','review')`).get(fid).cnt;
    const alertsCount = db.prepare(`SELECT COUNT(*) as cnt FROM alerts WHERE family_id=? AND is_dismissed=0`).get(fid).cnt;
    const membersCount = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE family_id=? AND is_active=1`).get(fid).cnt;
    const pendingTasks = db.prepare(`SELECT COUNT(*) as cnt FROM tasks WHERE family_id=? AND is_done=0`).get(fid).cnt;

    const snapshots = db.prepare(`
      SELECT net_worth, total_assets, total_liabilities, snapshot_date
      FROM net_worth_snapshots WHERE family_id=?
      ORDER BY snapshot_date ASC LIMIT 999
    `).all(fid);

    const recentActivity = db.prepare(`
      SELECT a.action, a.entity_type, a.meta, a.created_at,
             u.first_name || ' ' || u.last_name as user_name
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.family_id=?
      ORDER BY a.created_at DESC LIMIT 5
    `).all(fid);

    res.json({
      stats: { netWorth, totalAssets, totalLiabilities, docsCount, expiringCount, alertsCount, membersCount, pendingTasks },
      snapshots,
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
