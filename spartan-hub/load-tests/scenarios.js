/**
 * Spartan Hub 2.0 - Load Test Scenarios
 * k6 load test scenarios for comprehensive performance testing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import config from './config.js';

// Custom Metrics
const loginSuccessRate = new Rate('login_success');
const analysisSuccessRate = new Rate('analysis_success');
const coachSuccessRate = new Rate('coach_success');
const apiResponseTime = new Trend('api_response_time');

// Test User Data
const testUsers = config.testUsers;

// Helper Functions
function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function getRandomExercise() {
  const exercises = ['squat', 'deadlift', 'lunge', 'pushup', 'row', 'plank'];
  return exercises[Math.floor(Math.random() * exercises.length)];
}

function getRandomQuestion() {
  const questions = [
    'What is the proper squat form?',
    'How many reps should I do for muscle growth?',
    'What should I eat before a workout?',
    'How do I improve my deadlift?',
    'Is soreness normal after workouts?',
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

// API Call Functions
function login() {
  const user = getRandomUser();
  const payload = {
    email: user.email,
    password: user.password,
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${config.baseUrl}${config.endpoints.login}`, JSON.stringify(payload), params);
  
  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login has access token': (r) => r.json('accessToken') !== undefined,
  });

  loginSuccessRate.add(success);
  
  return response.json('accessToken');
}

function browseDashboard(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = http.get(`${config.baseUrl}/api/dashboard`, params);
  
  check(response, {
    'dashboard status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

function viewWorkouts(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = http.get(`${config.baseUrl}${config.endpoints.workouts}`, params);
  
  check(response, {
    'workouts status is 200': (r) => r.status === 200,
  });

  sleep(2);
}

function videoAnalysis(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const payload = {
    exercise: getRandomExercise(),
    videoData: 'mock_video_data',
  };

  const response = http.post(`${config.baseUrl}${config.endpoints.analyze}`, JSON.stringify(payload), params);
  
  const success = check(response, {
    'analysis status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });

  analysisSuccessRate.add(success);
  sleep(3);
}

function aiCoachChat(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  const payload = {
    message: getRandomQuestion(),
  };

  const response = http.post(`${config.baseUrl}${config.endpoints.coach}`, JSON.stringify(payload), params);
  
  const success = check(response, {
    'coach status is 200': (r) => r.status === 200,
  });

  coachSuccessRate.add(success);
  sleep(2);
}

function viewSettings(token) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const response = http.get(`${config.baseUrl}${config.endpoints.settings}`, params);
  
  check(response, {
    'settings status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

// User Scenario Simulation
function userBehavior(token) {
  const behavior = Math.random() * 100;
  
  if (behavior < config.userBehavior.browseDashboard) {
    browseDashboard(token);
  } else if (behavior < config.userBehavior.browseDashboard + config.userBehavior.viewWorkouts) {
    viewWorkouts(token);
  } else if (behavior < config.userBehavior.browseDashboard + config.userBehavior.viewWorkouts + config.userBehavior.videoAnalysis) {
    videoAnalysis(token);
  } else if (behavior < config.userBehavior.browseDashboard + config.userBehavior.viewWorkouts + config.userBehavior.videoAnalysis + config.userBehavior.aiCoachChat) {
    aiCoachChat(token);
  } else {
    viewSettings(token);
  }
}

// Default Load Test Function
export default function() {
  try {
    // Login
    const token = login();
    
    if (token) {
      // Simulate user behavior (3-5 actions per session)
      const actions = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < actions; i++) {
        userBehavior(token);
      }
      
      // Logout
      http.post(`${config.baseUrl}/api/auth/logout`, null, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error(`User action failed: ${error.message}`);
  }
  
  // Wait between user sessions
  sleep(5);
}

// Test Scenarios Export
export const options = {
  // Baseline Test Configuration
  baseline: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 }, // Ramp up to 100 users
      { duration: '8m', target: 100 }, // Stay at 100 users
      { duration: '1m', target: 0 },   // Ramp down
    ],
    gracefulRampDown: '30s',
  },
  
  // Load Test Configuration
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 500 }, // Ramp up to 500 users
      { duration: '25m', target: 500 }, // Stay at 500 users
      { duration: '5m', target: 0 },   // Ramp down
    ],
    gracefulRampDown: '30s',
  },
  
  // Stress Test Configuration
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 100 },
      { duration: '5m', target: 200 },
      { duration: '5m', target: 500 },
      { duration: '5m', target: 1000 },
      { duration: '5m', target: 1500 },
      { duration: '5m', target: 2000 },
      { duration: '5m', target: 0 },
    ],
    gracefulRampDown: '30s',
  },
  
  // Endurance Test Configuration
  endurance: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 200 }, // Ramp up to 200 users
      { duration: '1h55m', target: 200 }, // Stay at 200 users for 2 hours
    ],
    gracefulRampDown: '30s',
  },
};

// Thresholds for all scenarios
export const thresholds = {
  'http_req_duration': ['p(50)<200', 'p(95)<500', 'p(99)<1000'],
  'http_req_failed': ['rate<0.01'],
  'login_success': ['rate>0.95'],
  'analysis_success': ['rate>0.90'],
  'coach_success': ['rate>0.95'],
};
