# FamilyOS — Prompt Reference Guide

A structured catalog of all prompts used to build, audit, fix, and deploy FamilyOS.

---

## 1. Code Audit & Review

| # | Prompt | Purpose |
|---|--------|---------|
| 1 | `This project was developed using Sonnet 4.6. Now, as Opus 4.6, perform a complete audit of the codebase. Focus on: Code quality, structure, and best practices; UI consistency across all pages; Missing sections or incomplete implementations; Bugs or broken functionality; Performance or scalability concerns. Output: A structured review report, List of issues with severity, Recommended fixes and improvements` | Full codebase audit with severity-rated issue report |

---

## 2. Bug Fixing & Debugging

| # | Prompt | Purpose |
|---|--------|---------|
| 2 | `You previously identified multiple bugs and issues in the codebase. Now fix all of them carefully. Requirements: Fix all listed bugs and issues; Do not break any existing functionality; Maintain UI consistency across all pages; Ensure all pages are working correctly (no page should be missed). Process: Go through each issue one by one and fix them properly; Refactor code where necessary, but avoid unnecessary changes; Test all major flows and pages after fixes. After fixing: Provide a summary of all fixes applied; Confirm that everything is working correctly. Then: Commit all changes with a clear message; Push the code to the arunkumar-wq/familyos-staging main branch on GitHub` | Fix all audit issues across entire codebase |
| 3 | `Login failed for: Email: arun@familyos.ai Password: password123. Check: DB connection, User exists, Auth logic. Fix without breaking app. If user missing, create it with a suitable role for demo access. Reply with fix summary only.` | Debug and fix login failure (missing seed data + alert schema mismatch) |

---

## 3. Deployment & GitHub

| # | Prompt | Purpose |
|---|--------|---------|
| 4 | `Use GitHub user "arunkumar-wq" instead of "arun35121" to push the code. Retry the push with correct credentials. If it fails, show only the exact error.` | Fix GitHub push authentication |
| 5 | `The app deployed via Railway (GitHub) was working earlier, but login is now failing. Staging URL: https://familyos-staging-production.up.railway.app/ Check: Deployment issues, Environment variables, Database connection, Auth logic. Fix the issue without breaking anything. If user data is missing, recreate a demo user. Reply with fix summary only.` | Fix production deployment (JWT crash, CORS, hidden demo creds) |

---

## 4. Prompt Patterns & Templates

### Audit Template
```
Perform a complete audit of the codebase.
Focus on:
- Code quality, structure, and best practices
- UI consistency across all pages
- Missing sections or incomplete implementations
- Bugs or broken functionality
- Performance or scalability concerns

Output:
- A structured review report
- List of issues with severity
- Recommended fixes and improvements
```

### Bug Fix Template
```
[Describe the bug]

Check:
- [Area 1]
- [Area 2]
- [Area 3]

Fix without breaking app.
If [fallback condition], [fallback action].
Reply with fix summary only.
```

### Deployment Debug Template
```
The app deployed via [platform] was working earlier, but [symptom] is now failing.
Staging URL: [url]

Check:
- Deployment issues
- Environment variables
- Database connection
- Auth logic

Fix the issue without breaking anything.
```

### Git Push Template
```
Use GitHub user "[username]" to push the code.
Retry the push with correct credentials.
If it fails, show only the exact error.
```

---

## 5. Key Issues Found & Fixed (Reference)

| Category | Issue | Root Cause |
|----------|-------|------------|
| Security | Auth bypass | Hardcoded JWT secret fallback |
| Security | Privilege escalation | No role checks on member update/delete |
| Security | Cross-tenant access | Missing family_id guard on permissions |
| Security | File exposure | express.static served uploads without auth |
| Bug | LoadingSpinner broken | Typo: `{mssage}` instead of `{message}` |
| Bug | Login fails on Railway | getJwtSecret() throws in production |
| Bug | Alerts don't render | DB column `type` vs frontend field `severity` |
| Bug | Demo creds hidden | react-scripts build sets NODE_ENV=production |
| Bug | Dashboard shows fake data | Hardcoded fallback values (215, 19, 13) |
| Bug | Settings toggles non-functional | Divs instead of checkbox inputs |
| Bug | Search triggers on every keystroke | No debounce on DocumentsPage |
| Data | Empty database | Seed script never executed |
| Deploy | CORS blocks requests | CLIENT_URL defaulted to localhost:3000 |
| Deploy | Push rejected | Wrong GitHub user credentials |
| UX | Sidebar badges hardcoded | Static numbers instead of API-fetched counts |
| UX | Notification dot always visible | No conditional check on unread count |
| UX | No error boundaries | Single component crash takes down entire app |
