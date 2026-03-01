/**
 * Test Setup File
 * Phase A: Video Form Analysis MVP
 */

// Mock JWT verification for tests
jest.mock('../middleware/auth', () => ({
  verifyJWT: (req, res, next) => {
    req.user = { userId: 'test-user-123' };
    next();
  }
}));

// Mock rate limiting for tests
jest.mock('../middleware/rateLimitMiddleware', () => ({
  apiRateLimit: (req, res, next) => {
    next();
  }
}));

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
