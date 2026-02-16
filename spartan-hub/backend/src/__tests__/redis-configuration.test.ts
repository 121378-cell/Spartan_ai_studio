import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Redis Configuration Tests', () => {
  beforeEach(() => {
    // Clear any existing environment variables that might affect Redis
    delete process.env.REDIS_URL;
    delete process.env.NODE_ENV;
    jest.resetModules();
  });

  afterEach(() => {
    // Clean up after each test
    delete process.env.REDIS_URL;
    delete process.env.NODE_ENV;
    jest.resetModules();
  });

  describe('Redis Configuration', () => {
    it('should have default Redis configuration', () => {
      // Set test environment
      process.env.NODE_ENV = 'test';
      
      const config = require('../config/configService').default;
      const redisConfig = {
        redisUrl: config.get('redisUrl'),
        redisEnabled: config.get('redisEnabled')
      };

      expect(redisConfig.redisUrl).toBe('redis://localhost:6379');
      expect(redisConfig.redisEnabled).toBe(false); // Should be disabled in test environment
    });

    it('should enable Redis in development environment with URL', () => {
      process.env.NODE_ENV = 'development';
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const config = require('../config/configService').default;
      const redisConfig = {
        redisUrl: config.get('redisUrl'),
        redisEnabled: config.get('redisEnabled')
      };

      expect(redisConfig.redisUrl).toBe('redis://localhost:6379');
      expect(redisConfig.redisEnabled).toBe(true);
    });

    it('should disable Redis in test environment even with URL', () => {
      process.env.NODE_ENV = 'test';
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const config = require('../config/configService').default;
      const redisConfig = {
        redisUrl: config.get('redisUrl'),
        redisEnabled: config.get('redisEnabled')
      };

      expect(redisConfig.redisUrl).toBe('redis://localhost:6379');
      expect(redisConfig.redisEnabled).toBe(false); // Should remain disabled in test
    });

    it('should disable Redis when URL is empty', () => {
      process.env.NODE_ENV = 'development';
      process.env.REDIS_URL = '';
      
      const config = require('../config/configService').default;
      const redisConfig = {
        redisUrl: config.get('redisUrl'),
        redisEnabled: config.get('redisEnabled')
      };

      expect(redisConfig.redisUrl).toBe('redis://localhost:6379');
      expect(redisConfig.redisEnabled).toBe(false); // Should be disabled with empty URL
    });

    it('should disable Redis when URL is undefined', () => {
      process.env.NODE_ENV = 'development';
      // Don't set REDIS_URL
      
      const config = require('../config/configService').default;
      const redisConfig = {
        redisUrl: config.get('redisUrl'),
        redisEnabled: config.get('redisEnabled')
      };

      expect(redisConfig.redisUrl).toBe('redis://localhost:6379');
      expect(redisConfig.redisEnabled).toBe(false); // Should be disabled without URL
    });
  });

  describe('Redis Health Check', () => {
    it('should handle Redis health check gracefully', async () => {
      const { checkRedisCacheHealth } = require('../services/healthService');
      // This test verifies that the health check doesn't crash
      // even if Redis is not available
      const healthResult = await checkRedisCacheHealth();
      
      expect(healthResult).toBeDefined();
      expect(healthResult.name).toBe('Redis Cache');
      expect(healthResult.status).toBeDefined();
      expect(healthResult.responseTime).toBeDefined();
      expect(healthResult.lastChecked).toBeDefined();
      
      // Status should be either 'healthy' or 'unhealthy'
      expect(['healthy', 'unhealthy']).toContain(healthResult.status);
    });

    it('should return unhealthy status when Redis is disabled', async () => {
      // In test environment, Redis should be disabled
      process.env.NODE_ENV = 'test';
      
      const { checkRedisCacheHealth } = require('../services/healthService');
      
      const healthResult = await checkRedisCacheHealth();
      
      // Should not be healthy in test environment
      expect(healthResult.status).toBe('unhealthy');
      expect(healthResult.message).toBeDefined();
    });
  });

  describe('Redis Client Connection', () => {
    it('should have Redis client available', () => {
      const { redisClient } = require('../utils/cacheService');
      expect(redisClient).toBeDefined();
      expect(typeof redisClient.ping).toBe('function');
      expect(typeof redisClient.get).toBe('function');
      expect(typeof redisClient.set).toBe('function');
    });

    it('should handle Redis client operations gracefully', async () => {
      const { redisClient } = require('../utils/cacheService');
      // Test basic operations without expecting them to succeed
      // since Redis might not be running in test environment
      
      try {
        // Try to ping Redis
        await redisClient.ping();
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }

      try {
        // Try to get a non-existent key
        await redisClient.get('non-existent-key');
      } catch (error) {
        // Expected in test environment
        expect(error).toBeDefined();
      }
    });
  });
});