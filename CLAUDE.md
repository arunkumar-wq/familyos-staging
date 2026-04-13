# LINIO — Project Context Document

> Paste this entire file into a new Claude chat to give it full project context instantly.

## Identity

- **Name**: LINIO (formerly FamilyOS)
- **Type**: Full-stack SaaS web app for AI-powered family document management, net worth tracking, and financial insights
- **Stack**: React 18 + Express.js + SQLite (better-sqlite3) + Chart.js
- **Locale**: US (USD currency, MM/DD/YYYY dates, en-US formatting)
- **Demo**: gurmail@linio.ai / password123
- **Deploy**: Railway.app (auto-deploys from GitHub main branch)
- **Staging URL**: https://familyos-staging-production.up.railway.app/
- **Repo**: github.com/arunkumar-wq/familyos-staging

---

## Architecture

```
familyos-staging-main/
├── server/                    # Express.js backend (port 5000)
│   ├── index.js               # Entry: CORS, rate limiting, security headers, routes
│   ├── middleware/
│   │   ├── auth.js            # JWT auth + requireRole() + requirePermission()
│   │   └── upload.js          # Multer: 10MB limit, extension+MIME validation
│   └── routes/
│       ├── auth.js            # Login, register, profile, password change
│       ├── dashboard.js       # Aggregated stats (net worth, docs, alerts, members)
│       ├── documents.js       # CRUD + OCR analysis + download endpoint
│       ├── portfolio.js       # Assets, liabilities, snapshots, allocation
│       ├── family.js          # Member CRUD + audit scoring
│       ├── alerts.js          # Alert management + AI analysis engine
│       └── tasks.js           # Task CRUD
├── database/
│   ├── db.js                  # SQLite singleton with WAL mode, auto-migration
│   ├── schema.sql             # 10 tables + indexes
│   └── seed.js                # Demo data: Singh Family, 5 users, 23 docs, $3.4M assets
├── client/                    # React 18 frontend (port 3000, proxies to 5000)
│   └── src/
│       ├── App.js             # Shell: Navbar + ErrorBoundary + page routing
│       ├── context/AuthContext.js  # Global auth state (user, family, login/logout)
│       ├── utils/
│       │   ├── api.js         # Axios with JWT interceptor + 401 handler
│       │   └── formatters.js  # fmtUSD, fmtK, fmtDate, catIcon, assetColor
│       ├── components/
│       │   ├── Navbar.js      # Dark top navbar with nav, bell, user dropdown
│       │   ├── Sidebar.js     # Secondary nav (some layouts)
│       │   ├── Topbar.js      # Secondary topbar
│       │   └── UI.js          # Avatar, Badge, StatCard, Modal, PageHeader, etc.
│       └── pages/             # 13 page components (see Page Map below)
├── uploads/                   # User-uploaded files (UUID filenames)
├── railway.toml               # Build: npm install → client build → seed → start
├── package.json               # Root: express, better-sqlite3, bcryptjs, jwt, multer, tesseract.js
└── .env.example               # PORT, JWT_SECRET, JWT_EXPIRES_IN, CLIENT_URL, NODE_ENV
```

---

## Database Schema (SQLite)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| **families** | id, name, plan (free\|pro\|family) | Root tenant entity |
| **users** | id, family_id (FK), email (UNIQUE), role, relation, avatar_url, is_active | 5 roles: admin, co-admin, member, advisor, view-only |
| **permissions** | user_id (FK, UNIQUE), vault, portfolio, insights, family_mgmt | Per-user granular access levels |
| **documents** | id, family_id, owner_id, name, category, file_path, status, expiry_date, ai_analyzed, ai_summary (JSON) | Soft delete via is_deleted. 9 categories. |
| **assets** | id, family_id, name, category, value (REAL), institution | 8 categories: real-estate, equities, fixed-income, cash, gold, crypto, mf, other |
| **liabilities** | id, family_id, name, category, balance, interest_rate, emi | 6 categories: mortgage, auto, personal, education, credit-card, other |
| **net_worth_snapshots** | id, family_id, total_assets, total_liabilities, net_worth, snapshot_date | Monthly history for trend charts |
| **alerts** | id, family_id, type (urgent\|warning\|info\|success), title, description, is_read, is_dismissed | Mapped to severity on API response |
| **tasks** | id, family_id, assigned_to, title, due_date, is_urgent, is_done, priority | Simple task management |
| **audit_log** | id, family_id, user_id, action, entity_type, entity_id, meta (JSON) | Activity tracking |

**Permission Levels:**
- vault: full | view | own | none
- portfolio: full | view | none
- insights: full | view | none
- family_mgmt: admin | co-admin | none

---

## API Endpoints (30 total)

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /login | No | Email/password login, returns JWT |
| POST | /register | No | Create family + admin user |
| GET | /me | Yes | Current user + family |
| PUT | /me | Yes | Update profile |
| PUT | /password | Yes | Change password (requires current) |

### Dashboard (`/api/dashboard`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /summary | Yes | Stats, snapshots, recent activity |

