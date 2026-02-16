const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

// Config
const DB_PATH = path.join(__dirname, '../data/spartan.db');

function cleanupDuplicates() {
  console.log('🧹 Starting Duplicate User Cleanup...');
  console.log(`📂 Database Path: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Database file not found!');
    process.exit(1);
  }

  let db;
  try {
    db = new Database(DB_PATH);
    console.log('✅ Connected to database');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  }

  // 1. Find Duplicates
  try {
    console.log('🔍 Checking for duplicate users...');
    const duplicates = db.prepare(`
      SELECT email, COUNT(*) as count 
      FROM users 
      GROUP BY email 
      HAVING count > 1
    `).all();

    if (duplicates.length === 0) {
      console.log('✅ No duplicate users found. Database is clean.');
      db.close();
      return;
    }

    console.log(`⚠️ Found ${duplicates.length} emails with duplicates:`);
    
    // 2. Process Duplicates
    let totalRemoved = 0;
    
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');

    for (const dup of duplicates) {
      console.log(`   Processing ${dup.email} (${dup.count} copies)...`);
      
      // Get all users with this email, ordered by creation date (keep oldest or newest? usually keep newest if active, or oldest if original)
      // Let's keep the one with the most recent login or update, or just the latest created one.
      // Actually, standard practice: keep the most recently updated one, or manually decide.
      // Let's keep the most recently updated one.
      const users = db.prepare('SELECT id, email, createdAt, updatedAt FROM users WHERE email = ? ORDER BY updatedAt DESC').all(dup.email);
      
      const [keep, ...remove] = users;
      console.log(`     ✅ Keeping user ID: ${keep.id} (Updated: ${keep.updatedAt})`);
      
      for (const userToRemove of remove) {
        console.log(`     🗑️ Removing duplicate ID: ${userToRemove.id} (Updated: ${userToRemove.updatedAt})`);
        deleteStmt.run(userToRemove.id);
        totalRemoved++;
      }
    }
    
    console.log(`✨ Cleanup complete. Removed ${totalRemoved} duplicate user records.`);

  } catch (err) {
    console.error('❌ Error during cleanup:', err);
  } finally {
    db.close();
    console.log('🏁 Database connection closed.');
  }
}

cleanupDuplicates();
