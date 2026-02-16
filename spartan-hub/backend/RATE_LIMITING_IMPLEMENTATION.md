# Rate Limiting Implementation

## Overview
This document describes the comprehensive rate limiting strategy implemented for the Spartan Hub API to protect against excessive requests and abuse.

## Implementation Details

### Technology Stack
- **express-rate-limit**: Primary rate limiting middleware
- **rate-limit-redis**: Redis-based storage for rate limit counters
- **redis**: Redis client for distributed rate limiting

### Rate Limiting Policies

#### 1. Authentication Endpoints
- **Endpoints**: `/auth/*`, `/tokens/*`
- **Limit**: 5 requests per 15 minutes per IP
- **Purpose**: Prevent brute force attacks on login and registration
- **Store**: Redis-based

#### 2. Data Reading Endpoints (GET Requests)
- **Endpoints**: All GET requests to `/fitness`, `/plan`, `/test`, `/health`, `/cache`, `/activity`
- **Limit**: 100 requests per 15 minutes per IP
- **Purpose**: Allow flexible access to read operations
- **Store**: Redis-based

#### 3. Data Modification Endpoints (POST/PUT/DELETE Requests)
- **Endpoints**: All POST/PUT/DELETE requests to `/fitness`, `/plan`, `/test`, `/cache`, `/activity`
- **Limit**: 20 requests per 15 minutes per IP
- **Purpose**: Moderate write operations to prevent abuse
- **Store**: Redis-based

#### 4. Heavy API Endpoints
- **Endpoints**: `/ai/*` (AI endpoints that are resource intensive)
- **Limit**: 20 requests per 15 minutes per IP
- **Purpose**: Protect resource-intensive AI operations
- **Store**: Redis-based

#### 5. General API Endpoints
- **Endpoints**: Other API routes not specifically categorized
- **Limit**: 50 requests per 15 minutes per IP
- **Purpose**: General protection for API endpoints
- **Store**: Redis-based

#### 6. Global Rate Limit
- **Endpoints**: All requests
- **Limit**: 1000 requests per 15 minutes per IP
- **Purpose**: Overall protection against excessive requests
- **Store**: Redis-based

## Features

### Response Headers
- **HTTP 429 (Too Many Requests)**: Returned when rate limits are exceeded
- **Retry-After**: Indicates when the user can retry (in seconds)
- **X-RateLimit-Limit**: Maximum requests allowed in the time window
- **X-RateLimit-Remaining**: Remaining requests in the current window
- **X-RateLimit-Reset**: Time when the rate limit resets

### IP Address Handling
- Supports `X-Forwarded-For` header to detect real IP addresses behind proxies/load balancers
- Properly identifies unique clients in distributed environments

### Error Handling
- Clear and consistent error responses when rate limits are exceeded
- Descriptive error messages explaining the rate limit violation
- Structured error responses with success flag, message, and error code

### Redis Integration
- Distributed rate limiting across multiple server instances
- Persistent rate limit counters that survive server restarts
- Proper connection handling with error logging

## Configuration

### Environment Variables
- `REDIS_URL`: Redis connection string (defaults to `redis://localhost:6379`)

### Rate Limit Windows
- All rate limits use a 15-minute window (900,000 milliseconds)
- Consistent time window across all endpoint types for predictability

## Implementation Architecture

### Middleware Structure
1. **Global Rate Limit**: Applied to all requests first
2. **Method-Based Rate Limiting**: Different limits based on HTTP method
3. **Endpoint-Specific Rate Limiting**: Specialized limits for specific routes

### Code Structure
- **Middleware**: `src/middleware/rateLimitMiddleware.ts`
- **Configuration**: Integrated in `src/server.ts`
- **Storage**: Redis-based with fallback handling

## Security Considerations
- Rate limits are applied before authentication for unauthenticated endpoints
- IP-based limiting with support for forwarded headers
- Distributed rate limiting prevents bypass through multiple servers
- Consistent logging of rate limit violations for monitoring

## Testing
The implementation includes comprehensive testing for:
- Different rate limits by endpoint type
- IP-based rate limiting
- Response headers
- Error handling
- Redis integration

## Performance Impact
- Minimal overhead with Redis connection pooling
- Efficient rate limit checking
- Proper cleanup of expired rate limit entries