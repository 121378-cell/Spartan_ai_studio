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
      service: 'launcher',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'launcher',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'launcher',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('🚀 Spartan Hub Launcher');
logger.info('======================');

// Check if Ollama is running
function checkOllama() {
  try {
    execSync('ollama --version', { stdio: 'ignore' });
    logger.info('✅ Ollama is installed');
    
    // Check if gemma2 model is available
    try {
      const models = execSync('ollama list', { encoding: 'utf-8' });
      if (models.includes('gemma2:2b')) {
        logger.info('✅ gemma2:2b model is available');
        return true;
      } else {
        logger.warn('gemma2:2b model not found, downloading...');
        execSync('ollama pull gemma2:2b', { stdio: 'inherit' });
        logger.info('✅ gemma2:2b model downloaded');
        return true;
      }
    } catch (error) {
      logger.error('❌ Error checking/downloading model:', { errorMessage: error.message });
      return false;
    }
  } catch (error) {
    logger.error('❌ Ollama is not installed or not in PATH');
    logger.info('💡 Please install Ollama from https://ollama.com/');
    return false;
  }
}

// Build the application
function buildApp() {
  logger.info('🔧 Building application...');
  
  try {
    // Build frontend
    logger.info('🔨 Building frontend...');
    execSync('npx vite build', { stdio: 'inherit' });
    
    // Build backend
    logger.info('🔨 Building backend...');
    execSync('cd backend && npm run build', { stdio: 'inherit' });
    
    logger.info('✅ Application built successfully');
    return true;
  } catch (error) {
    logger.error('❌ Build failed:', { errorMessage: error.message });
    return false;
  }
}

// Start services
function startServices() {
  logger.info('🚀 Starting services...');
  
  // Start backend
  const backend = spawn('node', ['backend/dist/server.js'], {
    stdio: 'inherit'
  });
  
  // Start frontend
  const frontend = spawn('npx', ['vite', 'preview'], {
    stdio: 'inherit'
  });
  
  logger.info('✅ Services started successfully!');
  logger.info('🌐 Frontend: http://localhost:3000');
  logger.info('🔧 Backend API: http://localhost:3001');
  logger.info('💡 Press Ctrl+C to stop');
  
  // Handle shutdown
  process.on('SIGINT', () => {
    logger.info('\n🛑 Shutting down services...');
    backend.kill();
    frontend.kill();
    process.exit(0);
  });
}

// Main execution
async function main() {
  // Check Ollama installation and model
  if (!checkOllama()) {
    process.exit(1);
  }
  
  // Build the application
  if (!buildApp()) {
    process.exit(1);
  }
  
  // Start services
  startServices();
}

main();