const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration
const DB_PATH = path.join(__dirname, '../backend/data/spartan.db');

// Expected schema definition (derived from User.ts and sqliteDatabaseService.ts)
const EXPECTED_SCHEMA = {
  id: 'TEXT',
  name: 'TEXT',
  email: 'TEXT',
  password: 'TEXT',
  role: 'TEXT',
  quest: 'TEXT',
  stats: 'TEXT', // JSON
  onboardingCompleted: 'INTEGER',
  keystoneHabits: 'TEXT', // JSON
  masterRegulationSettings: 'TEXT', // JSON
  nutritionSettings: 'TEXT', // JSON
  isInAutonomyPhase: 'INTEGER',
  weightKg: 'REAL',
  trainingCycle: 'TEXT', // JSON
  lastWeeklyPlanDate: 'TEXT',
  detailedProfile: 'TEXT', // JSON
  preferences: 'TEXT', // JSON
  createdAt: 'TEXT',
  updatedAt: 'TEXT'
};

function fixDatabase() {
  console.log(`[FIX] Diagnosing and fixing database at: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`[ERROR] Database file not found at ${DB_PATH}`);
    process.exit(1);
  }

  let db;
  try {
    db = new Database(DB_PATH); // No verbose logging to keep output clean
  } catch (error) {
    console.error(`[ERROR] Failed to open database: ${error.message}`);
    process.exit(1);
  }

  try {
    // 1. Check and Fix Schema
    console.log('[FIX] Checking schema for table: users');
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const existingColumns = new Set(tableInfo.map(col => col.name));
    
    console.log(`[INFO] Current columns: ${Array.from(existingColumns).join(', ')}`);

    const missingColumns = Object.keys(EXPECTED_SCHEMA).filter(col => !existingColumns.has(col));

    if (missingColumns.length === 0) {
      console.log('[OK] No missing columns found.');
    } else {
      console.log(`[WARN] Missing columns: ${missingColumns.join(', ')}`);
      
      db.transaction(() => {
        for (const col of missingColumns) {
          const type = EXPECTED_SCHEMA[col];
          console.log(`[FIX] Adding missing column: ${col} (${type})`);
          try {
            db.prepare(`ALTER TABLE users ADD COLUMN ${col} ${type}`).run();
            console.log(`[SUCCESS] Added column ${col}`);
          } catch (err) {
            console.error(`[ERROR] Failed to add column ${col}: ${err.message}`);
          }
        }
      })();
    }

    // 2. Identify and Remove Duplicate Users (by Name)
    // Since we didn't have email before, we likely have duplicates by name or just garbage data.
    console.log('[FIX] Checking for duplicate users by name...');
    
    const duplicates = db.prepare(`
      SELECT name, COUNT(*) as count 
      FROM users 
      GROUP BY name 
      HAVING count > 1
    `).all();

    if (duplicates.length > 0) {
      console.log(`[WARN] Found ${duplicates.length} sets of duplicate users by name.`);
      
      const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
      let deletedCount = 0;

      db.transaction(() => {
        for (const dup of duplicates) {
          console.log(`[FIX] resolving duplicates for user: ${dup.name}`);
          // Get all records for this name, ordered by updatedAt desc (keep newest)
          // If updatedAt is missing (which we just added maybe), fallback to rowid or just keep one.
          // Note: We just added columns, so if updatedAt was missing, it's NULL now.
          
          const users = db.prepare('SELECT id, name, updatedAt, createdAt FROM users WHERE name = ?').all(dup.name);
          
          // Sort strategy: Prefer non-null updatedAt, then non-null createdAt, then newer.
          // Since we might have just added these columns, they might be all null.
          // In that case, we keep the first one and delete others.
          
          // Basic sort: if dates are present, use them.
          users.sort((a, b) => {
             const dateA = a.updatedAt || a.createdAt || '';
             const dateB = b.updatedAt || b.createdAt || '';
             return dateB.localeCompare(dateA); // Descending
          });

          const toKeep = users[0];
          const toDelete = users.slice(1);

          console.log(`   Keeping ID: ${toKeep.id}`);
          for (const user of toDelete) {
            console.log(`   Deleting ID: ${user.id}`);
            deleteStmt.run(user.id);
            deletedCount++;
          }
        }
      })();
      console.log(`[SUCCESS] Removed ${deletedCount} duplicate user records.`);
    } else {
      console.log('[OK] No duplicate users found by name.');
    }

    // 3. Ensure Email Uniqueness (Index)
    console.log('[FIX] Ensuring email uniqueness index...');
    try {
      db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
      console.log('[SUCCESS] Verified/Created unique index on users(email).');
    } catch (err) {
      console.error(`[ERROR] Failed to create unique index on email: ${err.message}`);
      // This might fail if we have multiple NULLs? No, SQLite allows multiple NULLs in UNIQUE.
      // It fails if we have multiple identical non-null values.
      // If we just added the column, all are NULL, so it should pass.
    }

    // 4. Data Patching (Optional but recommended for "Phase 0")
    // If we have users with NULL emails (which we do if we just added the column),
    // we should probably give them a dummy email to prevent issues in application logic that expects string.
    console.log('[FIX] Patching NULL emails...');
    const usersWithNullEmail = db.prepare('SELECT id, name FROM users WHERE email IS NULL').all();
    if (usersWithNullEmail.length > 0) {
      console.log(`[INFO] Found ${usersWithNullEmail.length} users with NULL email. Generating placeholders.`);
      const updateEmail = db.prepare('UPDATE users SET email = ? WHERE id = ?');
      
      db.transaction(() => {
        for (const user of usersWithNullEmail) {
          const safeName = user.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const dummyEmail = `${safeName}_${user.id.substring(0, 4)}@placeholder.local`;
          console.log(`   Updating user ${user.name} (${user.id}) -> ${dummyEmail}`);
          updateEmail.run(dummyEmail, user.id);
        }
      })();
      console.log('[SUCCESS] Patched NULL emails.');
    } else {
      console.log('[OK] No users with NULL email found.');
    }
    
    console.log('[DONE] Database fix completed successfully.');

  } catch (err) {
    console.error(`[ERROR] Unexpected error during fix: ${err.message}`);
    console.error(err.stack);
  } finally {
    if (db) db.close();
  }
}

fixDatabase();
