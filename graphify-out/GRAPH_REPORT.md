# Graph Report - .  (2026-04-13)

## Corpus Check
- Corpus is ~37,480 words - fits in a single context window. You may not need a graph.

## Summary
- 161 nodes · 139 edges · 40 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API & Issue Tracking|API & Issue Tracking]]
- [[_COMMUNITY_Document Management UI|Document Management UI]]
- [[_COMMUNITY_Auth & Deployment|Auth & Deployment]]
- [[_COMMUNITY_UI Component Library|UI Component Library]]
- [[_COMMUNITY_Formatting Utilities|Formatting Utilities]]
- [[_COMMUNITY_App Shell & Error Handling|App Shell & Error Handling]]
- [[_COMMUNITY_Document Processing|Document Processing]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_Auth Context|Auth Context]]
- [[_COMMUNITY_Notifications Page|Notifications Page]]
- [[_COMMUNITY_Auth Route Validation|Auth Route Validation]]
- [[_COMMUNITY_Family Route Logic|Family Route Logic]]
- [[_COMMUNITY_Prompt Engineering|Prompt Engineering]]
- [[_COMMUNITY_Navbar Component|Navbar Component]]
- [[_COMMUNITY_Portfolio Page|Portfolio Page]]
- [[_COMMUNITY_Dashboard Page|Dashboard Page]]
- [[_COMMUNITY_Calendar Page|Calendar Page]]
- [[_COMMUNITY_Family Page|Family Page]]
- [[_COMMUNITY_Insights Page|Insights Page]]
- [[_COMMUNITY_Audit Page|Audit Page]]
- [[_COMMUNITY_Settings Page|Settings Page]]
- [[_COMMUNITY_Edit Profile Page|Edit Profile Page]]
- [[_COMMUNITY_Add Member Page|Add Member Page]]
- [[_COMMUNITY_Portfolio Route|Portfolio Route]]
- [[_COMMUNITY_Alerts Route|Alerts Route]]
- [[_COMMUNITY_Tasks Route|Tasks Route]]
- [[_COMMUNITY_Dashboard Route|Dashboard Route]]
- [[_COMMUNITY_Documents Route|Documents Route]]
- [[_COMMUNITY_Upload Middleware|Upload Middleware]]
- [[_COMMUNITY_Topbar Component|Topbar Component]]
- [[_COMMUNITY_Database Schema|Database Schema]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_Database Connection|Database Connection]]
- [[_COMMUNITY_Seed Data|Seed Data]]
- [[_COMMUNITY_API Client|API Client]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_Global Styles|Global Styles]]
- [[_COMMUNITY_HTML Template|HTML Template]]
- [[_COMMUNITY_Deploy Config|Deploy Config]]

## God Nodes (most connected - your core abstractions)
1. `families Table` - 9 edges
2. `users Table` - 9 edges
3. `FamilyOS Application` - 6 edges
4. `ErrorBoundary` - 5 edges
5. `simulateAIAnalysis()` - 4 edges
6. `alerts Table` - 4 edges
7. `loadDocs()` - 3 edges
8. `readFileTextSafe()` - 3 edges
9. `extractStructuredDataFromFile()` - 3 edges
10. `JWT + bcryptjs Auth` - 3 edges

## Surprising Connections (you probably didn't know these)
- `users Table` --shares_data_with--> `Auth API Endpoints`  [INFERRED]
  database/schema.sql → README.md
- `users Table` --shares_data_with--> `Family API Endpoints`  [INFERRED]
  database/schema.sql → README.md
- `Setup Bootstrap Script` --references--> `FamilyOS Application`  [EXTRACTED]
  setup.sh → README.md
- `documents Table` --shares_data_with--> `Documents API Endpoints`  [INFERRED]
  database/schema.sql → README.md
- `assets Table` --shares_data_with--> `Portfolio API Endpoints`  [INFERRED]
  database/schema.sql → README.md

## Hyperedges (group relationships)
- **Full-Stack Request Flow: React -> Express -> SQLite** — readme_react_frontend, readme_express_backend, readme_sqlite_database, readme_jwt_auth [INFERRED 0.90]
- **Portfolio Financial Data Model** — schema_assets_table, schema_liabilities_table, schema_net_worth_snapshots_table, readme_api_portfolio, readme_page_portfolio [INFERRED 0.85]
- **Security Hardening: RBAC + Multi-Tenancy + JWT** — schema_rbac_system, schema_multi_tenancy, readme_jwt_auth, prompts_issue_security_auth_bypass, prompts_issue_security_privilege_escalation, prompts_issue_security_cross_tenant [EXTRACTED 0.90]

## Communities

### Community 0 - "API & Issue Tracking"
Cohesion: 0.1
Nodes (26): Bug: Alerts Column type vs severity Mismatch, Security Issue: Cross-Tenant Access, Security Issue: Privilege Escalation, Alerts API Endpoints, Documents API Endpoints, Family API Endpoints, Portfolio API Endpoints, Tasks API Endpoints (+18 more)

