# Form Analysis API Documentation

## Overview
API endpoints for the Video Form Analysis system that captures, analyzes, and stores exercise form data using MediaPipe pose detection.

## Base URL
```
/api/v1/form-analysis
```

## Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Endpoints

### Session Management

#### Start Form Analysis Session
```
POST /sessions/:userId/start
```
Start a new form analysis session for an exercise.

**Request Body:**
```json
{
  "exerciseType": "squat",
  "notes": "Morning workout session"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": 123
  },
  "message": "Form analysis session started successfully"
}
```

#### End Form Analysis Session
```
PUT /sessions/:sessionId/end
```
End a form analysis session and save final statistics.

**Request Body:**
```json
{
  "durationSeconds": 120,
  "stats": {
    "averageScore": 85.5,
    "bestScore": 92.0,
    "worstScore": 78.3,
    "totalReps": 10,
    "completedReps": 8
  }
}
```

### Rep Analysis

#### Add Rep Analysis Data
```
POST /sessions/:sessionId/rep
```
Add analysis data for a single repetition.

**Request Body:**
```json
{
  "repData": {
    "repNumber": 1,
    "startTime": "2026-01-30T10:00:00Z",
    "endTime": "2026-01-30T10:00:03Z",
    "durationMs": 3000,
    "score": 87.5,
    "feedback": "Good form, knees tracking well",
    "keypoints": {
      "nose": [0.5, 0.2],
      "left_shoulder": [0.4, 0.3],
      "right_shoulder": [0.6, 0.3]
    },
    "angles": {
      "knee_angle": 95,
      "hip_angle": 85,
      "back_angle": 175
    },
    "metrics": {
      "depth_score": 0.9,
      "knee_tracking_score": 0.85,
      "balance_score": 0.78
    }
  }
}
```

### Data Retrieval

#### Get User Form Sessions
```
GET /sessions/user/:userId?limit=20
```
Retrieve a user's form analysis sessions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "exercise_type": "squat",
      "session_start": "2026-01-30T10:00:00Z",
      "session_end": "2026-01-30T10:02:00Z",
      "duration_seconds": 120,
      "average_score": 85.5,
      "best_score": 92.0,
      "worst_score": 78.3,
      "total_reps": 10,
      "completed_reps": 8,
      "notes": "Morning workout session"
    }
  ],
  "message": "Form sessions retrieved successfully"
}
```

#### Get Session Details
```
GET /sessions/:sessionId/details
```
Get detailed information about a specific session including all rep analyses.

#### Get User Exercise Statistics
```
GET /stats/user/:userId?exerciseType=squat
```
Get aggregated statistics for a user's exercise performance.

### Feedback

#### Add Form Feedback
```
POST /feedback/:userId/:sessionId
```
Add feedback for specific form issues identified during analysis.

**Request Body:**
```json
{
  "feedbackData": {
    "repId": 456,
    "feedbackType": "correction",
    "bodyPart": "knees",
    "issue": "Knees caving inward during descent",
    "suggestion": "Focus on pushing knees outward during the squat",
    "severity": "medium"
  }
}
```

#### Get Session Feedback
```
GET /feedback/session/:sessionId
```
Retrieve all feedback associated with a specific session.

## Error Responses

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error

## Data Models

### Exercise Types
Supported exercise types include:
- `squat`
- `deadlift`
- `pushup`
- `pullup`
- `lunge`
- `bench_press`

### Feedback Types
- `correction`: Form corrections needed
- `encouragement`: Positive reinforcement
- `tip`: Helpful technique advice
- `warning`: Serious form issues to address

### Severity Levels
- `low`: Minor form issues
- `medium`: Moderate form concerns
- `high`: Significant form problems requiring attention

## Integration with Frontend

The API is designed to work with the React form analysis components:
1. Start session when user begins exercise
2. Send rep data after each repetition
3. End session when workout completes
4. Retrieve historical data for progress tracking