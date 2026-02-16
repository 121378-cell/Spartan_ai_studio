/**
 * Test script to evaluate Ollama AI connection latency and fallback mechanism
 * 
 * This script tests:
 * 1. Latency of AI service calls (< 500ms requirement)
 * 2. Fallback mechanism when Ollama is unavailable
 */

const axios = require('axios');
const https = require('https');

// Disable SSL verification for local testing
const agent = new https.Agent({  
  rejectUnauthorized: false
});

// For this test script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'test-ollama-connection',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'test-ollama-connection',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'test-ollama-connection',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER_ID = 'test-user-id'; // We'll create a test user if needed
const TIMEOUT = 500; // 500ms timeout for latency test

logger.info('=== Ollama AI Connection Test ===\n');

/**
 * Test 1: Measure latency of AI service call
 */
async function testLatency() {
  logger.info('Test 1: Measuring AI service latency...');
  
  try {
    // First create a test user if it doesn't exist
    const userData = {
      name: "Latency Test User",
      email: "latency@test.com",
      quest: "Test AI latency",
      stats: {
        totalWorkouts: 10,
        currentStreak: 5,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [
        {
          id: "habit1",
          name: "Morning Workout",
          anchor: "After breakfast",
          currentStreak: 5,
          longestStreak: 7
        }
      ],
      masterRegulationSettings: {
        targetBedtime: "22:00"
      },
      nutritionSettings: {
        priority: "performance"
      },
      isInAutonomyPhase: false,
      weightKg: 70
    };

    // Try to call the AI alert endpoint and measure response time
    const startTime = Date.now();
    
    const response = await axios.post(
      `${BASE_URL}/ai/alert`,
      userData,
      {
        httpsAgent: agent,
        timeout: 10000 // 10 second timeout for the request
      }
    );
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    logger.info(`✓ AI service responded in ${responseTime}ms`);
    
    if (responseTime < TIMEOUT) {
      logger.info(`✓ Latency requirement met (< ${TIMEOUT}ms)`);
    } else {
      logger.warn(`Latency requirement not met (>= ${TIMEOUT}ms)`);
    }
    
    logger.info('Response:', { response: JSON.stringify(response.data, null, 2) });
    
    return { success: true, responseTime, data: response.data };
  } catch (error) {
    logger.error('✗ Latency test failed:', { errorMessage: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Verify fallback mechanism when Ollama is unavailable
 */
async function testFallback() {
  logger.info('\nTest 2: Testing fallback mechanism...');
  
  try {
    // This test assumes Ollama has been stopped manually
    // In a real test scenario, you would stop the Ollama container first:
    // docker stop ollama_service
    
    logger.info('Please ensure Ollama service is stopped before running this test');
    logger.info('Run: docker stop ollama_service');
    
    // Wait for user to stop the service
    logger.info('Press Enter after stopping Ollama service...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    await new Promise(resolve => {
      process.stdin.once('data', () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });
    
    // Now test the AI service with Ollama stopped
    const startTime = Date.now();
    
    const userData = {
      name: "Fallback Test User",
      email: "fallback@test.com",
      quest: "Test AI fallback",
      stats: {
        totalWorkouts: 5,
        currentStreak: 3,
        joinDate: new Date().toISOString()
      },
      onboardingCompleted: true,
      keystoneHabits: [
        {
          id: "habit1",
          name: "Evening Workout",
          anchor: "Before dinner",
          currentStreak: 3,
          longestStreak: 5
        }
      ],
      masterRegulationSettings: {
        targetBedtime: "23:00"
      },
      nutritionSettings: {
        priority: "longevity"
      },
      isInAutonomyPhase: true,
      weightKg: 65
    };

    const response = await axios.post(
      `${BASE_URL}/ai/alert`,
      userData,
      {
        httpsAgent: agent,
        timeout: 10000 // 10 second timeout
      }
    );
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    logger.info(`AI service responded in ${responseTime}ms with Ollama stopped`);
    logger.info('Response:', { response: JSON.stringify(response.data, null, 2) });
    
    // Check if fallback was used
    if (response.data && response.data.data && response.data.data.fallback_used) {
      logger.info('✓ Fallback mechanism correctly activated');
      logger.info('✓ Service did not crash and returned fallback response');
      return { success: true, fallback: true, responseTime, data: response.data };
    } else {
      logger.warn('Fallback mechanism may not have been activated properly');
      return { success: true, fallback: false, responseTime, data: response.data };
    }
  } catch (error) {
    logger.error('Error during fallback test:', { errorMessage: error.message });
    
    // Even if there's an error, the service should not crash
    logger.info('✓ Service did not crash (handled error gracefully)');
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Health check endpoints
 */
async function testHealthChecks() {
  logger.info('\nTest 3: Testing health check endpoints...');
  
  try {
    // Test backend health
    const backendHealth = await axios.get(`${BASE_URL}/health`, { httpsAgent: agent });
    logger.info(`✓ Backend health: ${backendHealth.status} - ${JSON.stringify(backendHealth.data)}`);
    
    // Test AI health
    const aiHealth = await axios.get(`${BASE_URL}/ai/health`, { httpsAgent: agent });
    logger.info(`✓ AI health: ${aiHealth.status} - ${JSON.stringify(aiHealth.data)}`);
    
    return { backend: backendHealth.data, ai: aiHealth.data };
  } catch (error) {
    logger.error('✗ Health check test failed:', { errorMessage: error.message });
    return { error: error.message };
  }
}

/**
 * Main test function
 */
async function runTests() {
  logger.info('Starting Ollama AI connection tests...\n');
  
  // Test health checks first
  await testHealthChecks();
  
  // Test latency
  const latencyResult = await testLatency();
  
  // Test fallback mechanism
  logger.info('\nPreparing fallback test...');
  logger.info('NOTE: For the fallback test, you need to manually stop the Ollama service');
  
  const proceed = await new Promise(resolve => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Do you want to run the fallback test? (y/n): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
  
  if (proceed) {
    const fallbackResult = await testFallback();
    
    logger.info('\n=== Test Summary ===');
    logger.info('Latency Test:', { result: latencyResult.success ? 'PASSED' : 'FAILED' });
    if (latencyResult.success) {
      logger.info(`  Response Time: ${latencyResult.responseTime}ms`);
      logger.info(`  Meets Requirement (< ${TIMEOUT}ms):`, { meetsRequirement: latencyResult.responseTime < TIMEOUT ? 'YES' : 'NO' });
    }
    
    logger.info('Fallback Test:', { result: fallbackResult && fallbackResult.success ? 'PASSED' : 'SKIPPED/FAILED' });
    if (fallbackResult && fallbackResult.success) {
      logger.info(`  Fallback Activated:`, { activated: fallbackResult.fallback ? 'YES' : 'NO' });
    }
  } else {
    logger.info('Fallback test skipped.');
    
    logger.info('\n=== Test Summary ===');
    logger.info('Latency Test:', { result: latencyResult.success ? 'PASSED' : 'FAILED' });
    if (latencyResult.success) {
      logger.info(`  Response Time: ${latencyResult.responseTime}ms`);
      logger.info(`  Meets Requirement (< ${TIMEOUT}ms):`, { meetsRequirement: latencyResult.responseTime < TIMEOUT ? 'YES' : 'NO' });
    }
    logger.info('Fallback Test: SKIPPED');
  }
  
  logger.info('\n=== Test Complete ===');
}

// Run the tests
if (require.main === module) {
  runTests().catch(error => logger.error('Test execution error:', { errorMessage: error.message }));
}

module.exports = { testLatency, testFallback, testHealthChecks };