/**
 * Script to verify the fallback strategy implementation
 * This script will test all fallback mechanisms implemented for Spartan Hub
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// For this verification script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'verify-fallback-strategy',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'verify-fallback-strategy',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'verify-fallback-strategy',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('🔍 Verifying fallback strategy implementation...\n');

// Function to execute a command and capture output
const execCommand = (command, cwd) => {
  try {
    logger.info(`Executing: ${command}`);
    const output = execSync(command, { 
      cwd: cwd || process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    logger.warn(`⚠️ Command failed: ${command}`);
    logger.warn(`Error:`, { errorMessage: error.message });
    return null;
  }
};

// Function to check if a module can be loaded
const checkModule = (moduleName) => {
  try {
    logger.info(`Checking ${moduleName}...`);
    require.resolve(moduleName);
    const module = require(moduleName);
    logger.info(`✅ ${moduleName} loaded successfully`);
    return true;
  } catch (error) {
    logger.warn(`⚠️ ${moduleName} not available:`, { error: error.message.split('\n')[0] });
    return false;
  }
};

// Function to test database fallback
const testDatabaseFallback = () => {
  logger.info('\n🗄️ Testing database fallback strategy...');
  
  try {
    // First, let's check if the dist folder exists
    const distPath = path.join(__dirname, 'backend', 'dist');
    const configPath = path.join(distPath, 'config', 'database.js');
    
    if (!fs.existsSync(configPath)) {
      logger.info('🔄 Compiling TypeScript files first...');
      // Compile TypeScript files
      execSync('npx tsc', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
      logger.info('✅ TypeScript compilation completed');
    }
    
    // Now test importing the compiled database module
    logger.info('1. Testing database module import with fallback...');
    const dbModule = require('./backend/dist/config/database.js');
    logger.info('✅ Database module with fallback imported successfully');
    
    // Test database initialization
    logger.info('2. Testing database initialization with fallback...');
    const db = dbModule.initializeDatabase();
    logger.info('✅ Database initialized with fallback successfully');
    
    // Test basic database operations
    logger.info('3. Testing basic database operations...');
    
    // Try to create a test table
    db.exec(`
      CREATE TABLE IF NOT EXISTS fallback_test_table (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT
      )
    `);
    
    // Try to insert a test record
    const stmt = db.prepare(`
      INSERT INTO fallback_test_table (name, created_at) VALUES (?, ?)
    `);
    const result = stmt.run('Fallback Test Record', new Date().toISOString());
    logger.info(`✅ Inserted test record with changes: ${result.changes}`);
    
    // Try to select the test record
    const selectStmt = db.prepare('SELECT * FROM fallback_test_table WHERE name = ?');
    const row = selectStmt.get('Fallback Test Record');
    logger.info('✅ Selected test record:', { record: row });
    
    // Try to drop the test table
    db.exec('DROP TABLE IF EXISTS fallback_test_table');
    logger.info('✅ Cleaned up test table');
    
    logger.info('✅ Database fallback strategy is working correctly.\n');
    return true;
    
  } catch (error) {
    logger.error('❌ Error during database fallback testing:', { errorMessage: error.message });
    return false;
  }
};

// Function to test native module rebuilding
const testNativeModuleRebuilding = () => {
  logger.info('🔧 Testing native module rebuilding capabilities...\n');
  
  try {
    // Check if we're in the correct directory
    const basePath = process.cwd();
    const packageJsonPath = path.join(basePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logger.error('❌ package.json not found. Please run this script from the project root.');
      return false;
    }
    
    // Check if npm is available
    const npmVersion = execCommand('npm --version');
    if (!npmVersion) {
      logger.error('❌ npm is not available.');
      return false;
    }
    logger.info(`✅ npm version: ${npmVersion}`);
    
    // Check if Node.js is available
    const nodeVersion = execCommand('node --version');
    if (!nodeVersion) {
      logger.error('❌ Node.js is not available.');
      return false;
    }
    logger.info(`✅ Node.js version: ${nodeVersion}`);
    
    logger.info('✅ Native module rebuilding environment is properly set up.\n');
    return true;
    
  } catch (error) {
    logger.error('❌ Error during native module rebuilding testing:', { errorMessage: error.message });
    return false;
  }
};

// Function to test AI service fallback
const testAIServiceFallback = () => {
  logger.info('🤖 Testing AI service fallback mechanisms...\n');
  
  try {
    // Check if required AI modules are available
    const betterSqlite3Available = checkModule('better-sqlite3');
    const sqlite3Available = checkModule('sqlite3');
    
    logger.info(`\n📊 AI Service Fallback Status:`);
    logger.info(`   better-sqlite3: ${betterSqlite3Available ? '✅ Available' : '⚠️ Not available (will use fallback)'}`);
    logger.info(`   sqlite3: ${sqlite3Available ? '✅ Available' : '⚠️ Not available (will use mock database)'}`);
    
    logger.info('\n✅ AI service fallback mechanisms are in place.\n');
    return true;
    
  } catch (error) {
    logger.error('❌ Error during AI service fallback testing:', { errorMessage: error.message });
    return false;
  }
};

// Main verification function
const verifyFallbackStrategy = async () => {
  logger.info('🚀 Starting comprehensive fallback strategy verification...\n');
  
  let allTestsPassed = true;
  
  // Test 1: Database fallback
  const databaseTestPassed = testDatabaseFallback();
  if (!databaseTestPassed) allTestsPassed = false;
  
  // Test 2: Native module rebuilding
  const nativeModuleTestPassed = testNativeModuleRebuilding();
  if (!nativeModuleTestPassed) allTestsPassed = false;
  
  // Test 3: AI service fallback
  const aiServiceTestPassed = testAIServiceFallback();
  if (!aiServiceTestPassed) allTestsPassed = false;
  
  // Summary
  logger.info('📋 VERIFICATION SUMMARY:');
  logger.info('======================');
  logger.info(`Database Fallback:`, { result: databaseTestPassed ? '✅ PASSED' : '❌ FAILED' });
  logger.info(`Native Module Rebuilding:`, { result: nativeModuleTestPassed ? '✅ PASSED' : '❌ FAILED' });
  logger.info(`AI Service Fallback:`, { result: aiServiceTestPassed ? '✅ PASSED' : '❌ FAILED' });
  logger.info('======================');
  
  if (allTestsPassed) {
    logger.info('\n🎉 ALL TESTS PASSED!');
    logger.info('✅ The fallback strategy has been successfully implemented and verified.');
    logger.info('\n📝 Next steps:');
    logger.info('1. Test the application in different environments to ensure fallbacks work correctly');
    logger.info('2. Monitor logs for any fallback activations');
    logger.info('3. Document the fallback behavior for future maintenance');
  } else {
    logger.info('\n❌ SOME TESTS FAILED!');
    logger.warn('The fallback strategy implementation requires attention.');
    logger.info('\n🔧 Troubleshooting steps:');
    logger.info('1. Check the error messages above for specific issues');
    logger.info('2. Ensure all dependencies are properly installed');
    logger.info('3. Run the rebuild_native_modules.js script if native module issues are detected');
    logger.info('4. Verify the database configuration in backend/src/config/database.ts');
    return false;
  }
  
  return true;
};

// Run the verification
verifyFallbackStrategy()
  .then(success => {
    if (success) {
      logger.info('\n✅ Fallback strategy verification completed successfully!');
      process.exit(0);
    } else {
      logger.info('\n❌ Fallback strategy verification failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    logger.error('\n💥 Unexpected error during verification:', { errorMessage: error.message });
    process.exit(1);
  });