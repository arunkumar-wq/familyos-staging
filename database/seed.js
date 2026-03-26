/**
 * FamilyOS — Database Seed
 * Run: node database/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

const db = getDb();

console.log('🌱 Seeding FamilyOS database...\n');

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
db.prepare(`INSERT INTO families (id, name, plan) VALUES (?, ?, ?)`).run(familyId, 'Kumar Family', 'pro');

// ─── USERS ──────────────────────────────────────────────────────────
const passwordHash = bcrypt.hashSync('password123', 10);

const users = [
  { id: uuidv4(), first: 'Arun', last: 'Kumar', email: 'arun@familyos.ai', phone: '+91 98765 43210', role: 'admin', relation: 'self', dob: '1983-04-14', color: '#0f1f3d' },
  { id: uuidv4(), first: 'Sunita', last: 'Kumar', email: 'sunita@gmail.com', phone: '+91 98765 43211', role: 'co-admin', relation: 'spouse', dob: '1986-08-22', color: '#07b98a' },
  { id: uuidv4(), first: 'Arjun', last: 'Kumar', email: 'arjun@gmail.com', phone: '+91 98765 43212', role: 'member', relation: 'son', dob: '2008-03-10', color: '#f59e0b' },
  { id: uuidv4(), first: 'Maya', last: 'Kumar', email: 'maya@gmail.com', phone: '+91 98765 43213', role: 'member', relation: 'daughter', dob: '2013-11-05', color: '#f43f5e' },
];

const insertUser = db.prepare(`
  INSERT INTO users (id, family_id, first_name, last_name, email, phone, password_hash, role, relation, date_of_birth, avatar_color)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertPerm = db.prepare(`
  INSERT INTO permissions (id, user_id, vault, portfolio, insights, family_mgmt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const permMap = {
  admin:     { vault: 'full', portfolio: 'full', insights: 'full', family_mgmt: 'admin' },
  'co-admin':{ vault: 'full', portfolio: 'view', insights: 'full', family_mgmt: 'co-admin' },
  member:    { vault: 'own',  portfolio: 'none', insights: 'none', family_mgmt: 'none' },
};

users.forEach(u => {
  insertUser.run(u.id, familyId, u.first, u.last, u.email, u.phone, passwordHash, u.role, u.relation, u.dob, u.color);
  const p = permMap[u.role] || permMap.member;
  insertPerm.run(uuidv4(), u.id, p.vault, p.portfolio, p.insights, p.family_mgmt);
});

const [arun, sunita, arjun, maya] = users;

// ─── DOCUMENTS ──────────────────────────────────────────────────────
const docs = [
  // Arun
  { owner: arun.id, name: 'Aadhaar Card — Arun Kumar', cat: 'identity', status: 'current', size: '0.8 MB', ai: 1, summary: '{"type":"National ID","issuer":"UIDAI","number":"XXXX XXXX 4321","valid":"Lifetime"}' },
  { owner: arun.id, name: 'PAN Card — Arun Kumar', cat: 'identity', status: 'current', size: '0.4 MB', ai: 1, summary: '{"type":"Tax ID","issuer":"Income Tax Dept","number":"ABCPK1234D","valid":"Lifetime"}' },
  { owner: arun.id, name: 'Passport — Arun Kumar', cat: 'identity', status: 'expiring', expiry: '2025-06-14', size: '1.1 MB', ai: 1, summary: '{"type":"Passport","issuer":"MEA India","number":"P1234567","expiry":"14 Jun 2025","alert":"Renewal needed — 6-8 weeks processing"}' },
  { owner: arun.id, name: 'ITR — FY 2023-24', cat: 'tax', status: 'current', size: '2.3 MB', ai: 1, summary: '{"type":"Income Tax Return","year":"FY 2023-24","filed":"31 Jul 2024","refund":"₹42,800","status":"Verified"}' },
  { owner: arun.id, name: 'Home Loan Agreement — HDFC', cat: 'property', status: 'current', size: '4.1 MB', ai: 1, summary: '{"type":"Loan Agreement","lender":"HDFC Bank","amount":"₹65L","rate":"8.5%","tenure":"20yr","emi":"₹56,400"}' },
  { owner: arun.id, name: 'Property Registration Deed', cat: 'property', status: 'current', size: '3.8 MB', ai: 1, summary: '{"type":"Sale Deed","property":"H-42, Sector 62, Noida","area":"1850 sqft","value":"₹1.2Cr","registered":"2018-11-12"}' },
  { owner: arun.id, name: 'Car Insurance — Hyundai Creta', cat: 'insurance', status: 'expiring', expiry: '2025-04-01', size: '0.9 MB', ai: 1, summary: '{"type":"Motor Insurance","vehicle":"Hyundai Creta 2022","insurer":"HDFC Ergo","expiry":"1 Apr 2025","premium":"₹20,800/yr"}' },
  { owner: arun.id, name: 'Health Insurance Policy', cat: 'insurance', status: 'current', expiry: '2026-01-15', size: '1.5 MB', ai: 1, summary: '{"type":"Health Insurance","insurer":"Star Health","sum":"₹25L","members":4,"premium":"₹42,000/yr","expiry":"15 Jan 2026"}' },
  { owner: arun.id, name: 'Will & Testament', cat: 'legal', status: 'review', size: '2.1 MB', ai: 1, summary: '{"type":"Will","notarized":"2021-01-15","lawyer":"Sharma & Associates","note":"Update recommended — property acquired post-will"}' },
  { owner: arun.id, name: 'SBI Fixed Deposit Receipt', cat: 'finance', status: 'current', expiry: '2026-03-20', size: '0.5 MB', ai: 1, summary: '{"type":"FD Receipt","bank":"SBI","amount":"₹10L","rate":"6.8%","maturity":"20 Mar 2026","maturityValue":"₹11,43,880"}' },
  { owner: arun.id, name: 'Driving Licence', cat: 'identity', status: 'current', expiry: '2029-04-13', size: '0.7 MB', ai: 1, summary: '{"type":"Driving Licence","number":"UP14 20150049876","valid":"Until 2029","classes":"LMV, MCWG"}' },
  // Sunita
  { owner: sunita.id, name: 'Aadhaar Card — Sunita Kumar', cat: 'identity', status: 'current', size: '0.8 MB', ai: 1 },
  { owner: sunita.id, name: 'PAN Card — Sunita Kumar', cat: 'identity', status: 'current', size: '0.4 MB', ai: 1 },
  { owner: sunita.id, name: 'Passport — Sunita Kumar', cat: 'identity', status: 'current', expiry: '2028-08-22', size: '1.1 MB', ai: 1 },
  { owner: sunita.id, name: 'ITR FY 2023-24 — Sunita', cat: 'tax', status: 'current', size: '1.8 MB', ai: 1 },
  { owner: sunita.id, name: 'Teaching Certificate', cat: 'education', status: 'current', size: '1.2 MB', ai: 1 },
  // Arjun
  { owner: arjun.id, name: 'Aadhaar Card — Arjun Kumar', cat: 'identity', status: 'current', size: '0.7 MB', ai: 1 },
  { owner: arjun.id, name: 'Birth Certificate — Arjun', cat: 'legal', status: 'current', size: '0.6 MB', ai: 1 },
  { owner: arjun.id, name: 'Class 10 Marksheet', cat: 'education', status: 'current', size: '0.8 MB', ai: 1 },
  // Maya
  { owner: maya.id, name: 'Aadhaar Card — Maya Kumar', cat: 'identity', status: 'current', size: '0.6 MB', ai: 1 },
  { owner: maya.id, name: 'Birth Certificate — Maya', cat: 'legal', status: 'current', size: '0.6 MB', ai: 1 },
  { owner: maya.id, name: 'Vaccination Record — Maya', cat: 'medical', status: 'current', size: '1.2 MB', ai: 1 },
  { owner: maya.id, name: 'School Report Card 2024', cat: 'education', status: 'current', size: '0.9 MB', ai: 1 },
];

const insertDoc = db.prepare(`
  INSERT INTO documents (id, family_id, owner_id, name, category, file_size, status, expiry_date, ai_analyzed, ai_summary, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);

docs.forEach((d, i) => {
  insertDoc.run(uuidv4(), familyId, d.owner, d.name, d.cat, d.size || '0.8 MB', d.status, d.expiry || null, d.ai || 0, d.summary || null, Math.floor(Math.random() * 90));
});

// ─── ASSETS ─────────────────────────────────────────────────────────
const assets = [
  { name: 'Primary Home — Sector 62', subtitle: 'Noida, UP · 1850 sqft', category: 'real-estate', value: 12500000, institution: 'Self-Owned' },
  { name: 'Equity Portfolio — Zerodha', subtitle: 'Stocks + Mutual Funds', category: 'equities', value: 5892000, institution: 'Zerodha' },
  { name: 'Fixed Deposits — SBI', subtitle: '3 FDs · Maturity 2025-26', category: 'fixed-income', value: 3310000, institution: 'SBI' },
  { name: 'Savings & Current Accounts', subtitle: 'HDFC + ICICI', category: 'cash', value: 1472000, institution: 'HDFC / ICICI' },
  { name: 'Gold Holdings', subtitle: 'Physical + Digital Gold', category: 'gold', value: 890000, institution: 'Mixed' },
  { name: 'PPF Account', subtitle: 'SBI PPF · 15yr tenure', category: 'fixed-income', value: 680000, institution: 'SBI' },
];

const insertAsset = db.prepare(`INSERT INTO assets (id, family_id, name, subtitle, category, value, institution) VALUES (?, ?, ?, ?, ?, ?, ?)`);
assets.forEach(a => insertAsset.run(uuidv4(), familyId, a.name, a.subtitle, a.category, a.value, a.institution));

// ─── LIABILITIES ────────────────────────────────────────────────────
const liabilities = [
  { name: 'Home Loan — HDFC', subtitle: '20yr fixed · 14 yrs remaining', category: 'mortgage', balance: 4200000, rate: 8.5, emi: 56400, institution: 'HDFC Bank' },
  { name: 'Car Loan — Hyundai Creta', subtitle: '2 years remaining', category: 'auto', balance: 184000, rate: 9.0, emi: 8200, institution: 'HDFC Auto' },
];

const insertLia = db.prepare(`INSERT INTO liabilities (id, family_id, name, subtitle, category, balance, interest_rate, emi, institution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
liabilities.forEach(l => insertLia.run(uuidv4(), familyId, l.name, l.subtitle, l.category, l.balance, l.rate, l.emi, l.institution));

// ─── NET WORTH SNAPSHOTS (12 months history) ────────────────────────
const snapshots = [
  [15800000, 4600000], [16100000, 4550000], [16350000, 4510000], [16580000, 4480000],
  [16420000, 4460000], [16860000, 4440000], [17120000, 4410000], [17380000, 4395000],
  [17620000, 4390000], [17950000, 4384000], [18210000, 4384000], [18744000, 4384000]
];

const insertSnap = db.prepare(`INSERT INTO net_worth_snapshots (id, family_id, total_assets, total_liabilities, net_worth, snapshot_date) VALUES (?, ?, ?, ?, ?, date('now', '-' || ? || ' months'))`);
snapshots.forEach(([a, l], i) => {
  insertSnap.run(uuidv4(), familyId, a, l, a - l, 11 - i);
});

// ─── ALERTS ─────────────────────────────────────────────────────────
const alerts = [
  { user: arun.id, type: 'urgent', icon: '🛂', title: 'Passport expiring in 47 days', desc: 'Arun Kumar · Renewal takes 6–8 weeks. Apply immediately.' },
  { user: arun.id, type: 'urgent', icon: '🏛', title: 'Property tax due in 12 days', desc: '₹42,800 due · March 1, 2025. Late fee 1.5%/month.' },
  { user: arun.id, type: 'warning', icon: '🚗', title: 'Car insurance renewal in 30 days', desc: 'Hyundai Creta · HDFC Ergo · Due Apr 1, 2025.' },
  { user: arun.id, type: 'info', icon: '✨', title: 'AI filed 3 documents automatically', desc: 'ITR, FD receipt, and insurance renewal auto-categorised.' },
  { user: arun.id, type: 'success', icon: '📈', title: 'Portfolio up ₹52,400 this month', desc: 'Equity portfolio leading gains. Net worth at all-time high.' },
];

const insertAlert = db.prepare(`INSERT INTO alerts (id, family_id, user_id, type, icon, title, description) VALUES (?, ?, ?, ?, ?, ?, ?)`);
alerts.forEach(a => insertAlert.run(uuidv4(), familyId, a.user, a.type, a.icon, a.title, a.desc));

// ─── TASKS ──────────────────────────────────────────────────────────
const tasks = [
  { title: 'Renew passport — Arun', due: '2025-02-20', urgent: 1, done: 0, priority: 1 },
  { title: 'Pay property tax ₹42,800', due: '2025-03-01', urgent: 1, done: 0, priority: 2 },
  { title: 'Update will beneficiaries', due: '2025-01-15', urgent: 1, done: 0, priority: 3 },
  { title: 'Upload FY 2024-25 advance tax receipt', due: '2025-02-28', urgent: 0, done: 0, priority: 4 },
  { title: "Add Arjun's Class 12 marksheet", due: '2025-03-31', urgent: 0, done: 0, priority: 5 },
  { title: 'Share portfolio summary with CA', due: '2025-02-14', urgent: 0, done: 1, priority: 6 },
  { title: 'Upload vehicle RC document', due: '2025-01-31', urgent: 0, done: 1, priority: 7 },
];

const insertTask = db.prepare(`INSERT INTO tasks (id, family_id, assigned_to, title, due_date, is_urgent, is_done, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
tasks.forEach(t => insertTask.run(uuidv4(), familyId, arun.id, t.title, t.due, t.urgent, t.done, t.priority));

// ─── AUDIT LOG ──────────────────────────────────────────────────────
const auditEntries = [
  { user: arun.id, action: 'document.uploaded', entity: 'documents', meta: '{"name":"ITR FY2023-24"}' },
  { user: arun.id, action: 'ai.analysis_complete', entity: 'documents', meta: '{"count":3}' },
  { user: sunita.id, action: 'vault.accessed', entity: 'documents', meta: '{"section":"Insurance"}' },
  { user: arun.id, action: 'portfolio.viewed', entity: 'assets', meta: '{}' },
];

const insertAudit = db.prepare(`INSERT INTO audit_log (id, family_id, user_id, action, entity_type, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' hours'))`);
auditEntries.forEach((e, i) => insertAudit.run(uuidv4(), familyId, e.user, e.action, e.entity, e.meta, i * 2 + 1));

// ─── SUMMARY ────────────────────────────────────────────────────────
console.log('✅ Seed complete!\n');
console.log('📌 Login credentials:');
console.log('   Email:    arun@familyos.ai');
console.log('   Password: password123\n');
console.log('📊 Seeded:');
console.log(`   • 1 family, ${users.length} users`);
console.log(`   • ${docs.length} documents`);
console.log(`   • ${assets.length} assets, ${liabilities.length} liabilities`);
console.log(`   • ${snapshots.length} net worth snapshots`);
console.log(`   • ${alerts.length} alerts, ${tasks.length} tasks`);
console.log('\n🚀 Run: npm run dev\n');
