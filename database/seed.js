/**
 * LINIO — Database Seed (US Locale)
 * Run: node database/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

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
  // Gurmail
  { owner: gurmail.id, name: "Singh Family's Passport", cat: 'identity', status: 'expiring', expiry: '2026-03-28', size: '1.1 MB', ai: 1, summary: '{"type":"US Passport","issuer":"US Dept of State","number":"US #987654321","expiry":"Mar 28, 2026","confidence":0.98}' },
  { owner: gurmail.id, name: "Singh Family's Driver License", cat: 'identity', status: 'valid', expiry: '2028-08-22', size: '0.4 MB', ai: 1, summary: '{"type":"Driver License","issuer":"CA DMV","number":"CA DL #D1234567","expiry":"Aug 22, 2028","confidence":0.95}' },
  { owner: gurmail.id, name: "Singh Family's Social Security", cat: 'identity', status: 'valid', size: '0.3 MB', ai: 1, summary: '{"type":"Social Security Card","issuer":"SSA","number":"SSN (redacted)","confidence":0.88}' },
  { owner: gurmail.id, name: 'W-2 Form — 2024', cat: 'finance', status: 'current', size: '0.8 MB', ai: 1, summary: '{"type":"W-2 Wage Statement","issuer":"Employer","year":"2024","confidence":0.96}' },
  { owner: gurmail.id, name: '1099 Forms — 2024', cat: 'finance', status: 'current', size: '1.2 MB', ai: 1, summary: '{"type":"1099 Misc Income","issuer":"IRS","year":"2024","confidence":0.94}' },
  { owner: gurmail.id, name: 'Mortgage Agreement — Chase', cat: 'property', status: 'current', size: '4.1 MB', ai: 1, summary: '{"type":"Mortgage Agreement","lender":"Chase Bank","amount":"$650K","rate":"6.5%","term":"30yr"}' },
  { owner: gurmail.id, name: 'Property Deed — Primary Home', cat: 'property', status: 'current', size: '3.8 MB', ai: 1, summary: '{"type":"Property Deed","property":"123 Oak Lane, San Jose, CA","sqft":"2,200","value":"$890,000"}' },
  { owner: gurmail.id, name: 'Auto Insurance — State Farm', cat: 'insurance', status: 'expiring', expiry: '2026-04-01', size: '0.9 MB', ai: 1, summary: '{"type":"Auto Insurance","vehicle":"Toyota Camry 2023","insurer":"State Farm","premium":"$1,800/yr","confidence":0.94}' },
  { owner: gurmail.id, name: 'Health Insurance — Blue Cross', cat: 'insurance', status: 'current', expiry: '2026-12-31', size: '1.5 MB', ai: 1, summary: '{"type":"Health Insurance","insurer":"Blue Cross","plan":"PPO Family","premium":"$18,000/yr","confidence":0.96}' },
  { owner: gurmail.id, name: 'Living Trust Document', cat: 'legal', status: 'review', size: '2.1 MB', ai: 1, summary: '{"type":"Living Trust","attorney":"Smith & Associates","date":"2021-01-15","note":"Update recommended"}' },
  { owner: gurmail.id, name: 'Life Insurance — Northwestern', cat: 'insurance', status: 'current', expiry: '2035-06-14', size: '1.8 MB', ai: 1, summary: '{"type":"Life Insurance","insurer":"Northwestern Mutual","coverage":"$1M","premium":"$2,400/yr","confidence":0.97}' },
  { owner: gurmail.id, name: 'Schwab Brokerage Statement', cat: 'finance', status: 'current', size: '2.3 MB', ai: 1, summary: '{"type":"Brokerage Statement","institution":"Charles Schwab","value":"$1,180,400","confidence":0.95}' },
  // Lovely
  { owner: anita.id, name: "Singh Family's Passport", cat: 'identity', status: 'expiring', expiry: '2026-03-28', size: '1.1 MB', ai: 1, summary: '{"type":"US Passport","issuer":"US Dept of State","number":"US #987654321","expiry":"Mar 28, 2026","confidence":0.98}' },
  { owner: anita.id, name: 'Teaching Certificate', cat: 'education', status: 'current', size: '1.2 MB', ai: 1, summary: '{"type":"Teaching Certificate","issuer":"CA Board of Education","confidence":0.92}' },
  { owner: anita.id, name: "401(k) Statement — Lovely", cat: 'finance', status: 'current', size: '1.0 MB', ai: 1, summary: '{"type":"401k Statement","institution":"Fidelity","value":"$438,800","confidence":0.94}' },
  // Raj & Priya
  { owner: raj.id, name: 'Birth Certificates', cat: 'legal', status: 'valid', expiry: '2028-08-22', size: '0.6 MB', ai: 1, summary: '{"type":"Birth Certificate","issuer":"County Clerk","number":"US #987654367","confidence":0.95}' },
  { owner: raj.id, name: 'School Records — Raj', cat: 'education', status: 'current', size: '0.8 MB', ai: 1 },
  { owner: priya.id, name: 'Birth Certificate — Priya', cat: 'legal', status: 'current', size: '0.6 MB', ai: 1 },
  { owner: priya.id, name: 'Vaccination Record', cat: 'medical', status: 'current', size: '1.2 MB', ai: 1 },
  { owner: priya.id, name: 'School Report Card 2024', cat: 'education', status: 'current', size: '0.9 MB', ai: 1 },
  // Mom
  { owner: mom.id, name: 'Medicare Card', cat: 'insurance', status: 'current', size: '0.4 MB', ai: 1, summary: '{"type":"Medicare Card","issuer":"CMS","confidence":0.96}' },
  // Family/Shared
  { owner: gurmail.id, name: 'Marriage Certificate', cat: 'legal', status: 'valid', expiry: '2026-03-28', size: '0.5 MB', ai: 1, summary: '{"type":"Marriage Certificate","issuer":"County Clerk","confidence":0.97}' },
  { owner: gurmail.id, name: 'Home Insurance — Allstate', cat: 'insurance', status: 'current', expiry: '2026-09-15', size: '1.3 MB', ai: 1, summary: '{"type":"Homeowners Insurance","insurer":"Allstate","coverage":"$890K","premium":"$3,200/yr","confidence":0.95}' },
];

const insertDoc = db.prepare(`
  INSERT INTO documents (id, family_id, owner_id, name, category, file_size, status, expiry_date, ai_analyzed, ai_summary, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'))
`);
docs.forEach((d, i) => {
  insertDoc.run(uuidv4(), familyId, d.owner, d.name, d.cat, d.size || '0.8 MB', d.status, d.expiry || null, d.ai || 0, d.summary || null, Math.floor(Math.random() * 90));
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

const insertAsset = db.prepare(`INSERT INTO assets (id, family_id, name, subtitle, category, value, institution) VALUES (?, ?, ?, ?, ?, ?, ?)`);
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
