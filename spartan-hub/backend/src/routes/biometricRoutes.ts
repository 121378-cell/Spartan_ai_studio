/**
 * Biometric & Wearable Integration Routes
 * Base path: /api/biometrics
 * 
 * Endpoints for managing biometric data from multiple sources:
 * - Apple Health
 * - Garmin Connect
 * - Oura Ring
 * - Withings
 * 
 * All endpoints require authentication
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { verifyJWT } from '../middleware/auth';
import { apiRateLimit } from '../middleware/rateLimitMiddleware';
import {
  getConnectedDevices,
  registerWearableDevice,
  getBiometricData,
  getDailySummary,
  getHealthSummary,
  appleHealthCallback,
  syncAppleHealthData,
  getAppleHealthAuthUrl
} from '../controllers/biometricController';

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimit);

// Apply authentication to all routes
router.use(verifyJWT);

/**
 * Device Management Routes
 */

// GET /api/biometrics/devices - Get connected devices
router.get('/devices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getConnectedDevices(req, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/biometrics/devices/register - Register new device
router.post('/devices/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await registerWearableDevice(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * Biometric Data Routes
 */

// GET /api/biometrics/data - Get biometric data for date range
router.get('/data', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getBiometricData(req, res);
  } catch (error) {
    next(error);
  }
});

// GET /api/biometrics/summary/daily/:date - Get daily summary
router.get('/summary/daily/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getDailySummary(req, res);
  } catch (error) {
    next(error);
  }
});

// GET /api/biometrics/summary/range - Get health summary for date range
router.get('/summary/range', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getHealthSummary(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * Apple Health Routes
 */

// GET /api/biometrics/apple-health/authorize - Get authorization URL
router.get('/apple-health/authorize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getAppleHealthAuthUrl(req, res);
  } catch (error) {
    next(error);
  }
});

// GET /api/biometrics/apple-health/callback - OAuth callback
router.get('/apple-health/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await appleHealthCallback(req, res);
  } catch (error) {
    next(error);
  }
});

// POST /api/biometrics/apple-health/sync - Sync Apple Health data
router.post('/apple-health/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await syncAppleHealthData(req, res);
  } catch (error) {
    next(error);
  }
});

/**
 * Garmin Routes
 */
import garminRoutes from './garminRoutes';
router.use('/garmin', garminRoutes);

/**
 * Oura Routes (Future Implementation)
 */

// GET /api/biometrics/oura/authorize - Get authorization URL
router.get('/oura/authorize', async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Oura Ring integration coming soon',
    data: {
      status: 'pending'
    }
  });
});

// POST /api/biometrics/oura/sync - Sync Oura data
router.post('/oura/sync', async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Oura Ring integration coming soon',
    data: {
      status: 'pending'
    }
  });
});

/**
 * Withings Routes (Future Implementation)
 */

// GET /api/biometrics/withings/authorize - Get authorization URL
router.get('/withings/authorize', async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Withings integration coming soon',
    data: {
      status: 'pending'
    }
  });
});

// POST /api/biometrics/withings/sync - Sync Withings data
router.post('/withings/sync', async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Withings integration coming soon',
    data: {
      status: 'pending'
    }
  });
});

export default router;
