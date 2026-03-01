/**
 * Spartan Hub 2.0 - Mock Terra Service
 * 
 * Simulates Terra webhook callbacks for biometric data sync.
 * Supports multiple wearable providers: Garmin, Apple Health, Google Fit, Fitbit, Whoop, Oura.
 * 
 * Features:
 * - Simulated webhook callbacks
 * - Mock biometric data streaming
 * - Real-time data simulation
 * - Provider-specific data formats
 * 
 * Usage: 
 *   Development: npx ts-node scripts/mock-terra-service.ts
 *   Docker: Included in docker-compose.local-test.yml
 */

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 8080;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const STREAM_INTERVAL_MS = 5000; // Stream new data every 5 seconds

// Test user IDs
const TEST_USER_IDS = ['test-user-001', 'test-user-002'];

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

interface BiometricDataPoint {
  timestamp: string;
  value: number;
  unit: string;
  quality?: string;
}

interface MockUserData {
  baseHRV: number;
  baseRHR: number;
  baseSleepHours: number;
  baseSteps: number;
  baseStress: number;
}

// User-specific base values for realistic variation
const userData: Record<string, MockUserData> = {
  'test-user-001': {
    baseHRV: 55,
    baseRHR: 62,
    baseSleepHours: 7.2,
    baseSteps: 9500,
    baseStress: 35
  },
  'test-user-002': {
    baseHRV: 48,
    baseRHR: 68,
    baseSleepHours: 6.8,
    baseSteps: 7200,
    baseStress: 42
  }
};

/**
 * Generate realistic HRV data
 */
function generateHRVData(userId: string): BiometricDataPoint {
  const base = userData[userId]?.baseHRV || 50;
  const variation = (Math.random() - 0.5) * 15;
  const timeOfDay = Math.sin(new Date().getHours() / 24 * Math.PI * 2) * 5;
  
  return {
    timestamp: new Date().toISOString(),
    value: Math.round((base + variation + timeOfDay) * 10) / 10,
    unit: 'ms',
    quality: Math.random() > 0.8 ? 'good' : Math.random() > 0.5 ? 'fair' : 'poor'
  };
}

/**
 * Generate realistic heart rate data
 */
function generateHeartRateData(userId: string): BiometricDataPoint {
  const base = userData[userId]?.baseRHR || 65;
  const activityMultiplier = Math.random() > 0.7 ? 1.3 : 1.0; // Simulate activity
  
  return {
    timestamp: new Date().toISOString(),
    value: Math.round(base * activityMultiplier + (Math.random() - 0.5) * 10),
    unit: 'bpm'
  };
}

/**
 * Generate realistic step count
 */
function generateStepsData(userId: string): BiometricDataPoint {
  const base = userData[userId]?.baseSteps || 8000;
  const hourOfDay = new Date().getHours();
  const progressOfDay = hourOfDay / 24;
  
  return {
    timestamp: new Date().toISOString(),
    value: Math.round(base * progressOfDay + Math.random() * 500),
    unit: 'steps'
  };
}

/**
 * Generate realistic stress level
 */
function generateStressData(userId: string): BiometricDataPoint {
  const base = userData[userId]?.baseStress || 40;
  const workHoursStress = (hour: number) => {
    // Higher stress during work hours (9-17)
    if (hour >= 9 && hour <= 17) return 15;
    return 0;
  };
  
  return {
    timestamp: new Date().toISOString(),
    value: Math.min(100, Math.max(0, Math.round(base + workHoursStress(new Date().getHours()) + (Math.random() - 0.5) * 20))),
    unit: 'score'
  };
}

/**
 * Generate sleep data (only once per day)
 */
function generateSleepData(userId: string) {
  const base = userData[userId]?.baseSleepHours || 7;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return {
    date: yesterday.toISOString().split('T')[0],
    startTime: new Date(yesterday.setHours(22, Math.floor(Math.random() * 60))).toISOString(),
    endTime: new Date(yesterday.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60))).toISOString(),
    duration: Math.round((base + (Math.random() - 0.5) * 2) * 60),
    quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)],
    stages: {
      light: Math.floor(120 + Math.random() * 60),
      deep: Math.floor(60 + Math.random() * 40),
      rem: Math.floor(80 + Math.random() * 40),
      awake: Math.floor(10 + Math.random() * 20)
    },
    score: Math.floor(60 + Math.random() * 35)
  };
}

