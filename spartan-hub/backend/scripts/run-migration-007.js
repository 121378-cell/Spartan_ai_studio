const Database = require('better-sqlite3');

const db = new Database('data/spartan_hub.db');

console.log('Ejecutando migración 007: Crear tabla form_analyses...\n');

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS form_analyses (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    exerciseType TEXT NOT NULL,
    formScore INTEGER NOT NULL,
    metrics TEXT NOT NULL,
    warnings TEXT NOT NULL,
    recommendations TEXT NOT NULL,
    createdAt INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create indexes
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_form_analysis_user_created 
  ON form_analyses(userId, createdAt DESC)
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_form_analysis_type 
  ON form_analyses(userId, exerciseType)
`);

console.log('✅ Migración 007 completada\n');

// Verify table exists
const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='form_analyses'").get();
console.log('form_analyses table exists:', result ? 'YES ✅' : 'NO ❌');

// Show columns
const columns = db.prepare('PRAGMA table_info(form_analyses)').all();
console.log('\nColumnas:');
columns.forEach(col => console.log(`  - ${col.name}: ${col.type}`));

// Show indexes
const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='form_analyses'").all();
console.log('\nÍndices:');
indexes.forEach(idx => console.log(`  - ${idx.name}`));

db.close();

console.log('\n✅ Database schema ready for Phase A Backend!\n');
