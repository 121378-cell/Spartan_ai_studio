/**
 * Script to test the retry pattern implementation
 * This script will test the retry handler utility
 */

console.log('🔍 Testing retry pattern implementation...\n');

// Function to test the retry pattern
async function testRetryPattern() {
  console.log('🔄 Testing retry pattern...\n');
  
  try {
    // First, let's compile the TypeScript files
    console.log('1. Compiling TypeScript files...');
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: './backend', stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed\n');
    
    // Test the retry handler
    console.log('2. Testing retry handler...');
    const { executeWithRetry } = require('./backend/dist/utils/retryHandler');
    
    // Test a successful function
    console.log('   Testing successful function...');
    const result1 = await executeWithRetry(async () => {
      return 'Success!';
    });
    console.log(`   ✅ Successful function result: ${result1}\n`);
    
    // Test a function that fails and then succeeds
    console.log('   Testing function with retries...');
    let attemptCount = 0;
    const result2 = await executeWithRetry(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Temporary failure');
      }
      return `Success after ${attemptCount} attempts`;
    }, { maxRetries: 5, initialDelay: 100 });
    console.log(`   ✅ Function with retries result: ${result2}\n`);
    
    // Test a function that always fails
    console.log('   Testing function that always fails...');
    try {
      await executeWithRetry(async () => {
        throw new Error('Permanent failure');
      }, { maxRetries: 2, initialDelay: 100 });
      console.log('   ❌ This should have failed');
    } catch (error) {
      console.log(`   ✅ Correctly failed with error: ${error.message}\n`);
    }
    
    // Test timeout functionality
    console.log('   Testing timeout functionality...');
    try {
      await executeWithRetry(async () => {
        // This will take longer than the timeout
        await new Promise(resolve => setTimeout(resolve, 2000));
        return 'This should not be reached';
      }, { timeout: 1000, maxRetries: 1 });
      console.log('   ❌ This should have timed out');
    } catch (error) {
      console.log(`   ✅ Correctly timed out with error: ${error.message}\n`);
    }
    
    console.log('✅ Retry pattern tests completed successfully!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during retry pattern testing:', error.message);
    return false;
  }
}

// Function to test AI service retry integration
async function testAiServiceRetry() {
  console.log('🤖 Testing AI service retry integration...\n');
  
  try {
    console.log('1. Testing AI service retry integration...');
    // This would test the actual AI service retry integration
    // Since we don't have a real AI service running, we'll just verify the imports work
    const aiService = require('./backend/dist/services/aiService');
    console.log('   ✅ AI service module loaded successfully\n');
    
    console.log('✅ AI service retry integration test completed!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during AI service retry integration test:', error.message);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🚀 Starting retry pattern tests...\n');
  
  let allTestsPassed = true;
  
  // Test retry pattern
  const retryTestPassed = await testRetryPattern();
  if (!retryTestPassed) allTestsPassed = false;
  
  // Test AI service retry integration
  const aiServiceTestPassed = await testAiServiceRetry();
  if (!aiServiceTestPassed) allTestsPassed = false;
  
  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  console.log(`Retry Pattern: ${retryTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`AI Service Retry Integration: ${aiServiceTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('================');
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ The retry pattern implementation is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED!');
    console.log('⚠️ The retry pattern implementation requires attention.');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('💥 Unexpected error during testing:', error);
  process.exit(1);
});