/**
 * Script to test sqlite3 as a fallback alternative
 * This script will test the sqlite3 fallback implementation
 */

console.log('🔍 Testing sqlite3 as fallback alternative...\n');

// Function to test sqlite3 fallback
async function testSqlite3Fallback() {
  console.log('🗄️ Testing sqlite3 fallback implementation...');
  
  try {
    // First, let's compile the TypeScript files
    console.log('1. Compiling TypeScript files...');
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: './backend', stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed');
    
    // Now test importing the database module
    console.log('2. Testing database module import...');
    const dbModule = require('./backend/dist/config/database.js');
    console.log('✅ Database module imported successfully');
    
    // Test database initialization
    console.log('3. Testing database initialization...');
    const db = dbModule.initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    // Test schema initialization
    console.log('4. Testing schema initialization...');
    dbModule.initializeSchema();
    console.log('✅ Schema initialized successfully');
    
    // Test basic database operations
    console.log('5. Testing basic database operations...');
    
    // Try to create a test table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sqlite3_test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT
      )
    `);
    
    // Try to insert a test record
    const stmt = db.prepare(`
      INSERT INTO sqlite3_test_table (name, created_at) VALUES (?, ?)
    `);
    const result = stmt.run('SQLite3 Test Record', new Date().toISOString());
    console.log(`✅ Inserted test record with changes: ${result.changes}`);
    
    // Try to select the test record
    const selectStmt = db.prepare('SELECT * FROM sqlite3_test_table WHERE name = ?');
    const row = selectStmt.get('SQLite3 Test Record');
    console.log('✅ Selected test record:', row);
    
    // Try to update the test record
    const updateStmt = db.prepare(`
      UPDATE sqlite3_test_table SET name = ? WHERE name = ?
    `);
    const updateResult = updateStmt.run('Updated SQLite3 Test Record', 'SQLite3 Test Record');
    console.log(`✅ Updated test record with changes: ${updateResult.changes}`);
    
    // Try to delete the test record
    const deleteStmt = db.prepare('DELETE FROM sqlite3_test_table WHERE name = ?');
    const deleteResult = deleteStmt.run('Updated SQLite3 Test Record');
    console.log(`✅ Deleted test record with changes: ${deleteResult.changes}`);
    
    // Try to drop the test table
    db.exec('DROP TABLE IF EXISTS sqlite3_test_table');
    console.log('✅ Cleaned up test table');
    
    console.log('✅ sqlite3 fallback implementation is working correctly!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during sqlite3 fallback testing:', error.message);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🚀 Starting sqlite3 fallback alternative tests...\n');
  
  const testPassed = await testSqlite3Fallback();
  
  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  console.log(`sqlite3 Fallback: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('================');
  
  if (testPassed) {
    console.log('\n🎉 TEST PASSED!');
    console.log('✅ The sqlite3 fallback implementation is working correctly.');
  } else {
    console.log('\n❌ TEST FAILED!');
    console.log('⚠️ The sqlite3 fallback implementation requires attention.');
  }
  
  process.exit(testPassed ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('💥 Unexpected error during testing:', error);
  process.exit(1);
});