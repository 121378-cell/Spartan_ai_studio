require('dotenv').config();
const axios = require('axios');

// For this verification script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'verify-api-keys',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'verify-api-keys',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'verify-api-keys',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

async function testApiNinjas() {
  logger.info('Testing API Ninjas...');
  if (!process.env.API_NINJAS_KEY) {
    logger.warn('API Ninjas key not configured');
    return false;
  }
  
  try {
    const response = await axios.get('https://api.api-ninjas.com/v1/exercises', {
      headers: {
        'X-Api-Key': process.env.API_NINJAS_KEY
      },
      params: {
        muscle: 'biceps'
      }
    });
    
    logger.info('✅ API Ninjas: Working');
    logger.info(`   Found ${response.data.length} bicep exercises`);
    return true;
  } catch (error) {
    logger.error('API Ninjas: Not working');
    if (error.response) {
      logger.error(`   Status: ${error.response.status}`);
      logger.error(`   Error:`, { errorData: JSON.stringify(error.response.data) });
    } else {
      logger.error(`   Error:`, { errorMessage: error.message });
    }
    return false;
  }
}

async function testEdamam() {
  logger.info('\nTesting Edamam...');
  if (!process.env.EDAMAM_APP_ID || !process.env.EDAMAM_APP_KEY) {
    logger.warn('Edamam keys not configured');
    return false;
  }
  
  try {
    const response = await axios.get('https://api.edamam.com/api/nutrition-data', {
      params: {
        app_id: process.env.EDAMAM_APP_ID,
        app_key: process.env.EDAMAM_APP_KEY,
        ingr: '100g chicken breast'
      }
    });
    
    logger.info('✅ Edamam: Working');
    logger.info(`   Calories: ${response.data.calories}`);
    return true;
  } catch (error) {
    logger.error('Edamam: Not working');
    if (error.response) {
      logger.error(`   Status: ${error.response.status}`);
      logger.error(`   Error:`, { errorData: JSON.stringify(error.response.data) });
    } else {
      logger.error(`   Error:`, { errorMessage: error.message });
    }
    return false;
  }
}

async function main() {
  logger.info('API Keys Verification Script');
  logger.info('==========================');
  
  await testApiNinjas();
  await testEdamam();
  
  logger.info('\nVerification complete!');
  logger.info('\nTo configure your API keys, edit the .env file in the root directory.');
}

main();