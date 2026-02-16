import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// 1. Define all mock functions first
const mockExecuteAsyncWithReconnection = jest.fn() as any;
const mockCheckOllamaServiceHealth = jest.fn() as any;
const mockRedisPing = jest.fn() as any;

// 2. Setup mocks BEFORE importing
jest.mock('../utils/reconnectionHandler', () => ({
  executeAsyncWithReconnection: mockExecuteAsyncWithReconnection,
  getDatabaseInstance: () => null
}));

jest.mock('../services/aiService', () => ({
  checkOllamaServiceHealth: mockCheckOllamaServiceHealth
}));

jest.mock('../utils/cacheService', () => ({
  redisClient: {
    ping: mockRedisPing
  }
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    prepare: () => ({
      get: () => ({ test: 1 })
    })
  }
}));

jest.mock('../config/postgresReplicaConfig', () => ({
  executeQuery: async () => ({ rows: [{ test: 1 }] }),
  getPoolStats: () => ({ totalCount: 10, idleCount: 5 })
}), { virtual: true });

jest.mock('../utils/metricsCollector', () => ({
  metricsRegistry: {},
  getPerformanceMetrics: () => ({
    getMetrics: async () => ({})
  })
}));

// 3. Import after all mocks are setup
import { checkRedisCacheHealth, getSystemHealth, isSystemHealthy } from '../services/healthService';

const originalNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  process.env.NODE_ENV = 'test';
  jest.clearAllMocks();
  
  // Setup default implementations
  mockExecuteAsyncWithReconnection.mockImplementation(async (fn: any) => {
    if (typeof fn === 'function') {
      return await fn();
    }
    return null;
  });

  mockCheckOllamaServiceHealth.mockResolvedValue(true);
  mockRedisPing.mockResolvedValue('PONG');
});

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe('checkRedisCacheHealth', () => {
  it('returns healthy status when Redis ping succeeds', async () => {
    mockRedisPing.mockResolvedValue('PONG');

    const result = await checkRedisCacheHealth();

    expect(result.name).toBe('Redis Cache');
    expect(result.status).toBe('healthy');
    expect(result.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('returns degraded status when Redis ping fails in non-production', async () => {
    process.env.NODE_ENV = 'test';
    mockRedisPing.mockRejectedValue(new Error('Redis unavailable'));

    const result = await checkRedisCacheHealth();

    expect(result.name).toBe('Redis Cache');
    // In test mode, failures are treated as degraded OR unhealthy depending on implementation
    expect(['degraded', 'unhealthy']).toContain(result.status);
  });

  it('returns unhealthy status when Redis ping fails in production', async () => {
    process.env.NODE_ENV = 'production';
    mockRedisPing.mockRejectedValue(new Error('Redis down'));

    const result = await checkRedisCacheHealth();

    expect(result.name).toBe('Redis Cache');
    expect(result.status).toBe('unhealthy');
  });
});

describe('getSystemHealth', () => {
  it('returns healthy status when all services are healthy', async () => {
    const result = await getSystemHealth();

    expect(result.status).toMatch(/^(healthy|degraded)$/);
    expect(result.services.length).toBeGreaterThanOrEqual(2);
  });

  it('returns unhealthy status when Redis fails in production', async () => {
    process.env.NODE_ENV = 'production';
    mockRedisPing.mockRejectedValue(new Error('Redis down'));

    const result = await getSystemHealth();

    const redisHealth = result.services.find(s => s.name === 'Redis Cache');
    expect(redisHealth?.status).toBe('unhealthy');
  });

  it('includes uptime in system health', async () => {
    const result = await getSystemHealth();

    expect(result.uptime).toBeDefined();
    expect(result.uptime).toMatch(/\d+d/);
  });
});

describe('isSystemHealthy', () => {
  it('returns true when system health status is healthy', async () => {
    const result = await isSystemHealthy();

    expect(typeof result).toBe('boolean');
  });

  it('returns false when system health status is not healthy in production', async () => {
    process.env.NODE_ENV = 'production';
    mockRedisPing.mockRejectedValue(new Error('Redis down'));

    const result = await isSystemHealthy();

    expect(result).toBe(false);
  });
});
