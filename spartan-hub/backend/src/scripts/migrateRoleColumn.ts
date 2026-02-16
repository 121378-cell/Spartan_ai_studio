import db, { initializeDatabase, initializeSchema } from '../config/database';
const Database = require('better-sqlite3');
type DatabaseType = any;

// Initialize database
initializeDatabase();

console.log('🚀 Starting database migration for preferences...');

try {
  // Check if db is properly initialized and is a Database instance
  if (!db || typeof db === 'object' && 'type' in db) {
    console.log('⚠️ Database not properly initialized for SQLite operations');
    process.exit(0);
  }
  
  // Cast to Database.Database type
  const sqliteDb = db as DatabaseType;
  
  // Try to add the preferences column - if it already exists, this will fail gracefully
  try {
    console.log('➕ Adding preferences column to users table...');
    sqliteDb.exec('ALTER TABLE users ADD COLUMN preferences TEXT');
    console.log('✅ Preferences column added successfully');
  } catch (addColumnError: any) {
    // Check if the error is because the column already exists
    if (addColumnError.message.includes('duplicate column name') || addColumnError.message.includes('already exists')) {
      console.log('✅ Preferences column already exists in users table');
    } else {
      // Re-throw if it's a different error
      throw addColumnError;
    }
  }
  
  console.log('✅ Database migration completed successfully');
} catch (error) {
  console.error('❌ Error during database migration:', error);
}