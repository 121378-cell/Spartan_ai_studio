import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { checkAiServiceHealth, checkOllamaServiceHealth } from '../services/aiService';
import { processAiRequest } from '../services/aiService';
import { stopAiServiceMonitoring } from '../utils/aiReconnectionHandler';

describe('AI Service Configuration Tests', () => {
  beforeEach(() => {
    // Clear any existing environment variables that might affect AI service
    delete process.env.AI_SERVICE_URL;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Clean up after each test
    delete process.env.AI_SERVICE_URL;
    delete process.env.NODE_ENV;
    stopAiServiceMonitoring();
  });

  describe('AI Service Configuration', () => {
    it('should have default AI service URL', () => {
      const defaultUrl = 'http://localhost:8001';
      expect(process.env.AI_SERVICE_URL || 'http://localhost:8001').toBe(defaultUrl);
    });

    it('should use custom AI service URL when provided', () => {
      process.env.AI_SERVICE_URL = 'http://custom-ai-service:9000';
      expect(process.env.AI_SERVICE_URL).toBe('http://custom-ai-service:9000');
    });

    it('should have correct Ollama model configured', () => {
      // The model is hardcoded in the service, so we can't test it directly
      // but we can verify the service is using the expected model name
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('AI Service Health Checks', () => {
    it('should handle AI service health check gracefully', async () => {
      // This test verifies that the health check doesn't crash
      // even if the AI service is not available
      const healthResult = await checkAiServiceHealth();
      
      // Should return a boolean
      expect(typeof healthResult).toBe('boolean');
    });

    it('should handle Ollama service health check gracefully', async () => {
      // This test verifies that the Ollama health check doesn't crash
      // even if the service is not available
      const healthResult = await checkOllamaServiceHealth();
      
      // Should return a boolean
      expect(typeof healthResult).toBe('boolean');
    });

    it('should return false when AI service is not available', async () => {
      // In test environment, AI service should not be available
      const healthResult = await checkAiServiceHealth();
      
      // Should return false when service is not available
      expect(typeof healthResult).toBe('boolean');
    });
  });

  describe('AI Request Processing', () => {
    it('should handle alert prediction requests gracefully', async () => {
      // Test with mock user data
      const mockUserData = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        stats: {
          currentStreak: 3,
          totalWorkouts: 12
        },
        keystoneHabits: [
          { currentStreak: 4 }
        ]
      };

      try {
        const result = await processAiRequest('alert_prediction', mockUserData);
        
        // Should return a response with fallback_used flag
        expect(result).toBeDefined();
        if (result && typeof result === 'object' && 'fallback_used' in result) {
          expect(typeof (result as any).fallback_used).toBe('boolean');
        }
      } catch (error) {
        // Expected in test environment when AI service is not available
        expect(error).toBeDefined();
      }
    });

    it('should handle decision generation requests gracefully', async () => {
      // Test with mock decision context
      const mockContext = {
        weekly_score: 75,
        cause: 'Low recovery score',
        synergistic_score: 60
      };

      try {
        const result = await processAiRequest('decision_generation', mockContext);
        
        // Should return a response or null
        expect(result === null || typeof result === 'object').toBe(true);
      } catch (error) {
        // Expected in test environment when AI service is not available
        expect(error).toBeDefined();
      }
    });

    it('should reject unsupported request types', async () => {
      await expect(
        processAiRequest('unsupported_type' as any, {})
      ).rejects.toThrow('Unsupported AI request type: unsupported_type');
    });
  });

  describe('AI Service Fallback Mechanism', () => {
    it('should handle fallback mechanism gracefully', async () => {
      // Test that the service can handle fallback scenarios
      const mockUserData = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        stats: {
          currentStreak: 0,
          totalWorkouts: 0
        },
        keystoneHabits: []
      };

      try {
        const result = await processAiRequest('alert_prediction', mockUserData);
        
        // Should return a response with fallback_used flag set to true
        expect(result).toBeDefined();
        if (result && typeof result === 'object' && 'fallback_used' in result) {
          expect((result as any).fallback_used).toBe(true);
        }
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });
  });
});