import { PersistenceService } from './persistenceService';

// Test the persistence service
async function testPersistenceService() {
  console.log('Testing Persistence Service...');
  
  // Test saving and loading last loaded routine
  console.log('\n1. Testing last loaded routine persistence...');
  const testRoutine = {
    id: 'test-123',
    name: 'Test Routine',
    focus: 'strength',
    duration: 45,
    blocks: [
      {
        name: 'Warm-up',
        exercises: [
          { name: 'Jumping Jacks', sets: 1, reps: '10' }
        ]
      }
    ]
  };
  
  const saveSuccess = PersistenceService.saveLastLoadedRoutine(testRoutine);
  console.log('Save success:', saveSuccess);
  
  const loadedRoutine = PersistenceService.getLastLoadedRoutine();
  console.log('Loaded routine:', (loadedRoutine as any)?.name);
  
  // Test critical data persistence
  console.log('\n2. Testing critical data persistence...');
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  };
  
  const saveCriticalSuccess = PersistenceService.saveCriticalData('userProfile', userData);
  console.log('Save critical data success:', saveCriticalSuccess);
  
  const loadedCriticalData = PersistenceService.getCriticalData('userProfile');
  console.log('Loaded critical data:', (loadedCriticalData as any)?.name);

  // Test cache functionality
  console.log('\n3. Testing cache functionality...');
  const cacheData = { message: 'Hello from cache', timestamp: Date.now() };
  const cacheSuccess = PersistenceService.saveToCache('testKey', cacheData, 5000); // 5 second TTL
  console.log('Cache save success:', cacheSuccess);

  const loadedCacheData = PersistenceService.getFromCache('testKey');
  console.log('Loaded cache data:', (loadedCacheData as any)?.message);
  
  // Test storage info
  console.log('\n4. Testing storage info...');
  const storageInfo = PersistenceService.getStorageInfo();
  if (storageInfo) {
    console.log(`Storage usage: ${storageInfo.percentage}% (${storageInfo.used} bytes)`);
  }
  
  console.log('\nPersistence service test completed!');
}

// Run the test
testPersistenceService().catch(console.error);
