/**
 * Open Wearables API Service
 *
 * Open source wearable aggregation service - Free alternative to Terra API
 * Supporting Garmin, Apple Health, Google Fit, Fitbit, and more.
 *
 * GitHub: https://github.com/open-wearables/api
 *
 * Responsibilities:
 * - OAuth 2.0 device authentication
 * - Unified data sync across all device types
 * - Webhook event ingestion for real-time updates
 * - Data transformation to BiometricDataPoint format
 * - Rate limiting & error handling
 */

import axios from 'axios';
import { logger } from '../utils/logger';
import { BiometricDataPoint, WearableDevice, BiometricDataType } from '../types/biometric';

type AxiosInstance = ReturnType<typeof axios.create>;

interface OpenWearablesConfig {
  apiUrl: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
  webhookSecret: string;
}

interface OpenWearablesUser {
  user_id: string;
  provider: string;
  connected_at: string;
  devices: string[];
}

interface OpenWearablesActivity {
  id: string;
  user_id: string;
  activity_type: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  calories?: number;
  distance_meters?: number;
  steps?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  source_device: string;
}

interface OpenWearablesHeartRate {
  user_id: string;
  date: string;
  data: Array<{
    timestamp: number;
    value: number;
  }>;
  avg?: number;
  max?: number;
  min?: number;
  resting?: number;
}

interface OpenWearablesSleep {
  user_id: string;
  date: string;
  start_time: number;
  end_time: number;
  duration_seconds: number;
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
  stages?: {
    deep?: number;
    light?: number;
    rem?: number;
    awake?: number;
  };
}

interface OpenWearablesBodyMetrics {
  user_id: string;
  date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  bone_mass_kg?: number;
  water_percentage?: number;
}

export class OpenWearablesService {
  private static instance: OpenWearablesService;
  private api: AxiosInstance;
  private config: OpenWearablesConfig | null = null;
  private initialized: boolean = false;

  private constructor() {
    this.api = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  public static getInstance(): OpenWearablesService {
    if (!OpenWearablesService.instance) {
      OpenWearablesService.instance = new OpenWearablesService();
    }
    return OpenWearablesService.instance;
  }

  /**
   * Initialize service with configuration
   */
  public initialize(config?: Partial<OpenWearablesConfig>): void {
    const envConfig: OpenWearablesConfig = {
      apiUrl: process.env.OPEN_WEARABLES_API_URL || 'https://api.openwearables.org',
      apiKey: process.env.OPEN_WEARABLES_API_KEY || '',
      environment: (process.env.OPEN_WEARABLES_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      webhookSecret: process.env.OPEN_WEARABLES_WEBHOOK_SECRET || ''
    };

    this.config = { ...envConfig, ...config };
    
    // Set API key in headers
    if (this.config.apiKey) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    this.initialized = true;

    logger.info('Open Wearables API service initialized', {
      context: 'open-wearables',
      metadata: {
        apiUrl: this.config.apiUrl,
        environment: this.config.environment
      }
    });
  }

  /**
   * Check if service is configured
   */
  public isConfigured(): boolean {
    return this.initialized && !!this.config?.apiKey;
  }

  /**
   * Get configuration
   */
  public getConfig(): OpenWearablesConfig | null {
    return this.config;
  }

  /**
   * Connect user device (OAuth flow)
   */
  public async connectDevice(userId: string, provider: string): Promise<{ 
    authUrl: string; 
    connectionId: string;
  }> {
    if (!this.config) {
      throw new Error('Open Wearables API not initialized');
    }

    try {
      const response = await this.api.post('/oauth/connect', {
        user_id: userId,
        provider: provider,
        redirect_uri: `${this.config.apiUrl}/callback`
      });

      logger.info('Device connection initiated', {
        context: 'open-wearables',
        metadata: { userId, provider }
      });

      return {
        authUrl: response.data.auth_url,
        connectionId: response.data.connection_id
      };
    } catch (error) {
      logger.error('Failed to initiate device connection', {
        context: 'open-wearables',
        metadata: { userId, provider, error }
      });
      throw error;
    }
  }

  /**
   * Disconnect user device
   */
  public async disconnectDevice(userId: string, connectionId: string): Promise<boolean> {
    try {
      await this.api.delete(`/users/${userId}/connections/${connectionId}`);
      
      logger.info('Device disconnected', {
        context: 'open-wearables',
        metadata: { userId, connectionId }
      });

      return true;
    } catch (error) {
      logger.error('Failed to disconnect device', {
        context: 'open-wearables',
        metadata: { userId, connectionId, error }
      });
      return false;
    }
  }

  /**
   * Get user info
   */
  public async getUserInfo(userId: string): Promise<OpenWearablesUser | null> {
    try {
      const response = await this.api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get user info', {
        context: 'open-wearables',
        metadata: { userId, error }
      });
      return null;
    }
  }

