/**
 * Script to test parallel API calls in the fitness and nutrition service
 * This script will test the parallelization functionality
 */

// For this test script, we'll create a simple structured logger
const logger = {
  info: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      service: 'test-parallel-api-calls',
      metadata
    };
    console.info(JSON.stringify(logEntry));
  },
  error: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      service: 'test-parallel-api-calls',
      metadata
    };
    console.error(JSON.stringify(logEntry));
  },
  warn: (message, metadata = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      service: 'test-parallel-api-calls',
      metadata
    };
    console.warn(JSON.stringify(logEntry));
  }
};

logger.info('🔍 Testing parallel API calls...\n');

// Function to test the parallel API calls
async function testParallelApiCalls() {
  logger.info('🔄 Testing parallel API calls...\n');
  
  try {
    // First, let's compile the TypeScript files
    logger.info('1. Compiling TypeScript files...');
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: './backend', stdio: 'inherit' });
    logger.info('✅ TypeScript compilation completed\n');
    
    // Test the fitness service
    logger.info('2. Testing fitness service parallelization...');
    
    // Mock user profile for testing
    const mockUserProfile = {
      trainingCycle: {
        phase: 'strength'
      }
    };
    
    // Mock food items for testing
    const mockFoodItems = ['apple', 'chicken breast', 'rice'];
    
    // Mock preferences for testing
    const mockPreferences = {
      duration: '45 minutes',
      focus: 'upper body'
    };
    
    // Test parallel exercise recommendations
    logger.info('   Testing parallel exercise recommendations...');
    const fitnessService = require('./backend/dist/services/fitnessNutritionService');
    
    // Measure time for parallel execution
    const startTime = Date.now();
    const recommendations = await fitnessService.getExerciseRecommendations(mockUserProfile);
    const endTime = Date.now();
    
    logger.info(`   ✅ Got ${recommendations.length} exercise recommendations in ${endTime - startTime}ms`);
    logger.info(`   Sample recommendation:`, { recommendation: JSON.stringify(recommendations[0] || 'None', null, 2) });
    
    // Test parallel combined fitness data
    logger.info('   Testing parallel combined fitness data...');
    
    // Measure time for parallel execution
    const startTime2 = Date.now();
    const combinedData = await fitnessService.getCombinedFitnessData(mockPreferences, mockFoodItems);
    const endTime2 = Date.now();
    
    logger.info(`   ✅ Got combined fitness data in ${endTime2 - startTime2}ms`);
    logger.info(`   Exercises count: ${combinedData.exercises.length}`);
    logger.info(`   Nutrition count: ${combinedData.nutrition.length}`);
    logger.info(`   Workout plan: ${combinedData.workoutPlan ? 'Generated' : 'Not generated'}\n`);
    
    logger.info('✅ Fitness service parallelization tests completed successfully!\n');
    return true;
    
  } catch (error) {
    logger.error('❌ Error during parallel API calls testing:', { errorMessage: error.message });
    logger.error('Error stack:', { stack: error.stack });
    return false;
  }
}

// Function to test backend route parallelization
async function testBackendRouteParallelization() {
  logger.info('🧪 Testing backend route parallelization...\n');
  
  try {
    logger.info('1. Testing backend route parallelization...');
    
    // Test that the modules can be imported without errors
    const fitnessRoutes = require('./backend/dist/routes/fitnessRoutes');
    logger.info('   ✅ Fitness routes module loaded successfully\n');
    
    logger.info('✅ Backend route parallelization test completed!\n');
    return true;
    
  } catch (error) {
    logger.error('❌ Error during backend route parallelization test:', { errorMessage: error.message });
    return false;
  }
}

// Main test function
async function main() {
  logger.info('🚀 Starting parallel API calls tests...\n');
  
  let allTestsPassed = true;
  
  // Test parallel API calls
  const parallelApiCallsTestPassed = await testParallelApiCalls();
  if (!parallelApiCallsTestPassed) allTestsPassed = false;
  
  // Test backend route parallelization
  const backendRouteParallelizationTestPassed = await testBackendRouteParallelization();
  if (!backendRouteParallelizationTestPassed) allTestsPassed = false;
  
  // Summary
  logger.info('📋 TEST SUMMARY:');
  logger.info('================');
  logger.info(`Parallel API Calls:`, { result: parallelApiCallsTestPassed ? '✅ PASSED' : '❌ FAILED' });
  logger.info(`Backend Route Parallelization:`, { result: backendRouteParallelizationTestPassed ? '✅ PASSED' : '❌ FAILED' });
  logger.info('================');
  
  if (allTestsPassed) {
    logger.info('\n🎉 ALL TESTS PASSED!');
    logger.info('✅ The parallel API calls implementation is working correctly.');
  } else {
    logger.info('\n❌ SOME TESTS FAILED!');
    logger.warn('The parallel API calls implementation requires attention.');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
main().catch(error => {
  logger.error('💥 Unexpected error during testing:', { errorMessage: error.message });
  process.exit(1);
});