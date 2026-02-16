import { Request, Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';
import { ValidationError, NotFoundError } from '../utils/errorHandler';
import { HealthConnectHubService } from '../services/healthConnectHubService';
import AppleHealthService from '../services/appleHealthService';
import { BiometricDataType } from '../types/biometric';

/**
 * PKCE (Proof Key for Code Exchange) Helper Functions
 * Implements OAuth 2.0 PKCE extension for enhanced security
 */

interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Generate a PKCE code verifier and code challenge
 * Uses SHA-256 for code challenge generation as per RFC 7636
 */
const generatePKCEData = (): PKCEData => {
  // Generate code verifier (43-128 characters)
  const codeVerifier = randomBytes(32).toString('base64url');
  
  // Generate code challenge (SHA-256 hash of verifier, base64url encoded)
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Generate state for CSRF protection
  const state = randomBytes(16).toString('base64url');
  
  return {
    codeVerifier,
    codeChallenge,
    state
  };
};

/**
 * Validate state parameter
 */
const validateState = (providedState: string, storedState: string): boolean => {
  return providedState === storedState;
};

/**
 * In-memory PKCE data storage (in production, use Redis or database)
 */
const pkceStore = new Map<string, PKCEData>();

/**
 * Store PKCE data for a user session
 */
const storePKCEData = (userId: string, data: PKCEData): void => {
  pkceStore.set(userId, data);
  
  // Auto-expire after 15 minutes
  setTimeout(() => {
    pkceStore.delete(userId);
  }, 15 * 60 * 1000);
};

/**
 * Retrieve and validate PKCE data
 */
const retrievePKCEData = (userId: string, state: string): PKCEData | null => {
  const data = pkceStore.get(userId);
  if (!data) {
    return null;
  }
  
  // Validate state
  if (!validateState(state, data.state)) {
    pkceStore.delete(userId);
    return null;
  }
  
  return data;
};

/**
 * Biometric & Wearable Integration Controllers
 */

// Initialize services (these would be injected in production)
let healthHub: HealthConnectHubService | null = null;
let appleHealthService: AppleHealthService | null = null;

export const setHealthHub = (service: HealthConnectHubService) => {
  healthHub = service;
};

export const setAppleHealthService = (service: AppleHealthService) => {
  appleHealthService = service;
};

/**
 * Get connected wearable devices
 * GET /api/biometrics/devices
 */
export const getConnectedDevices = async (req: Request, res: Response) => {
  try {
    if (!healthHub) {
      throw new Error('HealthConnect Hub not initialized');
    }

    const {userId} = (req as any);

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const devices = await healthHub.getUserDevices(userId);

    return res.status(200).json({
      success: true,
      data: {
        devices,
        total: devices.length
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error('Failed to get connected devices', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Register new wearable device
 * POST /api/biometrics/devices/register
 */
export const registerWearableDevice = async (req: Request, res: Response) => {
  try {
    if (!healthHub) {
      throw new Error('HealthConnect Hub not initialized');
    }

    const {userId} = (req as any);
    const { deviceType, deviceName, accessToken, refreshToken, permissions } = req.body;

    // Validate inputs
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const sanitizedDeviceType = sanitizeInput(deviceType);
    const sanitizedDeviceName = sanitizeInput(deviceName);

    if (!sanitizedDeviceType || !sanitizedDeviceName) {
      throw new ValidationError('Device type and name are required');
    }

    if (!['apple-health', 'garmin', 'oura', 'withings'].includes(sanitizedDeviceType)) {
      throw new ValidationError('Invalid device type');
    }

    const deviceId = await healthHub.registerDevice({
      id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      deviceType: sanitizedDeviceType as 'apple-health' | 'garmin' | 'oura' | 'withings',
      deviceName: sanitizedDeviceName,
      accessToken: sanitizeInput(accessToken) || undefined,
      refreshToken: sanitizeInput(refreshToken) || undefined,
      isActive: true,
      permissions: permissions || {},
      metadata: {
        registeredAt: new Date().toISOString()
      }
    });

    logger.info('Wearable device registered', {
      context: 'biometricController',
      metadata: { userId, deviceType: sanitizedDeviceType, deviceId }
    });

    return res.status(201).json({
      success: true,
      data: {
        deviceId,
        message: 'Device registered successfully'
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error('Failed to register wearable device', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Get biometric data for date range
 * GET /api/biometrics/data?startDate=2024-01-01&endDate=2024-01-31&types=heart_rate,sleep
 */
export const getBiometricData = async (req: Request, res: Response) => {
  try {
    if (!healthHub) {
      throw new Error('HealthConnect Hub not initialized');
    }

    const {userId} = (req as any);
    const { startDate, endDate, types } = req.query;

    // Validate inputs
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    // Parse date range
    try {
      new Date(startDate as string);
      new Date(endDate as string);
    } catch {
      throw new ValidationError('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }

    // Parse data types
    let dataTypes: BiometricDataType[] | undefined;
    if (types) {
      const typeList = (types as string).split(',').map(t => t.trim());
      const validTypes: BiometricDataType[] = [
        BiometricDataType.HEART_RATE,
        BiometricDataType.RHR,
        BiometricDataType.HRV,
        BiometricDataType.SPO2,
        BiometricDataType.SLEEP,
        BiometricDataType.ACTIVITY,
        BiometricDataType.STEPS,
        BiometricDataType.DISTANCE,
        BiometricDataType.CALORIES,
        BiometricDataType.TEMPERATURE,
        BiometricDataType.BLOOD_PRESSURE,
        BiometricDataType.GLUCOSE
      ];

      dataTypes = typeList.filter(t => validTypes.includes(t as BiometricDataType)) as BiometricDataType[];

      if (typeList.length > 0 && dataTypes.length === 0) {
        throw new ValidationError('No valid data types provided');
      }
    }

    const data = await healthHub.getBiometricData(
      userId,
      startDate as string,
      endDate as string,
      dataTypes
    );

    return res.status(200).json({
      success: true,
      data: {
        dataPoints: data,
        total: data.length,
        dateRange: { startDate, endDate }
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error('Failed to get biometric data', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Get daily biometric summary
 * GET /api/biometrics/summary/daily/:date
 */
export const getDailySummary = async (req: Request, res: Response) => {
  try {
    if (!healthHub) {
      throw new Error('HealthConnect Hub not initialized');
    }

    const {userId} = (req as any);
    const { date } = req.params;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!date) {
      throw new ValidationError('Date is required');
    }

    // Validate date format
    try {
      new Date(date);
    } catch {
      throw new ValidationError('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }

    const summary = await healthHub.getDailySummary(userId, date);

    if (!summary) {
      throw new NotFoundError(`No summary found for date ${date}`);
    }

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error('Failed to get daily summary', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Get health summary for date range
 * GET /api/biometrics/summary/range?startDate=2024-01-01&endDate=2024-01-31
 */
export const getHealthSummary = async (req: Request, res: Response) => {
  try {
    if (!healthHub) {
      throw new Error('HealthConnect Hub not initialized');
    }

    const {userId} = (req as any);
    const { startDate, endDate } = req.query;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    // Validate date format
    try {
      new Date(startDate as string);
      new Date(endDate as string);
    } catch {
      throw new ValidationError('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }

    const summary = await healthHub.getHealthSummary(
      userId,
      startDate as string,
      endDate as string
    );

    return res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error('Failed to get health summary', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Apple Health OAuth callback
 * GET /api/biometrics/apple-health/callback?code=xxx&state=yyy
 */
export const appleHealthCallback = async (req: Request, res: Response) => {
  try {
    if (!appleHealthService || !healthHub) {
      throw new Error('Apple Health service not initialized');
    }

    const {userId} = (req as any);
    const { code, state, error } = req.query;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (error) {
      throw new ValidationError(`Apple Health authorization failed: ${error}`);
    }

    if (!code || !state) {
      throw new ValidationError('Authorization code and state are required');
    }

    // Validate state parameter against stored state
    // Validate state parameter against stored state
    const pkceData = retrievePKCEData(userId, state as string);
    
    if (!pkceData) {
      throw new ValidationError('Invalid or expired state parameter');
    }    
    // Exchange code for token
    const token = await appleHealthService.exchangeCodeForToken(code as string, pkceData.codeVerifier);

    // Register device
    const deviceId = await healthHub.registerDevice({
      id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      deviceType: 'apple-health' as 'apple-health' | 'garmin' | 'oura' | 'withings',
      deviceName: 'Apple Health',
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      tokenExpiresAt: Date.now() + token.expiresIn * 1000,
      isActive: true,
      permissions: {
        heartRate: true,
        sleep: true,
        activity: true,
        nutrition: false,
        mindfulness: false
      }
    });

    logger.info('Apple Health device connected', {
      context: 'biometricController',
      metadata: { userId, deviceId }
    });

    return res.status(200).json({
      success: true,
      data: {
        deviceId,
        message: 'Apple Health connected successfully'
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error('Apple Health callback failed', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Sync Apple Health data
 * POST /api/biometrics/apple-health/sync
 */
export const syncAppleHealthData = async (req: Request, res: Response) => {
  try {
    if (!appleHealthService || !healthHub) {
      throw new Error('Apple Health service not initialized');
    }

    const {userId} = (req as any);

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Get connected Apple Health device
    const devices = await healthHub.getUserDevices(userId);
    const appleDevice = devices.find(d => d.deviceType === 'apple-health');

    if (!appleDevice || !appleDevice.accessToken) {
      throw new NotFoundError('Apple Health device not connected or missing access token');
    }

    // Check if token needs refresh
    if (appleDevice.tokenExpiresAt && appleDevice.tokenExpiresAt < Date.now()) {
      if (appleDevice.refreshToken) {
        const newToken = await appleHealthService.refreshToken(appleDevice.refreshToken);
        // Update device with new token
        // TODO: Implement updateDevice method in HealthConnectHubService
        // if (healthHub) {
        //   await healthHub.updateDevice(appleDevice.deviceId || '', {
        //     accessToken: newToken.accessToken,
        //     refreshToken: newToken.refreshToken,
        //     tokenExpiresAt: Date.now() + newToken.expiresIn * 1000
        //   });
        // }
      }
    }

    // Sync data
    const syncResult = await appleHealthService.syncData(
      userId,
      appleDevice.deviceId || '',
      appleDevice.accessToken
    );

    logger.info('Apple Health data synced successfully', {
      context: 'biometricController',
      metadata: {
        userId,
        syncedRecords: syncResult.syncedRecords,
        errors: syncResult.errors.length
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        syncedRecords: syncResult.syncedRecords,
        nextSyncTime: syncResult.nextSyncTime,
        errors: syncResult.errors.length > 0 ? syncResult.errors : undefined
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
    }
    logger.error('Failed to sync Apple Health data', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

/**
 * Get Apple Health authorization URL
 * GET /api/biometrics/apple-health/authorize
 */
export const getAppleHealthAuthUrl = async (req: Request, res: Response) => {
  try {
    if (!appleHealthService) {
      throw new Error('Apple Health service not initialized');
    }

    const {userId} = (req as any);

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Generate PKCE data and store it
    const pkceData = generatePKCEData();
    storePKCEData(userId, pkceData);

    const authUrl = appleHealthService.generateAuthorizationUrl(userId, pkceData.state, pkceData.codeChallenge);

    return res.status(200).json({
      success: true,
      data: {
        authUrl,
        state: pkceData.state
      }
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error('Failed to generate Apple Health auth URL', {
      context: 'biometricController',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    throw error;
  }
};

export default {
  getConnectedDevices,
  registerWearableDevice,
  getBiometricData,
  getDailySummary,
  getHealthSummary,
  appleHealthCallback,
  syncAppleHealthData,
  getAppleHealthAuthUrl
};
