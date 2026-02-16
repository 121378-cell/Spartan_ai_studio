const fs = require('fs');
const path = require('path');
let sqlite3;
let open;

try {
  sqlite3 = require('sqlite3').verbose();
  open = require('sqlite').open;
} catch (e) {
  try {
    const backendPath = path.join(__dirname, '../backend/node_modules');
    sqlite3 = require(path.join(backendPath, 'sqlite3')).verbose();
    open = require(path.join(backendPath, 'sqlite')).open;
  } catch (e2) {
    console.error('❌ Could not find sqlite3/sqlite modules. Please run npm install in backend directory.');
    process.exit(1);
  }
}

// Config
const DB_PATH = path.join(__dirname, '../backend/data/spartan.db');

async function diagnose() {
  console.log('🔍 Starting Database Diagnosis...');
  console.log(`📂 Database Path: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found!');
    process.exit(1);
  }

  // Check permissions
  try {
    fs.accessSync(DB_PATH, fs.constants.R_OK | fs.constants.W_OK);
    console.log('✅ Database file is readable and writable');
  } catch (err) {
    console.error('❌ Database file permission error:', err.message);
  }

  let db;
  try {
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    console.log('✅ Connected to database');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }

  // 1. Integrity Check
  try {
    const integrity = await db.get('PRAGMA integrity_check');
    console.log('🛡️ Integrity Check:', integrity.integrity_check === 'ok' ? '✅ OK' : `❌ FAILED: ${integrity.integrity_check}`);
  } catch (err) {
    console.error('❌ Integrity check failed:', err);
  }

  // 2. Check for Duplicate Users (Email)
  try {
    console.log('👥 Checking for duplicate users...');
    const duplicates = await db.all(`
      SELECT email, COUNT(*) as count 
      FROM users 
      GROUP BY email 
      HAVING count > 1
    `);

    if (duplicates.length > 0) {
      console.error(`❌ Found ${duplicates.length} duplicate emails!`);
      duplicates.forEach(d => console.log(`   - ${d.email}: ${d.count} copies`));
      
      // Optional: Clean up duplicates?
      // For now, just report.
    } else {
      console.log('✅ No duplicate users found');
    }
  } catch (err) {
    console.error('❌ Error checking duplicates:', err);
  }

  // 3. Schema Validation (Basic)
  try {
    console.log('📋 Validating Users table schema...');
    const columns = await db.all('PRAGMA table_info(users)');
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

  await db.close();
  console.log('🏁 Diagnosis completed.');
}

diagnose();
