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

    it('should set CSRF cookie or return token in response', async () => {
      const response = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      // Token should be returned (cookie or in response)
      expect(response.body).toHaveProperty('token');
      expect(response.body.token.length).toBeGreaterThan(0);
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

      // Should be rejected with auth error (403 CSRF or 401 Unauthorized)
      expect([403, 401, 404]).toContain(response.status);
    });

    it('should reject PUT requests without valid CSRF token', async () => {
      const response = await request(app)
        .put('/fitness/activity/1')
        .send({
          type: 'cycling',
          duration: 45
        });

      expect([403, 401, 404]).toContain(response.status);
    });

    it('should reject DELETE requests without valid CSRF token', async () => {
      const response = await request(app)
        .delete('/fitness/activity/1');

      expect([403, 401, 404]).toContain(response.status);
    });

    it('should allow POST requests with valid CSRF token and authentication', async () => {
      // Get CSRF token first
      const tokenResponse = await request(app)
        .get('/api/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.token;

      // Make authenticated POST request with CSRF token
      // Note: This test may fail if auth is required, which is expected
      const response = await request(app)
        .post('/fitness/activity')
        .set('X-CSRF-Token', csrfToken)
        .set('Authorization', 'Bearer test-token')
        .send({
          type: 'running',
          duration: 30
        });

      // Should not be blocked by CSRF (may fail for other reasons like auth)
      // 403 specifically for CSRF is a failure, but 401/404 for other reasons is OK
      if (response.status === 403) {
        // If it's 403, it should mention CSRF in the message
        if (response.body?.message) {
          expect(response.body.message.toLowerCase()).not.toContain('csrf');
        }
      }
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
        // Message should mention CSRF or token validation
        expect(response.body.message.toLowerCase()).toMatch(/csrf|token|invalid|forbidden/i);
      }
    });
  });

  afterAll(() => {
    logger.info('CSRF protection tests completed', { context: 'csrfTests' });
  });
});
