const jwt = require('jsonwebtoken');
const { getDb } = require('../../database/db');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'familyos_super_secret_key_change_in_production_2025') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set to a strong, unique value in production');
    }
    return 'dev_only_familyos_secret_not_for_production';
  }
  return secret;
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

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

// Permission check helpers
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

function requirePermission(field, ...levels) {
  return (req, res, next) => {
    if (!levels.includes(req.user[field])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.requirePermission = requirePermission;
module.exports.getJwtSecret = getJwtSecret;
