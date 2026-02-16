/**
 * Test suite for rate limiting middleware
 */

import express, { Application } from 'express';
import request from 'supertest';
import { globalRateLimit, authRateLimit, apiRateLimit, heavyApiRateLimit, customRateLimit } from '../middleware/rateLimitMiddleware';

describe('Rate Limiting Middleware', () => {
  let app: Application;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  describe('Global Rate Limit Middleware', () => {
    it('should allow requests within limit', async () => {
      app.use(globalRateLimit);
      app.get('/test', (req, res) => {
        res.status(200).json({ message: 'Success' });
      });

      // Make a request within limit
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success');
      // standardHeaders: true sends RateLimit-Limit (lowercased)
      expect(response.headers['ratelimit-limit']).toBe('1000');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Auth Rate Limit Middleware', () => {
    it('should allow requests within auth limit', async () => {
      app.use('/auth', authRateLimit);
      app.post('/auth/login', (req, res) => {
        res.status(200).json({ message: 'Logged in' });
      });

      // Make a request within limit
      const response = await request(app).post('/auth/login');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged in');
      expect(response.headers['ratelimit-limit']).toBe('5');
    });

    it('should block requests exceeding auth limit', async () => {
      app.use('/auth', authRateLimit);
      app.post('/auth/login', (req, res) => {
        res.status(200).json({ message: 'Logged in' });
      });

      // Make 5 requests to reach limit
      for (let i = 0; i < 5; i++) {
        await request(app).post('/auth/login');
      }

      // 6th request should be blocked
      const response = await request(app).post('/auth/login');
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED_AUTH');
    });
  });

  describe('API Rate Limit Middleware', () => {
    it('should allow requests within API limit', async () => {
      app.use('/api', apiRateLimit);
      app.get('/api/users', (req, res) => {
        res.status(200).json({ users: [] });
      });

      // Make a request within limit
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('50');
    });
  });

  describe('Heavy API Rate Limit Middleware', () => {
    it('should allow requests within heavy API limit', async () => {
      app.use('/ai', heavyApiRateLimit);
      app.post('/ai/generate', (req, res) => {
        res.status(200).json({ result: 'Generated' });
      });

      // Make a request within limit
      const response = await request(app).post('/ai/generate');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('20');
    });
  });

  describe('Custom Rate Limit Middleware', () => {
    it('should allow requests within custom limit', async () => {
      const customLimiter = customRateLimit(5, 60000, 'test');
      app.use('/custom', customLimiter);
      app.get('/custom/data', (req, res) => {
        res.status(200).json({ data: 'test' });
      });

      // Make a request within limit
      const response = await request(app).get('/custom/data');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('5');
    });
  });
});
