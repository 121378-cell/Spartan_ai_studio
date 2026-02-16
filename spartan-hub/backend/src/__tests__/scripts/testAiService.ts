import { CheckInferenciaIA, checkAiServiceHealth } from '@/services/aiService';
import { logger } from '@/utils/logger';

// Mock user profile data for testing
const mockUserProfile = {
  name: 'Test User',
  email: 'test@example.com',
  quest: 'Get fit',
  stats: {
    totalWorkouts: 10,
    currentStreak: 5,
    joinDate: new Date().toISOString()
  },
  onboardingCompleted: true,
  keystoneHabits: [
    {
      id: 'habit1',
      name: 'Morning Workout',
      anchor: 'After breakfast',
      currentStreak: 5,
      longestStreak: 7
    }
  ],
  masterRegulationSettings: {
    targetBedtime: '22:00'
  },
  nutritionSettings: {
    priority: 'performance' as const
  },
  isInAutonomyPhase: false,
  weightKg: 70,
  role: 'user' // Add role field
};

async function testAiService() {
  logger.info('Testing AI service integration', {
    context: 'test-ai-service'
  });
  
  // Test health check
  logger.info('Testing AI service health check', {
    context: 'test-ai-service',
    metadata: { testStep: 'health-check' }
  });
  try {
    const isHealthy = await checkAiServiceHealth();
    logger.info('AI service health status', {
      context: 'test-ai-service',
      metadata: { isHealthy }
    });
  } catch (error) {
    logger.error('Error checking AI service health', {
      context: 'test-ai-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
  
  // Test AI inference function
  logger.info('Testing CheckInferenciaIA function', {
    context: 'test-ai-service',
    metadata: { testStep: 'inference-function' }
  });
  try {
    const result = await CheckInferenciaIA(mockUserProfile);
    logger.info('AI inference result', {
      context: 'test-ai-service',
      metadata: { result }
    });
  } catch (error) {
    logger.error('Error calling CheckInferenciaIA', {
      context: 'test-ai-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
  
  logger.info('AI service test completed', {
    context: 'test-ai-service'
  });
}

// Run the test
testAiService().catch(error => {
  logger.error('AI service test failed', {
    context: 'test-ai-service',
    metadata: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
  });
});
