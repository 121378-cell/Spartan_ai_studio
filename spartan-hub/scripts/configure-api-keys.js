const fs = require('fs');
const path = require('path');

// Read the current .env file
const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// For this utility script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'configure-api-keys',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'configure-api-keys',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'configure-api-keys',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('API Key Configuration Helper');
logger.info('==========================');

// Helper function to update or add a key in the .env content
function updateEnvKey(key, value) {
  const keyRegex = new RegExp(`^${key}=.*`, 'm');
  if (keyRegex.test(envContent)) {
    // Key exists, update it
    envContent = envContent.replace(keyRegex, `${key}=${value}`);
  } else {
    // Key doesn't exist, add it
    envContent += `\n${key}=${value}`;
  }
}

// Get API keys from user input
const apiKeys = {
  'API_NINJAS_KEY': 'API Ninjas Key',
  'EDAMAM_APP_ID': 'Edamam App ID',
  'EDAMAM_APP_KEY': 'Edamam App Key',
  'FATSECRET_KEY': 'FatSecret Key',
  'FATSECRET_SECRET': 'FatSecret Secret',
  'EXERCISEDB_KEY': 'ExerciseDB Key'
};

logger.info('Please enter your API keys when prompted (or leave blank to skip):');

// Collect API keys from user
Object.keys(apiKeys).forEach(key => {
  const value = require('readline-sync').question(`${apiKeys[key]}: `);
  if (value.trim() !== '') {
    updateEnvKey(key, value.trim());
    logger.info(`✓ ${apiKeys[key]} configured`);
  } else {
    logger.warn(`⚠ Skipping ${apiKeys[key]}`);
  }
});

// Write the updated content back to the .env file
fs.writeFileSync(envPath, envContent);
logger.info('\n✅ API keys have been updated in .env file');

// Test the configuration
logger.info('\nTesting configuration...');
require('dotenv').config();

Object.keys(apiKeys).forEach(key => {
  if (process.env[key]) {
    logger.info(`✓ ${apiKeys[key]}: Configured`);
  } else {
    logger.info(`✗ ${apiKeys[key]}: Not configured`);
  }
});