/**
 * Terra API Configuration
 * 
 * Unified wearable aggregation supporting 200+ devices:
 * - Garmin, Apple Health, Google Fit, Oura, Withings, Fitbit, etc.
 * 
 * API Docs: https://docs.tryterra.co/
 */

export const terraConfig = {
  // API Authentication
  apiKey: process.env.TERRA_API_KEY || '',
  apiSecret: process.env.TERRA_API_SECRET || '',
  
  // Webhook Configuration
  webhookSecret: process.env.TERRA_WEBHOOK_SECRET || '',
  webhookUrl: process.env.TERRA_WEBHOOK_URL || `${process.env.API_BASE_URL || 'http://localhost:5000'}/api/webhooks/terra`,
  
  // Base URLs
  baseUrl: 'https://api.tryterra.co/v2',
  webhookBaseUrl: 'https://api.tryterra.co/v2/webhooks',
  
  // Rate Limit Configuration
  rateLimits: {
    default: {
      requestsPerMinute: 60,
      requestsPerDay: 10000
    },
    heavy: {
      requestsPerMinute: 20,
      requestsPerDay: 2000
    }
  },
  
  // Supported Data Types
  supportedDataTypes: [
    'heart_rate',
    'resting_heart_rate',
    'heart_rate_variability',
    'sleep',
    'activity',
    'steps',
    'calories',
    'distance',
    'body_metrics',
    'weight',
    'body_fat',
    'blood_pressure',
    'blood_glucose',
    'stress',
    'respiration',
    'spo2',
    'temperature'
  ],
  
  // Device Types supported by Terra
  supportedDevices: [
    'garmin',
    'apple',
    'google',
    'oura',
    'withings',
    'fitbit',
    'polar',
    'samsung',
    'whoop',
    'strava',
    'cronometer',
    'eight',
    'myfitnesspal',
    'manual'
  ],
  
  // Poll/Sync Configuration
  syncConfig: {
    // Default polling interval in seconds (adaptive per signal type)
    defaultIntervalSeconds: 300, // 5 minutes
    
    // Critical signal poll interval (HRV spike, HR abnormality)
    criticalSignalIntervalSeconds: 60, // 1 minute
    
    // Max lookback for historical data
    maxHistoricalDaysLookback: 90,
    
    // Batch fetch size for efficiency
    batchFetchSize: 1000
  },
  
  // Webhook Event Types
  webhookEventTypes: [
    'user.updated',
    'user.deactivated',
    'user.reactivated',
    'data.activity',
    'data.sleep',
    'data.heart_rate',
    'data.body',
    'data.nutrition',
    'data.menstruation',
    'data.step',
    'data.glucose',
    'connection.error',
    'connection.revoked'
  ],
  
  // HTTP Timeout
  httpTimeout: 30000 // 30 seconds
};

export default terraConfig;
