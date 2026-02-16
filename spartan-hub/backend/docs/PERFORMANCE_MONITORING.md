# Performance and Monitoring Configuration

This document outlines the performance and monitoring solution implemented in the Spartan Hub application.

## Table of Contents
1. [Caching Layer](#caching-layer)
2. [Health Check Endpoint](#health-check-endpoint)
3. [Structured Logging](#structured-logging)
4. [Environment Configuration](#environment-configuration)
5. [Performance Metrics](#performance-metrics)

## Caching Layer

### Overview
The application implements a configurable caching layer using Redis with in-memory fallback for external API results.

### Cache Strategies
- **Redis (Primary)**: Distributed caching for production environments
- **In-Memory (Fallback)**: Local caching when Redis is unavailable
- **Hybrid**: Can be configured based on environment

### TTL Configuration
TTL (Time-To-Live) settings are configurable per content type:

| Content Type | TTL | Description |
|--------------|-----|-------------|
| `user/profile` | 2 minutes | User-specific data that changes frequently |
| `user/preferences` | 5 minutes | User preference settings |
| `user/progress` | 3 minutes | User progress tracking |
| `exercise/list` | 1 hour | Exercise data (rarely changes) |
| `exercise/detail` | 30 minutes | Detailed exercise information |
| `exercise/search` | 10 minutes | Exercise search results |
| `nutrition/info` | 30 minutes | Nutrition information |
| `nutrition/search` | 15 minutes | Nutrition search results |
| `workout/plan` | 1 hour | Workout plans |
| `workout/template` | 2 hours | Workout templates |
| `ai/alert` | 5 minutes | AI-generated alerts |
| `ai/decision` | 10 minutes | AI-generated decisions |
| `ai/recommendation` | 15 minutes | AI-generated recommendations |

### Cache Invalidation
- **Tag-based invalidation**: Invalidate entries by tags
- **Key-based invalidation**: Remove specific cache entries
- **Clear all**: Clear entire cache

### Usage Examples
```typescript
// Basic caching with TTL
await setCachedData('user:123', userData, 5 * 60 * 1000); // 5 minutes

// Caching with content type (uses policy-based TTL)
await setCachedData('exercise:456', exerciseData, undefined, 'exercise/detail', ['exercises', 'fitness']);

// Cache with wrapper function
const result = await withCache(
  'api:users:search',
  async () => {
    // Expensive operation
    return await apiCall();
  },
  'user/search',
  ['users', 'search']
);

// Invalidate by tag
await invalidateCacheByTag('users');
```

## Health Check Endpoint

### Overview
The `/health` endpoint performs comprehensive system checks and returns detailed health status information.

### Available Checks
- **Application Server**: Basic server health
- **Database**: PostgreSQL connectivity with response time measurements
- **AI Service**: Ollama service availability and responsiveness
- **Redis Cache**: Cache connection and responsiveness
- **Fitness API**: Placeholder for external fitness APIs

### Response Format
```json
{
  "status": "healthy",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "services": [
    {
      "name": "Database",
      "status": "healthy",
      "responseTime": 15,
      "lastChecked": "2023-01-01T00:00:00.000Z"
    }
  ],
  "uptime": "1d 2h 3m 4s",
  "metrics": {
    // Performance metrics
  }
}
```

### HTTP Status Codes
- `200`: System is healthy
- `503`: System is unhealthy

## Structured Logging

### Overview
The application uses structured JSON logging with essential fields for all application logs.

### Log Entry Structure
```json
{
  "timestamp": "2023-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Log message",
  "service": "spartan-hub-backend",
  "context": "api-performance",
  "userId": "user-123",
  "requestId": "req-456",
  "correlationId": "corr-789",
  "metadata": {
    "endpoint": "/api/users",
    "method": "GET",
    "duration": 150
  }
}
```

### Log Levels
- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug-level messages
- `trace`: Trace-level messages

### Correlation IDs
- Correlation IDs are automatically generated for request tracing
- Can be set manually using `logger.setCorrelationId()`
- Child loggers inherit correlation IDs from parent

### Sensitive Data Sanitization
Sensitive fields are automatically sanitized:
- `password`
- `token`
- `secret`
- `key`
- `authorization`
- `auth`
- `api_key`
- `apiKey`
- `pwd`
- `pass`
- `credential`
- `credentials`

### Performance Metrics Logging
- API performance metrics
- Error rate metrics
- Cache performance metrics
- General application metrics

## Environment Configuration

### Redis Configuration
```bash
REDIS_URL=redis://localhost:6379
```

### Logging Configuration
```bash
LOG_LEVEL=info
LOG_FILE_PATH=./logs/application.log
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true
LOG_MAX_FILE_SIZE=10
LOG_MAX_FILES=5
```

### Database Configuration
```bash
DATABASE_TYPE=postgres
POSTGRES_URL=postgresql://user:pass@localhost:5432/db
```

### Health Check Configuration
```bash
HEALTH_CHECK_TIMEOUT=5000  # 5 seconds timeout
```

## Performance Metrics

### Cache Metrics
- Cache hits
- Cache misses
- Cache hit rate
- Content type distribution
- Tag distribution

### API Performance Metrics
- Response times
- Status codes
- Endpoint performance
- Error rates

### Available Metrics Functions
```typescript
// Log API performance
logger.logApiPerformance('/api/users', 'GET', 150, 200);

// Log error rates
logger.logErrorRate(5, 100); // 5% error rate

// Log cache metrics
logger.logCacheMetrics(85, 15, 0.85); // 85% hit rate
```

### Monitoring Integration
The application includes integration with metrics collectors for external monitoring systems.