### Documents (`/api/documents`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Yes | List with filters (category, status, member, search). Vault permission enforced. |
| GET | /stats | Yes | Counts by status and category |
| GET | /:id/download | Yes | Download file or generate text summary |
| GET | /:id | Yes | Single document detail |
| POST | /upload | Yes | Upload with OCR analysis |
| POST | /analyze | Yes | OCR analysis without saving |
| PUT | /:id | Yes | Update document metadata |
| DELETE | /:id | Yes | Soft delete |

### Portfolio (`/api/portfolio`)
| Method | Path | Auth | Permission |
|--------|------|------|------------|
| GET | /summary | Yes | portfolio != none |
| POST | /assets | Yes | portfolio = full |
| PUT | /assets/:id | Yes | portfolio = full |
| DELETE | /assets/:id | Yes | portfolio = full |
| POST | /liabilities | Yes | portfolio = full |
| DELETE | /liabilities/:id | Yes | portfolio = full |

### Family (`/api/family`)
| Method | Path | Auth | Role |
|--------|------|------|------|
| GET | /members | Yes | Any |
| POST | /members | Yes | admin, co-admin |
| PUT | /members/:id | Yes | admin, co-admin |
| DELETE | /members/:id | Yes | admin, co-admin |
| GET | /audit | Yes | Any |

### Alerts (`/api/alerts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Yes | List (maps type→severity) |
| PUT | /:id/read | Yes | Mark read |
| PUT | /:id/dismiss | Yes | Dismiss |
| PUT | /read-all | Yes | Mark all read |
| POST | /analyze | Yes | Run comprehensive family analysis |

### Tasks (`/api/tasks`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | Yes | List sorted by done/urgent/priority |
| POST | / | Yes | Create task |
| PUT | /:id | Yes | Update task |
| DELETE | /:id | Yes | Delete task |

---

## Page Map (13 pages)

### Navigation Structure
```
Top Navbar:
  [Dashboard] [Documents] [Net Worth] [Family] [More ▾]
                                                  ├── Calendar
                                                  ├── AI Insights
                                                  └── Vault Audit

Bell Icon → Notification dropdown (top 5 alerts)
User Avatar → [Edit Profile] [Settings] [Sign Out]
```

### Page Details

| Page | Component | Route Key | Props | Data Sources |
|------|-----------|-----------|-------|--------------|
| **Login** | LoginPage.js | (unauthenticated) | — | POST /auth/login |
| **Dashboard** | DashboardPage.js | `dashboard` | navigate | /dashboard/summary, /tasks, /alerts, /family/members, /portfolio/summary |
| **Documents** | DocumentsPage.js | `documents` | navigate | /documents, /documents/stats, /family/members |
| **Net Worth** | PortfolioPage.js | `portfolio` | — | /portfolio/summary |
| **Family** | FamilyPage.js | `family` | navigate | /family/members |
| **AI Insights** | InsightsPage.js | `insights` | navigate | /alerts, POST /alerts/analyze |
| **Vault Audit** | AuditPage.js | `audit` | navigate | /family/audit |
| **Calendar** | CalendarPage.js | `calendar` | — | /tasks |
| **Notifications** | NotificationsPage.js | `notifications` | — | /alerts |
| **Settings** | SettingsPage.js | `settings` | navigate | /auth/me, PUT /auth/password |
| **Edit Profile** | EditProfilePage.js | `profile` | navigate | PUT /auth/me, PUT /auth/password |
| **Add Member** | AddMemberPage.js | `add-member` | navigate, editMember=null | POST /family/members |
| **Edit Member** | AddMemberPage.js | `edit-member` | navigate, editMember={obj} | PUT /family/members/:id |

---

## Key Features

### 1. Document Vault
- Upload with drag-and-drop or camera capture (mobile)
- Tesseract OCR extracts document type, expiry, confidence score
- Auto-matches document owner from OCR-detected names
- Auto-categorizes from filename (passport → identity, W-2 → finance)
- Category sidebar (desktop) / horizontal pills (mobile)
- View modal shows full metadata + AI analysis
- Download generates text summary for seeded docs, real file for uploads
- Status filter: current, expiring, expired, review

### 2. Net Worth Tracking
- Hero banner: Total Assets → Total Liabilities → Net Worth
- 24-month trend chart (filterable: 6M/12M/24M/ALL)
- Asset allocation vs target bar chart
- Accounts list with category icons
- AI portfolio insights (rebalancing, tax-loss harvesting, risk alerts)

### 3. AI Analysis Engine (POST /alerts/analyze)
- Document expiry scanning (expired, <30d, <90d)
- Missing document detection per member (passport, license, insurance, will)
- Emergency fund check (savings vs 6-month expenses)
- Crypto allocation warning (>5%)
- Net worth milestone tracking (>$2M)
- Tax season awareness (Feb-Apr)
- Returns severity-coded findings with action targets

### 4. Family Management
- Role-based access: admin > co-admin > member > advisor > view-only
- Granular permissions per user (vault, portfolio, insights, family_mgmt)
- Vault audit scoring (5 critical categories, 0-100% completeness)
- Co-admins cannot edit/promote/remove admins
- Temporary password generation for new members

