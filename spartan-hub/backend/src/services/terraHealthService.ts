/**
 * Terra Health Service
 * 
 * Unified wearable aggregation service supporting 200+ devices via Terra API.
 * Replaces multiple individual integrations with single API layer.
 * 
 * Supported Devices: Garmin, Apple, Google Fit, Oura, Withings, Fitbit, Whoop, etc.
 * 
 * Responsibilities:
 * - OAuth 2.0 device authentication & token management
 * - Unified data sync across all device types
 * - Webhook event ingestion for real-time updates
 * - Data transformation to BiometricDataPoint format
 * - Rate limiting & error handling
 */

import axios from 'axios';
import crypto from 'crypto';
import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { eventBus } from './eventBus';
import terraConfig from '../config/terraConfig';
type BetterSqliteDb = InstanceType<typeof import('better-sqlite3')>;
import {
  BiometricDataPoint,
  WearableDevice,
  BiometricDataType,
  ActivityType
} from '../types/biometric';

// Type alias for axios instance - compatible with axios 1.x
type AxiosInstance = ReturnType<typeof axios.create>;

interface TerraUserReference {
  user_id: string;
  provider: string;
  scopes: string[];
  connected_at: string;
}

interface TerraDeviceConnection {
  device_id: string;
  user_id: string;
  provider: string; // 'garmin', 'apple', 'google', etc.
  device_model?: string;
  last_webhook_update?: string;
  disconnect_reason?: string;
}

interface TerraHeartRateData {
  date: string;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  min_heart_rate?: number;
  resting_heart_rate?: number;
  heart_rate_data?: Array<{
    timestamp: number;
    value: number;
  }>;
}

interface TerraSleepData {
  date: string;
  sleep_start_time: number;
  sleep_end_time: number;
  duration_seconds: number;
  quality?: 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';
  deep_sleep_duration?: number;
  light_sleep_duration?: number;
  rem_sleep_duration?: number;
  awake_duration?: number;
}

interface TerraActivityData {
  id: string;
  start_time: number;
  end_time: number;
  name: string;
  activity_type: string;
  calories?: number;
  distance?: number;
  steps?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  source_device: string;
}

interface TerraBodyMetricsData {
  date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  bone_mass_kg?: number;
  water_percentage?: number;
}

export class TerraHealthService {
  private static instance: TerraHealthService;
  private axiosInstance: AxiosInstance;
  private db: BetterSqliteDb;

  public constructor() {
    this.db = getDatabase() as BetterSqliteDb;
    
    this.axiosInstance = axios.create({
      baseURL: terraConfig.baseUrl,
      timeout: terraConfig.httpTimeout,
      headers: {
        'x-api-key': terraConfig.apiKey,
        'x-api-secret': terraConfig.apiSecret,
        'Content-Type': 'application/json'
      }
    });

    logger.info('TerraHealthService initialized', { context: 'terra-init' });
  }

  static getInstance(): TerraHealthService {
    if (!TerraHealthService.instance) {
      TerraHealthService.instance = new TerraHealthService();
    }
    return TerraHealthService.instance;
  }

