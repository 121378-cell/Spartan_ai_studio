/**
 * Test API Keys Routes - Basic test endpoints for API keys testing
 */
import { Router, Request, Response } from 'express';
import { verifyJWT } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(verifyJWT);

/**
 * GET /test/api-keys
 * Get test API keys information
 */
router.get('/api-keys', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Test API keys endpoint',
    data: {
      availableKeys: ['test-api-key-1', 'test-api-key-2'],
      note: 'These are test keys for development purposes only'
    }
  });
});

/**
 * POST /test/api-keys/validate
 * Validate a test API key
 */
router.post('/api-keys/validate', (req: Request, res: Response) => {
  const { apiKey } = req.body;
  
  const validKeys = ['test-api-key-1', 'test-api-key-2'];
  
  if (validKeys.includes(apiKey)) {
    res.status(200).json({
      success: true,
      message: 'API key is valid',
      data: { valid: true }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid API key',
      data: { valid: false }
    });
  }
});

export default router;
