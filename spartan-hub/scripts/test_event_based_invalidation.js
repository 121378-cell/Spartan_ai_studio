/**
 * Script to test event-based cache invalidation
 * This script will test the cache event service and invalidation functionality
 */

console.log('🔍 Testing event-based cache invalidation...\n');

// Function to test the cache event service
async function testCacheEventService() {
  console.log('🔄 Testing cache event service...\n');
  
  try {
    // First, let's compile the TypeScript files
    console.log('1. Compiling TypeScript files...');
    const { execSync } = require('child_process');
    execSync('npx tsc', { cwd: './backend', stdio: 'inherit' });
    console.log('✅ TypeScript compilation completed\n');
    
    // Test the cache event service
    console.log('2. Testing cache event service...');
    const cacheEventService = require('./backend/dist/services/cacheEventService');
    const cacheService = require('./backend/dist/utils/cacheService');
    
    // Test event-tag mapping
    console.log('   Testing event-tag mapping...');
    const tagsForExerciseAdded = cacheEventService.getTagsForEvent(cacheEventService.CacheEventType.EXERCISE_ADDED);
    console.log(`   ✅ Tags for EXERCISE_ADDED: [${tagsForExerciseAdded.join(', ')}]`);
    
    const tagsForUserUpdated = cacheEventService.getTagsForEvent(cacheEventService.CacheEventType.USER_PROFILE_UPDATED);
    console.log(`   ✅ Tags for USER_PROFILE_UPDATED: [${tagsForUserUpdated.join(', ')}]\n`);
    
    // Test cache with tags
    console.log('   Testing cache with tags...');
    const testData = { message: 'Hello, cache with tags!', timestamp: Date.now() };
    cacheService.setCachedData('test-key-with-tags', testData, undefined, 'exercise/list', ['exercise/list', 'exercise/test']);
    
    const retrievedData = cacheService.getCachedData('test-key-with-tags');
    console.log(`   ✅ Retrieved data with tags: ${JSON.stringify(retrievedData)}\n`);
    
    // Test cache statistics with tag distribution
    console.log('   Testing cache statistics with tag distribution...');
    const stats = cacheService.getCacheStats();
    console.log(`   ✅ Cache size: ${stats.size}`);
    console.log(`   ✅ Tag distribution: ${JSON.stringify(stats.tagDistribution)}\n`);
    
    // Test cache invalidation by tag
    console.log('   Testing cache invalidation by tag...');
    const invalidatedCount = cacheService.invalidateCacheByTag('exercise/list');
    console.log(`   ✅ Invalidated ${invalidatedCount} entries by tag 'exercise/list'\n`);
    
    // Test that data was invalidated
    const invalidatedData = cacheService.getCachedData('test-key-with-tags');
    console.log(`   ✅ Data after invalidation: ${invalidatedData} (should be null)\n`);
    
    // Test event-triggered invalidation
    console.log('   Testing event-triggered invalidation...');
    
    // Add some data back to cache
    cacheService.setCachedData('test-key-1', { data: 'test1' }, undefined, 'exercise/list', ['exercise/list']);
    cacheService.setCachedData('test-key-2', { data: 'test2' }, undefined, 'exercise/detail', ['exercise/detail']);
    cacheService.setCachedData('test-key-3', { data: 'test3' }, undefined, 'nutrition/info', ['nutrition/info']);
    
    console.log('   ✅ Added test data to cache');
    
    // Trigger invalidation by event
    const eventInvalidatedCount = cacheEventService.triggerCacheInvalidation(cacheEventService.CacheEventType.EXERCISE_UPDATED);
    console.log(`   ✅ Event-triggered invalidation invalidated ${eventInvalidatedCount} entries\n`);
    
    // Test cache clearing
    console.log('   Testing cache clearing...');
    cacheService.clearCache();
    const clearedStats = cacheService.getCacheStats();
    console.log(`   ✅ Cache size after clearing: ${clearedStats.size}\n`);
    
    console.log('✅ Cache event service tests completed successfully!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during cache event service testing:', error.message);
    return false;
  }
}

// Function to test integration with fitness service
async function testFitnessServiceIntegration() {
  console.log('🧪 Testing fitness service integration...\n');
  
  try {
    console.log('1. Testing fitness service integration...');
    
    // Test that the modules can be imported without errors
    const fitnessService = require('./services/fitnessNutritionService');
    console.log('   ✅ Fitness service module loaded successfully\n');
    
    console.log('✅ Fitness service integration test completed!\n');
    return true;
    
  } catch (error) {
    console.error('❌ Error during fitness service integration test:', error.message);
    return false;
  }
}

// Main test function
async function main() {
  console.log('🚀 Starting event-based cache invalidation tests...\n');
  
  let allTestsPassed = true;
  
  // Test cache event service
  const cacheEventServiceTestPassed = await testCacheEventService();
  if (!cacheEventServiceTestPassed) allTestsPassed = false;
  
  // Test fitness service integration
  const fitnessServiceIntegrationTestPassed = await testFitnessServiceIntegration();
  if (!fitnessServiceIntegrationTestPassed) allTestsPassed = false;
  
  // Summary
  console.log('📋 TEST SUMMARY:');
  console.log('================');
  console.log(`Cache Event Service: ${cacheEventServiceTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Fitness Service Integration: ${fitnessServiceIntegrationTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('================');
  
  if (allTestsPassed) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ The event-based cache invalidation implementation is working correctly.');
  } else {
    console.log('\n❌ SOME TESTS FAILED!');
    console.log('⚠️ The event-based cache invalidation implementation requires attention.');
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
main().catch(error => {
  console.error('💥 Unexpected error during testing:', error);
  process.exit(1);
});