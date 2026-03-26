const jwt = require('jsonwebtoken');
const { getDb } = require('../../database/db');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'familyos_secret');

    const db = getDb();
    const user = db.prepare(`
      SELECT u.*, p.vault, p.portfolio, p.insights, p.family_mgmt
      FROM users u
      LEFT JOIN permissions p ON p.user_id = u.id
      WHERE u.id = ? AND u.is_active = 1
    `).get(decoded.userId);

    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authMiddleware;
