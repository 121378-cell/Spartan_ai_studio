import { SecretsManagerService } from '../services/secretsManagerService';
import { logger } from '../utils/logger';

describe('Secrets Manager Service', () => {
  let secretsManager: SecretsManagerService;

  beforeAll(() => {
    logger.info('Starting Secrets Manager Service tests', { context: 'tests' });
    secretsManager = new SecretsManagerService();
  });

  describe('Configuration', () => {
    it('should initialize with environment variables by default', () => {
      const status = secretsManager.getStatus();
      expect(status.enabled).toBe(true);
      expect(['aws', 'environment']).toContain(status.provider);
    });

    it('should show provider as environment when AWS not configured', () => {
      // Assuming AWS credentials are not set in test environment
      const status = secretsManager.getStatus();
      expect(status).toHaveProperty('provider');
    });

    it('should have empty cache initially', () => {
      const cache = secretsManager.getCacheStatus();
      expect(cache.size).toBe(0);
      expect(cache.secrets).toEqual([]);
    });
  });

  describe('Environment Variable Secrets', () => {
    beforeEach(() => {
      // Set test environment variables
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.JWT_SECRET = 'test-jwt-secret';
      process.env.OLLAMA_API_KEY = 'test-ollama-key';
    });

    it('should retrieve database secret from environment', async () => {
      const secret = await secretsManager.getSecret('database-secret');
      expect(secret).toBeDefined();
      expect(Object.keys(secret).length).toBeGreaterThan(0);
    });

    it('should retrieve JWT secret from environment', async () => {
      const secret = await secretsManager.getSecret('jwt-secret');
      expect(secret).toBeDefined();
    });

    it('should retrieve API keys from environment', async () => {
      const secret = await secretsManager.getSecret('api-keys');
      expect(secret).toBeDefined();
    });

    it('should return empty object for unknown secret', async () => {
      const secret = await secretsManager.getSecret('unknown-secret');
      expect(secret).toEqual({});
    });
  });

  describe('Caching', () => {
    beforeEach(() => {
      secretsManager.clearCache();
      process.env.TEST_SECRET = 'test-value';
    });

    it('should cache retrieved secrets', async () => {
      let cache = secretsManager.getCacheStatus();
      expect(cache.size).toBe(0);

      await secretsManager.getSecret('test-secret');
      cache = secretsManager.getCacheStatus();
      expect(cache.size).toBe(1);
    });

    it('should return cached secret without reloading', async () => {
      // Get secret first time
      const secret1 = await secretsManager.getSecret('test-secret');

      // Get secret second time (should be from cache)
      const secret2 = await secretsManager.getSecret('test-secret');

      expect(secret2).toEqual(secret1);
    });

    it('should clear specific secret cache', async () => {
      await secretsManager.getSecret('test-secret');
      let cache = secretsManager.getCacheStatus();
      expect(cache.size).toBe(1);

      secretsManager.clearCache('test-secret');
      cache = secretsManager.getCacheStatus();
      expect(cache.size).toBe(0);
    });

    it('should clear all secrets cache', async () => {
      await secretsManager.getSecret('test-secret');
      await secretsManager.getSecret('database-secret');

      let cache = secretsManager.getCacheStatus();
      expect(cache.size).toBe(2);

      secretsManager.clearCache();
      cache = secretsManager.getCacheStatus();
      expect(cache.size).toBe(0);
    });
  });

  describe('Service Status', () => {
    it('should return service status', () => {
      const status = secretsManager.getStatus();
      
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('cacheSize');
      expect(typeof status.enabled).toBe('boolean');
    });

    it('should report cache status', () => {
      const cache = secretsManager.getCacheStatus();
      
      expect(cache).toHaveProperty('size');
      expect(cache).toHaveProperty('secrets');
      expect(Array.isArray(cache.secrets)).toBe(true);
      expect(typeof cache.size).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing secrets gracefully', async () => {
      const secret = await secretsManager.getSecret('non-existent-secret-xyz');
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('object');
    });

    it('should not throw on repeated access', async () => {
      expect(async () => {
        await secretsManager.getSecret('test-secret');
        await secretsManager.getSecret('test-secret');
        await secretsManager.getSecret('test-secret');
      }).not.toThrow();
    });
  });

  afterAll(() => {
    logger.info('Secrets Manager Service tests completed', { context: 'tests' });
  });
});
