# Spartan Hub API Documentation

## Table of Contents
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Rate Limiting](#rate-limiting)
- [Health Checks](#health-checks)
- [Cache Management](#cache-management)
- [AI Services](#ai-services)
- [Fitness Services](#fitness-services)
- [User Management](#user-management)
- [Security Guidelines](#security-guidelines)

## Base URL
```
https://api.spartanhub.com
```

## Authentication

### JWT Token Authentication

All protected endpoints require a valid JWT token in the Authorization header.

#### Headers
- `Authorization: Bearer <token>` - Required for protected endpoints
- `Content-Type: application/json` - Required for POST/PUT requests

#### Token Format
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyMTIzIiwicm9sZSI6InVzZXIiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password to get a JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```

**Success Response:**
- Status: 200 OK
- Headers:
  - `X-RateLimit-Limit: 5`
  - `X-RateLimit-Remaining: 4`
  - `X-RateLimit-Reset: 900`
  - `Set-Cookie: auth_token=<token>; HttpOnly; Secure; SameSite=Strict`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "role": "user",
      "name": "John Doe"
    }
  }
}
```

**Error Response:**
- Status: 401 Unauthorized

```json
{
  "success": false,
  "message": "Invalid credentials",
  "error": "Invalid email or password"
}
```

- Status: 429 Too Many Requests

```json
{
  "success": false,
  "message": "Too many authentication attempts from this IP, please try again later.",
  "code": "RATE_LIMIT_EXCEEDED_AUTH",
  "retryAfter": "Please try again later."
}
```

#### POST /auth/register
Register a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "secure_password",
  "quest": "Initial quest"
}
```

**Success Response:**
- Status: 201 Created

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

**Error Response:**
- Status: 400 Bad Request

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Health Checks

#### GET /health
Check the health status of the application and its services.

**Success Response:**
- Status: 200 OK
- Headers:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 99`
  - `X-RateLimit-Reset: 900`

```json
{
  "status": "OK",
  "message": "Backend server is running",
  "timestamp": "2023-12-26T11:00:00.000Z",
  "port": 3001
}
```

#### GET /api/governance/health
Check governance system health (requires authentication).

**Headers:**
- `Authorization: Bearer <token>` - Required

**Success Response:**
- Status: 200 OK

```json
{
  "success": true,
  "message": "Governance system is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-26T11:00:00.000Z",
    "checks": {
      "ai_service": "healthy",
      "database": "connected",
      "cache": "available"
    }
  }
}
```

**Error Response:**
- Status: 401 Unauthorized (no token)
- Status: 403 Forbidden (insufficient permissions)

### Cache Management

#### GET /cache/stats
Get cache statistics and performance metrics.

**Headers:**
- `Authorization: Bearer <token>` - Required

**Success Response:**
- Status: 200 OK

```json
{
  "success": true,
  "message": "Cache statistics retrieved successfully",
  "data": {
    "size": 45,
    "keys": ["user:123", "exercise:456", "ai:recommendation:789"],
    "contentTypeDistribution": {
      "user/profile": 12,
      "exercise/list": 20,
      "ai/recommendation": 13
    },
    "tagDistribution": {
      "users": 12,
      "exercises": 20,
      "ai": 13
    },
    "cacheMetrics": {
      "hits": 1250,
      "misses": 250,
      "hitRate": 0.8333
    }
  }
}
```

#### POST /cache/invalidate
Invalidate cache entries by tag.

**Headers:**
- `Authorization: Bearer <token>` - Required
- `Content-Type: application/json`

**Request:**
```json
{
  "tag": "users"
}
```

**Success Response:**
- Status: 200 OK

```json
{
  "success": true,
  "message": "Cache invalidated successfully",
  "data": {
    "invalidatedCount": 12
  }
}
```

### AI Services

#### POST /ai/alert/:userId
Get personalized AI alert for a user.

**Headers:**
- `Authorization: Bearer <token>` - Required
- `Content-Type: application/json`

**Path Parameters:**
- `userId` - User ID to get alert for

**Request:**
```json
{
  "context": "workout_performance",
  "data": {
    "performance": 0.85,
    "consistency": 0.9
  }
}
```

**Success Response:**
- Status: 200 OK
- Headers:
  - `X-RateLimit-Limit: 20`
  - `X-RateLimit-Remaining: 19`
  - `X-RateLimit-Reset: 900`

```json
{
  "success": true,
  "message": "AI alert generated successfully",
  "data": {
    "alert": {
      "type": "motivational",
      "message": "Great job! Keep up the consistency.",
      "priority": "medium",
      "timestamp": "2023-12-26T11:00:00.000Z"
    }
  }
}
```

#### POST /ai/decision/:userId
Get AI-driven decision for a user.

**Headers:**
- `Authorization: Bearer <token>` - Required
- `Content-Type: application/json`

**Path Parameters:**
- `userId` - User ID to get decision for

**Request:**
```json
{
  "context": "workout_adjustment",
  "data": {
    "performance": 0.7,
    "fatigue": 0.85
  }
}
```

**Success Response:**
- Status: 200 OK

```json
{
  "success": true,
  "message": "AI decision generated successfully",
  "data": {
    "decision": {
      "type": "workout_adjustment",
      "recommendation": "Reduce intensity by 20%",
      "confidence": 0.89,
      "timestamp": "2023-12-26T11:00:00.000Z"
    }
  }
}
```

### Fitness Services

#### GET /fitness
Get fitness data for authenticated user.

**Headers:**
- `Authorization: Bearer <token>` - Required

**Success Response:**
- Status: 200 OK
- Headers:
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 99`
  - `X-RateLimit-Reset: 900`

```json
{
  "success": true,
  "message": "Fitness data retrieved successfully",
  "data": {
    "user": {
      "id": "user123",
      "name": "John Doe"
    },
    "workouts": [
      {
        "id": "workout123",
        "date": "2023-12-25T10:00:00.000Z",
        "type": "strength",
        "duration": 45,
        "performance": 0.85
      }
    ],
    "exercises": [
      {
        "id": "exercise456",
        "name": "Push-ups",
        "category": "upper_body",
        "sets": 3,
        "reps": 15
      }
    ]
  }
}
```

#### POST /fitness
Record a new fitness activity.

**Headers:**
- `Authorization: Bearer <token>` - Required
- `Content-Type: application/json`

**Request:**
```json
{
  "activityType": "workout",
  "data": {
    "exercise": "Push-ups",
    "sets": 3,
    "reps": 15,
    "weight": 0
  }
}
```

**Success Response:**
- Status: 201 Created
- Headers:
  - `X-RateLimit-Limit: 20`
  - `X-RateLimit-Remaining: 19`
  - `X-RateLimit-Reset: 900`

```json
{
  "success": true,
  "message": "Fitness activity recorded successfully",
  "data": {
    "activity": {
      "id": "activity123",
      "userId": "user123",
      "type": "workout",
      "data": {
        "exercise": "Push-ups",
        "sets": 3,
        "reps": 15,
        "weight": 0
      },
      "timestamp": "2023-12-26T11:00:00.000Z"
    }
  }
}
```

### User Management

#### GET /test/user/:userId
Get user information by ID (for testing purposes).

**Headers:**
- `Authorization: Bearer <token>` - Required

**Path Parameters:**
- `userId` - User ID to retrieve

**Success Response:**
- Status: 200 OK

```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "id": "user123",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "lastLoginAt": "2023-12-25T10:00:00.000Z"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting with different limits based on endpoint type:

- **Global**: 1000 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **GET requests**: 100 requests per 15 minutes per IP
- **Write operations (POST/PUT/DELETE)**: 20 requests per 15 minutes per IP
- **AI endpoints**: 20 requests per 15 minutes per IP
- **General API**: 50 requests per 15 minutes per IP

### Rate Limit Headers

When rate limiting applies, the following headers are included in responses:

- `X-RateLimit-Limit`: The maximum number of requests allowed in the current window
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: The time when the rate limit window resets (in seconds)

### Rate Limit Response

When the rate limit is exceeded, the API returns:

- **Status**: 429 Too Many Requests

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "code": "RATE_LIMIT_EXCEEDED_GLOBAL",
  "retryAfter": "Please try again later."
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
Validation error occurred.

```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "path": "field_name",
      "message": "Error description"
    }
  ]
}
```

#### 401 Unauthorized
Authentication required or invalid token.

```json
{
  "success": false,
  "message": "Access denied. No token provided. Please log in to continue."
}
```

#### 403 Forbidden
Insufficient permissions.

```json
{
  "success": false,
  "message": "Access denied. You do not have permission to perform this action."
}
```

#### 404 Not Found
Requested resource does not exist.

```json
{
  "success": false,
  "message": "Resource not found"
}
```

#### 500 Internal Server Error
Unexpected server error occurred.

```json
{
  "success": false,
  "message": "An unexpected error occurred",
  "error": "Error details"
}
```

## Security Guidelines

### Authentication Security
- JWT tokens are stored in httpOnly cookies when possible
- Tokens expire after 1 hour of inactivity
- Sessions are tracked and can be invalidated
- Passwords are hashed using bcrypt

### Input Validation
- All inputs are validated using Zod schemas
- SQL injection is prevented with parameterized queries
- XSS prevention through proper output encoding

### Rate Limiting Security
- Rate limits applied per IP address
- Support for X-Forwarded-For and X-Real-IP headers
- Different limits for different endpoint types
- Distributed rate limiting using Redis

### Data Protection
- Sensitive data is sanitized from logs
- PII is protected according to privacy regulations
- Data encryption at rest and in transit