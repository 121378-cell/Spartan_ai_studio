const fs = require('fs');
const path = require('path');

console.log('API Keys Update Script');
console.log('====================');

// Read the current .env file
const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

console.log('Please enter your actual API keys:');

// Get API keys from user input
const apiNinjasKey = require('readline-sync').question('API Ninjas Key: ');
const edamamAppId = require('readline-sync').question('Edamam App ID: ');
const edamamAppKey = require('readline-sync').question('Edamam App Key: ');
const fatsecretKey = require('readline-sync').question('FatSecret Key: ');
const fatsecretSecret = require('readline-sync').question('FatSecret Secret: ');
const exercisedbKey = require('readline-sync').question('ExerciseDB Key: ');

// Update the .env content with actual keys
envContent = envContent.replace('API_NINJAS_KEY=your_actual_api_ninjas_key_here', `API_NINJAS_KEY=${apiNinjasKey}`);
envContent = envContent.replace('EDAMAM_APP_ID=your_actual_edamam_app_id_here', `EDAMAM_APP_ID=${edamamAppId}`);
envContent = envContent.replace('EDAMAM_APP_KEY=your_actual_edamam_app_key_here', `EDAMAM_APP_KEY=${edamamAppKey}`);
envContent = envContent.replace('FATSECRET_KEY=your_actual_fatsecret_key_here', `FATSECRET_KEY=${fatsecretKey}`);
envContent = envContent.replace('FATSECRET_SECRET=your_actual_fatsecret_secret_here', `FATSECRET_SECRET=${fatsecretSecret}`);
envContent = envContent.replace('EXERCISEDB_KEY=your_actual_exercisedb_key_here', `EXERCISEDB_KEY=${exercisedbKey}`);

// Write the updated content back to the .env file
fs.writeFileSync(envPath, envContent);

console.log('\n✅ API keys have been updated in .env file');

// Test the configuration
console.log('\nTesting configuration...');
require('dotenv').config();

const keys = [
  'API_NINJAS_KEY',
  'EDAMAM_APP_ID', 
  'EDAMAM_APP_KEY',
  'FATSECRET_KEY',
  'FATSECRET_SECRET',
  'EXERCISEDB_KEY'
];

keys.forEach(key => {
  if (process.env[key]) {
    console.log(`✓ ${key}: Configured`);
  } else {
    console.log(`✗ ${key}: Not configured`);
  }
});