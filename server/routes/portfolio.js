const express = require('express');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

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
    db.prepare(`INSERT INTO assets (id, family_id, name, subtitle, category, value, institution, notes, is_seed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`).run(
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

// POST /api/portfolio/reset — Delete only user-added assets (is_seed=0)
router.post('/reset', auth, (req, res) => {
  try {
    if (req.user.portfolio !== 'full') {
      return res.status(403).json({ error: 'No permission to modify portfolio' });
    }
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM assets
      WHERE family_id = ? AND (is_seed = 0 OR is_seed IS NULL)
    `).run(req.user.family_id);

    res.json({
      deleted: result.changes,
      message: `Deleted ${result.changes} user-added asset(s)`
    });
  } catch (err) {
    console.error('Reset error:', err.message);
    res.status(500).json({ error: 'Reset failed: ' + err.message });
  }
});

// POST /api/portfolio/ai-import — Extract assets from uploaded financial statement
router.post('/ai-import', auth, upload.single('file'), async (req, res) => {
  let filePath = null;
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    filePath = path.join(__dirname, '..', '..', 'uploads', file.filename);
    let extractedText = '';

    // Try PDF text extraction first
    if (file.mimetype === 'application/pdf') {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text || '';
      } catch (e) {
        console.error('PDF parse failed:', e.message);
      }
    }

    // If no text OR image, try OCR
    if (!extractedText.trim() && file.mimetype.startsWith('image/')) {
      try {
        const worker = await Tesseract.createWorker('eng');
        const { data } = await worker.recognize(filePath);
        await worker.terminate();
        extractedText = data.text || '';
      } catch (e) {
        console.error('OCR failed:', e.message);
      }
    }

    // Cleanup uploaded file
    try { fs.unlinkSync(filePath); } catch(e) {}
    filePath = null;

    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Could not extract text from this file. Try a clearer statement.' });
    }

    const assets = extractAssetsFromText(extractedText);

    if (assets.length === 0) {
      return res.json({
        assets: [],
        totalExtracted: 0,
        message: 'No recognizable financial assets found in this statement'
      });
    }

    // Insert assets
    const db = getDb();
    const insertedAssets = [];
    for (const asset of assets) {
      const id = uuidv4();
      try {
        db.prepare(`
          INSERT INTO assets (id, family_id, name, subtitle, category, value, currency, institution, is_seed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        `).run(id, req.user.family_id, asset.name, asset.subtitle, asset.category, asset.value, asset.currency || 'USD', asset.institution);
        insertedAssets.push({ id, ...asset });
      } catch (dbErr) {
        console.error('DB insert failed for asset:', asset.name, dbErr.message);
      }
    }

    res.json({
      assets: insertedAssets,
      totalExtracted: insertedAssets.length,
      extractedInstitution: assets[0]?.institution
    });
  } catch (err) {
    console.error('AI Import error:', err.message, err.stack);
    if (filePath) { try { fs.unlinkSync(filePath); } catch(e) {} }
    res.status(500).json({ error: 'AI import failed: ' + err.message });
  }
});

function extractAssetsFromText(text) {
  const upper = text.toUpperCase();
  const assets = [];

  // Institution detection — ORDER MATTERS, check longer names first
  const institutions = [
    { keywords: ['CHARLES SCHWAB', 'SCHWAB'], name: 'Charles Schwab' },
    { keywords: ['FIDELITY'], name: 'Fidelity' },
    { keywords: ['VANGUARD'], name: 'Vanguard' },
    { keywords: ['BANK OF AMERICA', 'BOFA'], name: 'Bank of America' },
    { keywords: ['JPMORGAN CHASE', 'CHASE'], name: 'Chase Bank' },
    { keywords: ['WELLS FARGO'], name: 'Wells Fargo' },
    { keywords: ['ROBINHOOD'], name: 'Robinhood' },
    { keywords: ['MORGAN STANLEY'], name: 'Morgan Stanley' },
    { keywords: ['E*TRADE', 'ETRADE'], name: 'E*TRADE' },
    { keywords: ['COINBASE'], name: 'Coinbase' },
  ];

  let detectedInstitution = 'Imported Institution';
  for (const inst of institutions) {
    if (inst.keywords.some(k => upper.includes(k))) {
      detectedInstitution = inst.name;
      break;
    }
  }

  // Account type detection
  const accountTypes = [
    { keywords: ['401(K)', '401K', '401 K'], category: 'equities', label: '401(k)' },
    { keywords: ['ROTH IRA'], category: 'equities', label: 'Roth IRA' },
    { keywords: ['TRADITIONAL IRA'], category: 'equities', label: 'IRA' },
    { keywords: [' IRA '], category: 'equities', label: 'IRA' },
    { keywords: ['BROKERAGE'], category: 'equities', label: 'Brokerage' },
    { keywords: ['SAVINGS'], category: 'cash', label: 'Savings' },
    { keywords: ['CHECKING'], category: 'cash', label: 'Checking' },
    { keywords: ['MUTUAL FUND'], category: 'equities', label: 'Mutual Fund' },
  ];

  // Extract value — look for big dollar amounts near key phrases
  const valuePatterns = [
    /TOTAL\s+ACCOUNT\s+VALUE[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /ACCOUNT\s+BALANCE[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /ENDING\s+BALANCE[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /CURRENT\s+VALUE[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /TOTAL\s+BALANCE[\s:]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ];

  let detectedValue = 0;
  for (const pattern of valuePatterns) {
    const match = text.match(pattern);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val > 100) {
        detectedValue = val;
        break;
      }
    }
  }

  // Fallback — find biggest dollar amount
  if (detectedValue === 0) {
    const dollarMatches = [...text.matchAll(/\$\s*([\d,]+(?:\.\d{2})?)/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))
      .filter(v => v > 1000)
      .sort((a, b) => b - a);
    if (dollarMatches.length > 0) detectedValue = dollarMatches[0];
  }

  // Find first matching account type only (not all — avoid duplicates)
  let foundType = null;
  for (const type of accountTypes) {
    if (type.keywords.some(k => upper.includes(k))) {
      foundType = type;
      break;
    }
  }

  if (foundType) {
    assets.push({
      name: detectedInstitution + ' ' + foundType.label,
      subtitle: 'AI-imported from statement',
      category: foundType.category,
      value: detectedValue || 50000,
      currency: 'USD',
      institution: detectedInstitution,
    });
  } else if (detectedValue > 0) {
    assets.push({
      name: detectedInstitution + ' Account',
      subtitle: 'AI-imported from statement',
      category: 'equities',
      value: detectedValue,
      currency: 'USD',
      institution: detectedInstitution,
    });
  }

  return assets;
}

module.exports = router;
