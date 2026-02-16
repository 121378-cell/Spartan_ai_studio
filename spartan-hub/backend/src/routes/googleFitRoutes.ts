import { Router, Request, Response } from 'express';
import { googleFitService } from '../services/googleFitService';
import { verifyJWT as authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/fitness/google/auth
 * Redirects user to Google Consent Screen
 */
router.get('/google/auth', authenticateToken, (req: Request, res: Response) => {
  const {userId} = (req as any).user;
  const url = googleFitService.getAuthUrl(userId);
  return res.json({ url });
});

/**
 * GET /api/fitness/google/callback
 * Handles the OAuth2 callback
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string; // userId passed as state

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  try {
    await googleFitService.handleCallback(code, state);

    // Successful connection - redirect to frontend
    // Adjust this URL to match your frontend route
    return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard?googleFit=connected`);
  } catch (error) {
    logger.error('Google Fit callback failed', { metadata: { error: String(error) } });
    return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard?googleFit=error`);
  }
});

/**
 * GET /api/fitness/google/stats
 * Fetches daily stats
 */
router.get('/google/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {userId} = (req as any).user;

    // Today's stats (midnight to now)
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const steps = await googleFitService.getDailySteps(userId, startOfDay.getTime(), now);

    return res.json({ steps, timestamp: now });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch Google Fit stats' });
  }
});

/**
 * GET /api/fitness/google/status
 * Checks if user is connected to Google Fit
 */
router.get('/google/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {userId} = (req as any).user;
    const connected = await googleFitService.isConnected(userId);
    return res.json({ connected });
  } catch (error) {
    logger.error('Error checking Google Fit status:', { metadata: { error: String(error) } });
    return res.status(500).json({ error: 'Failed to check Google Fit status' });
  }
});

/**
 * POST /api/fitness/google/disconnect
 * Disconnects user from Google Fit, revokes tokens, and cleans profile
 */
router.post('/google/disconnect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {userId} = (req as any).user;
        
    logger.info(`Disconnecting Google Fit for user ${userId}`);
    await googleFitService.disconnect(userId);
        
    return res.json({ 
      success: true, 
      message: 'Google Fit disconnected successfully' 
    });
  } catch (error) {
    logger.error('Error disconnecting Google Fit:', { metadata: { error: String(error) } });
    return res.status(500).json({ 
      error: 'Failed to disconnect Google Fit',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
