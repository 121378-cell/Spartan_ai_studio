/**
 * Spartan Hub 2.0 - Load Testing Utilities
 * 
 * Helper functions for k6 load testing scenarios
 * 
 * @version 1.0.0
 * @date March 2, 2026
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// ============================================================================
// CUSTOM METRICS
// ============================================================================

// Response time trends by endpoint
export const loginResponseTime = new Trend('login_response_time');
export const registerResponseTime = new Trend('register_response_time');
export const fitnessAnalyzeResponseTime = new Trend('fitness_analyze_response_time');
export const coachChatResponseTime = new Trend('coach_chat_response_time');
export const workoutsResponseTime = new Trend('workouts_response_time');
export const healthCheckResponseTime = new Trend('health_check_response_time');

// Error rates by type
export const authenticationErrors = new Rate('authentication_errors');
export const serverErrors = new Rate('server_errors');
export const validationErrors = new Rate('validation_errors');
export const timeoutErrors = new Rate('timeout_errors');

// Throughput metrics
export const successfulRequests = new Counter('successful_requests');
export const failedRequests = new Counter('failed_requests');

// Resource utilization (simulated)
export const simulatedCpuUsage = new Gauge('simulated_cpu_usage');
export const simulatedMemoryUsage = new Gauge('simulated_memory_usage');

// Business metrics
export const successfulLogins = new Counter('successful_logins');
export const successfulWorkouts = new Counter('successful_workouts');
export const successfulAnalyses = new Counter('successful_analyses');
export const activeUsers = new Gauge('active_users');

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

/**
 * Authenticate a user and return the token
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} - { token, user } or null on failure
 */
export function authenticate(baseUrl, email, password) {
  const url = `${baseUrl}/api/auth/login`;
  const payload = JSON.stringify({ email, password });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: '30s',
  };
  
  const response = http.post(url, payload, params);
  
  loginResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'login: status is 200': (r) => r.status === 200,
    'login: has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.token;
      } catch {
        return false;
      }
    },
  });
  
  if (success) {
    successfulLogins.add(1);
    successfulRequests.add(1);
    const body = JSON.parse(response.body);
    return {
      token: body.data.token,
      user: body.data.user,
    };
  } else {
    failedRequests.add(1);
    if (response.status >= 500) {
      serverErrors.add(1);
    } else if (response.status === 401 || response.status === 403) {
      authenticationErrors.add(1);
    } else {
      validationErrors.add(1);
    }
    return null;
  }
}

/**
 * Register a new user
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {object} userData - User registration data
 * @returns {object} - { token, user } or null on failure
 */
