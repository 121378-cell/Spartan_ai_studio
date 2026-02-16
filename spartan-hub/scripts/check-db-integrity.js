const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Path to the database
const DB_PATH = path.join(__dirname, '../backend/data/spartan.db');

console.log(`Checking database integrity at: ${DB_PATH}`);

if (!fs.existsSync(DB_PATH)) {
  console.error('Database file not found!');
  process.exit(1);
}

const db = new Database(DB_PATH);

try {
  // 1. Integrity Check
  console.log('\n--- 1. Running Integrity Check ---');
  const integrity = db.prepare('PRAGMA integrity_check').get();
  console.log(`Integrity Check Result: ${integrity.integrity_check}`);

  if (integrity.integrity_check !== 'ok') {
    console.error('DATABASE INTEGRITY COMPROMISED! Stopping script.');
    process.exit(1);
  }

  // 2. Check for Duplicates
  console.log('\n--- 2. Checking for Duplicate Users ---');
  const duplicates = db.prepare(`
    SELECT email, COUNT(*) as count 
    FROM users 
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email 
    HAVING count > 1
  `).all();

  if (duplicates.length === 0) {
    console.log('No duplicate users found.');
  } else {
    console.log(`Found ${duplicates.length} emails with duplicate records.`);
    
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');

    for (const dup of duplicates) {
      console.log(`Processing duplicates for email: ${dup.email} (Count: ${dup.count})`);
      
      // Get all records for this email, newest first
      // Assuming 'updatedAt' or 'createdAt' exists. If not, use 'rowid' or 'id'.
      // Based on schema, 'updatedAt' exists.
      const records = db.prepare(`
        SELECT id, name, email, updatedAt 
        FROM users 
        WHERE email = ? 
        ORDER BY updatedAt DESC
      `).all(dup.email);

      // Keep the first one (newest), delete the rest
      const [toKeep, ...toDelete] = records;
      
      console.log(`  Keeping user: ${toKeep.name} (ID: ${toKeep.id}, Updated: ${toKeep.updatedAt})`);
      
      for (const record of toDelete) {
        console.log(`  Deleting duplicate: ${record.name} (ID: ${record.id}, Updated: ${record.updatedAt})`);
        deleteStmt.run(record.id);
      }
    }
    console.log('Duplicate cleanup completed.');
  }

  // 3. Schema Validation (Quick check for required fields)
  console.log('\n--- 3. Verifying User Schema Constraints ---');
  // Check if we can enable strict mode or just verify the schema
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const emailCol = tableInfo.find(c => c.name === 'email');
  
  if (emailCol) {
    console.log('Email column exists.');
    // We can't easily check for UNIQUE constraint via PRAGMA table_info in standard SQLite easily 
    // without parsing SQL, but we can check index list
    const indices = db.prepare("PRAGMA index_list(users)").all();
    const emailIndex = indices.find(i => i.name.includes('email') && i.unique === 1);
    
    if (emailIndex) {
      console.log(`Unique index on email verified: ${emailIndex.name}`);
    } else {
      console.warn('WARNING: No unique index found on email column! Creating one...');
      try {
        db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)").run();
        console.log('Unique index created successfully.');
      } catch (err) {
        console.error('Error creating unique index (might still have duplicates?):', err.message);
      }
    }
  } else {
    console.error('CRITICAL: Email column missing from users table!');
  }

  console.log('\n--- Database Check Completed Successfully ---');

} catch (error) {
  console.error('Error during database check:', error);
  process.exit(1);
} finally {
  db.close();
}
