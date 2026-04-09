const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');
const auth = require('../middleware/auth');
const { getJwtSecret } = require('../middleware/auth');

const router = express.Router();

// Input validation helpers
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isStrongPassword(pw) {
  return typeof pw === 'string' && pw.length >= 8;
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = getDb();
    const user = db.prepare(`
      SELECT u.*, p.vault, p.portfolio, p.insights, p.family_mgmt
      FROM users u
      LEFT JOIN permissions p ON p.user_id = u.id
      WHERE u.email = ? AND u.is_active = 1
    `).get(email.toLowerCase().trim());

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email, familyId: user.family_id },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  try {
    const { firstName, lastName, email, password, familyName } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (firstName.length > 100 || lastName.length > 100) {
      return res.status(400).json({ error: 'Name too long' });
    }

    const db = getDb();
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase().trim());
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const familyId = uuidv4();
    const userId = uuidv4();
    const hash = bcrypt.hashSync(password, 10);

    db.prepare(`INSERT INTO families (id, name) VALUES (?, ?)`).run(familyId, familyName || `${lastName} Family`);
    db.prepare(`
      INSERT INTO users (id, family_id, first_name, last_name, email, password_hash, role, relation)
      VALUES (?, ?, ?, ?, ?, ?, 'admin', 'self')
    `).run(userId, familyId, firstName.trim(), lastName.trim(), email.toLowerCase().trim(), hash);
    db.prepare(`INSERT INTO permissions (id, user_id, vault, portfolio, insights, family_mgmt) VALUES (?, ?, 'full', 'full', 'full', 'admin')`).run(uuidv4(), userId);

    const token = jwt.sign(
      { userId, email: email.toLowerCase().trim(), familyId },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user: { id: userId, first_name: firstName.trim(), last_name: lastName.trim(), email: email.toLowerCase().trim(), role: 'admin', family_id: familyId } });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const { password_hash, ...user } = req.user;
  const db = getDb();
  const family = db.prepare(`SELECT * FROM families WHERE id = ?`).get(user.family_id);
  res.json({ user, family });
});

// PUT /api/auth/me
router.put('/me', auth, (req, res) => {
  try {
    const { first_name, last_name, phone, date_of_birth } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }
    if (first_name.length > 100 || last_name.length > 100) {
      return res.status(400).json({ error: 'Name too long' });
    }
    const db = getDb();
    db.prepare(`
      UPDATE users SET first_name=?, last_name=?, phone=?, date_of_birth=?, updated_at=datetime('now')
      WHERE id=?
    `).run(first_name.trim(), last_name.trim(), phone || null, date_of_birth || null, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/password
router.put('/password', auth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const db = getDb();
    const user = db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user.id);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(hash, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Password change error:', err.message);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

module.exports = router;
