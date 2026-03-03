# 📚 Spartan Hub 2.0 - API Documentation

**Version:** 2.0.0  
**Last Updated:** April 2026  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Workouts](#workouts)
4. [Form Analysis](#form-analysis)
5. [Challenges](#challenges)
6. [Teams](#teams)
7. [Gamification](#gamification)
8. [Analytics](#analytics)

---

## 🔐 Authentication

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

---

### POST /api/auth/login

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "userId": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

---

### POST /api/auth/logout

Logout user and invalidate tokens.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 👥 Users

### GET /api/users/me

Get current user profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "stats": {
      "totalWorkouts": 45,
      "currentStreak": 7,
      "level": 12,
      "points": 3450
    }
  }
}
```

---

### PUT /api/users/me

Update current user profile.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "preferences": {
    "notifications": true,
    "privacy": "public"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "name": "John Smith",
    "preferences": {
      "notifications": true,
      "privacy": "public"
    }
  }
}
```

---

## 🏋️ Workouts

### GET /api/workouts

Get user's workout history.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `limit` (optional): Number of workouts to return (default: 20)
- `offset` (optional): Offset for pagination (default: 0)
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response (200):**
```json
{
  "success": true,
  "data": {
    "workouts": [
      {
        "id": "workout-123",
        "type": "strength",
        "duration": 3600,
        "calories": 450,
        "date": "2026-04-13T10:00:00Z",
        "exercises": [...]
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}
```

---

### POST /api/workouts

Create a new workout.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "type": "strength",
  "duration": 3600,
  "exercises": [
    {
      "name": "Squat",
      "sets": 4,
      "reps": 10,
      "weight": 100
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "workout-123",
    "type": "strength",
    "duration": 3600,
    "date": "2026-04-13T10:00:00Z"
  }
}
```

---

## 🎯 Form Analysis

### POST /api/form-analysis

Save form analysis results.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "exerciseType": "squat",
  "formScore": 85,
  "metrics": {
    "repsCompleted": 10,
    "durationSeconds": 45,
    "kneeValgusAngle": 5,
    "squatDepth": "parallel"
  },
  "warnings": ["Slight knee valgus detected"],
  "recommendations": ["Focus on pushing knees out"]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "analysis-123",
    "exerciseType": "squat",
    "formScore": 85,
    "createdAt": "2026-04-13T10:00:00Z"
  }
}
```

---

### GET /api/form-analysis/history

Get user's form analysis history.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `exerciseType` (optional): Filter by exercise type
- `limit` (optional): Number of analyses to return (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analyses": [
      {
        "id": "analysis-123",
        "exerciseType": "squat",
        "formScore": 85,
        "metrics": {...},
        "createdAt": "2026-04-13T10:00:00Z"
      }
    ],
    "total": 15,
    "limit": 20
  }
}
```

---

## 🏆 Challenges

### GET /api/challenges

Get available challenges.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "challenges": [
      {
        "id": "challenge-123",
        "name": "30-Day Squat Challenge",
        "description": "Complete 1000 squats in 30 days",
        "startDate": "2026-04-01T00:00:00Z",
        "endDate": "2026-05-01T00:00:00Z",
        "participants": 150,
        "rewards": [...]
      }
    ],
    "total": 5
  }
}
```

---

### POST /api/challenges/:id/join

Join a challenge.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully joined challenge"
}
```

---

## 👥 Teams

### POST /api/teams

Create a new team.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Fitness Warriors",
  "description": "Elite fitness team",
  "isPrivate": false
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "team-123",
    "name": "Fitness Warriors",
    "memberCount": 1
  }
}
```

---

## 🎮 Gamification

### GET /api/gamification/progress

Get user's gamification progress.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "level": 12,
    "currentXP": 3450,
    "requiredXP": 4000,
    "progress": 86.25,
    "achievements": [...],
    "badges": [...]
  }
}
```

---

### GET /api/gamification/achievements

Get all available achievements.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "achievement-1",
        "name": "First Steps",
        "description": "Complete your first workout",
        "category": "fitness",
        "difficulty": "easy",
        "unlocked": true,
        "unlockedAt": "2026-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

## 📊 Analytics

### GET /api/analytics/summary

Get user's analytics summary.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `period` (optional): Time period (week/month/year)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "workouts": 25,
    "totalDuration": 90000,
    "caloriesBurned": 12500,
    "averageFormScore": 82.5,
    "streakDays": 7,
    "achievements": 3
  }
}
```

---

## 🔧 Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request body",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "errorId": "error-123"
}
```

---

## 📞 Rate Limits

| Endpoint | Limit |
|----------|-------|
| Authentication | 10 requests/minute |
| General API | 100 requests/minute |
| File Upload | 10 requests/minute |

---

## 🔗 Support

- **Documentation:** https://docs.spartanhub.io
- **API Status:** https://status.spartanhub.io
- **Support:** support@spartanhub.io

---

**© 2026 Spartan Hub. All rights reserved.**
