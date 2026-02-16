import { HttpService } from './httpService';
import { logger } from '../utils/logger';

async function testHttpService() {
  logger.info('Testing HTTP service with aggressive timeout', {
    context: 'test-http-service'
  });
  
  try {
    // Test health check
    logger.info('Testing backend health check', {
      context: 'test-http-service',
      metadata: { testStep: 'health-check' }
    });
    const healthResponse = await HttpService.get('/health');
    logger.info('Health check response', {
      context: 'test-http-service',
      metadata: { healthData: healthResponse.data }
    });
  } catch (error) {
    logger.error('Health check failed (expected if backend is not running)', {
      context: 'test-http-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
  
  try {
    // Test timeout with a non-existent endpoint
    logger.info('Testing timeout with non-existent endpoint', {
      context: 'test-http-service',
      metadata: { testStep: 'timeout-test' }
    });
    await HttpService.get('/non-existent-endpoint');
  } catch (error) {
    logger.error('Timeout test result', {
      context: 'test-http-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
  
  logger.info('HTTP service test completed', {
    context: 'test-http-service'
  });
}

// Run the test
testHttpService().catch(error => {
  logger.error('HTTP service test failed', {
    context: 'test-http-service',
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
  });
});
