# 📡 SPARTAN HUB 2.0 - API DOCUMENTATION

**Version:** 2.0  
**Date:** March 1, 2026  
**Base URL:** `https://api.spartan-hub.com`  
**Authentication:** JWT Bearer Token

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Users](#users)
4. [Video Form Analysis](#video-form-analysis)
5. [Biometric Data](#biometric-data)
6. [Workouts](#workouts)
7. [AI Coaching](#ai-coaching)
8. [Health Metrics](#health-metrics)
9. [Error Handling](#error-handling)

---

## 🎯 OVERVIEW

### API Specification

- **Protocol:** HTTPS
- **Format:** JSON
- **Version:** v2
- **Rate Limit:** 100 requests/minute (authenticated)

### Base URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://api.spartan-hub.com |
| **Staging** | https://staging-api.spartan-hub.com |
| **Development** | http://localhost:3001 |

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-03-01T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-01T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

---

## 🔐 AUTHENTICATION

### Register User

**POST** `/auth/register`

Create a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "age": 30,
  "gender": "male",
  "fitnessLevel": "intermediate"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123456",
      "email": "john@example.com",
      "name": "John Doe",
      "createdAt": "2026-03-01T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123456",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 3600
  }
}
```

---

### Refresh Token

**POST** `/auth/refresh`

Refresh expired JWT token.

**Request:**
```json
{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

---

## 👤 USERS

### Get User Profile

**GET** `/users/me`

Get current user profile information.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123456",
    "email": "john@example.com",
    "name": "John Doe",
    "age": 30,
    "gender": "male",
    "fitnessLevel": "intermediate",
    "goals": ["build_muscle", "improve_endurance"],
    "metrics": {
      "height": 180,
      "weight": 75,
      "bmi": 23.1
    },
    "createdAt": "2026-03-01T10:00:00Z",
    "updatedAt": "2026-03-01T10:00:00Z"
  }
}
```

---

### Update User Profile

**PUT** `/users/me`

Update user profile information.

**Request:**
```json
{
  "name": "John D. Doe",
  "weight": 76,
  "goals": ["build_muscle", "lose_fat"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "usr_123456",
    "name": "John D. Doe",
    "weight": 76,
    "goals": ["build_muscle", "lose_fat"],
    "updatedAt": "2026-03-01T10:00:00Z"
  }
}
```

---

## 📹 VIDEO FORM ANALYSIS

### Start Analysis Session

**POST** `/video-analysis/sessions`

Create a new video analysis session.

**Request:**
```json
{
  "exerciseType": "squat",
  "deviceId": "device_123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_789",
    "exerciseType": "squat",
    "status": "ready",
    "createdAt": "2026-03-01T10:00:00Z"
  }
}
```

---

### Upload Video Frame

**POST** `/video-analysis/sessions/{sessionId}/frames`

Upload a video frame for analysis.

**Headers:**
```
Content-Type: multipart/form-data
```

**Request:**
- `frame`: Image file (JPEG/PNG)
- `timestamp`: number (milliseconds)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "frameId": "frame_456",
    "timestamp": 1234567890,
    "analysis": {
      "poseDetected": true,
      "confidence": 0.95,
      "jointAngles": {
        "knee": 95.5,
        "hip": 92.3,
        "ankle": 88.7
      }
    }
  }
}
```

---

### Get Analysis Results

**GET** `/video-analysis/sessions/{sessionId}/results`

Get complete analysis results for a session.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_789",
    "exerciseType": "squat",
    "overallScore": 85,
    "metrics": {
      "averageDepth": 92,
      "kneeAlignment": 88,
      "backAngle": 90,
      "tempo": 82
    },
    "feedback": {
      "strengths": [
        "Good depth throughout the movement",
        "Back remained straight"
      ],
      "improvements": [
        "Knees tend to cave in slightly on ascent",
        "Consider slowing down the eccentric phase"
      ],
      "recommendations": [
        "Focus on pushing knees outward during ascent",
        "Try a 3-second descent count"
      ]
    },
    "reps": [
      {
        "repNumber": 1,
        "score": 87,
        "startTime": 0,
        "endTime": 3500
      },
      {
        "repNumber": 2,
        "score": 83,
        "startTime": 4000,
        "endTime": 7500
      }
    ],
    "completedAt": "2026-03-01T10:05:00Z"
  }
}
```

---

### Save Analysis

**POST** `/video-analysis/sessions/{sessionId}/save`

Save analysis results to user history.

**Request:**
```json
{
  "notes": "Felt strong today, knees still need work",
  "tags": ["leg_day", "heavy"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "savedId": "save_321",
    "sessionId": "session_789",
    "userId": "usr_123456",
    "savedAt": "2026-03-01T10:06:00Z"
  }
}
```

---

## 📊 BIOMETRIC DATA

### Sync Wearable Data

**POST** `/biometrics/sync`

Trigger synchronization with connected wearables.

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "syncId": "sync_654",
    "status": "processing",
    "estimatedCompletion": "2026-03-01T10:02:00Z"
  }
}
```

---

### Get Daily Biometrics

**GET** `/biometrics/daily?date=2026-03-01`

Get daily aggregated biometric data.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-01",
    "hrv": {
      "value": 45,
      "unit": "ms",
      "status": "good",
      "baseline": 42,
      "trend": "improving"
    },
    "restingHeartRate": {
      "value": 62,
      "unit": "bpm",
      "status": "excellent"
    },
    "sleep": {
      "duration": 7.5,
      "quality": 82,
      "deepSleep": 1.8,
      "remSleep": 2.1,
      "awakenings": 2
    },
    "stress": {
      "level": "low",
      "score": 35
    },
    "recovery": {
      "score": 78,
      "status": "good",
      "recommendation": "Ready for moderate to high intensity training"
    },
    "activity": {
      "steps": 8542,
      "calories": 2340,
      "activeMinutes": 45
    }
  }
}
```

---

### Get Biometric Trends

**GET** `/biometrics/trends?metric=hrv&days=30`

Get historical trends for a specific metric.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "metric": "hrv",
    "period": "30d",
    "dataPoints": [
      {
        "date": "2026-02-01",
        "value": 42,
        "baseline": 40
      },
      {
        "date": "2026-02-02",
        "value": 44,
        "baseline": 40
      }
      // ... more data points
    ],
    "statistics": {
      "average": 43.5,
      "min": 35,
      "max": 52,
      "trend": "improving",
      "percentChange": 8.5
    }
  }
}
```

