require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── UPLOADS DIRECTORY ───────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });

// ─── MIDDLEWARE ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || true, // true = reflect request origin (safe for same-origin production)
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Serve uploaded files (must be before API routes)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Too many requests' } });
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { error: 'Too many login attempts. Please try again later.' } });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── ROUTES ─────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/dashboard',     require('./routes/dashboard'));
app.use('/api/documents',     require('./routes/documents'));
app.use('/api/portfolio',     require('./routes/portfolio'));
app.use('/api/family',        require('./routes/family'));
app.use('/api/alerts',        require('./routes/alerts'));
app.use('/api/tasks',         require('./routes/tasks'));

// ─── HEALTH CHECK ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0', time: new Date().toISOString() }));

// ─── SERVE REACT BUILD IN PRODUCTION ─────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(buildPath));
  app.get('*', (_, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

// ─── ERROR HANDLER ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 LINIO server running on http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: familyos.db\n`);
});
