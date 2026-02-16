import express, { Request, Response } from 'express';
import request from 'supertest';
import { rateLimitAlertMiddleware } from '../middleware/alertMiddleware';
import { alertService } from '../services/alertService';

jest.mock('../services/alertService', () => {
  const actual = jest.requireActual('../services/alertService');
  return {
    ...actual,
    alertService: {
      ...actual.alertService,
      createAlert: jest.fn()
    }
  };
});

describe('Alert Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Reset mock
    (alertService.createAlert as jest.Mock).mockClear();
  });

  describe('rateLimitAlertMiddleware', () => {
    it('should create an alert when rate limit is exceeded (429 status)', async () => {
      app.use(rateLimitAlertMiddleware);

      app.get('/test-rate-limit', (req, res) => {
        res.status(429).json({ message: 'Too many requests' });
      });
      
      // Make request
      const response = await request(app)
        .get('/test-rate-limit')
        .expect(429);
      
      // Verify alert was created
      expect(alertService.createAlert).toHaveBeenCalledWith(
        'rate_limit_exceeded',
        'medium',
        expect.stringContaining('Rate limit exceeded'),
        'rateLimitAlertMiddleware',
        expect.objectContaining({
          endpoint: '/test-rate-limit',
          method: 'GET'
        })
      );
    });

    it('should not create an alert for non-429 responses', async () => {
      app.use(rateLimitAlertMiddleware);

      app.get('/test-success', (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
      
      // Make request
      const response = await request(app)
        .get('/test-success')
        .expect(200);
      
      // Verify alert was not created
      expect(alertService.createAlert).not.toHaveBeenCalled();
    });
  });
});
