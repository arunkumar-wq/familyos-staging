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

    // Migrate: add is_seed column to assets if missing, and mark existing rows as seeded
    const assetCols = db.prepare("PRAGMA table_info(assets)").all().map(c => c.name);
    if (!assetCols.includes('is_seed')) {
      db.exec("ALTER TABLE assets ADD COLUMN is_seed INTEGER DEFAULT 0");
      db.exec("UPDATE assets SET is_seed = 1 WHERE is_seed IS NULL OR is_seed = 0");
    }

    console.log('✅ Database connected:', DB_PATH);
  }
  return db;
}

module.exports = { getDb };
