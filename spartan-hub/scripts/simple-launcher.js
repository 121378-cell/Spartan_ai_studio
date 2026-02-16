const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config();

// For this launcher script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'simple-launcher',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'simple-launcher',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'simple-launcher',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('🚀 Spartan Hub Simple Launcher');
logger.info('============================');

// Function to check if we're running in a PKG environment
function isPkg() {
  return typeof process.pkg !== 'undefined';
}

// Function to get the correct base path
function getBasePath() {
  if (isPkg()) {
    // When packaged with PKG, use the executable directory
    return path.dirname(process.execPath);
  } else {
    // When running normally from scripts/, use the project root (one level up)
    return path.join(__dirname, '..');
  }
}

// Function to check if a command exists
function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Function to install backend dependencies
function installBackendDeps() {
  logger.info('📦 Checking backend dependencies...');
  
  const basePath = getBasePath();
  const backendPath = path.join(basePath, 'backend');
  
  // Check if node_modules exists in backend
  const nodeModulesPath = path.join(backendPath, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    logger.info('🔧 Installing backend dependencies...');
    try {
      execSync(`cd "${backendPath}" && npm install`, { stdio: 'inherit' });
      logger.info('✅ Backend dependencies installed');
    } catch (error) {
      logger.error('❌ Failed to install backend dependencies:', { errorMessage: error.message });
      return false;
    }
  } else {
    logger.info('✅ Backend dependencies already installed');
  }
  
  return true;
}

// Function to rebuild native modules specifically for PKG environment
function rebuildNativeModulesForPkg() {
  logger.info('🔧 Rebuilding native modules for compatibility...');
  
  const basePath = getBasePath();
  const backendPath = path.join(basePath, 'backend');
  
  try {
    // For PKG environment, we need to rebuild native modules to match the PKG Node.js version
    if (isPkg()) {
      logger.info('🔧 Performing npm rebuild for PKG compatibility...');
      execSync(`cd "${backendPath}" && npm rebuild --target=18.5.0 --target_arch=x64 --target_platform=win32`, { stdio: 'inherit' });
    } else {
      // For normal environment, just do a regular rebuild
      execSync(`cd "${backendPath}" && npm rebuild`, { stdio: 'inherit' });
    }
    logger.info('✅ Native modules rebuilt successfully');
    return true;
  } catch (error) {
    logger.warn('⚠️ Failed to rebuild native modules, continuing anyway...', { errorMessage: error.message });
    logger.info('ℹ️ The application will attempt to use fallback mechanisms for database operations');
    return true; // Continue anyway as the modules might still work or fallbacks are available
  }
}

// Function to build backend
function buildBackend() {
  logger.info('🔨 Building backend...');
  
  const basePath = getBasePath();
  const backendPath = path.join(basePath, 'backend');
  
  try {
    execSync(`cd "${backendPath}" && npx tsc`, { stdio: 'inherit' });
    logger.info('✅ Backend built successfully');
    return true;
  } catch (error) {
    logger.error('❌ Backend build failed:', { errorMessage: error.message });
    return false;
  }
}

// Function to start backend service
function startBackend() {
  logger.info('🚀 Starting backend service...');
  
  const basePath = getBasePath();
  const backendDistPath = path.join(basePath, 'backend', 'dist');
  const serverPath = path.join(backendDistPath, 'server.js');
  
  // Set environment variable to handle better-sqlite3 in PKG
  const backend = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      // This might help with native module loading in PKG
      'PKG_EXECPATH': 'off'
    }
  });
  
  backend.on('error', (error) => {
    logger.error('❌ Error starting backend:', { errorMessage: error.message });
  });
  
  backend.on('close', (code) => {
    logger.info(`🔄 Backend service exited with code ${code}`);
  });
  
  return backend;
}

// Function to show instructions
function showInstructions() {
  logger.info('\n📋 INSTRUCTIONS:');
  logger.info('================');
  logger.info('1. Backend API is now running at: http://localhost:3001');
  logger.info('2. To test the API, visit: http://localhost:3001/health');
  logger.info('3. To test the AI service, visit: http://localhost:3001/ai/health');
  logger.info('4. For the complete frontend experience, you can:');
  logger.info('   a. Use a development server: npx vite');
  logger.info('   b. Or open index.html directly in a browser (limited functionality)');
  logger.info('\n💡 Press Ctrl+C to stop the backend service');
  
  // Show which APIs are configured
  logger.info('\n🔧 API Configuration:');
  logger.info('====================');
  logger.info('API Ninjas:', { status: process.env.API_NINJAS_KEY ? '✅ Configured' : '❌ Not configured' });
  logger.info('Edamam:', { status: process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY ? '✅ Configured' : '❌ Not configured' });
  logger.info('FatSecret:', { status: process.env.FATSECRET_KEY && process.env.FATSECRET_SECRET ? '✅ Configured' : '❌ Not configured' });
  logger.info('ExerciseDB:', { status: process.env.EXERCISEDB_KEY ? '✅ Configured' : '❌ Not configured' });
}

// Main function
async function main() {
  // Install and rebuild backend dependencies
  if (!installBackendDeps() || !rebuildNativeModulesForPkg() || !buildBackend()) {
    logger.info('\n❌ Failed to set up backend. Please check the error messages above.');
    logger.info('ℹ️ The application will attempt to continue with fallback mechanisms where possible.');
    // We don't exit here to allow fallback mechanisms to work
  }
  
  // Start backend
  const backend = startBackend();
  
  // Show instructions
  showInstructions();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logger.info('\n🛑 Shutting down...');
    backend.kill();
    process.exit(0);
  });
}

main();