import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting database migration for preferences...');

try {
  // Connect directly to the database file to avoid schema initialization
  // Use the same path as in database.ts
  const dbDir = path.join('/app', 'data');
  const dbPath = path.join(dbDir, 'spartan.db');
  
  // Check if database file exists
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found:', dbPath);
    process.exit(1);
  }
  
  console.log('📂 Database file found:', dbPath);
  
  // Connect to database
  const db = new Database(dbPath);
  
  // Check if preferences column already exists
  const tableInfo = db.prepare('PRAGMA table_info(users)').all() as any[] || [];
  const hasPreferencesColumn = tableInfo.some(column => column.name === 'preferences');
  
  if (hasPreferencesColumn) {
    console.log('✅ Preferences column already exists in users table');
  } else {
    console.log('➕ Adding preferences column to users table...');
    db.exec('ALTER TABLE users ADD COLUMN preferences TEXT');
    console.log('✅ Preferences column added successfully');
  }
  
  // Close database connection
  db.close();
  
  console.log('✅ Database migration completed successfully');
} catch (error: any) {
  console.error('❌ Error during database migration:', error.message);
  process.exit(1);
}