# Structured Logging System

The Spartan Hub backend implements a comprehensive structured logging system to provide consistent, machine-readable logs for monitoring, debugging, and auditing purposes.

## Features

### 1. Multi-Level Logging
The logger supports five log levels:
- **ERROR**: Critical errors that require immediate attention
- **WARN**: Potential issues that should be investigated
- **INFO**: General information about application operation
- **DEBUG**: Detailed information for debugging purposes
- **TRACE**: Very detailed diagnostic information

### 2. Dual Output
Logs can be written to both console and file outputs simultaneously:
- Console output for development and real-time monitoring
- File output for persistent storage and analysis

### 3. Structured JSON Format
All logs are formatted as JSON objects with consistent fields:
```json
{
  "timestamp": "2023-01-01T12:00:00.000Z",
  "level": "info",
  "message": "User logged in",
  "service": "spartan-hub-backend",
  "context": "auth",
  "userId": "user123",
  "requestId": "req456",
  "metadata": {
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 4. Log Rotation
Automatic log rotation prevents disk space issues:
- Size-based rotation (default: 10MB per file)
- Configurable maximum number of files to retain
- Automatic cleanup of old log files

### 5. Specialized Logging Methods
Additional methods for common logging scenarios:
- `errorWithStack()`: Logs errors with full stack traces
- `metric()`: Logs performance metrics with timing information
- `startup()` and `shutdown()`: Logs application lifecycle events

## Configuration

The logger can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level to output | `info` |
| `LOG_FILE_PATH` | Path to log file | `./logs/application.log` |
| `LOG_ENABLE_CONSOLE` | Enable console output | `true` |
| `LOG_ENABLE_FILE` | Enable file output | `true` |
| `LOG_MAX_FILE_SIZE` | Maximum file size in MB | `10` |
| `LOG_MAX_FILES` | Maximum number of log files | `5` |

## Usage

### Basic Logging
```typescript
import { logger } from './utils/logger';

// Simple log messages
logger.info('User logged in successfully');
logger.warn('Invalid input detected');
logger.error('Database connection failed');
```

### Contextual Logging
```typescript
// Add contextual information
logger.info('Processing workout data', {
  context: 'workout-processing',
  userId: 'user123',
  metadata: {
    workoutId: 'workout456',
    exerciseCount: 5
  }
});
```

### Error Logging with Stack Trace
```typescript
try {
  // Some operation
} catch (error) {
  logger.errorWithStack('Failed to process workout data', error, {
    context: 'workout-processing',
    userId: 'user123'
  });
}
```

### Performance Metrics
```typescript
const startTime = Date.now();
// Perform some operation
const duration = Date.now() - startTime;

logger.metric('workout-processing', duration, {
  context: 'performance',
  userId: 'user123'
});
```

## HTTP Request/Response Logging

The system includes middleware for automatic HTTP request/response logging with timing information:

```typescript
// In server.ts
import { requestLogger } from './middleware/loggingMiddleware';

app.use(requestLogger);
```

This middleware automatically logs:
- Incoming requests with method, URL, and client IP
- Outgoing responses with status code and timing information
- Errors that occur during request processing

## Best Practices

1. **Use appropriate log levels**: Choose the right level for each message
2. **Include contextual information**: Add relevant context to make logs useful
3. **Avoid sensitive data**: Never log passwords, tokens, or personal information
4. **Be consistent**: Use consistent field names and formats
5. **Log early and often**: Capture important events throughout the application lifecycle

## Log Analysis

Structured logs can be easily parsed and analyzed using:
- Log aggregation tools (ELK Stack, Splunk, etc.)
- Monitoring systems (Prometheus, Grafana, etc.)
- Custom scripts for specific analysis needs

Example log analysis query:
```bash
# Count error occurrences by type
jq 'select(.level=="error") | .code' logs/application.log | sort | uniq -c
```