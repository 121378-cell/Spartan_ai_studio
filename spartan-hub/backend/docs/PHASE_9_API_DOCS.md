# Phase 9 API Documentation

## Overview
Phase 9 introduces comprehensive engagement and retention features including achievements, challenges, social interactions, and advanced analytics.

## Base URL
```
/api/v1/phase9
```

## Authentication
All endpoints require JWT authentication via Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Endpoints

### Achievement System

#### Get User Achievements
```
GET /achievements/user/:userId
```
Retrieve all achievements for a specific user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 1,
      "achievementId": "first_workout",
      "status": "unlocked",
      "progress": 100,
      "unlockedAt": "2026-01-30T10:00:00Z"
    }
  ],
  "message": "User achievements retrieved successfully"
}
```

#### Get Available Achievements
```
GET /achievements/available
```
Retrieve all available achievements in the system.

#### Check Unlocked Achievements
```
POST /achievements/user/:userId/check
```
Check if user has unlocked new achievements based on recent activity.

**Request Body:**
```json
{
  "activityType": "workout_completed",
  "activityData": {
    "workoutId": 123,
    "duration": 3600
  }
}
```

### Engagement System

#### Create Challenge
```
POST /engagement/challenges
```
Create a new challenge for users to participate in.

**Request Body:**
```json
{
  "title": "30-Day Plank Challenge",
  "description": "Hold a plank for 2 minutes",
  "type": "daily",
  "difficulty": "intermediate",
  "rewardPoints": 500,
  "startDate": "2026-01-30T00:00:00Z",
  "endDate": "2026-02-28T23:59:59Z"
}
```

#### Join Challenge
```
POST /engagement/challenges/:userId/:challengeId/join
```
Join a challenge as a participant.

#### Update Challenge Progress
```
PUT /engagement/challenges/:userId/:challengeId/progress
```
Update user's progress in a challenge.

**Request Body:**
```json
{
  "progress": 75
}
```

#### Get User Streaks
```
GET /engagement/streaks/user/:userId
```
Retrieve user's current streak information.

#### Get Leaderboard
```
GET /engagement/leaderboard?limit=10
```
Get top users by engagement points.

### Community Features

#### Follow User
```
POST /community/users/:followerId/follow/:followedId
```
Follow another user in the community.

#### Create Post
```
POST /community/posts/:userId
```
Create a new community post.

**Request Body:**
```json
{
  "content": "Just finished an amazing workout!",
  "mediaUrl": "https://example.com/image.jpg"
}
```

#### Like Post
```
POST /community/posts/:userId/:postId/like
```
Like a community post.

#### Add Comment
```
POST /community/posts/:postId/comments
```
Add a comment to a post.

**Request Body:**
```json
{
  "userId": 1,
  "content": "Great job!",
  "parentCommentId": 5
}
```

#### Share Workout
```
POST /community/workouts/:userId/share
```
Share a completed workout with the community.

**Request Body:**
```json
{
  "workoutData": {
    "type": "running",
    "duration": 1800,
    "distance": 5000
  },
  "description": "Morning 5K run"
}
```

#### Get User Feed
```
GET /community/feed/:userId?limit=20
```
Get personalized feed of posts from followed users.

#### Search Users
```
GET /community/users/search?query=john&limit=10
```
Search for users by username or email.

### Retention Analytics

#### Track Activity
```
POST /analytics/activity/:userId
```
Track user activity for analytics.

**Request Body:**
```json
{
  "activityType": "app_login",
  "activityData": {},
  "sessionDuration": 300
}
```

#### Calculate Engagement Score
```
GET /analytics/engagement/:userId/score
```
Calculate user's engagement score based on recent activity.

#### Predict Churn Risk
```
GET /analytics/churn/:userId/predict
```
Get churn risk prediction for user.

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 25.5,
    "riskLevel": "low"
  },
  "message": "Churn risk predicted successfully"
}
```

#### Get Retention Dashboard
```
GET /analytics/dashboard
```
Get comprehensive retention analytics dashboard.

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

## Rate Limiting
All endpoints are rate-limited to prevent abuse:
- 100 requests per minute per user
- 1000 requests per hour per IP

## WebSockets
Real-time updates are available via WebSocket connection:
```
ws://localhost:8000/ws/engagement
```

Events include:
- `challenge_updated`: Challenge progress updates
- `achievement_unlocked`: New achievements
- `streak_extended`: Streak milestones
- `social_notification`: Likes, comments, follows