  /**
   * Sync activities from wearable
   */
  public async syncActivities(userId: string, options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<OpenWearablesActivity[]> {
    try {
      const params = new URLSearchParams();
      if (options?.startDate) params.append('start_date', options.startDate);
      if (options?.endDate) params.append('end_date', options.endDate);
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await this.api.get(`/users/${userId}/activities`, { params });
      
      logger.info('Activities synced', {
        context: 'open-wearables',
        metadata: { 
          userId, 
          count: response.data.length,
          dateRange: `${options?.startDate || 'all'} to ${options?.endDate || 'now'}`
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to sync activities', {
        context: 'open-wearables',
        metadata: { userId, error }
      });
      return [];
    }
  }

  /**
   * Sync heart rate data
   */
  public async syncHeartRate(userId: string, date?: string): Promise<OpenWearablesHeartRate | null> {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);

      const response = await this.api.get(`/users/${userId}/heart-rate`, { params });
      
      logger.info('Heart rate synced', {
        context: 'open-wearables',
        metadata: { userId, date: date || 'latest' }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to sync heart rate', {
        context: 'open-wearables',
        metadata: { userId, error }
      });
      return null;
    }
  }

  /**
   * Sync sleep data
   */
  public async syncSleepData(userId: string, date?: string): Promise<OpenWearablesSleep | null> {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);

      const response = await this.api.get(`/users/${userId}/sleep`, { params });
      
      logger.info('Sleep data synced', {
        context: 'open-wearables',
        metadata: { userId, date: date || 'latest' }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to sync sleep data', {
        context: 'open-wearables',
        metadata: { userId, error }
      });
      return null;
    }
  }

  /**
   * Sync body metrics
   */
  public async syncBodyMetrics(userId: string, date?: string): Promise<OpenWearablesBodyMetrics | null> {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);

      const response = await this.api.get(`/users/${userId}/body-metrics`, { params });
      
      logger.info('Body metrics synced', {
        context: 'open-wearables',
        metadata: { userId, date: date || 'latest' }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to sync body metrics', {
        context: 'open-wearables',
        metadata: { userId, error }
      });
      return null;
    }
  }

  /**
   * Get all user activities
   */
  public async getUserActivities(userId: string, options?: {
    limit?: number;
    includeMetrics?: boolean;
  }): Promise<any[]> {
    return this.syncActivities(userId, {
      limit: options?.limit || 10
    });
  }

  /**
   * Transform activity to biometric data point
   */
  public transformToBiometricData(
    activity: OpenWearablesActivity,
    userId: string
  ): BiometricDataPoint[] {
    const dataPoints: BiometricDataPoint[] = [];

    // Create activity data point
    dataPoints.push({
      id: `activity_${activity.id}`,
      userId,
      type: 'activity' as BiometricDataType,
      timestamp: activity.start_time,
      value: activity.duration_seconds,
      unit: 'seconds',
      metadata: {
        activityType: activity.activity_type,
        calories: activity.calories,
        distance: activity.distance_meters,
        steps: activity.steps,
        avgHeartRate: activity.avg_heart_rate,
        maxHeartRate: activity.max_heart_rate,
        sourceDevice: activity.source_device
      },
      source: 'open_wearables',
      createdAt: Date.now()
    });

    // Create heart rate data point if available
    if (activity.avg_heart_rate) {
      dataPoints.push({
        id: `hr_${activity.id}`,
        userId,
        type: 'heart_rate' as BiometricDataType,
        timestamp: activity.start_time,
        value: activity.avg_heart_rate,
        unit: 'bpm',
        metadata: {
          activityId: activity.id,
          activityType: activity.activity_type
        },
        source: 'open_wearables',
        createdAt: Date.now()
      });
    }

    return dataPoints;
  }

  /**
   * Verify webhook signature
   */
  public verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config?.webhookSecret) {
      logger.warn('Webhook secret not configured');
      return false;
    }

    // Implement signature verification based on Open Wearables spec
    // This is a placeholder - adjust based on actual implementation
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.api.get('/health');
      return true;
    } catch (error) {
      logger.error('Open Wearables API health check failed', {
        context: 'open-wearables',
        metadata: { error }
      });
      return false;
    }
  }

  /**
   * Get service info
   */
  public getServiceInfo(): { name: string; version: string; providers: string[] } {
    return {
      name: 'Open Wearables API',
      version: '1.0.0',
      providers: ['garmin', 'apple_health', 'google_fit', 'fitbit', 'oura', 'withings', 'whoop']
    };
  }
}

// Export singleton instance
export const openWearablesService = OpenWearablesService.getInstance();

export default openWearablesService;
