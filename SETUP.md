# LINIO — Environment Setup Guide

Step-by-step instructions to run the project from scratch on a fresh system.

---

## 1. Prerequisites

### Node.js (v18 or higher)

**Mac:**
```bash
# Option A: Using Homebrew (recommended)
brew install node

# Option B: Using nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18
nvm use 18
```

**Windows:**
1. Download the installer from https://nodejs.org (LTS version)
2. Run the installer, check "Add to PATH"
3. Restart your terminal after installation

**Verify installation (both OS):**
```bash
node --version    # Should print v18.x.x or higher
npm --version     # Should print 9.x.x or higher
```

### Git

**Mac:**
```bash
brew install git
```

**Windows:**
1. Download from https://git-scm.com/download/win
2. Run installer with default settings
3. Use "Git Bash" or any terminal that supports git

**Verify:**
```bash
git --version
```

### Python 3 (optional — needed for `better-sqlite3` native build on some systems)

If `npm install` fails with a native module error, you may need Python:

**Mac:**
```bash
brew install python3
```

**Windows:**
1. Download from https://python.org
2. Check "Add Python to PATH" during install

---

## 2. Clone the Repository

```bash
git clone https://github.com/arunkumar-wq/familyos-staging.git
cd familyos-staging
```

---

## 3. Install Dependencies

This project has two `package.json` files — one for the backend (root) and one for the React frontend (`client/`).

**Quick setup (installs both):**
```bash
npm run setup
```

**Manual setup (if the above fails):**
```bash
# Step 1: Install backend dependencies
npm install

# Step 2: Install frontend dependencies
cd client
npm install
cd ..
```

---

## 4. Environment Variables

Create a `.env` file in the project root:

**Mac/Linux:**
```bash
cp .env.example .env
```

**Windows (Command Prompt):**
```cmd
copy .env.example .env
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

Open `.env` and verify these values:

```env
PORT=5000
JWT_SECRET=familyos_super_secret_key_change_in_production_2025
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

> **Note:** For local development, the defaults work fine. For production, change `JWT_SECRET` to a long random string.

---

## 5. Database Setup & Seeding

The database is SQLite — no external database server needed. The file `database/familyos.db` is created automatically when the server starts.

**Seed the database with demo data:**
```bash
npm run seed
```

You should see:
```
Seeding LINIO database...

Seed complete!

Login credentials:
   Email:    gurmail@linio.ai
   Password: password123

Seeded:
   1 family (Singh Family), 5 users
   23 documents
   7 assets, 4 liabilities
   24 net worth snapshots
   5 alerts, 8 tasks
```

> **Re-seeding:** Running `npm run seed` again will clear all data and re-create it fresh. This is safe during development.

---

## 6. Running the Application

### Option A: Run both frontend and backend together (recommended)

```bash
npm run dev
```

This starts:
- **Backend** at http://localhost:5000 (Express API)
- **Frontend** at http://localhost:3000 (React dev server)

Open http://localhost:3000 in your browser.

### Option B: Run separately (useful for debugging)

**Terminal 1 — Backend:**
```bash
npm run server
```

**Terminal 2 — Frontend:**
```bash
npm run client
```

### Option C: Production mode

```bash
# Build the React frontend
npm run build

# Start the server (serves the built React app)
npm start
```

Open http://localhost:5000 — the server serves both API and frontend.

---

## 7. Login

Once the app is running at http://localhost:3000:

| Field | Value |
|-------|-------|
| Email | `gurmail@linio.ai` |
| Password | `password123` |

These are pre-filled on the login page.

---

## 8. Project Structure (Quick Reference)