  /**
   * Generate OAuth URL for device connection
   */
  generateOAuthUrl(userId: string, redirectUri: string, deviceProvider?: string): string {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      
      // Store state for verification on callback
      const stmt = this.db.prepare(`
        INSERT INTO oauth_states (userId, state, provider, expiresAt)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(userId, state, 'terra', Date.now() + 10 * 60 * 1000); // 10 min expiry

      let params = `?api_key=${terraConfig.apiKey}&state=${state}&reference_id=${userId}`;
      
      if (deviceProvider) {
        params += `&provider=${deviceProvider}`;
      }

      const oauthUrl = `${terraConfig.baseUrl}/auth/generateAuthToken${params}`;
      
      logger.info('Generated Terra OAuth URL', {
        context: 'terra-oauth',
        metadata: { userId, provider: deviceProvider }
      });

      return oauthUrl;
    } catch (error) {
      logger.error('Failed to generate Terra OAuth URL', {
        context: 'terra-oauth',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Handle OAuth callback and register device
   */
  async handleOAuthCallback(userId: string, authToken: string, state: string): Promise<WearableDevice> {
    try {
      // Verify state
      const stateRecord = this.db.prepare(
        'SELECT * FROM oauth_states WHERE userId = ? AND state = ? AND provider = ? AND expiresAt > ?'
      ).get(userId, state, 'terra', Date.now());

      if (!stateRecord) {
        throw new Error('Invalid or expired OAuth state');
      }

      // Exchange auth token for user connection
      const response = await this.axiosInstance.post('/auth/authenticateUser', {
        reference_id: userId,
        auth_token: authToken,
        accept_eula: true
      });

      const terraUserRef: TerraUserReference = (response.data as { user: TerraUserReference }).user;

      logger.info('Terra OAuth callback processed', {
        context: 'terra-oauth',
        metadata: { userId, terraUserId: terraUserRef.user_id }
      });

      // Register device in our DB
      const deviceId = `${userId}_terra_${Date.now()}`;
      
      const stmt = this.db.prepare(`
        INSERT INTO wearable_devices (
          id, userId, deviceType, deviceName, accessToken, refreshToken,
          tokenExpiresAt, lastSyncTime, isActive, createdAt, updatedAt, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        deviceId,
        userId,
        'terra',
        `Terra (${terraUserRef.provider})`,
        terraUserRef.user_id, // Terra user ID
        JSON.stringify({ scopes: terraUserRef.scopes }),
        Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        Date.now(),
        1,
        Date.now(),
        Date.now(),
        JSON.stringify({
          terraProvider: terraUserRef.provider,
          connectedAt: terraUserRef.connected_at
        })
      );

      // Clean up OAuth state
      this.db.prepare('DELETE FROM oauth_states WHERE userId = ? AND state = ?').run(userId, state);

      // Emit device connected event
      eventBus.emit('device.connected', { userId, deviceType: 'terra', provider: terraUserRef.provider });

      return {
        id: deviceId,
        deviceId,
        userId,
        deviceType: 'terra' as const,
        deviceName: `Terra (${terraUserRef.provider})`,
        isActive: true
      };
    } catch (error) {
      logger.error('Failed to handle Terra OAuth callback', {
        context: 'terra-oauth',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get connected devices for user
   */
  async getConnectedDevices(userId: string): Promise<TerraDeviceConnection[]> {
    try {
      const devices = this.db.prepare(`
        SELECT accessToken as terraUserId FROM wearable_devices
        WHERE userId = ? AND deviceType = 'terra' AND isActive = 1
      `).all(userId);

      const terraDevices: TerraDeviceConnection[] = [];

      for (const device of devices) {
        const response = await this.axiosInstance.get(`/user/${(device as { terraUserId: string }).terraUserId}/devices`);
        terraDevices.push(...((response.data as { devices: TerraDeviceConnection[] }).devices));
      }

      logger.info('Fetched Terra connected devices', {
        context: 'terra-devices',
        metadata: { userId, count: terraDevices.length }
      });

      return terraDevices;
    } catch (error) {
      logger.error('Failed to get Terra devices', {
        context: 'terra-devices',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Sync all data for user from all connected devices
   */
  async syncAllUserData(userId: string, fromDate?: Date): Promise<number> {
    try {
      const devices = this.db.prepare(`
        SELECT accessToken as terraUserId FROM wearable_devices
        WHERE userId = ? AND deviceType = 'terra' AND isActive = 1
      `).all(userId);

      let totalDataPoints = 0;

      const defaultFromDate = new Date();
      defaultFromDate.setDate(defaultFromDate.getDate() - 7); // Last 7 days

      const dataFromDate = fromDate || defaultFromDate;

      for (const device of devices) {
        const terraUserId = (device as { terraUserId: string }).terraUserId;
        totalDataPoints += await this.syncHeartRateData(userId, terraUserId, dataFromDate);
        totalDataPoints += await this.syncSleepData(userId, terraUserId, dataFromDate);
        totalDataPoints += await this.syncActivityData(userId, terraUserId, dataFromDate);
        totalDataPoints += await this.syncBodyMetricsData(userId, terraUserId, dataFromDate);
      }

      // Update last sync time
      const stmt = this.db.prepare(`
        UPDATE wearable_devices
        SET lastSyncTime = ?
        WHERE userId = ? AND deviceType = 'terra'
      `);
      stmt.run(Date.now(), userId);

      logger.info('Completed Terra data sync', {
        context: 'terra-sync',
        metadata: { userId, totalDataPoints }
      });

      // Emit data synced event
      eventBus.emit('data.synced', { userId, source: 'terra', dataPoints: totalDataPoints });

      return totalDataPoints;
    } catch (error) {
      logger.error('Failed to sync Terra data', {
        context: 'terra-sync',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Sync heart rate data
   */
  private async syncHeartRateData(userId: string, terraUserId: string, fromDate: Date): Promise<number> {
    try {
      const response = await this.axiosInstance.get(
        `/user/${terraUserId}/heart_rate`,
        {
          params: {
            date_from: fromDate.toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0]
          }
        }
      );

      const dataPoints: BiometricDataPoint[] = [];
      const heartRateData: TerraHeartRateData[] = (response.data as { data: TerraHeartRateData[] }).data;

      for (const dayData of heartRateData) {
        if (dayData.resting_heart_rate) {
          dataPoints.push({
            userId,
            timestamp: new Date(dayData.date).getTime(),
            dataType: 'resting_heart_rate' as BiometricDataType,
            value: dayData.resting_heart_rate,
            unit: 'bpm',
            device: 'terra',
            source: 'terra-api',
            confidence: 0.95,
            rawData: JSON.stringify({ terrasync: dayData })
          });
        }

        if (dayData.avg_heart_rate) {
          dataPoints.push({
            userId,
            timestamp: new Date(dayData.date).getTime(),
            dataType: 'heart_rate' as BiometricDataType,
            value: dayData.avg_heart_rate,
            unit: 'bpm',
            device: 'terra',
            source: 'terra-api',
            confidence: 0.95,
            rawData: JSON.stringify({ source: dayData })
          });
        }

        if (dayData.heart_rate_data && Array.isArray(dayData.heart_rate_data)) {
          for (const hrPoint of dayData.heart_rate_data) {
            dataPoints.push({
              userId,
              timestamp: hrPoint.timestamp * 1000,
              dataType: 'heart_rate' as BiometricDataType,
              value: hrPoint.value,
              unit: 'bpm',
              device: 'terra',
              source: 'terra-api',
              confidence: 0.95,
              rawData: JSON.stringify(hrPoint)
            });
          }
        }
      }

      this.persistBiometricData(dataPoints);
      return dataPoints.length;
    } catch (error) {
      logger.warn('Failed to sync Terra heart rate data', {
        context: 'terra-sync-hr',
        metadata: { userId, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      return 0;
    }
  }

  /**
   * Sync sleep data
   */
  private async syncSleepData(userId: string, terraUserId: string, fromDate: Date): Promise<number> {
    try {
      const response = await this.axiosInstance.get(
        `/user/${terraUserId}/sleep`,
        {
          params: {
            date_from: fromDate.toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0]
          }
        }
      );

      const dataPoints: BiometricDataPoint[] = [];
      const sleepData: TerraSleepData[] = (response.data as { data: TerraSleepData[] }).data;

      for (const dayData of sleepData) {
        dataPoints.push({
          userId,
          timestamp: dayData.sleep_start_time * 1000,
          dataType: 'sleep_duration' as BiometricDataType,
          value: dayData.duration_seconds / 3600, // Convert to hours
          unit: 'hours',
          device: 'terra',
          source: 'terra-api',
          confidence: 0.95,
          rawData: JSON.stringify(dayData)
        });
      }

      this.persistBiometricData(dataPoints);
      return dataPoints.length;
    } catch (error) {
      logger.warn('Failed to sync Terra sleep data', {
        context: 'terra-sync-sleep',
        metadata: { userId, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      return 0;
    }
  }

  /**
   * Sync activity data
   */
  private async syncActivityData(userId: string, terraUserId: string, fromDate: Date): Promise<number> {
    try {
      const response = await this.axiosInstance.get(
        `/user/${terraUserId}/activity`,
        {
          params: {
            date_from: fromDate.toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0]
          }
        }
      );

      const dataPoints: BiometricDataPoint[] = [];
      const activityData: TerraActivityData[] = (response.data as { data: TerraActivityData[] }).data;

      for (const activity of activityData) {
        if (activity.calories) {
          dataPoints.push({
            userId,
            timestamp: activity.start_time * 1000,
            dataType: 'calories' as BiometricDataType,
            value: activity.calories,
            unit: 'kcal',
            device: 'terra',
            source: 'terra-api',
            confidence: 0.90,
            rawData: JSON.stringify(activity)
          });
        }

        if (activity.distance) {
          dataPoints.push({
            userId,
            timestamp: activity.start_time * 1000,
            dataType: 'distance' as BiometricDataType,
            value: activity.distance,
            unit: 'km',
            device: 'terra',
            source: 'terra-api',
            confidence: 0.90,
            rawData: JSON.stringify(activity)
          });
        }
      }

      this.persistBiometricData(dataPoints);
      return dataPoints.length;
    } catch (error) {
      logger.warn('Failed to sync Terra activity data', {
        context: 'terra-sync-activity',
        metadata: { userId, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      return 0;
    }
  }

  /**
   * Sync body metrics data
   */
  private async syncBodyMetricsData(userId: string, terraUserId: string, fromDate: Date): Promise<number> {
    try {
      const response = await this.axiosInstance.get(
        `/user/${terraUserId}/body`,
        {
          params: {
            date_from: fromDate.toISOString().split('T')[0],
            date_to: new Date().toISOString().split('T')[0]
          }
        }
      );

      const dataPoints: BiometricDataPoint[] = [];
      const bodyMetricsData: TerraBodyMetricsData[] = (response.data as { data: TerraBodyMetricsData[] }).data;

      for (const dayData of bodyMetricsData) {
        if (dayData.weight_kg) {
          dataPoints.push({
            userId,
            timestamp: new Date(dayData.date).getTime(),
            dataType: 'weight' as BiometricDataType,
            value: dayData.weight_kg,
            unit: 'kg',
            device: 'terra',
            source: 'terra-api',
            confidence: 0.95,
            rawData: JSON.stringify(dayData)
          });
        }

        if (dayData.body_fat_percentage) {
          dataPoints.push({
            userId,
            timestamp: new Date(dayData.date).getTime(),
            dataType: 'body_fat' as BiometricDataType,
            value: dayData.body_fat_percentage,
            unit: '%',
            device: 'terra',
            source: 'terra-api',
            confidence: 0.85,
            rawData: JSON.stringify(dayData)
          });
        }
      }

      this.persistBiometricData(dataPoints);
      return dataPoints.length;
    } catch (error) {
      logger.warn('Failed to sync Terra body metrics data', {
        context: 'terra-sync-body',
        metadata: { userId, errorMessage: error instanceof Error ? error.message : String(error) }
      });
      return 0;
    }
  }

  /**
   * Handle webhook event from Terra
   */
  async handleWebhookEvent(payload: any, signature: string, timestamp?: string, rawBody?: Buffer): Promise<void> {
    try {
      // Verify webhook signature and replay window
      if (!this.verifyWebhookSignature(payload, signature, timestamp, rawBody)) {
        throw new Error('Invalid webhook signature');
      }

      const event = payload.data;

      logger.info('Received Terra webhook event', {
        context: 'terra-webhook',
        metadata: { eventType: event.data_type, userId: event.user_id }
      });

      // Handle different event types
      switch (event.data_type) {
      case 'activity':
      case 'sleep':
      case 'heart_rate':
      case 'body':
        // Emit event for real-time processing
        eventBus.emit('terra.webhook', {
          dataType: event.data_type,
          userId: event.user_id,
          timestamp: event.timestamp
        });
        break;

      case 'connection_error':
      case 'connection_revoked':
        // Disable device
        this.db.prepare(`
            UPDATE wearable_devices
            SET isActive = 0
            WHERE userId = ? AND deviceType = 'terra'
          `).run(event.user_id);

        eventBus.emit('device.disconnected', { userId: event.user_id, reason: event.data_type });
        break;
      }
    } catch (error) {
      logger.error('Failed to handle Terra webhook', {
        context: 'terra-webhook',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifyWebhookSignature(payload: any, signature: string, timestamp?: string, rawBody?: Buffer): boolean {
    if (!timestamp) {
      logger.warn('Missing timestamp in Terra webhook', { context: 'terra-webhook' });
      return false;
    }

    const tsNumber = Number(timestamp);
    if (Number.isNaN(tsNumber)) {
      logger.warn('Invalid timestamp in Terra webhook', {
        context: 'terra-webhook',
        metadata: { timestamp }
      });
      return false;
    }

    // Terra may send seconds; normalize to ms
    const tsMs = tsNumber > 1e12 ? tsNumber : tsNumber * 1000;

    // Reject replays outside ±5 minutes window
    const now = Date.now();
    if (Math.abs(now - tsMs) > 5 * 60 * 1000) {
      logger.warn('Terra webhook timestamp outside allowed window', {
        context: 'terra-webhook',
        metadata: { timestamp }
      });
      return false;
    }

    const body = rawBody ? rawBody : Buffer.from(JSON.stringify(payload));
    const message = `${timestamp}.${body.toString('utf-8')}`;
    const hmac = crypto.createHmac('sha256', terraConfig.webhookSecret);
    const hash = hmac.update(message).digest('hex');

    // constant-time comparison
    const sigBuf = Buffer.from(signature, 'hex');
    const hashBuf = Buffer.from(hash, 'hex');
    if (sigBuf.length !== hashBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, hashBuf);
  }

  /**
   * Persist biometric data points
   */
  private persistBiometricData(dataPoints: BiometricDataPoint[]): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO biometric_data_points (
          userId, timestamp, dataType, value, unit, device, source, confidence, rawData
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const point of dataPoints) {
        stmt.run(
          point.userId,
          point.timestamp,
          point.dataType,
          point.value,
          point.unit,
          point.device,
          point.source,
          point.confidence,
          point.rawData
        );
      }

      logger.info('Persisted biometric data points', {
        context: 'terra-persist',
        metadata: { count: dataPoints.length }
      });
    } catch (error) {
      logger.error('Failed to persist biometric data', {
        context: 'terra-persist',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Disconnect device
   */
  async disconnectDevice(userId: string, deviceId: string): Promise<void> {
    try {
      this.db.prepare(`
        UPDATE wearable_devices
        SET isActive = 0
        WHERE userId = ? AND id = ? AND deviceType = 'terra'
      `).run(userId, deviceId);

      eventBus.emit('device.disconnected', { userId, deviceId });

      logger.info('Disconnected Terra device', {
        context: 'terra-disconnect',
        metadata: { userId, deviceId }
      });
    } catch (error) {
      logger.error('Failed to disconnect Terra device', {
        context: 'terra-disconnect',
        metadata: { errorMessage: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }
}

export const getTerraHealthService = (): TerraHealthService => {
  return TerraHealthService.getInstance();
};

export const terraHealthService = TerraHealthService.getInstance();

export default TerraHealthService;
