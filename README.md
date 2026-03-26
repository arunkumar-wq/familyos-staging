# FamilyOS — AI-Powered Family Command Center

Full-stack SaaS for family document management, portfolio tracking, and AI-powered insights.

---

## Tech Stack

| Layer    | Technology                         |
|----------|------------------------------------|
| Frontend | React 18, Chart.js, CSS Variables  |
| Backend  | Node.js 18+, Express.js            |
| Database | SQLite via better-sqlite3          |
| Auth     | JWT + bcryptjs                     |
| Uploads  | Multer (local /uploads dir)        |

---

## Quick Start

### 1 — Install

```bash
cd familyos
npm run setup
```

### 2 — Configure

```bash
cp .env.example .env
# Edit .env if needed (defaults work out of the box)
```

### 3 — Seed Database

```bash
npm run seed
```

### 4 — Run Dev

```bash
npm run dev
```

Opens at **http://localhost:3000**

---

## Demo Login

```
Email:    arun@familyos.ai
Password: password123
```

Other members: sunita@gmail.com, arjun@gmail.com, maya@gmail.com (same password)

---

## Pages

| Page | Description |
|------|-------------|
| Login / Signup | JWT auth with demo hint |
| Dashboard | Stats, charts, alerts, tasks, quick actions |
| Document Vault | Upload, scan, AI analysis, category filter |
| Portfolio | Charts, assets table, liabilities table |
| Family | Member cards, permissions table |
| Add / Edit Member | Role, relation, access permissions |
| AI Insights | Severity-tiered action cards |
| Vault Audit | Score ring, per-member health breakdown |
| Calendar | Event grid, upcoming deadlines |
| Notifications | Read/dismiss alerts from DB |
| Settings | Profile, Security, Notifications, Integrations, Billing |
| Edit Profile | Live API update, danger zone |

---

## API Endpoints

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
PUT    /api/auth/me
PUT    /api/auth/password

GET    /api/dashboard/summary

GET    /api/documents
GET    /api/documents/stats
POST   /api/documents/upload
PUT    /api/documents/:id
DELETE /api/documents/:id

GET    /api/portfolio/summary
POST   /api/portfolio/assets
PUT    /api/portfolio/assets/:id
DELETE /api/portfolio/assets/:id
POST   /api/portfolio/liabilities
DELETE /api/portfolio/liabilities/:id

GET    /api/family/members
POST   /api/family/members
PUT    /api/family/members/:id
DELETE /api/family/members/:id
GET    /api/family/audit

GET    /api/alerts
PUT    /api/alerts/:id/read
PUT    /api/alerts/:id/dismiss
PUT    /api/alerts/read-all

GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

---

## Scripts

```bash
npm run setup    # Install all deps
npm run dev      # Start both servers
npm run seed     # Seed database
npm run build    # Build React for production
npm start        # Production server
```

---

## Production

```bash
npm run build
NODE_ENV=production node server/index.js
```

Express serves the React build and handles /api in one process.

---

## Troubleshooting

**Port in use:**
```bash
lsof -ti:5000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Reset DB:**
```bash
rm database/familyos.db && npm run seed
```

**better-sqlite3 build error:**
```bash
npm install --build-from-source better-sqlite3
```