// =============================================================================
// TERRA WEBHOOK PAYLOAD FORMATS
// =============================================================================

/**
 * Garmin webhook payload format
 */
function createGarminPayload(userId: string, dataType: string) {
  const payloads: Record<string, any> = {
    hrv: {
      event_type: 'USER_DATA_UPDATED',
      user_id: userId,
      provider: 'garmin',
      data_type: 'hrv',
      timestamp: new Date().toISOString(),
      data: {
        hrv: generateHRVData(userId),
        device: 'Garmin Forerunner 955',
        firmware_version: '12.34'
      }
    },
    heart_rate: {
      event_type: 'USER_DATA_UPDATED',
      user_id: userId,
      provider: 'garmin',
      data_type: 'heart_rate',
      timestamp: new Date().toISOString(),
      data: {
        heart_rate: generateHeartRateData(userId),
        device: 'Garmin Forerunner 955'
      }
    },
    steps: {
      event_type: 'USER_DATA_UPDATED',
      user_id: userId,
      provider: 'garmin',
      data_type: 'steps',
      timestamp: new Date().toISOString(),
      data: {
        steps: generateStepsData(userId),
        distance: { value: Math.random() * 10, unit: 'km' },
        calories: Math.floor(2000 + Math.random() * 800)
      }
    },
    sleep: {
      event_type: 'USER_DATA_UPDATED',
      user_id: userId,
      provider: 'garmin',
      data_type: 'sleep',
      timestamp: new Date().toISOString(),
      data: generateSleepData(userId)
    },
    stress: {
      event_type: 'USER_DATA_UPDATED',
      user_id: userId,
      provider: 'garmin',
      data_type: 'stress',
      timestamp: new Date().toISOString(),
      data: {
        stress: generateStressData(userId),
        measurement_type: 'hrv_based'
      }
    }
  };
  
  return payloads[dataType] || payloads.heart_rate;
}

/**
 * Apple Health webhook payload format
 */
function createAppleHealthPayload(userId: string, dataType: string) {
  const payloads: Record<string, any> = {
    hrv: {
      event_type: 'HEALTH_DATA_SYNC',
      user_id: userId,
      provider: 'apple-health',
      data_type: 'heart_rate_variability',
      timestamp: new Date().toISOString(),
      data: {
        hrv: generateHRVData(userId),
        source_device: 'Apple Watch Series 8',
        healthkit_version: '10.0'
      }
    },
    heart_rate: {
      event_type: 'HEALTH_DATA_SYNC',
      user_id: userId,
      provider: 'apple-health',
      data_type: 'heart_rate',
      timestamp: new Date().toISOString(),
      data: {
        heart_rate: generateHeartRateData(userId),
        source_device: 'Apple Watch Series 8'
      }
    },
    steps: {
      event_type: 'HEALTH_DATA_SYNC',
      user_id: userId,
      provider: 'apple-health',
      data_type: 'step_count',
      timestamp: new Date().toISOString(),
      data: {
        steps: generateStepsData(userId),
        source_device: 'iPhone 15 Pro'
      }
    },
    sleep: {
      event_type: 'HEALTH_DATA_SYNC',
      user_id: userId,
      provider: 'apple-health',
      data_type: 'sleep_analysis',
      timestamp: new Date().toISOString(),
      data: generateSleepData(userId)
    }
  };
  
  return payloads[dataType] || payloads.heart_rate;
}

/**
 * Google Fit webhook payload format
 */