### 5. Security
- JWT authentication with configurable expiry
- bcryptjs password hashing (cost 10)
- Rate limiting: 200/15min global, 15/15min on auth
- Security headers: X-Content-Type-Options, X-Frame-Options, HSTS
- RBAC enforcement on every route
- Multi-tenancy: every query scoped by family_id
- File upload: extension + MIME validation, UUID filenames
- Audit logging for member and document changes

---

## Design System

### Layout
- **Desktop**: Dark top navbar (#1a2332), light page background (#eef2f7)
- **Mobile (<=768px)**: Hamburger menu, stacked grids, horizontal category pills
- **iPhone 17 Pro Max (430px)**: Compact stat cards (2x2), hidden sub-text, smaller fonts

### CSS Variables
- `--brand: #1a3a5c` (navy), `--accent: #0a9e9e` (teal)
- `--bg: #eef2f7`, `--surface: #ffffff`, `--border: #dde3ec`
- `--green: #059669`, `--amber: #d97706`, `--red: #dc2626`
- Fonts: Inter (body), DM Sans (headings)

### Component Classes
- `.card` — White surface with border + shadow
- `.btn-teal`, `.btn-brand`, `.btn-outline`, `.btn-danger` — Button variants
- `.badge-green`, `.badge-red`, `.badge-amber` — Status badges
- `.sec-bar-teal`, `.sec-bar-navy` — Section header bars
- `.dash-stat-card` — Dashboard stat cards with colored accent border + icon
- `.mini-stats-strip` — Compact stat row for sub-pages
- `.doc-cats-mobile` — Horizontal scrollable category pills
- `.doc-cards-mobile` / `.doc-table-desktop` — Responsive document layouts
- `.settings-layout` / `.settings-tabs-mobile` — Settings responsive layout
- `.nw-banner` — Portfolio hero banner (stacks vertically on mobile)

### Responsive Breakpoints
- `>900px` — Desktop: full 2-column grids, document sidebar
- `768px-900px` — Tablet: grids collapse to 1 column
- `<=768px` — Mobile: hamburger menu, pill tabs, card layouts, compact spacing
- `<=430px` — iPhone: extra compact fonts/buttons, hidden sub-text

---

## Demo Data (Seed)

| Entity | Count | Details |
|--------|-------|---------|
| Family | 1 | Singh Family (pro plan) |
| Users | 5 | Gurmail (admin), Lovely (co-admin), Raj (member), Priya (member), Mom (view-only) |
| Documents | 23 | US-oriented: passport, SSN, driver license, W-2, 1099, mortgage, insurance, etc. |
| Assets | 7 | $3.4M total: Schwab brokerage, real estate, 401(k)x2, savings, 529, crypto |
| Liabilities | 4 | $565K total: mortgage, auto loan, student loan, credit card |
| Snapshots | 24 | Monthly net worth history |
| Alerts | 5 | Passport expiry, insurance review, missing doc, rebalance, net worth milestone |
| Tasks | 8 | Passport renewal, insurance review, tax filing, etc. |

---

## Development

```bash
# Setup
npm run setup                  # Install root + client dependencies
npm run seed                   # Populate database with demo data

# Development
npm run dev                    # Start both server (5000) + client (3000)
npm run server                 # Server only with nodemon
npm run client                 # React dev server only

# Production
npm run build                  # Build React for production
npm start                      # Start server (serves React build)
```

### Environment Variables
```
PORT=5000                      # Server port
JWT_SECRET=<strong-secret>     # REQUIRED in production
JWT_EXPIRES_IN=7d              # Token expiry
CLIENT_URL=http://localhost:3000  # CORS origin (or 'true' for same-origin)
NODE_ENV=development           # 'production' enables HSTS, serves React build
```

---

## Scaling Notes (for future development)

### Current Limitations
- SQLite is single-writer — will bottleneck under concurrent load
- No database migration system — schema changes require manual ALTER TABLE
- No refresh token — JWT valid for 7 days, no rotation
- File storage is local disk — no CDN/cloud storage
- AI analysis is simulated (OCR via Tesseract, no real LLM integration)
- No WebSocket — all data fetched via polling/page navigation
- No i18n framework — hardcoded to en-US

### Recommended Next Steps
1. **Database**: Migrate to PostgreSQL with Prisma ORM + migrations
2. **Auth**: Add refresh tokens, OAuth/SSO, session management
3. **Storage**: Move uploads to S3/CloudFlare R2 with signed URLs
4. **AI**: Integrate real document AI (GPT-4 Vision / Claude for OCR + analysis)
5. **Routing**: Replace state-based routing with react-router-dom (URL support, deep linking)
6. **State**: Add React Query or SWR for data fetching/caching
7. **Testing**: Add Jest + React Testing Library + API integration tests
8. **CI/CD**: GitHub Actions for lint, test, build, deploy
9. **Monitoring**: Add error tracking (Sentry) and analytics
10. **Mobile**: Consider React Native or PWA for native mobile experience