### Community 1 - "Document Management UI"
Cohesion: 0.11
Nodes (5): deleteDoc(), guessCat(), handleFile(), loadDocs(), submitUpload()

### Community 2 - "Auth & Deployment"
Cohesion: 0.15
Nodes (13): JWT_SECRET Config, Deployment Process, Security Issue: Auth Bypass via Hardcoded JWT, Railway Nixpacks Deployment, Auth API Endpoints, Chart.js Visualizations, Node.js Express Backend, FamilyOS Application (+5 more)

### Community 3 - "UI Component Library"
Cohesion: 0.18
Nodes (0): 

### Community 4 - "Formatting Utilities"
Cohesion: 0.2
Nodes (0): 

### Community 5 - "App Shell & Error Handling"
Cohesion: 0.25
Nodes (1): ErrorBoundary

### Community 6 - "Document Processing"
Cohesion: 0.39
Nodes (4): extractStructuredDataFromFile(), inferNameFromFilename(), readFileTextSafe(), simulateAIAnalysis()

### Community 7 - "Auth Middleware"
Cohesion: 0.5
Nodes (2): authMiddleware(), getJwtSecret()

### Community 8 - "Sidebar Navigation"
Cohesion: 0.67
Nodes (0): 

### Community 9 - "Auth Context"
Cohesion: 0.67
Nodes (0): 

### Community 10 - "Notifications Page"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "Auth Route Validation"
Cohesion: 0.67
Nodes (0): 

### Community 12 - "Family Route Logic"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Prompt Engineering"
Cohesion: 0.67
Nodes (3): Codebase Audit Process, Bug Fix Process, Rationale: Sonnet 4.6 to Opus 4.6 Migration

### Community 14 - "Navbar Component"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Portfolio Page"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Dashboard Page"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Calendar Page"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Family Page"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Insights Page"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Audit Page"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Settings Page"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Edit Profile Page"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Add Member Page"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Portfolio Route"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Alerts Route"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Tasks Route"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Dashboard Route"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Documents Route"
Cohesion: 1.0
Nodes (2): CLIENT_URL Config, Deploy Issue: CORS Blocks Requests

### Community 29 - "Upload Middleware"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Topbar Component"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Database Schema"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Login Page"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Database Connection"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Seed Data"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "API Client"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "App Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Global Styles"
Cohesion: 1.0
Nodes (1): AI Insights Page

### Community 38 - "HTML Template"
Cohesion: 1.0
Nodes (1): Settings Page

### Community 39 - "Deploy Config"
Cohesion: 1.0
Nodes (1): PORT 5000 Config

## Knowledge Gaps
- **20 isolated node(s):** `SQLite via better-sqlite3`, `Multer File Uploads`, `Chart.js Visualizations`, `Portfolio Page`, `Family Management Page` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Navbar Component`** (2 nodes): `Navbar.js`, `Navbar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Portfolio Page`** (2 nodes): `AddMemberPage()`, `AddMemberPage.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Page`** (2 nodes): `AuditPage()`, `AuditPage.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Calendar Page`** (2 nodes): `CalendarPage()`, `CalendarPage.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Family Page`** (2 nodes): `DashboardPage.js`, `DashboardPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Insights Page`** (2 nodes): `EditProfilePage.js`, `EditProfilePage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Page`** (2 nodes): `FamilyPage.js`, `FamilyPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Page`** (2 nodes): `InsightsPage.js`, `InsightsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Edit Profile Page`** (2 nodes): `LoginPage.js`, `LoginPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Add Member Page`** (2 nodes): `PortfolioPage.js`, `PortfolioPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Portfolio Route`** (2 nodes): `SettingsPage.js`, `SettingsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Alerts Route`** (2 nodes): `db.js`, `getDb()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tasks Route`** (2 nodes): `upload.js`, `fileFilter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Dashboard Route`** (2 nodes): `mapAlert()`, `alerts.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Documents Route`** (2 nodes): `CLIENT_URL Config`, `Deploy Issue: CORS Blocks Requests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Upload Middleware`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Topbar Component`** (1 nodes): `Topbar.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Database Schema`** (1 nodes): `api.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Page`** (1 nodes): `seed.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Database Connection`** (1 nodes): `index.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Seed Data`** (1 nodes): `dashboard.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Client`** (1 nodes): `portfolio.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Entry Point`** (1 nodes): `tasks.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Global Styles`** (1 nodes): `AI Insights Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HTML Template`** (1 nodes): `Settings Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Deploy Config`** (1 nodes): `PORT 5000 Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `users Table` connect `API & Issue Tracking` to `Auth & Deployment`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `Auth API Endpoints` connect `Auth & Deployment` to `API & Issue Tracking`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `users Table` (e.g. with `Auth API Endpoints` and `Family API Endpoints`) actually correct?**
  _`users Table` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `SQLite via better-sqlite3`, `Multer File Uploads`, `Chart.js Visualizations` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API & Issue Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Document Management UI` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._