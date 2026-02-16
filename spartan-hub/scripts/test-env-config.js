// Test script to verify environment variables are properly loaded
require('dotenv').config();

console.log('Environment Variables Configuration Test');
console.log('=====================================');

// API Keys
console.log('API_NINJAS_KEY:', process.env.API_NINJAS_KEY ? '✓ Configured' : '✗ Not configured');
console.log('EDAMAM_APP_ID:', process.env.EDAMAM_APP_ID ? '✓ Configured' : '✗ Not configured');
console.log('EDAMAM_APP_KEY:', process.env.EDAMAM_APP_KEY ? '✓ Configured' : '✗ Not configured');
console.log('FATSECRET_KEY:', process.env.FATSECRET_KEY ? '✓ Configured' : '✗ Not configured');
console.log('FATSECRET_SECRET:', process.env.FATSECRET_SECRET ? '✓ Configured' : '✗ Not configured');
console.log('EXERCISEDB_KEY:', process.env.EXERCISEDB_KEY ? '✓ Configured' : '✗ Not configured');

// Ollama Configuration
console.log('OLLAMA_HOST:', process.env.OLLAMA_HOST || 'Using default: http://localhost:11434');

console.log('\nTo configure the API keys:');
console.log('1. Edit the .env file in the root directory');
console.log('2. Add your API keys from the respective services');
console.log('3. Restart the application');

// Test the fitness nutrition service
console.log('\nTesting fitness nutrition service...');
const { searchExercisesByMuscle } = require('../src/services/fitnessNutritionService');

// Simple test to verify the service can be imported
console.log('✓ Fitness nutrition service imported successfully');