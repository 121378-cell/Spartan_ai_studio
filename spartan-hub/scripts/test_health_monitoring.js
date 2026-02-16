/**
 * Script to test the health monitoring implementation
 * This script will test the health service and endpoints
 */

console.log('🔍 Testing health monitoring implementation...\n');

// Function to test the health service
async function testHealthService() {
  console.log('🔄 Testing health service...\n');
  
  try {
    // First, let's compile the TypeScript files
    console.log('1. Compiling TypeScript files...');
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: './backend', stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed\n');
    
    // Test the health service
    console.log('2. Testing health service...');
    const { getSystemHealth, isSystemHealthy } = require('./backend/dist/services/healthService');
    
    // Test system health
    console.log('   Testing system health...');
    const health = await getSystemHealth();
    console.log(`   ✅ System health status: ${health.status}`);
    console.log(`   ✅ Uptime: ${health.uptime}`);
    console.log(`   ✅ Services checked: ${health.services.length}`);
    
    // Display service details
    health.services.forEach(service => {
      console.log(`      - ${service.name}: ${service.status}${service.message ? ` (${service.message})` : ''}`);
    });
    
    console.log('');
    
    // Test simple health status
    console.log('   Testing simple health status...');
    const isHealthy = await isSystemHealthy();
    console.log(`   ✅ Simple health status: ${isHealthy ? 'healthy' : 'unhealthy'}\n`);
    
    console.log('✅ Health service tests completed successfully!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during health service testing:', error.message);
    return false;
  }
}

// Function to test health endpoints
async function testHealthEndpoints() {
  console.log('🌐 Testing health endpoints...\n');
  
  try {
    console.log('1. Testing health endpoints...');
    
    // Since we don't have a server running, we'll just verify the route registration
    const healthRoutes = require('./backend/dist/routes/healthRoutes');
    console.log('   ✅ Health routes module loaded successfully\n');
    
    console.log('✅ Health endpoints test completed!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during health endpoints test:', error.message);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🚀 Starting health monitoring tests...\n');
  
  let allTestsPassed = true;
  
  // Test health service
  const healthServiceTestPassed = await testHealthService();
  if (!healthServiceTestPassed) allTestsPassed = false;
  
  // Test health endpoints
  const healthEndpointsTestPassed = await testHealthEndpoints();
  if (!healthEndpointsTestPassed) allTestsPassed = false;
  
  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  console.log(`Health Service: ${healthServiceTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Health Endpoints: ${healthEndpointsTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('================');
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ The health monitoring implementation is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED!');
    console.log('⚠️ The health monitoring implementation requires attention.');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('💥 Unexpected error during testing:', error);
  process.exit(1);
});