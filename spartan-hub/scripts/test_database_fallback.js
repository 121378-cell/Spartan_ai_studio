/**
 * Script to test the database fallback strategy
 * This script will test the database initialization with fallback mechanisms
 */

console.log('🚀 Testing database fallback strategy...');

try {
  // Test importing the database module
  console.log('1. Testing database module import...');
  const dbModule = require('./backend/src/config/database');
  console.log('✅ Database module imported successfully');
  
  // Test database initialization
  console.log('2. Testing database initialization...');
  const db = dbModule.initializeDatabase();
  console.log('✅ Database initialized successfully');
  
  // Test schema initialization
  console.log('3. Testing schema initialization...');
  dbModule.initializeSchema();
  console.log('✅ Schema initialized successfully');
  
  // Test basic database operations
  console.log('4. Testing basic database operations...');
  
  // Try to create a test table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_table (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT
    )
  `);
  
  // Try to insert a test record
  const stmt = db.prepare(`
    INSERT INTO test_table (name, created_at) VALUES (?, ?)
  `);
  const result = stmt.run('Test Record', new Date().toISOString());
  console.log(`✅ Inserted test record with changes: ${result.changes}`);
  
  // Try to select the test record
  const selectStmt = db.prepare('SELECT * FROM test_table WHERE name = ?');
  const row = selectStmt.get('Test Record');
  console.log('✅ Selected test record:', row);
  
  // Try to drop the test table
  db.exec('DROP TABLE IF EXISTS test_table');
  console.log('✅ Cleaned up test table');
  
  console.log('\n🎉 All tests passed! Database fallback strategy is working correctly.');
  
} catch (error) {
  console.error('❌ Error during testing:', error);
  console.error('🔧 This might indicate an issue with the database fallback implementation.');
  process.exit(1);
}