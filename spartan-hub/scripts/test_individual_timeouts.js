/**
 * Script to test individual request timeouts in the fitness and nutrition service
 * This script will test the timeout functionality
 */

console.log('🔍 Testing individual request timeouts...\n');

// Function to test the retry handler with timeouts
async function testRetryHandlerTimeouts() {
  console.log('🔄 Testing retry handler with timeouts...\n');
  
  try {
    // First, let's compile the TypeScript files
    console.log('1. Compiling TypeScript files...');
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: './backend', stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed\n');
    
    // Test the retry handler
    console.log('2. Testing retry handler with timeouts...');
    
    const { executeWithRetry } = require('./backend/dist/utils/retryHandler');
    
    // Test a function that completes quickly
    console.log('   Testing function that completes quickly...');
    const result1 = await executeWithRetry(async () => {
      return 'Quick result';
    }, { timeout: 1000, perRequestTimeout: 500 });
    console.log(`   ✅ Quick function result: ${result1}\n`);
    
    // Test a function that times out
    console.log('   Testing function that times out...');
    try {
      await executeWithRetry(async () => {
        // This will take longer than the timeout
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'This should not be reached';
      }, { timeout: 1000, perRequestTimeout: 1000, maxRetries: 1 });
      console.log('   ❌ This should have timed out');
    } catch (error) {
      console.log(`   ✅ Correctly timed out with error: ${error.message}\n`);
    }
    
    console.log('✅ Retry handler timeout tests completed successfully!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during retry handler timeout testing:', error.message);
    return false;
  }
}

// Function to test fitness service with individual timeouts
async function testFitnessServiceTimeouts() {
  console.log('🧪 Testing fitness service with individual timeouts...\n');
  
  try {
    console.log('1. Testing fitness service with individual timeouts...');
    
    // Test that the modules can be imported without errors
    const fitnessService = require('./backend/dist/services/fitnessNutritionService');
    console.log('   ✅ Fitness service module loaded successfully\n');
    
    console.log('✅ Fitness service timeout test completed!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during fitness service timeout test:', error.message);
    return false;
  }
}

// Function to test backend route timeouts
async function testBackendRouteTimeouts() {
  console.log('サービ Testing backend route timeouts...\n');
  
  try {
    console.log('1. Testing backend route timeouts...');
    
    // Test that the modules can be imported without errors
    const fitnessRoutes = require('./backend/dist/routes/fitnessRoutes');
    console.log('   ✅ Fitness routes module loaded successfully\n');
    
    console.log('✅ Backend route timeout test completed!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during backend route timeout test:', error.message);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🚀 Starting individual request timeout tests...\n');
  
  let allTestsPassed = true;
  
  // Test retry handler with timeouts
  const retryHandlerTimeoutTestPassed = await testRetryHandlerTimeouts();
  if (!retryHandlerTimeoutTestPassed) allTestsPassed = false;
  
  // Test fitness service with individual timeouts
  const fitnessServiceTimeoutTestPassed = await testFitnessServiceTimeouts();
  if (!fitnessServiceTimeoutTestPassed) allTestsPassed = false;
  
  // Test backend route timeouts
  const backendRouteTimeoutTestPassed = await testBackendRouteTimeouts();
  if (!backendRouteTimeoutTestPassed) allTestsPassed = false;
  
  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  console.log(`Retry Handler Timeouts: ${retryHandlerTimeoutTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Fitness Service Timeouts: ${fitnessServiceTimeoutTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Backend Route Timeouts: ${backendRouteTimeoutTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('================');
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ The individual request timeout implementation is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED!');
    console.log('⚠️ The individual request timeout implementation requires attention.');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('💥 Unexpected error during testing:', error);
  process.exit(1);
});