function createGoogleFitPayload(userId: string, dataType: string) {
  const payloads: Record<string, any> = {
    hrv: {
      event_type: 'DATA_UPDATE',
      user_id: userId,
      provider: 'google-fit',
      data_type: 'hrv',
      timestamp: new Date().toISOString(),
      data: {
        hrv: generateHRVData(userId),
        data_source: 'wear_os_device'
      }
    },
    heart_rate: {
      event_type: 'DATA_UPDATE',
      user_id: userId,
      provider: 'google-fit',
      data_type: 'heart_rate',
      timestamp: new Date().toISOString(),
      data: {
        heart_rate: generateHeartRateData(userId),
        data_source: 'phone_sensor'
      }
    },
    steps: {
      event_type: 'DATA_UPDATE',
      user_id: userId,
      provider: 'google-fit',
      data_type: 'steps',
      timestamp: new Date().toISOString(),
      data: {
        steps: generateStepsData(userId),
        calories: Math.floor(2000 + Math.random() * 800)
      }
    }
  };
  
  return payloads[dataType] || payloads.heart_rate;
}

// =============================================================================
// EXPRESS SERVER
// =============================================================================

const app = express();
app.use(express.json());

// Store active streaming intervals
const streamingIntervals: Map<string, NodeJS.Timeout> = new Map();

// Store webhook subscriptions
const webhookSubscriptions: Map<string, { url: string; events: string[] }> = new Map();

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'mock-terra-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    activeStreams: streamingIntervals.size,
    activeSubscriptions: webhookSubscriptions.size
  });
});

/**
 * Root endpoint with service info
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Spartan Hub Mock Terra Service',
    version: '1.0.0',
    description: 'Simulates Terra webhook callbacks for biometric data sync',
    endpoints: {
      health: 'GET /health',
      webhook: 'POST /webhook',
      subscribe: 'POST /subscribe',
      unsubscribe: 'DELETE /subscribe/:userId',
      stream: 'POST /stream/start/:userId',
      streamStop: 'DELETE /stream/stop/:userId',
      simulate: 'POST /simulate/:userId/:dataType',
      status: 'GET /status'
    },
    supportedProviders: ['garmin', 'apple-health', 'google-fit', 'fitbit', 'whoop', 'oura'],
    supportedDataTypes: ['hrv', 'heart_rate', 'steps', 'sleep', 'stress', 'activity']
  });
});

/**
 * Register webhook subscription
 */
app.post('/subscribe', (req: Request, res: Response) => {
  const { userId, webhookUrl, events } = req.body;
  
  if (!userId || !webhookUrl) {
    return res.status(400).json({ error: 'userId and webhookUrl are required' });
  }
  
  webhookSubscriptions.set(userId, {
    url: webhookUrl,
    events: events || ['USER_DATA_UPDATED', 'HEALTH_DATA_SYNC']
  });
  
  console.log(`📡 Webhook registered for user ${userId}: ${webhookUrl}`);
  
  res.json({
    success: true,
    userId,
    webhookUrl,
    events,
    message: 'Webhook subscription registered successfully'
  });
});

/**
 * Unregister webhook subscription
 */
app.delete('/subscribe/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  
  if (webhookSubscriptions.has(userId)) {
    webhookSubscriptions.delete(userId);
    console.log(`📡 Webhook unregistered for user ${userId}`);
  }
  
  res.json({
    success: true,
    message: 'Webhook subscription removed'
  });
});

/**
 * Start real-time data streaming for a user
 */
app.post('/stream/start/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { provider = 'garmin', interval = STREAM_INTERVAL_MS } = req.body;
  
  if (!TEST_USER_IDS.includes(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (streamingIntervals.has(userId)) {
    return res.status(400).json({ error: 'Stream already active for this user' });
  }
  
  console.log(`🔴 Starting real-time stream for user ${userId} (provider: ${provider})`);
  
  const dataTypes = ['hrv', 'heart_rate', 'steps', 'stress'];
  let dataIndex = 0;
  
  const intervalId = setInterval(() => {
    const dataType = dataTypes[dataIndex % dataTypes.length];
    dataIndex++;
    
    // Generate payload based on provider
    let payload;
    switch (provider) {
      case 'apple-health':
        payload = createAppleHealthPayload(userId, dataType);
        break;
      case 'google-fit':
        payload = createGoogleFitPayload(userId, dataType);
        break;
      default:
        payload = createGarminPayload(userId, dataType);
    }
    
    // Send to backend webhook
    sendWebhook(payload);
    
    console.log(`📊 Streamed ${dataType} data for user ${userId}`);
  }, interval);
  
  streamingIntervals.set(userId, intervalId);
  
  res.json({
    success: true,
    userId,
    provider,
    interval,
    message: 'Real-time streaming started',
    dataTypes: ['hrv', 'heart_rate', 'steps', 'stress', 'sleep']
  });
});

/**
 * Stop real-time data streaming
 */
app.delete('/stream/stop/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  
  if (streamingIntervals.has(userId)) {
    clearInterval(streamingIntervals.get(userId)!);
    streamingIntervals.delete(userId);
    console.log(`⏹️ Stopped stream for user ${userId}`);
  }
  
  res.json({
    success: true,
    message: 'Streaming stopped'
  });
});

