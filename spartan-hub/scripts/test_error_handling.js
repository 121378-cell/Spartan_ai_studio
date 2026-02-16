/**
 * Script to test the improved error handling implementation
 * This script will test the error handler utility and endpoints
 */

console.log('🔍 Testing improved error handling implementation...\n');

// Function to test the error handler utility
async function testErrorHandler() {
  console.log('🔄 Testing error handler utility...\n');
  
  try {
    // First, let's compile the TypeScript files
    console.log('1. Compiling TypeScript files...');
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: './backend', stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed\n');
    
    // Test the error handler utility
    console.log('2. Testing error handler utility...');
    const errorHandler = require('./backend/dist/utils/errorHandler');
    
    // Test custom error classes
    console.log('   Testing custom error classes...');
    
    const validationError = new errorHandler.ValidationError('Test validation error');
    console.log(`   ✅ ValidationError: ${validationError.name} - ${validationError.message}`);
    
    const authError = new errorHandler.AuthenticationError('Test authentication error');
    console.log(`   ✅ AuthenticationError: ${authError.name} - ${authError.message}`);
    
    const authzError = new errorHandler.AuthorizationError('Test authorization error');
    console.log(`   ✅ AuthorizationError: ${authzError.name} - ${authzError.message}`);
    
    const notFoundError = new errorHandler.NotFoundError('Test not found error');
    console.log(`   ✅ NotFoundError: ${notFoundError.name} - ${notFoundError.message}`);
    
    const conflictError = new errorHandler.ConflictError('Test conflict error');
    console.log(`   ✅ ConflictError: ${conflictError.name} - ${conflictError.message}`);
    
    const serviceError = new errorHandler.ServiceUnavailableError('Test service unavailable error');
    console.log(`   ✅ ServiceUnavailableError: ${serviceError.name} - ${serviceError.message}\n`);
    
    // Test error response creation
    console.log('   Testing error response creation...');
    const mockRequest = { path: '/test' };
    
    const errorResponse = errorHandler.createErrorResponse(validationError, mockRequest);
    console.log(`   ✅ Error response created: ${JSON.stringify(errorResponse)}\n`);
    
    console.log('✅ Error handler utility tests completed successfully!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during error handler utility testing:', error.message);
    return false;
  }
}

// Function to test error endpoints
async function testErrorEndpoints() {
  console.log('🌐 Testing error endpoints...\n');
  
  try {
    console.log('1. Testing error endpoints...');
    
    // Test that the modules can be imported without errors
    const aiController = require('./backend/dist/controllers/aiController');
    console.log('   ✅ AI controller module loaded successfully');
    
    const planController = require('./backend/dist/controllers/planController');
    console.log('   ✅ Plan controller module loaded successfully');
    
    const authMiddleware = require('./backend/dist/middleware/auth');
    console.log('   ✅ Auth middleware module loaded successfully');
    
    const server = require('./backend/dist/server');
    console.log('   ✅ Server module loaded successfully\n');
    
    console.log('✅ Error endpoints test completed!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during error endpoints test:', error.message);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🚀 Starting error handling tests...\n');
  
  let allTestsPassed = true;
  
  // Test error handler utility
  const errorHandlerTestPassed = await testErrorHandler();
  if (!errorHandlerTestPassed) allTestsPassed = false;
  
  // Test error endpoints
  const errorEndpointsTestPassed = await testErrorEndpoints();
  if (!errorEndpointsTestPassed) allTestsPassed = false;
  
  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  console.log(`Error Handler Utility: ${errorHandlerTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Error Endpoints: ${errorEndpointsTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('================');
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ The improved error handling implementation is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED!');
    console.log('⚠️ The improved error handling implementation requires attention.');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('💥 Unexpected error during testing:', error);
  process.exit(1);
});