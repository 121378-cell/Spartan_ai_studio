#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// For this launcher script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'spartan-hub-launcher',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'spartan-hub-launcher',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'spartan-hub-launcher',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('🚀 Spartan Hub Launcher');
logger.info('====================');

// Function to check if a command exists
function commandExists(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Function to check if Ollama is running and model is available
function checkOllama() {
  logger.info('🔍 Checking Ollama installation...');
  
  if (!commandExists('ollama')) {
    logger.error('❌ Ollama is not installed');
    logger.info('💡 Please install Ollama from https://ollama.com/');
    return false;
  }
  
  logger.info('✅ Ollama is installed');
  
  // Check if gemma2 model is available
  try {
    const models = execSync('ollama list', { encoding: 'utf-8' });
    if (models.includes('gemma2:2b')) {
      logger.info('✅ gemma2:2b model is available');
      return true;
    } else {
      logger.warn('gemma2:2b model not found');
      logger.info('💡 To download the model, run: ollama pull gemma2:2b');
      return false;
    }
  } catch (error) {
    logger.error('❌ Error checking models:', { errorMessage: error.message });
    return false;
  }
}

// Function to install backend dependencies
function installBackendDeps() {
  logger.info('📦 Checking backend dependencies...');
  
  if (!fs.existsSync(path.join(__dirname, 'backend', 'node_modules'))) {
    logger.info('🔧 Installing backend dependencies...');
    try {
      execSync('cd backend && npm install', { stdio: 'inherit' });
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

// Function to build backend
function buildBackend() {
  logger.info('🔨 Building backend...');
  
  try {
    execSync('cd backend && npx tsc', { stdio: 'inherit' });
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
  
  const backend = spawn('node', ['backend/dist/server.js'], {
    stdio: 'inherit'
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
}

// Main function
async function main() {
  // Check Ollama
  if (!checkOllama()) {
    logger.info('\n⚠️  Please install Ollama and the gemma2:2b model, then run this launcher again.');
    process.exit(1);
  }
  
  // Install and build backend
  if (!installBackendDeps() || !buildBackend()) {
    logger.info('\n❌ Failed to set up backend. Please check the error messages above.');
    process.exit(1);
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