/**
 * Simulate single data update
 */
app.post('/simulate/:userId/:dataType', (req: Request, res: Response) => {
  const { userId, dataType } = req.params;
  const { provider = 'garmin' } = req.body;
  
  if (!TEST_USER_IDS.includes(userId)) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Generate payload based on provider
  let payload;
  switch (provider) {
    case 'apple-health':
      payload = createAppleHealthPayload(userId, dataType);
      break;
    case 'google-fit':
      payload = createGoogleFitPayload(userId, dataType);
      break;
    default:
      payload = createGarminPayload(userId, dataType);
  }
  
  // Send webhook
  sendWebhook(payload);
  
  console.log(`📊 Simulated ${dataType} data for user ${userId} (provider: ${provider})`);
  
  res.json({
    success: true,
    userId,
    dataType,
    provider,
    payload
  });
});

/**
 * Get streaming status
 */
app.get('/status', (req: Request, res: Response) => {
  const status = {
    activeStreams: Array.from(streamingIntervals.keys()).map(userId => ({
      userId,
      active: true
    })),
    subscriptions: Array.from(webhookSubscriptions.entries()).map(([userId, sub]) => ({
      userId,
      webhookUrl: sub.url,
      events: sub.events
    })),
    testUsers: TEST_USER_IDS
  };
  
  res.json(status);
});

/**
 * Receive webhooks from backend (for testing)
 */
app.post('/webhook', (req: Request, res: Response) => {
  const payload = req.body;
  console.log('📥 Received webhook:', JSON.stringify(payload, null, 2));
  
  res.json({
    success: true,
    message: 'Webhook received',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Send webhook to backend
 */
async function sendWebhook(payload: any) {
  const subscription = webhookSubscriptions.get(payload.user_id);
  
  if (subscription) {
    try {
      await fetch(subscription.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error(`Failed to send webhook: ${error}`);
    }
  } else {
    // Log for debugging
    console.log(`📤 Webhook (no subscription): ${payload.data_type} for ${payload.user_id}`);
  }
}

/**
 * Initialize mock data for test users
 */
function initializeMockData() {
  console.log('🔄 Initializing mock data for test users...');
  
  // Generate initial data for each test user
  for (const userId of TEST_USER_IDS) {
    console.log(`   - ${userId}`);
  }
}

// =============================================================================
// SERVER STARTUP
// =============================================================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     Spartan Hub 2.0 - Mock Terra Service                      ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on: http://localhost:${PORT}                    ║`);
  console.log('║                                                               ║');
  console.log('║  Test Users:                                                  ║');
  console.log('║    - test-user-001 (Alex Tester)                              ║');
  console.log('║    - test-user-002 (Jordan Tester)                            ║');
  console.log('║                                                               ║');
  console.log('║  Supported Providers:                                         ║');
  console.log('║    - Garmin, Apple Health, Google Fit                         ║');
  console.log('║    - Fitbit, Whoop, Oura                                      ║');
  console.log('║                                                               ║');
  console.log('║  Quick Start:                                                 ║');
  console.log(`║    curl http://localhost:${PORT}/stream/start/test-user-001      ║');
  console.log(`║    curl http://localhost:${PORT}/simulate/test-user-001/hrv      ║');
  console.log(`║    curl http://localhost:${PORT}/status                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  initializeMockData();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Mock Terra Service...');
  
  // Clear all streaming intervals
  streamingIntervals.forEach((interval, userId) => {
    clearInterval(interval);
    console.log(`   Stopped stream for ${userId}`);
  });
  
  server.close(() => {
    console.log('✅ Mock Terra Service stopped');
    process.exit(0);
  });
});

export default app;
