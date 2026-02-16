/**
 * Simple script to test database functionality with fallback
 */

console.log('🔍 Testing database functionality...\n');

try {
  console.log('1. Loading database module...');
  const dbModule = require('./backend/dist/config/database.js');
  console.log('✅ Database module loaded');
  
  console.log('2. Accessing database instance...');
  const db = dbModule.db || dbModule.default;
  console.log('✅ Database instance accessed');
  
  console.log('3. Testing database operations...');
  
  // Test exec
  if (typeof db.exec === 'function') {
    db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
    console.log('✅ exec() function works');
  } else {
    console.log('⚠️ exec() function not available');
  }
  
  // Test prepare
  if (typeof db.prepare === 'function') {
    const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
    if (typeof stmt.run === 'function') {
      stmt.run('Test Entry');
      console.log('✅ prepare() and run() functions work');
    } else {
      console.log('⚠️ run() function not available');
    }
  } else {
    console.log('⚠️ prepare() function not available');
  }
  
  console.log('\n🎉 Database test completed successfully!');
  
} catch (error) {
  console.error('❌ Error during database test:', error.message);
  console.error('Stack trace:', error.stack);
}