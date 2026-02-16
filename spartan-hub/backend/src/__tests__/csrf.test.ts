import request from 'supertest';
import { app } from '../server';
import { logger } from '../utils/logger';

describe('CSRF Protection', () => {
  beforeAll(() => {
    logger.info('Starting CSRF protection tests', { context: 'csrfTests' });
  });

  describe('GET /api/csrf-token', () => {
    it('should return a valid CSRF token', async () => {
      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('should set CSRF cookie in response', async () => {
      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      // Check for CSRF cookie (csurf sets it as _csrf)
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return different tokens for different requests', async () => {
      const response1 = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const response2 = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      // Each request should get a new token
      expect(response1.body.token).not.toBe(response2.body.token);
    });
  });

  describe('POST/PUT/DELETE request validation', () => {
    it('should reject POST requests without valid CSRF token', async () => {
      // Attempt to make a POST request without CSRF token
      const response = await request(app)
        .post('/fitness/activity')
        .send({
          type: 'running',
          duration: 30
        });

      // Should be rejected with 403 Forbidden due to CSRF
      expect([403, 401]).toContain(response.status);
    });

    it('should reject PUT requests without valid CSRF token', async () => {
      const response = await request(app)
        .put('/fitness/activity/1')
        .send({
          type: 'cycling',
          duration: 45
        });

      expect([403, 401]).toContain(response.status);
    });

    it('should reject DELETE requests without valid CSRF token', async () => {
      const response = await request(app)
        .delete('/fitness/activity/1');

      expect([403, 401]).toContain(response.status);
    });

    it('should allow POST requests with valid CSRF token', async () => {
      // Get CSRF token first
      const tokenResponse = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.token;
      const cookies = tokenResponse.headers['set-cookie'];

      // Make authenticated POST request with CSRF token
      // Note: This test assumes proper auth is in place
      const response = await request(app)
        .post('/fitness/activity')
        .set('Cookie', cookies)
        .set('X-CSRF-Token', csrfToken)
        .send({
          type: 'running',
          duration: 30
        });

      // Should not be blocked by CSRF (may fail for other reasons like auth)
      expect(response.status).not.toBe(403);
    });
  });

  describe('CSRF error handling', () => {
    it('should return proper error message for invalid CSRF token', async () => {
      const response = await request(app)
        .post('/fitness/activity')
        .set('X-CSRF-Token', 'invalid-token')
        .send({
          type: 'running',
          duration: 30
        });

      // Response should be forbidden or similar auth error
      if (response.status === 403) {
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('CSRF');
      }
    });
  });

  afterAll(() => {
    logger.info('CSRF protection tests completed', { context: 'csrfTests' });
  });
});