export function registerUser(baseUrl, userData) {
  const url = `${baseUrl}/api/auth/register`;
  const payload = JSON.stringify(userData);
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    timeout: '30s',
  };
  
  const response = http.post(url, payload, params);
  
  registerResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'register: status is 201': (r) => r.status === 201,
    'register: has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.token;
      } catch {
        return false;
      }
    },
  });
  
  if (success) {
    successfulRequests.add(1);
    const body = JSON.parse(response.body);
    return {
      token: body.data.token,
      user: body.data.user,
    };
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Create authenticated request headers
 * 
 * @param {string} token - JWT token
 * @returns {object} - Headers object with authorization
 */
export function createAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ============================================================================
// API CALL WRAPPERS
// ============================================================================

/**
 * Get user profile
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} token - JWT token
 * @returns {object} - User profile data or null
 */
export function getUserProfile(baseUrl, token) {
  const url = `${baseUrl}/api/users/me`;
  
  const params = {
    headers: createAuthHeaders(token),
    timeout: '10s',
  };
  
  const response = http.get(url, params);
  
  const success = check(response, {
    'getProfile: status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successfulRequests.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Get today's workout
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} token - JWT token
 * @returns {object} - Workout data or null
 */
export function getTodaysWorkout(baseUrl, token) {
  const url = `${baseUrl}/api/workouts/today`;
  
  const params = {
    headers: createAuthHeaders(token),
    timeout: '10s',
  };
  
  const response = http.get(url, params);
  workoutsResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'getWorkout: status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successfulRequests.add(1);
    successfulWorkouts.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Get workouts list
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} token - JWT token
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} - Workouts list or null
 */
export function getWorkouts(baseUrl, token, page = 1, limit = 10) {
  const url = `${baseUrl}/api/workouts?page=${page}&limit=${limit}`;
  
  const params = {
    headers: createAuthHeaders(token),
    timeout: '10s',
  };
  
  const response = http.get(url, params);
  workoutsResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'getWorkouts: status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successfulRequests.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Analyze fitness data
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} token - JWT token
 * @param {object} analysisData - Data to analyze
 * @returns {object} - Analysis results or null
 */
export function analyzeFitness(baseUrl, token, analysisData) {
  const url = `${baseUrl}/api/fitness/analyze`;
  const payload = JSON.stringify(analysisData);
  
  const params = {
    headers: createAuthHeaders(token),
    timeout: '30s',
  };
  
  const response = http.post(url, payload, params);
  fitnessAnalyzeResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'analyzeFitness: status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successfulRequests.add(1);
    successfulAnalyses.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Chat with AI Coach
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} token - JWT token
 * @param {string} message - User message
 * @returns {object} - Coach response or null
 */
export function chatWithCoach(baseUrl, token, message) {
  const url = `${baseUrl}/api/coach/chat`;
  const payload = JSON.stringify({
    message,
    context: {
      currentExercise: 'squat',
      recentWorkouts: 5,
    },
  });
  
  const params = {
    headers: createAuthHeaders(token),
    timeout: '30s',
  };
  
  const response = http.post(url, payload, params);
  coachChatResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'chatWithCoach: status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successfulRequests.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Get health status
 * 
 * @param {string} baseUrl - Base URL of the API
 * @returns {object} - Health status or null
 */
export function getHealthStatus(baseUrl) {
  const url = `${baseUrl}/api/health`;
  
  const params = {
    headers: {
      'Accept': 'application/json',
    },
    timeout: '5s',
  };
  
  const response = http.get(url, params);
  healthCheckResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'healthCheck: status is 200': (r) => r.status === 200,
    'healthCheck: is healthy': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.status === 'healthy';
      } catch {
        return false;
      }
    },
  });
  
  if (success) {
    successfulRequests.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Get readiness score
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} token - JWT token
 * @returns {object} - Readiness score or null
 */
