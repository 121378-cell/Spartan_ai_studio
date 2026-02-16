/**
 * Garmin Wearable Routes
 *
 * API endpoints for Garmin device management and data operations
 */

import { Router, Request, Response } from 'express';
import garminController from '../controllers/garminController';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { rateLimiter, rateLimitMiddleware } from '../middleware/rateLimiter';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/wearables/garmin/auth-url
 * Get OAuth authorization URL
 *
 * @returns {Object} authUrl - Garmin authorization URL
 */
router.post(
  '/auth-url',
  rateLimitMiddleware,
  authMiddleware,
  garminController.getAuthorizationUrl
);

/**
 * GET /api/wearables/garmin/callback
 * OAuth callback handler
 *
 * @query {string} oauth_token - OAuth token from Garmin
 * @query {string} oauth_verifier - OAuth verifier from Garmin
 */
router.get(
  '/callback',
  rateLimitMiddleware,
  garminController.handleCallback
);

/**
 * POST /api/wearables/garmin/sync
 * Sync biometric data from Garmin
 *
 * @body {string} deviceId - Wearable device ID
 * @body {string} [startDate] - Start date (default: 7 days ago)
 * @body {string} [endDate] - End date (default: today)
 */
router.post(
  '/sync',
  rateLimitMiddleware,
  authMiddleware,
  garminController.syncData
);

/**
 * GET /api/wearables/garmin/devices
 * Get list of connected Garmin devices
 *
 * @returns {Array} devices - List of connected devices
 */
router.get(
  '/devices',
  rateLimitMiddleware,
  authMiddleware,
  garminController.getDevices
);

/**
 * DELETE /api/wearables/garmin/devices/:deviceId
 * Disconnect a Garmin device
 *
 * @param {string} deviceId - Wearable device ID
 */
router.delete(
  '/devices/:deviceId',
  rateLimitMiddleware,
  authMiddleware,
  garminController.disconnectDevice
);

/**
 * GET /api/wearables/garmin/data
 * Get biometric data from Garmin
 *
 * @query {string} [deviceId] - Filter by device
 * @query {string} [dataType] - Filter by data type
 * @query {string} [startDate] - Filter by start date
 * @query {string} [endDate] - Filter by end date
 * @query {number} [limit] - Result limit (default: 100, max: 1000)
 */
router.get(
  '/data',
  rateLimitMiddleware,
  authMiddleware,
  garminController.getBiometricData
);

/**
 * GET /api/wearables/garmin/summary
 * Get daily summary data from Garmin
 *
 * @query {string} date - Date (YYYY-MM-DD)
 */
router.get(
  '/summary',
  rateLimitMiddleware,
  authMiddleware,
  garminController.getDailySummary
);

/**
 * ==============================================
 * MANUAL DATA ENTRY ENDPOINTS
 * Until API credentials are implemented
 * ==============================================
 */

/**
 * POST /api/wearables/garmin/manual/heart-rate
 * Add manual heart rate data entry
 *
 * @body {string} deviceId - Wearable device ID
 * @body {number} timestamp - Unix timestamp in milliseconds
 * @body {number} value - Heart rate value (bpm)
 * @body {string} [unit] - Unit (default: bpm)
 */
router.post(
  '/manual/heart-rate',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualHeartRate
);

/**
 * POST /api/wearables/garmin/manual/sleep
 * Add manual sleep data entry
 *
 * @body {string} deviceId - Wearable device ID
 * @body {string} date - Date (YYYY-MM-DD)
 * @body {number} startTime - Start time (Unix timestamp seconds)
 * @body {number} endTime - End time (Unix timestamp seconds)
 * @body {number} duration - Duration in seconds
 * @body {string} [quality] - Sleep quality (POOR | FAIR | GOOD | EXCELLENT)
 */
router.post(
  '/manual/sleep',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualSleep
);

/**
 * POST /api/wearables/garmin/manual/activity
 * Add manual activity data entry
 *
 * @body {string} deviceId - Wearable device ID
 * @body {string} date - Date (YYYY-MM-DD)
 * @body {string} name - Activity name
 * @body {number} startTime - Start time (Unix timestamp seconds)
 * @body {number} duration - Duration in seconds
 * @body {number} [calories] - Calories burned
 * @body {number} [distance] - Distance in meters
 * @body {number} [steps] - Step count
 * @body {number} [avgHeartRate] - Average heart rate
 * @body {number} [maxHeartRate] - Maximum heart rate
 */
router.post(
  '/manual/activity',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualActivity
);

