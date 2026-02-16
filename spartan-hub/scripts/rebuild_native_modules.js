/**
 * Script to rebuild native modules for compatibility
 * This script addresses the Node.js version mismatch issues with native modules
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// For this utility script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'rebuild-native-modules',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'rebuild-native-modules',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'rebuild-native-modules',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('🔧 Rebuilding native modules for compatibility...');

// Function to execute a command and handle errors
const execCommand = (command, cwd) => {
  try {
    logger.info(`Executing: ${command}`);
    const output = execSync(command, { 
      cwd: cwd || process.cwd(),
      stdio: 'inherit',
      env: {
        ...process.env,
        // Set environment variables for native module compilation
        npm_config_arch: 'x64',
        npm_config_target_arch: 'x64',
        npm_config_platform: 'win32'
      }
    });
    return output;
  } catch (error) {
    logger.warn(`⚠️ Command failed: ${command}`);
    logger.warn(`Error: ${error.message}`);
    return null;
  }
};

// Function to check if we're in a PKG environment
const isPkg = () => {
  return typeof process.pkg !== 'undefined';
};

// Function to get the correct base path
const getBasePath = () => {
  if (isPkg()) {
    // When packaged with PKG, use the executable directory
    return path.dirname(process.execPath);
  } else {
    // When running normally, use the current directory
    return process.cwd();
  }
};

try {
  const basePath = getBasePath();
  logger.info(`📂 Base path: ${basePath}`);
  
  // Check if we're in the correct directory
  const packageJsonPath = path.join(basePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logger.error('❌ package.json not found. Please run this script from the project root.');
    process.exit(1);
  }
  
  // Rebuild native modules in the main project
  logger.info('\n🔨 Rebuilding native modules for main project...');
  execCommand('npm rebuild', basePath);
  
  // Check if backend directory exists
  const backendPath = path.join(basePath, 'backend');
  if (fs.existsSync(backendPath)) {
    logger.info('\n🔧 Rebuilding native modules for backend...');
    execCommand('npm rebuild', backendPath);
    
    // For PKG environment, rebuild with specific target
    if (isPkg()) {
      logger.info('\n🎯 Performing npm rebuild for PKG compatibility...');
      execCommand('npm rebuild --target=18.5.0 --target_arch=x64 --target_platform=win32', backendPath);
    }
  }
  
  // Check if launcher directory exists
  const launcherPath = path.join(basePath, 'launcher');
  if (fs.existsSync(launcherPath)) {
    logger.info('\n🔧 Rebuilding native modules for launcher...');
    execCommand('pip install --upgrade --force-reinstall -r requirements.txt', launcherPath);
  }
  
  logger.info('\n✅ Native module rebuilding completed!');
  logger.info('\n📝 Next steps:');
  logger.info('1. Test the application to ensure database operations work correctly');
  logger.info('2. If issues persist, try running the application with the HUSKY=0 environment variable');
  logger.info('3. For packaged applications, ensure the rebuild was done with the same Node.js version used for packaging');
  
} catch (error) {
  logger.error('❌ Error during native module rebuilding:', { errorMessage: error });
  logger.error('🔧 This might indicate an issue with the native module compatibility.');
  
  // Provide troubleshooting suggestions
  logger.info('\n🛠️ Troubleshooting suggestions:');
  logger.info('1. Ensure you have the correct Node.js version installed');
  logger.info('2. Try clearing the node_modules directory and reinstalling dependencies');
  logger.info('3. Check if Python is installed (required for some native modules)');
  logger.info('4. For Windows users, ensure you have Windows Build Tools installed');
  logger.info('5. As a last resort, consider using the fallback database implementation');
  
  process.exit(1);
}