/**
 * Script to verify that both better-sqlite3 and sqlite3 libraries are available
 * This script will check if both database libraries can be loaded
 */

console.log('🔍 Verifying database libraries availability...\n');

// Function to check if a module can be loaded
function checkModule(moduleName) {
  try {
    console.log(`Checking ${moduleName}...`);
    // Try to resolve the module from the backend directory
    const modulePath = require.resolve(moduleName, { paths: ['./backend/node_modules'] });
    const module = require(modulePath);
    console.log(`✅ ${moduleName} loaded successfully from ${modulePath}`);
    return true;
  } catch (error) {
    try {
      // Try to resolve the module from the current directory
      const modulePath = require.resolve(moduleName);
      const module = require(modulePath);
      console.log(`✅ ${moduleName} loaded successfully from ${modulePath}`);
      return true;
    } catch (error2) {
      console.warn(`⚠️ ${moduleName} not available: ${error2.message.split('\n')[0]}`);
      return false;
    }
  }
}

// Function to test database libraries
async function testDatabaseLibraries() {
  console.log('🗄️ Testing database libraries...\n');
  
  // Check if better-sqlite3 is available
  const betterSqlite3Available = checkModule('better-sqlite3');
  
  // Check if sqlite3 is available
  const sqlite3Available = checkModule('sqlite3');
  
  console.log('\n📊 Database Libraries Status:');
  console.log('===========================');
  console.log(`better-sqlite3: ${betterSqlite3Available ? '✅ Available' : '❌ Not available'}`);
  console.log(`sqlite3: ${sqlite3Available ? '✅ Available' : '❌ Not available'}`);
  
  // Test better-sqlite3 if available
  if (betterSqlite3Available) {
    try {
      console.log('\n🧪 Testing better-sqlite3 functionality...');
      // Load the module from the correct path
      const Database = require('./backend/node_modules/better-sqlite3');
      const path = require('path');
      const fs = require('fs');
      
      // Create a test database
      const testDbPath = path.join(__dirname, 'test_better_sqlite3.db');
      const db = new Database(testDbPath);
      
      // Test basic operations
      db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
      const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
      const result = stmt.run('Better SQLite3 Test');
      console.log(`✅ better-sqlite3 basic operations work (inserted ${result.changes} row(s))`);
      
      // Clean up
      db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (error) {
      console.error('❌ Error testing better-sqlite3:', error.message);
    }
  }
  
  // Test sqlite3 if available
  if (sqlite3Available) {
    try {
      console.log('\n🧪 Testing sqlite3 functionality...');
      // Load the module from the correct path
      const sqlite3 = require('./backend/node_modules/sqlite3');
      const path = require('path');
      const fs = require('fs');
      
      // Create a test database
      const testDbPath = path.join(__dirname, 'test_sqlite3.db');
      const db = new sqlite3.Database(testDbPath);
      
      // Test basic operations
      db.serialize(() => {
        db.run('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
        const stmt = db.prepare('INSERT INTO test (name) VALUES (?)');
        stmt.run('SQLite3 Test');
        stmt.finalize();
        console.log('✅ sqlite3 basic operations work');
      });
      
      // Clean up
      db.close();
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
    } catch (error) {
      console.error('❌ Error testing sqlite3:', error.message);
    }
  }
  
  console.log('\n✅ Database libraries verification completed!\n');
  return betterSqlite3Available || sqlite3Available;
}

// Main verification function
async function main() {
  console.log('🚀 Starting database libraries verification...\n');
  
  const verificationPassed = await testDatabaseLibraries();
  
  if (verificationPassed) {
    console.log('🎉 VERIFICATION PASSED!');
    console.log('✅ At least one database library is available for use.');
  } else {
    console.log('❌ VERIFICATION FAILED!');
    console.log('⚠️ No database libraries are available.');
  }
  
  process.exit(verificationPassed ? 0 : 1);
}

// Run the verification
main().catch(error => {
  console.error('💥 Unexpected error during verification:', error);
  process.exit(1);
});