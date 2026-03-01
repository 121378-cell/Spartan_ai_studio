/**
 * Spartan Hub 2.0 - Load Test Configuration
 * Configuration file for k6 load testing
 */

export const config = {
  // Base URLs
  baseUrl: __ENV.BASE_URL || 'http://localhost:3001',
  frontendUrl: __ENV.FRONTEND_URL || 'http://localhost:5173',

  // Test User Credentials (create these in your test environment)
  testUsers: [
    {
      email: __ENV.TEST_USER_1_EMAIL || 'test1@spartan-hub.com',
      password: __ENV.TEST_USER_1_PASSWORD || 'TestPassword123!',
    },
    {
      email: __ENV.TEST_USER_2_EMAIL || 'test2@spartan-hub.com',
      password: __ENV.TEST_USER_2_PASSWORD || 'TestPassword123!',
    },
  ],

  // API Endpoints
  endpoints: {
    // Authentication
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/tokens/refresh',

    // Health
    health: '/api/health',

    // Fitness
    analyze: '/api/fitness/analyze',
    workouts: '/api/workouts',
    biometric: '/api/biometric',

    // AI Coach
    coach: '/api/coach/chat',

    // User
    profile: '/api/user/profile',
    settings: '/api/user/settings',
  },

  // Test Scenarios Configuration
  scenarios: {
    baseline: {
      users: 100,
      duration: '10m',
      rampUp: '2m',
      rampDown: '1m',
    },
    load: {
      users: 500,
      duration: '30m',
      rampUp: '5m',
      rampDown: '5m',
    },
    stress: {
      startUsers: 100,
      maxUsers: 2000,
      stepDuration: '5m',
      stepIncrease: 100,
    },
    endurance: {
      users: 200,
      duration: '2h',
      rampUp: '5m',
    },
  },

  // Performance Thresholds
  thresholds: {
    http_req_duration: {
      p50: 200, // 50% of requests should be below 200ms
      p95: 500, // 95% of requests should be below 500ms
      p99: 1000, // 99% of requests should be below 1000ms
    },
    http_req_failed: {
      rate: 0.01, // Error rate should be below 1%
    },
  },

  // User Behavior Weights
  userBehavior: {
    browseDashboard: 40,
    viewWorkouts: 30,
    videoAnalysis: 15,
    aiCoachChat: 10,
    settingsProfile: 5,
  },
};

export default config;