```
familyos-staging/
├── server/              # Express.js backend
│   ├── index.js         # Entry point (port 5000)
│   ├── middleware/       # auth.js (JWT), upload.js (Multer)
│   └── routes/          # auth, dashboard, documents, portfolio, family, alerts, tasks
├── database/
│   ├── db.js            # SQLite connection (auto-creates familyos.db)
│   ├── schema.sql       # Table definitions
│   └── seed.js          # Demo data
├── client/              # React 18 frontend
│   ├── public/          # Static HTML
│   └── src/
│       ├── App.js       # Main app shell
│       ├── components/  # Navbar, UI, Sidebar, Topbar
│       ├── context/     # AuthContext (login state)
│       ├── pages/       # 13 page components
│       └── utils/       # api.js (Axios), formatters.js
├── uploads/             # User-uploaded files (created at runtime)
├── package.json         # Backend dependencies + scripts
├── .env.example         # Environment template
└── railway.toml         # Railway deployment config
```

---

## 9. Common Errors & Fixes

### `better-sqlite3` build fails

**Error:** `node-gyp rebuild failed` or `Cannot find module 'better-sqlite3'`

**Fix (Windows):**
```bash
npm install --global windows-build-tools
npm install
```

**Fix (Mac):**
```bash
xcode-select --install
npm install
```

**Fix (both):** If still failing, try:
```bash
npm install better-sqlite3 --build-from-source
```

---

### Port 5000 already in use

**Error:** `Error: listen EADDRINUSE: address already in use :::5000`

**Fix (Mac/Linux):**
```bash
lsof -i :5000
kill -9 <PID>
```

**Fix (Windows):**
```bash
netstat -ano | findstr :5000
taskkill /F /PID <PID>
```

Or change the port in `.env`:
```env
PORT=5001
```

---

### Port 3000 already in use (React)

When you run `npm run client`, React may ask:
```
Something is already running on port 3000. Use a different port? (Y/n)
```

Type `Y` and it will use port 3001. The API proxy still works.

---

### Login fails with "Invalid credentials"

**Cause:** Database hasn't been seeded.

**Fix:**
```bash
npm run seed
```

Then refresh the login page and try again with `gurmail@linio.ai` / `password123`.

---

### `CORS error` in browser console

**Cause:** Backend isn't running, or running on a different port.

**Fix:**
1. Make sure the backend is running on port 5000 (`npm run server`)
2. Check that `client/package.json` has `"proxy": "http://localhost:5000"`
3. If using a custom port, update both `.env` and the proxy setting

---

### React app shows blank white page

**Cause:** Frontend build error or missing dependencies.

**Fix:**
```bash
cd client
rm -rf node_modules
npm install
npm start
```

**Windows:**
```cmd
cd client
rmdir /s /q node_modules
npm install
npm start
```

---

### `Cannot find module 'tesseract.js'`

**Fix:**
```bash
npm install tesseract.js
```

This is the OCR library used for document analysis. It downloads language data on first use (~15MB).

---

### Database is corrupted or schema mismatch

**Fix:** Delete the database and re-seed:

**Mac/Linux:**
```bash
rm database/familyos.db
npm run seed
```

**Windows:**
```cmd
del database\familyos.db
npm run seed
```

---

## 10. Deployment (Railway)

The project auto-deploys to Railway when code is pushed to the `main` branch.

**Railway build process** (defined in `railway.toml`):
1. `npm install` — install backend deps
2. `cd client && npm install && npm run build` — build React
3. `node database/seed.js` — seed the database
4. `node server/index.js` — start the server

**Environment variables to set on Railway:**
| Variable | Value |
|----------|-------|
| `JWT_SECRET` | A strong random string (32+ characters) |
| `NODE_ENV` | `production` |

> Railway auto-assigns `PORT`. Do not set it manually.

---

## Quick Start Cheatsheet

```bash
# One-time setup
git clone https://github.com/arunkumar-wq/familyos-staging.git
cd familyos-staging
npm run setup
cp .env.example .env
npm run seed

# Daily development
npm run dev

# Open browser
# http://localhost:3000
# Login: gurmail@linio.ai / password123
```