/**
 * POST /api/wearables/garmin/manual/stress
 * Add manual stress data entry
 *
 * @body {string} deviceId - Wearable device ID
 * @body {string} date - Date (YYYY-MM-DD)
 * @body {number} dayAverage - Daily average stress (0-100)
 * @body {number} [minStress] - Minimum stress level
 * @body {number} [maxStress] - Maximum stress level
 */
router.post(
  '/manual/stress',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualStress
);

/**
 * GET /api/wearables/garmin/manual/data
 * Get manual data entries for a user
 *
 * @query {string} [startDate] - Start date (ISO format)
 * @query {string} [endDate] - End date (ISO format)
 * @returns {Array} dataPoints - List of manual data entries
 */
router.get(
  '/manual/data',
  rateLimitMiddleware,
  authMiddleware,
  garminController.getManualDataEntries
);

/**
 * POST /api/wearables/garmin/manual/bulk-import
 * Bulk import manual data entries
 *
 * @body {string} deviceId - Wearable device ID
 * @body {Array} dataPoints - Array of data points
 *   - timestamp: number (milliseconds)
 *   - dataType: string
 *   - value: number
 *   - unit: string
 *   - confidence: number (0-1, optional)
 * @returns {Object} result - Import result with count
 */
router.post(
  '/manual/bulk-import',
  rateLimitMiddleware,
  authMiddleware,
  garminController.bulkImportManualData
);

/**
 * POST /api/wearables/manual/heart-rate
 * Add manual heart rate data
 *
 * @body {number} timestamp - Unix timestamp in milliseconds
 * @body {number} value - Heart rate in bpm (30-220)
 * @body {string} [device] - Device name (default: manual-input)
 */
router.post(
  '/manual/heart-rate',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualHeartRate
);

/**
 * POST /api/wearables/manual/sleep
 * Add manual sleep data
 *
 * @body {number} startTime - Sleep start timestamp (milliseconds)
 * @body {number} endTime - Sleep end timestamp (milliseconds)
 * @body {string} [quality] - Sleep quality (POOR, FAIR, GOOD, EXCELLENT)
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/manual/sleep',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualSleep
);

/**
 * POST /api/wearables/manual/activity
 * Add manual activity data
 *
 * @body {string} name - Activity name (Running, Cycling, etc.)
 * @body {number} startTime - Activity start timestamp (milliseconds)
 * @body {number} duration - Activity duration (milliseconds)
 * @body {number} [calories] - Calories burned (0-10000)
 * @body {number} [distance] - Distance (meters, 0-1000000)
 * @body {number} [steps] - Step count (0-1000000)
 * @body {number} [avgHeartRate] - Average heart rate (bpm)
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/manual/activity',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualActivity
);

/**
 * POST /api/wearables/manual/stress
 * Add manual stress data
 *
 * @body {number} timestamp - Unix timestamp in milliseconds
 * @body {number} level - Stress level (0-100)
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/manual/stress',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualStress
);

/**
 * POST /api/wearables/manual/weight
 * Add manual weight data
 *
 * @body {number} timestamp - Unix timestamp in milliseconds
 * @body {number} weight - Weight in kg (20-300)
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/manual/weight',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualWeight
);

/**
 * POST /api/wearables/manual/blood-pressure
 * Add manual blood pressure data
 *
 * @body {number} timestamp - Unix timestamp in milliseconds
 * @body {number} systolic - Systolic pressure in mmHg (70-200)
 * @body {number} diastolic - Diastolic pressure in mmHg (40-130)
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/manual/blood-pressure',
  rateLimitMiddleware,
  authMiddleware,
  garminController.addManualBloodPressure
);

/**
 * GET /api/wearables/manual/data
 * Get all manual data for authenticated user
 *
 * @query {number} [limit] - Limit results (default: 100)
 * @returns {Array} data - Array of manual data entries
 */
router.get(
  '/manual/data',
  rateLimitMiddleware,
  authMiddleware,
  garminController.getManualData
);

/**
 * DELETE /api/wearables/manual/data/:dataId
 * Delete manual data entry
 *
 * @param {string} dataId - Data point ID to delete
 */
router.delete(
  '/manual/data/:dataId',
  rateLimitMiddleware,
  authMiddleware,
  garminController.deleteManualData
);

router.use((err: any, req: AuthenticatedRequest, res: Response, next: any) => {
  logger.error('Garmin route error', {
    context: 'garmin-routes',
    error: err.message,
    metadata: { path: req.path }
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

export default router;
