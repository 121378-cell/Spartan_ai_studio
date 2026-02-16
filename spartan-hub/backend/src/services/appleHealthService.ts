import axios from 'axios';
import { logger } from '../utils/logger';
import {
  BiometricDataPoint,
  BiometricDataType,
  HRVData,
  RestingHeartRateData,
  SleepData,
  ActivityData,
  BloodOxygenData,
  WearableDevice
} from '../types/biometric';
import { HealthConnectHubService } from './healthConnectHubService';

/**
 * Apple Health Integration Service
 * Syncs data from Apple HealthKit via OAuth
 * Converts Apple Health metrics to standardized biometric schema
 */

export interface AppleHealthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiEndpoint: string;
}

export interface AppleHealthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AppleHealthSyncResponse {
  syncedRecords: number;
  dataPoints: BiometricDataPoint[];
  nextSyncTime: number;
  errors: Array<{ metric: string; error: string }>;
}

export class AppleHealthService {
  private config: AppleHealthConfig;
  private healthHub: HealthConnectHubService;
  private httpClient: any;

  // Apple Health Kit metric types mapping
  private readonly HEALTH_KIT_TYPES = {
    HKQuantityTypeIdentifierHeartRate: 'heart_rate',
    HKQuantityTypeIdentifierRestingHeartRate: 'resting_heart_rate',
    HKQuantityTypeIdentifierHeartRateVariability: 'hrv',
    HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv_sdnn',
    HKQuantityTypeIdentifierOxygenSaturation: 'spo2',
    HKCategoryTypeIdentifierSleepAnalysis: 'sleep',
    HKQuantityTypeIdentifierStepCount: 'steps',
    HKQuantityTypeIdentifierDistanceWalkingRunning: 'distance',
    HKQuantityTypeIdentifierActiveEnergyBurned: 'calories',
    HKQuantityTypeIdentifierBodyTemperature: 'body_temperature',
    HKQuantityTypeIdentifierBloodPressureSystolic: 'blood_pressure_systolic',
    HKQuantityTypeIdentifierBloodPressureDiastolic: 'blood_pressure_diastolic'
  };

  constructor(config: AppleHealthConfig, healthHub: HealthConnectHubService) {
    this.config = config;
    this.healthHub = healthHub;
    this.httpClient = axios.create({
      baseURL: config.apiEndpoint,
      timeout: 30000
    });
  }

