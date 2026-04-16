/**
 * LINIO — Database Seed (US Locale)
 * Run: node database/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');

const docPreviewDir = path.join(__dirname, '..', 'client', 'public', 'doc-previews');
if (!fs.existsSync(docPreviewDir)) fs.mkdirSync(docPreviewDir, { recursive: true });

function createDocPreview(filename, docType, docName, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#f8f9fa"/>
    <rect width="400" height="50" fill="${color}"/>
    <text x="200" y="32" text-anchor="middle" fill="white" font-family="Arial" font-size="16" font-weight="bold">${docType}</text>
    <text x="200" y="120" text-anchor="middle" fill="#333" font-family="Arial" font-size="14" font-weight="bold">${docName}</text>
    <text x="200" y="150" text-anchor="middle" fill="#999" font-family="Arial" font-size="12">DOCUMENT PREVIEW</text>
    <rect x="50" y="180" width="300" height="1" fill="#ddd"/>
    <text x="200" y="210" text-anchor="middle" fill="#bbb" font-family="Arial" font-size="11">Secured by LINIO</text>
  </svg>`;
  fs.writeFileSync(path.join(docPreviewDir, filename), svg);
  return filename;
}

const db = getDb();

console.log('🌱 Seeding LINIO database...\n');

// ─── CLEAR EXISTING DATA ────────────────────────────────────────────
db.exec(`
  DELETE FROM audit_log;
  DELETE FROM tasks;
  DELETE FROM alerts;
  DELETE FROM net_worth_snapshots;
  DELETE FROM liabilities;
  DELETE FROM assets;
  DELETE FROM documents;
  DELETE FROM permissions;
  DELETE FROM users;
  DELETE FROM families;
`);

// ─── FAMILY ─────────────────────────────────────────────────────────
const familyId = uuidv4();
db.prepare(`INSERT INTO families (id, name, plan) VALUES (?, ?, ?)`).run(familyId, 'Singh Family', 'pro');

// ─── USERS ──────────────────────────────────────────────────────────
const passwordHash = bcrypt.hashSync('password123', 10);

const users = [
  { id: uuidv4(), first: 'Gurmail', last: 'Singh', email: 'gurmail@linio.ai', phone: '+1 (555) 987-6543', role: 'admin', relation: 'self', dob: '1983-04-14', color: '#0f1f3d', avatar: '/avatars/Gurmail.png' },
  { id: uuidv4(), first: 'Lovely', last: 'Singh', email: 'lovely@gmail.com', phone: '+1 (555) 987-6544', role: 'co-admin', relation: 'spouse', dob: '1986-08-22', color: '#07b98a', avatar: '/avatars/Lovely.png' },
  { id: uuidv4(), first: 'Raj', last: 'Singh', email: 'raj@gmail.com', phone: '+1 (555) 987-6545', role: 'member', relation: 'son', dob: '2008-03-10', color: '#f59e0b', avatar: '/avatars/Raj.png' },
  { id: uuidv4(), first: 'Priya', last: 'Singh', email: 'priya@gmail.com', phone: '+1 (555) 987-6546', role: 'member', relation: 'daughter', dob: '2013-11-05', color: '#f43f5e', avatar: '/avatars/Priya.png' },
  { id: uuidv4(), first: 'Mom', last: 'Singh', email: 'mom@gmail.com', phone: '+1 (555) 987-6547', role: 'view-only', relation: 'mother', dob: '1955-06-15', color: '#6c2bd9', avatar: '/avatars/Mom.png' },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, family_id, first_name, last_name, email, phone, password_hash, role, relation, date_of_birth, avatar_color, avatar_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertPerm = db.prepare(`
  INSERT INTO permissions (id, user_id, vault, portfolio, insights, family_mgmt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const permMap = {
  admin:      { vault: 'full', portfolio: 'full', insights: 'full', family_mgmt: 'admin' },
  'co-admin': { vault: 'full', portfolio: 'view', insights: 'full', family_mgmt: 'co-admin' },
  member:     { vault: 'own',  portfolio: 'none', insights: 'none', family_mgmt: 'none' },
  'view-only':{ vault: 'view', portfolio: 'view', insights: 'view', family_mgmt: 'none' },
};

users.forEach(u => {
  insertUser.run(u.id, familyId, u.first, u.last, u.email, u.phone, passwordHash, u.role, u.relation, u.dob, u.color, u.avatar || null);
  const p = permMap[u.role] || permMap.member;
  insertPerm.run(uuidv4(), u.id, p.vault, p.portfolio, p.insights, p.family_mgmt);
});

const [gurmail, anita, raj, priya, mom] = users;

// ─── DOCUMENTS (US-oriented) ───────────────────────────────────────
const docs = [
  { owner: gurmail.id, name: "Gurmail's Passport", cat: 'identity', status: 'expiring', expiry: '2026-03-28', size: '1.1 MB', mime: 'image/svg+xml', file: createDocPreview('passport_gurmail.svg', 'US PASSPORT', 'GURMAIL SINGH', '#1a3a6b'), ai: 1, summary: '{"type":"US Passport","issuer":"US Dept of State","number":"567890123","expiry":"Mar 28, 2026","confidence":0.98,"fields":[{"key":"Passport Number","value":"567890123","confidence":0.96},{"key":"Full Name","value":"GURMAIL SINGH","confidence":0.94},{"key":"Expiry Date","value":"Mar 28, 2026","confidence":0.97}]}' },
  { owner: gurmail.id, name: "Gurmail's Driver License", cat: 'identity', status: 'valid', expiry: '2028-08-22', size: '0.4 MB', mime: 'image/svg+xml', file: createDocPreview('dl_gurmail.svg', 'DRIVER LICENSE', 'GURMAIL SINGH', '#003366'), ai: 1, summary: '{"type":"Driver License","issuer":"CA DMV","number":"D4567890","expiry":"Aug 22, 2028","confidence":0.95,"fields":[{"key":"DL Number","value":"D4567890","confidence":0.95},{"key":"Full Name","value":"GURMAIL SINGH","confidence":0.93},{"key":"Expiry Date","value":"Aug 22, 2028","confidence":0.96}]}' },
  { owner: gurmail.id, name: "Gurmail's Social Security", cat: 'identity', status: 'valid', expiry: '2099-12-31', size: '0.3 MB', mime: 'image/svg+xml', file: createDocPreview('ssn_gurmail.svg', 'SOCIAL SECURITY', 'GURMAIL SINGH', '#003366'), ai: 1, summary: '{"type":"Social Security Card","issuer":"SSA","number":"XXX-XX-4321","confidence":0.88,"fields":[{"key":"SSN","value":"XXX-XX-4321","confidence":0.92},{"key":"Full Name","value":"GURMAIL SINGH","confidence":0.90}]}' },

  { owner: gurmail.id, name: 'W-2 Form — 2024', cat: 'finance', status: 'current', expiry: '2027-04-15', size: '0.8 MB', mime: 'application/pdf', file: createDocPreview('w2_2024.svg', 'W-2 FORM', '2024 TAX YEAR', '#1a5c3a'), ai: 1, summary: '{"type":"W-2 Wage Statement","issuer":"Employer","year":"2024","confidence":0.96,"fields":[{"key":"Tax Year","value":"2024","confidence":0.98},{"key":"Employer","value":"Tech Corp Inc","confidence":0.90}]}' },
  { owner: gurmail.id, name: '1099 Forms — 2024', cat: 'finance', status: 'current', expiry: '2027-04-15', size: '1.2 MB', mime: 'application/pdf', file: createDocPreview('1099_2024.svg', '1099 FORMS', '2024 TAX YEAR', '#1a5c3a'), ai: 1, summary: '{"type":"1099 Misc Income","issuer":"Charles Schwab","year":"2024","confidence":0.94,"fields":[{"key":"Tax Year","value":"2024","confidence":0.96},{"key":"Total Income","value":"$42,800","confidence":0.88}]}' },
  { owner: gurmail.id, name: 'Schwab Brokerage Statement', cat: 'finance', status: 'current', expiry: '2027-01-31', size: '2.3 MB', mime: 'application/pdf', file: createDocPreview('schwab_stmt.svg', 'BROKERAGE STATEMENT', 'CHARLES SCHWAB', '#0a5c8a'), ai: 1, summary: '{"type":"Brokerage Statement","institution":"Charles Schwab","value":"$1,180,400","confidence":0.95,"fields":[{"key":"Account Value","value":"$1,180,400","confidence":0.95},{"key":"Account Type","value":"Taxable Brokerage","confidence":0.92}]}' },

  { owner: gurmail.id, name: 'Mortgage Agreement — Chase', cat: 'property', status: 'current', expiry: '2050-01-15', size: '4.1 MB', mime: 'application/pdf', file: createDocPreview('mortgage_chase.svg', 'MORTGAGE AGREEMENT', 'CHASE BANK', '#1a3a5c'), ai: 1, summary: '{"type":"Mortgage Agreement","lender":"Chase Bank","amount":"$650K","rate":"6.5%","term":"30yr","confidence":0.93,"fields":[{"key":"Lender","value":"Chase Bank","confidence":0.96},{"key":"Amount","value":"$650,000","confidence":0.94},{"key":"Rate","value":"6.5%","confidence":0.95}]}' },
  { owner: gurmail.id, name: 'Property Deed — Primary Home', cat: 'property', status: 'current', expiry: '2099-12-31', size: '3.8 MB', mime: 'application/pdf', file: createDocPreview('deed_home.svg', 'PROPERTY DEED', '123 OAK LANE, SAN JOSE', '#5c3a1a'), ai: 1, summary: '{"type":"Property Deed","property":"123 Oak Lane, San Jose, CA","sqft":"2,200","value":"$890,000","confidence":0.92,"fields":[{"key":"Address","value":"123 Oak Lane, San Jose, CA","confidence":0.95},{"key":"Assessed Value","value":"$890,000","confidence":0.88}]}' },

  { owner: gurmail.id, name: 'Auto Insurance — State Farm', cat: 'insurance', status: 'expiring', expiry: '2026-04-01', size: '0.9 MB', mime: 'application/pdf', file: createDocPreview('auto_ins.svg', 'AUTO INSURANCE', 'STATE FARM', '#dc2626'), ai: 1, summary: '{"type":"Auto Insurance","vehicle":"Toyota Camry 2023","insurer":"State Farm","premium":"$1,800/yr","confidence":0.94,"fields":[{"key":"Insurer","value":"State Farm","confidence":0.96},{"key":"Vehicle","value":"Toyota Camry 2023","confidence":0.92},{"key":"Premium","value":"$1,800/yr","confidence":0.90}]}' },
  { owner: gurmail.id, name: 'Health Insurance — Blue Cross', cat: 'insurance', status: 'current', expiry: '2026-12-31', size: '1.5 MB', mime: 'application/pdf', file: createDocPreview('health_ins.svg', 'HEALTH INSURANCE', 'BLUE CROSS', '#3883f6'), ai: 1, summary: '{"type":"Health Insurance","insurer":"Blue Cross","plan":"PPO Family","premium":"$18,000/yr","confidence":0.96,"fields":[{"key":"Insurer","value":"Blue Cross Blue Shield","confidence":0.97},{"key":"Plan","value":"PPO Family","confidence":0.94},{"key":"Premium","value":"$18,000/yr","confidence":0.92}]}' },
  { owner: gurmail.id, name: 'Life Insurance — Northwestern', cat: 'insurance', status: 'current', expiry: '2035-06-14', size: '1.8 MB', mime: 'application/pdf', file: createDocPreview('life_ins.svg', 'LIFE INSURANCE', 'NORTHWESTERN MUTUAL', '#059669'), ai: 1, summary: '{"type":"Life Insurance","insurer":"Northwestern Mutual","coverage":"$1M","premium":"$2,400/yr","confidence":0.97,"fields":[{"key":"Insurer","value":"Northwestern Mutual","confidence":0.98},{"key":"Coverage","value":"$1,000,000","confidence":0.96},{"key":"Beneficiary","value":"Lovely Singh","confidence":0.94}]}' },
  { owner: gurmail.id, name: 'Home Insurance — Allstate', cat: 'insurance', status: 'current', expiry: '2026-09-15', size: '1.3 MB', mime: 'application/pdf', file: createDocPreview('home_ins.svg', 'HOME INSURANCE', 'ALLSTATE', '#f59e0b'), ai: 1, summary: '{"type":"Homeowners Insurance","insurer":"Allstate","coverage":"$890K","premium":"$3,200/yr","confidence":0.95,"fields":[{"key":"Insurer","value":"Allstate","confidence":0.97},{"key":"Coverage","value":"$890,000","confidence":0.93},{"key":"Premium","value":"$3,200/yr","confidence":0.91}]}' },

  { owner: gurmail.id, name: 'Living Trust Document', cat: 'legal', status: 'review', expiry: '2028-01-15', size: '2.1 MB', mime: 'application/pdf', file: createDocPreview('trust.svg', 'LIVING TRUST', 'SINGH FAMILY', '#7c3aed'), ai: 1, summary: '{"type":"Living Trust","attorney":"Smith & Associates","date":"2021-01-15","confidence":0.91,"fields":[{"key":"Attorney","value":"Smith & Associates","confidence":0.93},{"key":"Date Created","value":"Jan 15, 2021","confidence":0.95},{"key":"Status","value":"Review Recommended","confidence":0.88}]}' },
  { owner: gurmail.id, name: 'Marriage Certificate', cat: 'legal', status: 'valid', expiry: '2099-12-31', size: '0.5 MB', mime: 'image/svg+xml', file: createDocPreview('marriage.svg', 'MARRIAGE CERTIFICATE', 'GURMAIL & LOVELY SINGH', '#7c3aed'), ai: 1, summary: '{"type":"Marriage Certificate","issuer":"Fresno County","date":"Nov 20, 2010","confidence":0.97,"fields":[{"key":"Certificate No","value":"MC-2010-56789","confidence":0.94},{"key":"Date","value":"November 20, 2010","confidence":0.96}]}' },

  { owner: anita.id, name: "Lovely's Passport", cat: 'identity', status: 'expiring', expiry: '2026-05-20', size: '1.1 MB', mime: 'image/svg+xml', file: createDocPreview('passport_lovely.svg', 'US PASSPORT', 'LOVELY SINGH', '#1a3a6b'), ai: 1, summary: '{"type":"US Passport","issuer":"US Dept of State","number":"678901234","expiry":"May 20, 2026","confidence":0.98,"fields":[{"key":"Passport Number","value":"678901234","confidence":0.96},{"key":"Full Name","value":"LOVELY SINGH","confidence":0.94},{"key":"Expiry Date","value":"May 20, 2026","confidence":0.97}]}' },
  { owner: anita.id, name: 'Teaching Certificate', cat: 'education', status: 'current', expiry: '2028-06-30', size: '1.2 MB', mime: 'application/pdf', file: createDocPreview('teaching_cert.svg', 'TEACHING CERTIFICATE', 'CA BOARD OF EDUCATION', '#0a9e9e'), ai: 1, summary: '{"type":"Teaching Certificate","issuer":"CA Board of Education","confidence":0.92,"fields":[{"key":"Issuer","value":"CA Board of Education","confidence":0.94},{"key":"Valid Until","value":"Jun 30, 2028","confidence":0.90}]}' },
  { owner: anita.id, name: "401(k) Statement — Lovely", cat: 'finance', status: 'current', expiry: '2027-01-31', size: '1.0 MB', mime: 'application/pdf', file: createDocPreview('401k_lovely.svg', '401(K) STATEMENT', 'FIDELITY', '#0a5c8a'), ai: 1, summary: '{"type":"401k Statement","institution":"Fidelity","value":"$438,800","confidence":0.94,"fields":[{"key":"Account Value","value":"$438,800","confidence":0.95},{"key":"Institution","value":"Fidelity","confidence":0.96}]}' },
  { owner: anita.id, name: "Lovely's Driver License", cat: 'identity', status: 'valid', expiry: '2028-08-22', size: '0.4 MB', mime: 'image/svg+xml', file: createDocPreview('dl_lovely.svg', 'DRIVER LICENSE', 'LOVELY SINGH', '#003366'), ai: 1, summary: '{"type":"Driver License","issuer":"CA DMV","number":"D5678901","expiry":"Aug 22, 2028","confidence":0.95,"fields":[{"key":"DL Number","value":"D5678901","confidence":0.95},{"key":"Full Name","value":"LOVELY SINGH","confidence":0.93}]}' },

  { owner: raj.id, name: "Raj's Birth Certificate", cat: 'identity', status: 'valid', expiry: '2099-12-31', size: '0.6 MB', mime: 'image/svg+xml', file: createDocPreview('birth_raj.svg', 'BIRTH CERTIFICATE', 'RAJ SINGH', '#0a9e9e'), ai: 1, summary: '{"type":"Birth Certificate","issuer":"Fresno County","number":"2008-BC-345678","confidence":0.95,"fields":[{"key":"Certificate No","value":"2008-BC-345678","confidence":0.94},{"key":"Full Name","value":"RAJ SINGH","confidence":0.96},{"key":"Date of Birth","value":"March 10, 2008","confidence":0.97}]}' },
  { owner: raj.id, name: "Raj's Passport", cat: 'identity', status: 'valid', expiry: '2028-06-01', size: '1.1 MB', mime: 'image/svg+xml', file: createDocPreview('passport_raj.svg', 'US PASSPORT', 'RAJ SINGH', '#1a3a6b'), ai: 1, summary: '{"type":"US Passport","number":"789012345","expiry":"Jun 1, 2028","confidence":0.96,"fields":[{"key":"Passport Number","value":"789012345","confidence":0.96},{"key":"Full Name","value":"RAJ SINGH","confidence":0.94}]}' },
  { owner: raj.id, name: 'School Records — Raj', cat: 'education', status: 'current', expiry: '2026-06-15', size: '0.8 MB', mime: 'application/pdf', file: createDocPreview('school_raj.svg', 'SCHOOL RECORDS', 'FRESNO HIGH SCHOOL', '#0a9e9e'), ai: 1, summary: '{"type":"School Records","school":"Fresno High School","grade":"12","confidence":0.88}' },

  { owner: priya.id, name: "Priya's Birth Certificate", cat: 'identity', status: 'valid', expiry: '2099-12-31', size: '0.6 MB', mime: 'image/svg+xml', file: createDocPreview('birth_priya.svg', 'BIRTH CERTIFICATE', 'PRIYA SINGH', '#0a9e9e'), ai: 1, summary: '{"type":"Birth Certificate","issuer":"Fresno County","number":"2013-BC-456789","confidence":0.95,"fields":[{"key":"Certificate No","value":"2013-BC-456789","confidence":0.94},{"key":"Full Name","value":"PRIYA SINGH","confidence":0.96}]}' },
  { owner: priya.id, name: 'Vaccination Record', cat: 'medical', status: 'current', expiry: '2027-09-01', size: '1.2 MB', mime: 'application/pdf', file: createDocPreview('vaccination_priya.svg', 'VACCINATION RECORD', 'PRIYA SINGH', '#dc2626'), ai: 1, summary: '{"type":"Vaccination Record","provider":"Kaiser Permanente","confidence":0.90,"fields":[{"key":"Patient","value":"PRIYA SINGH","confidence":0.94},{"key":"Last Updated","value":"Sep 2025","confidence":0.88}]}' },
  { owner: priya.id, name: 'School Report Card 2024', cat: 'education', status: 'current', expiry: '2026-06-15', size: '0.9 MB', mime: 'application/pdf', file: createDocPreview('report_priya.svg', 'REPORT CARD', 'PRIYA SINGH — 2024', '#0a9e9e'), ai: 1, summary: '{"type":"Report Card","school":"Fresno Middle School","year":"2024","confidence":0.87}' },

  { owner: mom.id, name: "Mom's Passport", cat: 'identity', status: 'valid', expiry: '2029-02-10', size: '1.0 MB', mime: 'image/svg+xml', file: createDocPreview('passport_mom.svg', 'US PASSPORT', 'SURINDER KAUR SINGH', '#1a3a6b'), ai: 1, summary: '{"type":"US Passport","number":"345678901","expiry":"Feb 10, 2029","confidence":0.96,"fields":[{"key":"Passport Number","value":"345678901","confidence":0.96},{"key":"Full Name","value":"SURINDER KAUR SINGH","confidence":0.94}]}' },
  { owner: mom.id, name: 'Medicare Card', cat: 'insurance', status: 'current', expiry: '2030-06-15', size: '0.4 MB', mime: 'image/svg+xml', file: createDocPreview('medicare_mom.svg', 'MEDICARE CARD', 'SURINDER KAUR SINGH', '#003366'), ai: 1, summary: '{"type":"Medicare Card","issuer":"CMS","number":"1EG4-TE5-MK72","confidence":0.96,"fields":[{"key":"Medicare No","value":"1EG4-TE5-MK72","confidence":0.94},{"key":"Part A","value":"Jun 15, 2020","confidence":0.92}]}' },
];

const insertDoc = db.prepare(`
  INSERT INTO documents (id, family_id, owner_id, name, category, file_path, mime_type, file_size, status, expiry_date, ai_analyzed, ai_summary, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);
docs.forEach(d => {
  insertDoc.run(uuidv4(), familyId, d.owner, d.name, d.cat, d.file || null, d.mime || null, d.size || '0.8 MB', d.status, d.expiry, d.ai || 0, d.summary || null, Math.floor(Math.random() * 90));
});

// ─── ASSETS (USD) ──────────────────────────────────────────────────
const assets = [
  { name: 'Brokerage (Schwab)', subtitle: 'Taxable · Stocks + ETFs', category: 'equities', value: 1180400, institution: 'Charles Schwab' },
  { name: 'Real Estate', subtitle: 'Primary Residence · San Jose, CA', category: 'real-estate', value: 890000, institution: 'Self-Owned' },
  { name: '401(k) — Gurmail', subtitle: 'Retirement · Employer match', category: 'equities', value: 642000, institution: 'Fidelity' },
  { name: '401(k) — Lovely', subtitle: 'Retirement', category: 'equities', value: 438800, institution: 'Fidelity' },
  { name: 'Savings (Chase)', subtitle: 'Emergency Fund', category: 'cash', value: 124200, institution: 'Chase Bank' },
  { name: '529 Plans', subtitle: 'Education · Raj & Priya', category: 'fixed-income', value: 70000, institution: 'Vanguard' },
  { name: 'Crypto (Coinbase)', subtitle: 'Digital Assets', category: 'crypto', value: 68800, institution: 'Coinbase' },
];

const insertAsset = db.prepare(`INSERT INTO assets (id, family_id, name, subtitle, category, value, institution, is_seed) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
assets.forEach(a => insertAsset.run(uuidv4(), familyId, a.name, a.subtitle, a.category, a.value, a.institution));

// ─── LIABILITIES (USD) ─────────────────────────────────────────────
const liabilities = [
  { name: 'Mortgage — Chase', subtitle: '30yr fixed · 24 yrs remaining', category: 'mortgage', balance: 485000, rate: 6.5, emi: 3800, institution: 'Chase Bank' },
  { name: 'Auto Loan — Toyota', subtitle: '3 years remaining', category: 'auto', balance: 18400, rate: 5.2, emi: 540, institution: 'Toyota Financial' },
  { name: 'Student Loan — Lovely', subtitle: 'Federal · 5 yrs remaining', category: 'education', balance: 32080, rate: 4.5, emi: 600, institution: 'Dept of Education' },
  { name: 'Credit Card — Amex', subtitle: 'Revolving', category: 'credit-card', balance: 30000, rate: 21.0, emi: 900, institution: 'American Express' },
];

const insertLia = db.prepare(`INSERT INTO liabilities (id, family_id, name, subtitle, category, balance, interest_rate, emi, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
liabilities.forEach(l => insertLia.run(uuidv4(), familyId, l.name, l.subtitle, l.category, l.balance, l.rate, l.emi, l.institution));

// ─── NET WORTH SNAPSHOTS (24 months, USD) ──────────────────────────
const snapshots = [];
for (let i = 23; i >= 0; i--) {
  const baseAssets = 2800000 + (23 - i) * 26000 + Math.floor(Math.random() * 20000);
  const baseLiab = 600000 - (23 - i) * 1500;
  snapshots.push([baseAssets, baseLiab]);
}

const insertSnap = db.prepare(`INSERT INTO net_worth_snapshots (id, family_id, total_assets, total_liabilities, net_worth, snapshot_date) VALUES (?, ?, ?, ?, ?, date('now', '-' || ? || ' months'))`);
snapshots.forEach(([a, l], i) => {
  insertSnap.run(uuidv4(), familyId, a, l, a - l, 23 - i);
});

// ─── ALERTS ─────────────────────────────────────────────────────────
const alerts = [
  { user: gurmail.id, type: 'urgent', icon: '🛂', title: 'Passport expires in 45 days', desc: 'Passport expires in 45 days', sev: 'critical', page: 'documents' },
  { user: gurmail.id, type: 'warning', icon: '🛡', title: 'Insurance review recommended', desc: 'Insurance review recommended', sev: 'warning', page: 'documents' },
  { user: gurmail.id, type: 'info', icon: '📄', title: 'Missing document detected', desc: 'Missing document detected', sev: 'info', page: 'documents' },
  { user: gurmail.id, type: 'info', icon: '📊', title: 'Portfolio rebalance alert', desc: 'Portfolio rebalance alert', sev: 'info', page: 'portfolio' },
  { user: gurmail.id, type: 'success', icon: '📈', title: 'Net worth up $16.7K this month', desc: 'Portfolio at all-time high', page: 'portfolio' },
];

const insertAlert = db.prepare(`INSERT INTO alerts (id, family_id, user_id, type, icon, title, description, link_page) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
alerts.forEach(a => insertAlert.run(uuidv4(), familyId, a.user, a.type, a.icon, a.title, a.desc, a.page || null));

// ─── TASKS ──────────────────────────────────────────────────────────
const tasks = [
  { title: 'Renew passport — Gurmail', due: '2026-02-20', urgent: 1, done: 0, priority: 1 },
  { title: 'Review home insurance renewal', due: '2026-03-01', urgent: 1, done: 0, priority: 2 },
  { title: 'Update living trust beneficiaries', due: '2026-01-15', urgent: 1, done: 0, priority: 3 },
  { title: 'File 2025 tax return', due: '2026-04-15', urgent: 0, done: 0, priority: 4 },
  { title: 'Tax season prep', due: '2026-03-31', urgent: 0, done: 0, priority: 5 },
  { title: 'Upload Raj college acceptance letter', due: '2026-03-31', urgent: 0, done: 0, priority: 6 },
  { title: 'Review 529 plan allocations', due: '2026-02-14', urgent: 0, done: 1, priority: 7 },
  { title: 'Upload vehicle registration', due: '2026-01-31', urgent: 0, done: 1, priority: 8 },
];

const insertTask = db.prepare(`INSERT INTO tasks (id, family_id, assigned_to, title, due_date, is_urgent, is_done, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
tasks.forEach(t => insertTask.run(uuidv4(), familyId, gurmail.id, t.title, t.due, t.urgent, t.done, t.priority));

// ─── AUDIT LOG ──────────────────────────────────────────────────────
const auditEntries = [
  { user: gurmail.id, action: 'document.uploaded', entity: 'documents', meta: '{"name":"W-2 Form 2024"}' },
  { user: gurmail.id, action: 'ai.analysis_complete', entity: 'documents', meta: '{"count":5}' },
  { user: anita.id, action: 'vault.accessed', entity: 'documents', meta: '{"section":"Insurance"}' },
  { user: gurmail.id, action: 'portfolio.viewed', entity: 'assets', meta: '{}' },
];

const insertAudit = db.prepare(`INSERT INTO audit_log (id, family_id, user_id, action, entity_type, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))`);
auditEntries.forEach((e, i) => insertAudit.run(uuidv4(), familyId, e.user, e.action, e.entity, e.meta, i * 2 + 1));

// ─── SUMMARY ────────────────────────────────────────────────────────
console.log('✅ Seed complete!\n');
console.log('📌 Login credentials:');
console.log('   Email:    gurmail@linio.ai');
console.log('   Password: password123\n');
console.log('📊 Seeded:');
console.log(`   • 1 family (Singh Family), ${users.length} users`);
console.log(`   • ${docs.length} documents`);
console.log(`   • ${assets.length} assets, ${liabilities.length} liabilities`);
console.log(`   • ${snapshots.length} net worth snapshots`);
console.log(`   • ${alerts.length} alerts, ${tasks.length} tasks`);
console.log('   • Currency: USD ($)');
console.log('   • Locale: en-US\n');
console.log('🚀 Run: npm run dev\n');