---

## 🏋️ WORKOUTS

### Get Today's Workout

**GET** `/workouts/today`

Get the workout plan for today.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-01",
    "workoutId": "workout_987",
    "type": "strength",
    "focus": "lower_body",
    "estimatedDuration": 45,
    "difficulty": "intermediate",
    "exercises": [
      {
        "id": "ex_001",
        "name": "Barbell Squat",
        "sets": 4,
        "reps": "8-10",
        "restSeconds": 120,
        "notes": "Focus on depth and knee alignment",
        "videoUrl": "https://spartan-hub.com/videos/squat-demo"
      },
      {
        "id": "ex_002",
        "name": "Romanian Deadlift",
        "sets": 3,
        "reps": "10-12",
        "restSeconds": 90,
        "notes": "Keep back straight, feel the stretch"
      }
      // ... more exercises
    ],
    "warmup": {
      "duration": 5,
      "exercises": [
        "Leg swings x10 each leg",
        "Bodyweight squats x15",
        "Hip circles x10"
      ]
    },
    "cooldown": {
      "duration": 5,
      "exercises": [
        "Quad stretch 30s each leg",
        "Hamstring stretch 30s each leg",
        "Hip flexor stretch 30s each side"
      ]
    }
  }
}
```

---

### Complete Workout

**POST** `/workouts/{workoutId}/complete`

Mark a workout as completed.

**Request:**
```json
{
  "completedAt": "2026-03-01T11:00:00Z",
  "exercises": [
    {
      "exerciseId": "ex_001",
      "setsCompleted": [
        { "reps": 10, "weight": 80, "rating": 8 },
        { "reps": 10, "weight": 80, "rating": 7 },
        { "reps": 9, "weight": 80, "rating": 9 },
        { "reps": 8, "weight": 80, "rating": 8 }
      ]
    }
  ],
  "overallRating": 8,
  "notes": "Felt strong today!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "workoutId": "workout_987",
    "status": "completed",
    "completedAt": "2026-03-01T11:00:00Z",
    "performanceScore": 85,
    "achievements": [
      {
        "id": "ach_001",
        "name": "Consistency King",
        "description": "Completed 5 workouts in a row"
      }
    ]
  }
}
```

---

## 🤖 AI COACHING

### Get AI Recommendation

**POST** `/ai/recommendations`

Get personalized AI coaching recommendation.

**Request:**
```json
{
  "context": "pre_workout",
  "data": {
    "hrv": 45,
    "sleep": 7.5,
    "fatigue": "low",
    "lastWorkout": "2026-02-28"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "recommendationId": "rec_555",
    "type": "workout_adjustment",
    "title": "Ready for High Intensity",
    "message": "Your recovery metrics look excellent today. HRV is above baseline and you're well-rested. Perfect day to push hard on your leg workout!",
    "actionItems": [
      "Consider adding 10% more weight to your main lifts",
      "You can reduce rest periods by 15 seconds between sets",
      "Try to hit a new PR on squats if you're feeling confident"
    ],
    "confidence": 0.92,
    "generatedAt": "2026-03-01T09:00:00Z"
  }
}
```

---

### Chat with AI Coach

**POST** `/ai/chat`

Have a conversation with Coach Vitalis.

**Request:**
```json
{
  "message": "My knees hurt during squats. What should I do?",
  "context": {
    "currentExercise": "squat",
    "recentWorkouts": 5
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_777",
    "response": "Knee pain during squats is common and often related to form. Here are some things to check:\n\n1. **Knee Tracking**: Make sure your knees are pushing outward, not caving inward\n2. **Depth**: Don't go deeper than you can while maintaining good form\n3. **Warm-up**: Ensure you're properly warming up before heavy squats\n4. **Foot Position**: Try adjusting your stance width or toe angle\n\nIf pain persists, consider:\n- Reducing weight temporarily\n- Working with a physical therapist\n- Trying goblet squats or box squats as alternatives\n\nWould you like me to analyze your squat form via video?",
    "suggestions": [
      "Show me squat form tips",
      "Suggest alternative exercises",
      "Create a knee-friendly workout"
    ],
    "timestamp": "2026-03-01T10:30:00Z"
  }
}
```

---

## 📈 HEALTH METRICS

### Get Readiness Score

**GET** `/metrics/readiness`

Get current readiness score for training.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "readinessScore": 82,
    "status": "good",
    "factors": {
      "hrv": {
        "value": 45,
        "impact": "positive",
        "contribution": 25
      },
      "sleep": {
        "duration": 7.5,
        "quality": 82,
        "impact": "positive",
        "contribution": 22
      },
      "recovery": {
        "score": 78,
        "impact": "neutral",
        "contribution": 18
      },
      "stress": {
        "level": "low",
        "impact": "positive",
        "contribution": 17
      }
    },
    "recommendation": {
      "intensity": "moderate_to_high",
      "message": "You're in good shape for today's workout. Push yourself but listen to your body.",
      "avoid": [],
      "focus": ["strength", "power"]
    },
    "updatedAt": "2026-03-01T06:00:00Z"
  }
}
```

---

## ❌ ERROR HANDLING

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address",
        "code": "INVALID_FORMAT"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "code": "MIN_LENGTH"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-01T10:00:00Z",
    "requestId": "req_123456"
  }
}
```

---

## 📞 SUPPORT

**API Issues:** api-support@spartan-hub.com  
**Documentation:** https://docs.spartan-hub.com  
**Status:** https://status.spartan-hub.com

---

**Last Updated:** March 1, 2026  
**Version:** 2.0  
**Maintainer:** Backend Team