export function getReadinessScore(baseUrl, token) {
  const url = `${baseUrl}/api/metrics/readiness`;
  
  const params = {
    headers: createAuthHeaders(token),
    timeout: '10s',
  };
  
  const response = http.get(url, params);
  
  const success = check(response, {
    'getReadiness: status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successfulRequests.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

/**
 * Get biometric data
 * 
 * @param {string} baseUrl - Base URL of the API
 * @param {string} token - JWT token
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {object} - Biometric data or null
 */
export function getBiometricData(baseUrl, token, date) {
  const url = `${baseUrl}/api/biometrics/daily?date=${date}`;
  
  const params = {
    headers: createAuthHeaders(token),
    timeout: '10s',
  };
  
  const response = http.get(url, params);
  
  const success = check(response, {
    'getBiometrics: status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successfulRequests.add(1);
    return JSON.parse(response.body);
  } else {
    failedRequests.add(1);
    return null;
  }
}

// ============================================================================
// RESPONSE VALIDATORS
// ============================================================================

/**
 * Validate API response structure
 * 
 * @param {object} response - HTTP response
 * @param {string} expectedType - Expected response type
 * @returns {boolean} - True if valid
 */
export function validateResponseStructure(response, expectedType = 'success') {
  try {
    const body = JSON.parse(response.body);
    return body.success === true && body.data !== undefined;
  } catch {
    return false;
  }
}

/**
 * Validate response time against threshold
 * 
 * @param {object} response - HTTP response
 * @param {number} threshold - Maximum acceptable response time (ms)
 * @returns {boolean} - True if within threshold
 */
export function validateResponseTime(response, threshold) {
  return response.timings.duration <= threshold;
}

/**
 * Validate JWT token structure
 * 
 * @param {string} token - JWT token
 * @returns {boolean} - True if valid structure
 */
export function validateTokenStructure(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const parts = token.split('.');
  return parts.length === 3;
}

// ============================================================================
// METRICS COLLECTORS
// ============================================================================

/**
 * Collect and log current metrics summary
 * 
 * @returns {object} - Metrics summary
 */
export function collectMetricsSummary() {
  return {
    successfulRequests: successfulRequests.count,
    failedRequests: failedRequests.count,
    successRate: successfulRequests.count / (successfulRequests.count + failedRequests.count) * 100,
    avgLoginTime: loginResponseTime.avg,
    avgWorkoutTime: workoutsResponseTime.avg,
    avgCoachChatTime: coachChatResponseTime.avg,
    avgFitnessAnalyzeTime: fitnessAnalyzeResponseTime.avg,
    authErrorRate: authenticationErrors.rate,
    serverErrorRate: serverErrors.rate,
  };
}

/**
 * Log metrics to console
 * 
 * @param {string} prefix - Log prefix
 */
export function logMetrics(prefix = '[METRICS]') {
  const metrics = collectMetricsSummary();
  console.log(`${prefix} Success Rate: ${metrics.successRate.toFixed(2)}%`);
  console.log(`${prefix} Avg Login Time: ${metrics.avgLoginTime.toFixed(2)}ms`);
  console.log(`${prefix} Avg Workout Time: ${metrics.avgWorkoutTime.toFixed(2)}ms`);
  console.log(`${prefix} Avg Coach Chat Time: ${metrics.avgCoachChatTime.toFixed(2)}ms`);
  console.log(`${prefix} Avg Fitness Analyze Time: ${metrics.avgFitnessAnalyzeTime.toFixed(2)}ms`);
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

/**
 * Generate random user data for registration
 * 
 * @returns {object} - User registration data
 */
export function generateUserData() {
  const timestamp = Date.now();
  return {
    name: `Test User ${timestamp}`,
    email: `testuser${timestamp}@spartan-hub.com`,
    password: 'TestPass123!',
    age: Math.floor(Math.random() * 30) + 18,
    gender: Math.random() > 0.5 ? 'male' : 'female',
    fitnessLevel: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
  };
}

/**
 * Generate random fitness analysis data
 * 
 * @returns {object} - Fitness analysis data
 */
export function generateFitnessAnalysisData() {
  const exercises = ['squat', 'deadlift', 'bench-press', 'overhead-press', 'barbell-row'];
  return {
    exerciseType: exercises[Math.floor(Math.random() * exercises.length)],
    reps: Math.floor(Math.random() * 15) + 1,
    sets: Math.floor(Math.random() * 5) + 1,
    weight: Math.floor(Math.random() * 100) + 20,
    duration: Math.floor(Math.random() * 60) + 10,
  };
}

/**
 * Generate random coach question
 * 
 * @returns {string} - Coach question
 */
export function generateCoachQuestion() {
  const questions = [
    'What should I eat before my workout?',
    'How many rest days should I take?',
    'My knees hurt during squats, what should I do?',
    'How can I improve my deadlift form?',
    'What is the best cardio for fat loss?',
    'How much protein should I eat daily?',
    'Can you create a home workout for me?',
    'How do I track my progress?',
    'What exercises target the core?',
    'How do I prevent muscle soreness?',
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sleep for a specified duration
 * 
 * @param {number} seconds - Seconds to sleep
 */
export function randomSleep(minSeconds, maxSeconds) {
  const duration = Math.random() * (maxSeconds - minSeconds) + minSeconds;
  sleep(duration);
}

/**
 * Get random item from array
 * 
 * @param {array} array - Source array
 * @returns {*} - Random item
 */
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random number in range
 * 
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random number
 */
export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format duration in human-readable format
 * 
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  // Metrics
  loginResponseTime,
  registerResponseTime,
  fitnessAnalyzeResponseTime,
  coachChatResponseTime,
  workoutsResponseTime,
  healthCheckResponseTime,
  authenticationErrors,
  serverErrors,
  validationErrors,
  timeoutErrors,
  successfulRequests,
  failedRequests,
  simulatedCpuUsage,
  simulatedMemoryUsage,
  successfulLogins,
  successfulWorkouts,
  successfulAnalyses,
  activeUsers,
  
  // Authentication
  authenticate,
  registerUser,
  createAuthHeaders,
  
  // API Calls
  getUserProfile,
  getTodaysWorkout,
  getWorkouts,
  analyzeFitness,
  chatWithCoach,
  getHealthStatus,
  getReadinessScore,
  getBiometricData,
  
  // Validators
  validateResponseStructure,
  validateResponseTime,
  validateTokenStructure,
  
  // Metrics
  collectMetricsSummary,
  logMetrics,
  
  // Data Generators
  generateUserData,
  generateFitnessAnalysisData,
  generateCoachQuestion,
  
  // Utilities
  randomSleep,
  randomItem,
  randomNumber,
  formatDuration,
};
