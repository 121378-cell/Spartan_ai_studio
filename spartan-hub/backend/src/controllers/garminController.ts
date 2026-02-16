/**
 * Garmin Biometric Controller
 *
 * Handles HTTP requests for Garmin device management and data operations
 * - Device registration and OAuth flow
 * - Data synchronization
 * - Biometric data retrieval
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import garminHealthService from '../services/garminHealthService';
import ManualDataEntryService from '../services/manualDataEntryService';
import garminManualDataService from '../services/garminManualDataService';
import { getDatabase, getDatabaseManager } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { sanitizeInput, validateAndSanitizeString } from '../utils/sanitization';
import { ValidationError, NotFoundError } from '../utils/errorHandler';

// Extend Express Request to include user info
interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: any;
}

export class GarminController {
  private db = getDatabase();
  private manualDataService = new ManualDataEntryService();

  /**
   * GET /api/wearables/garmin/auth-url
   * Start Garmin OAuth flow - return authorization URL
   */
  getAuthorizationUrl = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      logger.info('Requesting Garmin authorization URL', {
        context: 'garmin-controller',
        metadata: { userId }
      });

      const { url, requestToken, requestTokenSecret } = garminHealthService.getAuthorizationUrl(userId);

      // Store request tokens for verification during callback
      // In production, use Redis or session storage
      (req as any).session = (req as any).session || {};
      (req as any).session.garminRequestToken = requestToken;
      (req as any).session.garminRequestTokenSecret = requestTokenSecret;

      res.status(200).json({
        success: true,
        authUrl: url,
        message: 'Redirect user to this URL to authorize Garmin access'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        logger.error('Error getting Garmin auth URL', {
          context: 'garmin-controller',
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ success: false, message: 'Failed to get authorization URL' });
      }
    }
  };

  /**
   * GET /api/wearables/garmin/callback
   * OAuth callback handler - exchange code for tokens and register device
   */
  handleCallback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { oauth_token, oauth_verifier } = req.query;
      if (!oauth_token || !oauth_verifier) {
        throw new ValidationError('Missing OAuth callback parameters');
      }

      const sanitizedToken = sanitizeInput(String(oauth_token));
      const sanitizedVerifier = sanitizeInput(String(oauth_verifier));

      logger.info('Processing Garmin OAuth callback', {
        context: 'garmin-controller',
        metadata: { userId }
      });

      // Exchange tokens
      const tokens = await garminHealthService.exchangeTokens(
        userId,
        sanitizedToken,
        sanitizedVerifier
      );

      // Register device
      const device = await garminHealthService.registerDevice(userId, tokens);

      logger.info('Garmin device registered via OAuth', {
        context: 'garmin-controller',
        metadata: { userId, deviceId: device.id }
      });

      res.status(200).json({
        success: true,
        device,
        message: 'Garmin device successfully connected'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        logger.error('Error handling Garmin callback', {
          context: 'garmin-controller',
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ success: false, message: 'OAuth callback failed' });
      }
    }
  };

  /**
   * POST /api/wearables/garmin/sync
   * Sync biometric data from Garmin
   */
  syncData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { deviceId } = req.body;
      if (!deviceId) {
        throw new ValidationError('Device ID is required');
      }

      const sanitizedDeviceId = sanitizeInput(deviceId);

      logger.info('Starting Garmin data sync', {
        context: 'garmin-controller',
        metadata: { userId, deviceId: sanitizedDeviceId }
      });

      // Optional: date range
      const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date();

      // Perform full sync
      const syncResult = await garminHealthService.fullSync(
        userId,
        sanitizedDeviceId,
        startDate,
        endDate
      );

      logger.info('Garmin data sync completed', {
        context: 'garmin-controller',
        metadata: {
          userId,
          deviceId: sanitizedDeviceId,
          totalPoints: syncResult.totalPoints,
          errors: syncResult.errors.length
        }
      });

      res.status(200).json({
        success: syncResult.success,
        totalPoints: syncResult.totalPoints,
        errors: syncResult.errors,
        message: `Synced ${syncResult.totalPoints} biometric data points`
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        logger.error('Error syncing Garmin data', {
          context: 'garmin-controller',
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ success: false, message: 'Data sync failed' });
      }
    }
  };

  /**
   * GET /api/wearables/garmin/devices
   * Get list of connected Garmin devices for user
   */
  getDevices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      logger.info('Fetching Garmin devices', {
        context: 'garmin-controller',
        metadata: { userId }
      });

      const devices = this.db.prepare(`
        SELECT id, userId, deviceType, deviceName, isActive, lastSyncAt, createdAt
        FROM wearable_devices
        WHERE userId = ? AND deviceType = 'garmin'
        ORDER BY createdAt DESC
      `).all(userId) as any[];

      res.status(200).json({
        success: true,
        devices: devices.map(d => ({
          id: d.id,
          userId: d.userId,
          deviceType: d.deviceType,
          deviceName: d.deviceName,
          isActive: d.isActive === 1,
          lastSyncAt: d.lastSyncAt,
          createdAt: d.createdAt
        })),
        count: devices.length
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        logger.error('Error fetching Garmin devices', {
          context: 'garmin-controller',
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ success: false, message: 'Failed to fetch devices' });
      }
    }
  };

  /**
   * DELETE /api/wearables/garmin/devices/:deviceId
   * Disconnect a Garmin device
   */
  disconnectDevice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { deviceId } = req.params;
      const sanitizedDeviceId = sanitizeInput(deviceId);

      logger.info('Disconnecting Garmin device', {
        context: 'garmin-controller',
        metadata: { userId, deviceId: sanitizedDeviceId }
      });

      // Verify device belongs to user
      const device = this.db.prepare(`
        SELECT id FROM wearable_devices
        WHERE id = ? AND userId = ? AND deviceType = 'garmin'
      `).get(sanitizedDeviceId, userId) as any;

      if (!device) {
        throw new NotFoundError('Device not found');
      }

      // Delete device
      const stmt = this.db.prepare('DELETE FROM wearable_devices WHERE id = ? AND userId = ?');
      stmt.run(sanitizedDeviceId, userId);

      logger.info('Garmin device disconnected', {
        context: 'garmin-controller',
        metadata: { userId, deviceId: sanitizedDeviceId }
      });

      res.status(200).json({
        success: true,
        message: 'Device successfully disconnected'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
      } else if (error instanceof NotFoundError) {
        res.status(404).json({ success: false, message: error.message });
      } else {
        logger.error('Error disconnecting Garmin device', {
          context: 'garmin-controller',
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ success: false, message: 'Failed to disconnect device' });
      }
    }
  };

  /**
   * GET /api/wearables/garmin/data
   * Get biometric data from Garmin devices
   */
  getBiometricData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Parse query parameters
      const { deviceId, dataType, startDate, endDate, limit = 100 } = req.query;

      // Build query
      let query = 'SELECT * FROM biometric_data_points WHERE userId = ? AND device = "garmin"';
      const params: any[] = [userId];

      if (deviceId) {
        // Find device ID by wearable device ID
        const device = this.db.prepare(`
          SELECT id FROM wearable_devices WHERE id = ? AND userId = ? AND deviceType = 'garmin'
        `).get(sanitizeInput(String(deviceId)), userId) as any;

        if (device) {
          // Can filter by device source name if needed
        }
      }

      if (dataType) {
        query += ' AND dataType = ?';
        params.push(sanitizeInput(String(dataType)));
      }

      if (startDate) {
        const timestamp = new Date(String(startDate)).getTime();
        query += ' AND timestamp >= ?';
        params.push(timestamp);
      }

      if (endDate) {
        const timestamp = new Date(String(endDate)).getTime();
        query += ' AND timestamp <= ?';
        params.push(timestamp);
      }

      query += ' ORDER BY timestamp DESC LIMIT ?';
      const limitNum = Math.min(parseInt(String(limit)) || 100, 1000);
      params.push(limitNum);

      const dataPoints = this.db.prepare(query).all(...params) as any[];

      logger.info('Retrieved Garmin biometric data', {
        context: 'garmin-controller',
        metadata: { userId, pointsCount: dataPoints.length }
      });

      res.status(200).json({
        success: true,
        dataPoints: dataPoints.map(dp => ({
          id: dp.id,
          userId: dp.userId,
          timestamp: dp.timestamp,
          dataType: dp.dataType,
          value: dp.value,
          unit: dp.unit,
          device: dp.device,
          source: dp.source,
          confidence: dp.confidence,
          createdAt: dp.createdAt
        })),
        count: dataPoints.length
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        logger.error('Error retrieving Garmin biometric data', {
          context: 'garmin-controller',
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ success: false, message: 'Failed to retrieve data' });
      }
    }
  };

  /**
   * GET /api/wearables/garmin/summary
   * Get daily summary data from Garmin
   */
  getDailySummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { date } = req.query;
      if (!date) {
        throw new ValidationError('Date parameter is required (YYYY-MM-DD)');
      }

      const sanitizedDate = sanitizeInput(String(date));

      logger.info('Fetching Garmin daily summary', {
        context: 'garmin-controller',
        metadata: { userId, date: sanitizedDate }
      });

      const summary = this.db.prepare(`
        SELECT * FROM daily_biometric_summaries
        WHERE userId = ? AND date = ?
      `).get(userId, sanitizedDate) as any;

      if (!summary) {
        res.status(404).json({
          success: false,
          message: 'No summary data for this date'
        });
        return;
      }

      res.status(200).json({
        success: true,
        summary: {
          id: summary.id,
          userId: summary.userId,
          date: summary.date,
          heartRateAvg: summary.heartRateAvg,
          heartRateMin: summary.heartRateMin,
          heartRateMax: summary.heartRateMax,
          rhhr: summary.rhhr,
          hrvAvg: summary.hrvAvg,
          sleepDuration: summary.sleepDuration,
          sleepQuality: summary.sleepQuality,
          totalSteps: summary.totalSteps,
          totalDistance: summary.totalDistance,
          caloriesBurned: summary.caloriesBurned,
          avgSpO2: summary.avgSpO2,
          bodyTemperature: summary.bodyTemperature,
          avgStressLevel: summary.avgStressLevel,
          createdAt: summary.createdAt,
          updatedAt: summary.updatedAt
        }
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        logger.error('Error fetching Garmin daily summary', {
          context: 'garmin-controller',
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
      }
    }
  };

  /**
   * POST /api/wearables/garmin/manual/heart-rate
   * Add manual heart rate data entry
   */
  addManualHeartRate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      const { deviceId, timestamp, value, unit } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!deviceId || !timestamp || typeof value !== 'number') {
        res.status(400).json({ success: false, message: 'Device ID, timestamp, and value are required' });
        return;
      }

      const dataPoint = await garminManualDataService.addManualHeartRateData(userId, deviceId, {
        timestamp,
        value,
        unit: unit || 'bpm'
      });

      res.status(201).json({ success: true, data: dataPoint });
    } catch (error) {
      logger.error('Failed to add manual heart rate data', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add heart rate data'
      });
    }
  };

  /**
   * POST /api/wearables/garmin/manual/sleep
   * Add manual sleep data entry
   */
  addManualSleep = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      const { deviceId, date, startTime, endTime, duration, quality } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!deviceId || !date || !startTime || !endTime || !duration) {
        res.status(400).json({
          success: false,
          message: 'Device ID, date, startTime, endTime, and duration are required'
        });
        return;
      }

      const dataPoint = await garminManualDataService.addManualSleepData(userId, deviceId, {
        date,
        startTime,
        endTime,
        duration,
        quality: quality || 'FAIR'
      });

      res.status(201).json({ success: true, data: dataPoint });
    } catch (error) {
      logger.error('Failed to add manual sleep data', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add sleep data'
      });
    }
  };

  /**
   * POST /api/wearables/garmin/manual/activity
   * Add manual activity data entry
   */
  addManualActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      const { deviceId, date, name, startTime, duration, calories, distance, steps, avgHeartRate, maxHeartRate } =
        req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!deviceId || !date || !name || !startTime || !duration) {
        res.status(400).json({
          success: false,
          message: 'Device ID, date, name, startTime, and duration are required'
        });
        return;
      }

      const dataPoints = await garminManualDataService.addManualActivityData(userId, deviceId, {
        date,
        name,
        startTime,
        duration,
        calories,
        distance,
        steps,
        avgHeartRate,
        maxHeartRate
      });

      res.status(201).json({ success: true, data: dataPoints, count: dataPoints.length });
    } catch (error) {
      logger.error('Failed to add manual activity data', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add activity data'
      });
    }
  };

  /**
   * POST /api/wearables/garmin/manual/stress
   * Add manual stress data entry
   */
  addManualStress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      const { deviceId, date, dayAverage, minStress, maxStress } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!deviceId || !date || typeof dayAverage !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Device ID, date, and dayAverage are required'
        });
        return;
      }

      const dataPoint = await garminManualDataService.addManualStressData(userId, deviceId, {
        date,
        dayAverage,
        minStress,
        maxStress
      });

      res.status(201).json({ success: true, data: dataPoint });
    } catch (error) {
      logger.error('Failed to add manual stress data', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add stress data'
      });
    }
  };

  /**
   * GET /api/wearables/garmin/manual/data
   * Get manual data entries for a user
   */
  getManualDataEntries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      const { startDate, endDate } = req.query;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate && typeof startDate === 'string') {
        start = new Date(startDate);
      }

      if (endDate && typeof endDate === 'string') {
        end = new Date(endDate);
      }

      const dataPoints = await garminManualDataService.getManualDataEntries(userId, start, end);

      res.status(200).json({ success: true, data: dataPoints, count: dataPoints.length });
    } catch (error) {
      logger.error('Failed to get manual data entries', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve data entries'
      });
    }
  };

  /**
   * POST /api/wearables/garmin/manual/bulk-import
   * Bulk import manual data
   */
  bulkImportManualData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      const { deviceId, dataPoints } = req.body;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!deviceId || !Array.isArray(dataPoints)) {
        res.status(400).json({
          success: false,
          message: 'Device ID and dataPoints array are required'
        });
        return;
      }

      const inserted = await garminManualDataService.bulkImportManualData(userId, deviceId, dataPoints);

      res.status(201).json({
        success: true,
        message: `${inserted} data points imported successfully`,
        inserted,
        total: dataPoints.length
      });
    } catch (error) {
      logger.error('Failed to bulk import manual data', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to bulk import data'
      });
    }
  };


  /**
   * POST /api/wearables/manual/weight
   * Add manual weight data
   */
  addManualWeight = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { timestamp, weight, notes } = req.body;

      if (!timestamp || !weight) {
        throw new ValidationError('Timestamp and weight are required');
      }

      const dataPoint = await this.manualDataService.addWeightData(userId, {
        timestamp: Number(timestamp),
        weight: Number(weight),
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Weight data added successfully',
        data: dataPoint
      });
    } catch (error) {
      logger.error('Failed to add manual weight', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      const status = error instanceof ValidationError ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add weight data'
      });
    }
  };

  /**
   * POST /api/wearables/manual/blood-pressure
   * Add manual blood pressure data
   */
  addManualBloodPressure = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { timestamp, systolic, diastolic, notes } = req.body;

      if (!timestamp || !systolic || !diastolic) {
        throw new ValidationError('Timestamp, systolic, and diastolic pressures are required');
      }

      const dataPoint = await this.manualDataService.addBloodPressureData(userId, {
        timestamp: Number(timestamp),
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Blood pressure data added successfully',
        data: dataPoint
      });
    } catch (error) {
      logger.error('Failed to add manual blood pressure', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      const status = error instanceof ValidationError ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add blood pressure data'
      });
    }
  };

  /**
   * GET /api/wearables/manual/data
   * Get all manual data for user
   */
  getManualData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const limit = req.query.limit ? Number(req.query.limit) : 100;

      const data = await this.manualDataService.getUserManualData(userId, limit);

      res.status(200).json({
        success: true,
        message: 'Manual data retrieved successfully',
        count: data.length,
        data
      });
    } catch (error) {
      logger.error('Failed to get manual data', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve manual data'
      });
    }
  };

  /**
   * DELETE /api/wearables/manual/data/:dataId
   * Delete manual data entry
   */
  deleteManualData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId || req.user?.id;
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { dataId } = req.params;
      if (!dataId) {
        throw new ValidationError('Data ID is required');
      }

      const deleted = await this.manualDataService.deleteManualData(userId, dataId);

      if (!deleted) {
        throw new NotFoundError('Manual data entry not found');
      }

      res.status(200).json({
        success: true,
        message: 'Manual data deleted successfully'
      });
    } catch (error) {
      logger.error('Failed to delete manual data', {
        context: 'garmin-controller',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      const status = error instanceof NotFoundError ? 404 : error instanceof ValidationError ? 400 : 500;
      res.status(status).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete manual data'
      });
    }
  };
}

export default new GarminController();
