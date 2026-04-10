const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'familyos.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run schema on first connect
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
    // Migrate: add avatar_url column if missing
    const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
    if (!cols.includes('avatar_url')) {
      db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT NULL");
    }

    console.log('✅ Database connected:', DB_PATH);
  }
  return db;
}

module.exports = { getDb };
