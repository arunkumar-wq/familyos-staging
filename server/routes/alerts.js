const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Map DB 'type' to frontend 'severity' for consistency
const TYPE_TO_SEVERITY = { urgent: 'critical', warning: 'warning', info: 'info', success: 'success' };

function mapAlert(a) {
  return { ...a, severity: TYPE_TO_SEVERITY[a.type] || a.type };
}

// GET /api/alerts
router.get('/', auth, (req, res) => {
  try {
    const db = getDb();
    const alerts = db.prepare(`SELECT * FROM alerts WHERE family_id=? AND is_dismissed=0 ORDER BY created_at DESC`).all(req.user.family_id);
    res.json(alerts.map(mapAlert));
  } catch (err) {
    console.error('GET /alerts error:', err.message);
    res.status(500).json({ error: 'Failed to load alerts' });
  }
});

// PUT /api/alerts/:id/read
router.put('/:id/read', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE alerts SET is_read=1 WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// PUT /api/alerts/:id/dismiss
router.put('/:id/dismiss', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE alerts SET is_dismissed=1 WHERE id=? AND family_id=?`).run(req.params.id, req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

// PUT /api/alerts/read-all
router.put('/read-all', auth, (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE alerts SET is_read=1 WHERE family_id=?`).run(req.user.family_id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// POST /api/alerts/analyze — Run comprehensive family analysis
router.post('/analyze', auth, (req, res) => {
  try {
    const db = getDb();
    const fid = req.user.family_id;
    const results = [];

    // 1. Check document expiry dates
    const expiringDocs = db.prepare(`
      SELECT d.name, d.expiry_date, d.category, u.first_name, u.last_name
      FROM documents d
      LEFT JOIN users u ON d.owner_id = u.id
      WHERE d.family_id = ? AND d.is_deleted = 0 AND d.expiry_date IS NOT NULL
      ORDER BY d.expiry_date ASC
    `).all(fid);

    const now = new Date();
    expiringDocs.forEach(d => {
      const exp = new Date(d.expiry_date);
      const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) {
        results.push({ severity: 'critical', type: 'expiry', title: `${d.name} has EXPIRED`, body: `Expired ${Math.abs(daysLeft)} days ago. Owner: ${d.first_name} ${d.last_name}. Renew immediately.`, action: 'documents' });
      } else if (daysLeft <= 30) {
        results.push({ severity: 'critical', type: 'expiry', title: `${d.name} expires in ${daysLeft} days`, body: `Owner: ${d.first_name} ${d.last_name}. Start renewal process now.`, action: 'documents' });
      } else if (daysLeft <= 90) {
        results.push({ severity: 'warning', type: 'expiry', title: `${d.name} expires in ${daysLeft} days`, body: `Owner: ${d.first_name} ${d.last_name}. Plan ahead for renewal.`, action: 'documents' });
      }
    });

    // 2. Check missing documents per member
    const members = db.prepare(`SELECT id, first_name, last_name, role FROM users WHERE family_id = ? AND is_active = 1`).all(fid);

    members.forEach(m => {
      const memberDocs = db.prepare(`SELECT name, category FROM documents WHERE owner_id = ? AND is_deleted = 0`).all(m.id);
      const docNames = memberDocs.map(d => d.name.toLowerCase()).join(' ');
      const missing = [];
      if (!docNames.includes('passport')) missing.push('Passport');
      if (!docNames.includes('license') && !docNames.includes('driver')) missing.push('Driver License');
      if (!docNames.includes('insurance')) missing.push('Insurance Policy');
      if (m.role === 'admin' || m.role === 'co-admin') {
        if (!docNames.includes('will') && !docNames.includes('trust')) missing.push('Will/Trust');
      }
      if (missing.length > 0) {
        results.push({ severity: missing.length >= 3 ? 'critical' : 'warning', type: 'missing', title: `${m.first_name} ${m.last_name} — ${missing.length} missing documents`, body: `Missing: ${missing.join(', ')}. Upload these for complete coverage.`, action: 'documents' });
      }
    });

    // 3. Portfolio insights
    const assets = db.prepare(`SELECT * FROM assets WHERE family_id = ?`).all(fid);
    const liabilities = db.prepare(`SELECT * FROM liabilities WHERE family_id = ?`).all(fid);
    const totalAssets = assets.reduce((s, a) => s + (a.value || 0), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + (l.balance || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    // Emergency fund check
    const savings = assets.filter(a => (a.name || '').toLowerCase().includes('saving'));
    const totalSavings = savings.reduce((s, a) => s + (a.value || 0), 0);
    const monthlyExpense = totalLiabilities > 0 ? totalLiabilities / 12 : 10000;
    const emergencyMonths = monthlyExpense > 0 ? Math.round(totalSavings / monthlyExpense * 10) / 10 : 0;
    if (emergencyMonths < 6) {
      results.push({ severity: 'warning', type: 'portfolio', title: `Emergency fund covers ${emergencyMonths} months`, body: `Target is 6 months of expenses. Consider increasing savings by $${Math.round(6 * monthlyExpense - totalSavings).toLocaleString()}.`, action: 'portfolio' });
    }

    // Crypto check
    const crypto = assets.filter(a => (a.name || '').toLowerCase().includes('crypto') || (a.category || '').toLowerCase().includes('crypto'));
    const cryptoPct = totalAssets > 0 ? Math.round(crypto.reduce((s, a) => s + (a.value || 0), 0) / totalAssets * 100) : 0;
    if (cryptoPct > 5) {
      results.push({ severity: 'info', type: 'portfolio', title: `Crypto allocation at ${cryptoPct}%`, body: `Consider reviewing crypto holdings. Experts recommend max 5% allocation.`, action: 'portfolio' });
    }

    // Net worth milestone
    if (netWorth > 2000000) {
      results.push({ severity: 'success', type: 'portfolio', title: `Net worth milestone: $${(netWorth / 1000000).toFixed(1)}M`, body: `Great progress! Consider consulting a wealth advisor for advanced tax strategies.`, action: 'portfolio' });
    }

    // 4. Actionable recommendations
    const docCount = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE family_id = ? AND is_deleted = 0`).get(fid).c;
    if (docCount < 10) {
      results.push({ severity: 'info', type: 'recommendation', title: 'Upload more documents for better AI insights', body: `Only ${docCount} documents uploaded. AI works better with more data — aim for 20+ documents.`, action: 'documents' });
    }

    // Insurance review
    const insuranceDocs = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE family_id = ? AND category = 'insurance' AND is_deleted = 0`).get(fid).c;
    if (insuranceDocs === 0) {
      results.push({ severity: 'warning', type: 'recommendation', title: 'No insurance documents found', body: `Upload your insurance policies for coverage gap analysis and renewal tracking.`, action: 'documents' });
    }

    // Tax season check (if near April)
    const currentMonth = new Date().getMonth();
    if (currentMonth >= 1 && currentMonth <= 3) {
      const taxDocs = db.prepare(`SELECT COUNT(*) as c FROM documents WHERE family_id = ? AND (category = 'finance' OR name LIKE '%tax%' OR name LIKE '%1099%' OR name LIKE '%W-2%') AND is_deleted = 0`).get(fid).c;
      results.push({ severity: taxDocs < 3 ? 'critical' : 'info', type: 'recommendation', title: taxDocs < 3 ? 'Tax season: Missing tax documents' : 'Tax season: Documents ready', body: taxDocs < 3 ? `Only ${taxDocs} tax documents found. Upload W-2s, 1099s, and other tax forms before filing deadline.` : `${taxDocs} tax documents uploaded. Review and ensure all forms are current.`, action: 'documents' });
    }

    res.json({
      results,
      summary: {
        totalFindings: results.length,
        critical: results.filter(r => r.severity === 'critical').length,
        warnings: results.filter(r => r.severity === 'warning').length,
        info: results.filter(r => r.severity === 'info' || r.severity === 'success').length,
        membersAnalyzed: members.length,
        documentsScanned: docCount,
        assetsReviewed: assets.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

module.exports = router;
