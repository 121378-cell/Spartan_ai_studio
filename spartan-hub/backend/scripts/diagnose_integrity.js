const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// Config
const DB_PATH = path.join(__dirname, '../data/spartan.db');

function diagnose() {
  console.log('🔍 Starting Database Diagnosis (Internal - Better-SQLite3)...');
  console.log(`📂 Database Path: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found!');
    process.exit(1);
  }

  let db;
  try {
    db = new Database(DB_PATH, { readonly: true });
    console.log('✅ Connected to database');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }

  // 1. Integrity Check
  try {
    const integrity = db.pragma('integrity_check', { simple: true });
    console.log('🛡️ Integrity Check:', integrity === 'ok' ? '✅ OK' : `❌ FAILED: ${integrity}`);
  } catch (err) {
    console.error('❌ Integrity check failed:', err);
  }

  // 2. Check for Duplicate Users (Email)
  try {
    console.log('👥 Checking for duplicate users...');
    const duplicates = db.prepare(`
      SELECT email, COUNT(*) as count 
      FROM users 
      GROUP BY email 
      HAVING count > 1
    `).all();

    if (duplicates.length > 0) {
      console.error(`❌ Found ${duplicates.length} duplicate emails!`);
      duplicates.forEach(d => console.log(`   - ${d.email}: ${d.count} copies`));
    } else {
      console.log('✅ No duplicate users found');
    }
  } catch (err) {
    console.error('❌ Error checking duplicates:', err);
  }

  // 3. Schema Validation
  try {
    console.log('📋 Validating Users table schema...');
    const columns = db.pragma('table_info(users)');
    const columnNames = columns.map(c => c.name);
    
    const requiredColumns = ['id', 'email', 'password', 'name', 'role'];
    const missing = requiredColumns.filter(c => !columnNames.includes(c));
    
    if (missing.length > 0) {
      console.error('❌ Missing critical columns:', missing);
    } else {
      console.log('✅ Critical columns present:', columnNames.join(', '));
    }
  } catch (err) {
    console.error('❌ Error validating schema:', err);
  }

  db.close();
  console.log('🏁 Diagnosis completed.');
}

diagnose();