  /**
   * Generate Apple Health OAuth authorization URL with PKCE support
   */
  generateAuthorizationUrl(userId: string, state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: [
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariability',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierOxygenSaturation',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBodyTemperature'
      ].join(' '),
      state,
      code_challenge_method: 'S256'
    });

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
    }

    return `https://healthkit.apple.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<AppleHealthToken> {
    try {
      const response = await this.httpClient.post('/oauth/token', {
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier
      });

      logger.info('Apple Health token exchange successful', {
        context: 'appleHealth'
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };
    } catch (error) {
      logger.error('Failed to exchange Apple Health token', {
        context: 'appleHealth',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Refresh Apple Health access token
   */
  async refreshToken(refreshToken: string): Promise<AppleHealthToken> {
    try {
      const response = await this.httpClient.post('/oauth/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      });

      logger.debug('Apple Health token refreshed', {
        context: 'appleHealth'
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type
      };
    } catch (error) {
      logger.error('Failed to refresh Apple Health token', {
        context: 'appleHealth',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Sync heart rate data from Apple Health
   */
  private async syncHeartRateData(
    userId: string,
    accessToken: string,
    startDate: string
  ): Promise<BiometricDataPoint[]> {
    const dataPoints: BiometricDataPoint[] = [];

    try {
      const response = await this.httpClient.get('/data/heartrate', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { userId, startDate, limit: 1000 }
      });

      const records = response.data.records || [];

      for (const record of records) {
        dataPoints.push({
          userId,
          timestamp: new Date(record.startDate).getTime(),
          dataType: 'heart_rate' as BiometricDataType,
          value: record.value,
          unit: 'bpm',
          device: 'apple_health',
          source: 'apple-health',
          confidence: 0.95,
          rawData: {
            metadata: record.metadata,
            endDate: record.endDate,
            UUID: record.UUID
          }
        });
      }

      logger.debug('Heart rate data synced', {
        context: 'appleHealth',
        metadata: { userId, recordCount: records.length }
      });
    } catch (error) {
      logger.error('Failed to sync heart rate data', {
        context: 'appleHealth',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return dataPoints;
  }

  /**
   * Sync resting heart rate data
   */
  private async syncRestingHeartRateData(
    userId: string,
    accessToken: string,
    startDate: string
  ): Promise<BiometricDataPoint[]> {
    const dataPoints: BiometricDataPoint[] = [];

    try {
      const response = await this.httpClient.get('/data/resting-heart-rate', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { userId, startDate, limit: 500 }
      });

      const records = response.data.records || [];

      for (const record of records) {
        dataPoints.push({
          userId,
          timestamp: new Date(record.date).getTime(),
          dataType: 'resting_heart_rate' as BiometricDataType,
          value: record.value,
          unit: 'bpm',
          device: 'apple_health',
          source: 'apple-health',
          confidence: 0.9,
          rawData: {
            date: record.date,
            UUID: record.UUID
          }
        });
      }

      logger.debug('Resting heart rate data synced', {
        context: 'appleHealth',
        metadata: { userId, recordCount: records.length }
      });
    } catch (error) {
      logger.error('Failed to sync resting heart rate data', {
        context: 'appleHealth',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return dataPoints;
  }

  /**
   * Sync HRV data
   */
  private async syncHRVData(
    userId: string,
    accessToken: string,
    startDate: string
  ): Promise<BiometricDataPoint[]> {
    const dataPoints: BiometricDataPoint[] = [];

    try {
      const response = await this.httpClient.get('/data/hrv', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { userId, startDate, limit: 500 }
      });

      const records = response.data.records || [];

      for (const record of records) {
        dataPoints.push({
          userId,
          timestamp: new Date(record.date).getTime(),
          dataType: 'hrv' as BiometricDataType,
          value: record.sdnn,
          unit: 'ms',
          device: 'apple_health',
          source: 'apple-health',
          confidence: 0.92,
          rawData: {
            rmssd: record.rmssd,
            sdnn: record.sdnn,
            lf: record.lf,
            hf: record.hf,
            lfHfRatio: record.lfHfRatio,
            pnn50: record.pnn50,
            classification: record.classification,
            date: record.date
          }
        });
      }

      logger.debug('HRV data synced', {
        context: 'appleHealth',
        metadata: { userId, recordCount: records.length }
      });
    } catch (error) {
      logger.error('Failed to sync HRV data', {
        context: 'appleHealth',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return dataPoints;
  }

  /**
   * Sync sleep data
   */
  private async syncSleepData(
    userId: string,
    accessToken: string,
    startDate: string
  ): Promise<BiometricDataPoint[]> {
    const dataPoints: BiometricDataPoint[] = [];

    try {
      const response = await this.httpClient.get('/data/sleep', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { userId, startDate, limit: 500 }
      });

      const records = response.data.records || [];

      for (const record of records) {
        const duration = new Date(record.endDate).getTime() - new Date(record.startDate).getTime();

        dataPoints.push({
          userId,
          timestamp: new Date(record.startDate).getTime(),
          dataType: 'sleep' as BiometricDataType,
          value: duration / (1000 * 60 * 60), // Convert to hours
          unit: 'hours',
          device: 'apple_health',
          source: 'apple-health',
          confidence: 0.88,
          rawData: {
            startDate: record.startDate,
            endDate: record.endDate,
            sleepAnalysis: record.sleepAnalysis,
            UUID: record.UUID
          }
        });
      }

      logger.debug('Sleep data synced', {
        context: 'appleHealth',
        metadata: { userId, recordCount: records.length }
      });
    } catch (error) {
      logger.error('Failed to sync sleep data', {
        context: 'appleHealth',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return dataPoints;
  }

  /**
   * Sync activity data
   */
  private async syncActivityData(
    userId: string,
    accessToken: string,
    startDate: string
  ): Promise<BiometricDataPoint[]> {
    const dataPoints: BiometricDataPoint[] = [];

    try {
      const response = await this.httpClient.get('/data/activity', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { userId, startDate, limit: 1000 }
      });

      const records = response.data.records || [];

      for (const record of records) {
        // Store different activity metrics as separate data points
        if (record.steps) {
          dataPoints.push({
            userId,
            timestamp: new Date(record.date).getTime(),
            dataType: 'steps' as BiometricDataType,
            value: record.steps,
            unit: 'count',
            device: 'apple_health',
            source: 'apple-health',
            confidence: 0.98
          });
        }

        if (record.distance) {
          dataPoints.push({
            userId,
            timestamp: new Date(record.date).getTime(),
            dataType: 'distance' as BiometricDataType,
            value: record.distance,
            unit: 'meters',
            device: 'apple_health',
            source: 'apple-health',
            confidence: 0.95
          });
        }

        if (record.calories) {
          dataPoints.push({
            userId,
            timestamp: new Date(record.date).getTime(),
            dataType: 'calories' as BiometricDataType,
            value: record.calories,
            unit: 'kcal',
            device: 'apple_health',
            source: 'apple-health',
            confidence: 0.90
          });
        }
      }

      logger.debug('Activity data synced', {
        context: 'appleHealth',
        metadata: { userId, recordCount: records.length }
      });
    } catch (error) {
      logger.error('Failed to sync activity data', {
        context: 'appleHealth',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return dataPoints;
  }

  /**
   * Sync SpO2 data
   */
  private async syncBloodOxygenData(
    userId: string,
    accessToken: string,
    startDate: string
  ): Promise<BiometricDataPoint[]> {
    const dataPoints: BiometricDataPoint[] = [];

    try {
      const response = await this.httpClient.get('/data/blood-oxygen', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { userId, startDate, limit: 500 }
      });

      const records = response.data.records || [];

      for (const record of records) {
        dataPoints.push({
          userId,
          timestamp: new Date(record.date).getTime(),
          dataType: 'spo2' as BiometricDataType,
          value: record.value,
          unit: '%',
          device: 'apple_health',
          source: 'apple-health',
          confidence: 0.93,
          rawData: {
            date: record.date,
            UUID: record.UUID
          }
        });
      }

      logger.debug('Blood oxygen data synced', {
        context: 'appleHealth',
        metadata: { userId, recordCount: records.length }
      });
    } catch (error) {
      logger.error('Failed to sync blood oxygen data', {
        context: 'appleHealth',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }

    return dataPoints;
  }

  /**
   * Complete Apple Health sync
   */
  async syncData(
    userId: string,
    deviceId: string,
    accessToken: string
  ): Promise<AppleHealthSyncResponse> {
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days
    const allDataPoints: BiometricDataPoint[] = [];
    const errors: Array<{ metric: string; error: string }> = [];

    try {
      logger.info('Starting Apple Health data sync', {
        context: 'appleHealth',
        metadata: { userId, deviceId }
      });

      // Sync all metrics in parallel
      const [
        heartRateData,
        restingHRData,
        hrvData,
        sleepData,
        activityData,
        spO2Data
      ] = await Promise.all([
        this.syncHeartRateData(userId, accessToken, startDate),
        this.syncRestingHeartRateData(userId, accessToken, startDate),
        this.syncHRVData(userId, accessToken, startDate),
        this.syncSleepData(userId, accessToken, startDate),
        this.syncActivityData(userId, accessToken, startDate),
        this.syncBloodOxygenData(userId, accessToken, startDate)
      ]);

      allDataPoints.push(
        ...heartRateData,
        ...restingHRData,
        ...hrvData,
        ...sleepData,
        ...activityData,
        ...spO2Data
      );

      // Store all data points
      for (const dataPoint of allDataPoints) {
        try {
          await this.healthHub.storeBiometricData(dataPoint);
        } catch (error) {
          errors.push({
            metric: dataPoint.dataType,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Update device sync status
      const now = Date.now();
      const nextSyncTime = now + 3600000; // 1 hour from now
      await this.healthHub.updateDeviceSyncStatus(deviceId, now, nextSyncTime);

      logger.info('Apple Health data sync completed', {
        context: 'appleHealth',
        metadata: {
          userId,
          syncedRecords: allDataPoints.length,
          errors: errors.length
        }
      });

      return {
        syncedRecords: allDataPoints.length,
        dataPoints: allDataPoints,
        nextSyncTime: now + 3600000,
        errors
      };
    } catch (error) {
      logger.error('Apple Health sync failed', {
        context: 'appleHealth',
        metadata: {
          userId,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }
}

export default AppleHealthService;
