# AI Message Queue Implementation

## Overview

This document describes the implementation of a message queue system for AI requests in the Spartan Hub application. The message queue provides efficient handling of AI requests, preventing system overload and improving reliability.

## Features

### 1. Request Queuing
- Queues AI requests to prevent overwhelming the AI service
- Configurable queue size limits
- Automatic rejection of requests when queue is full

### 2. Concurrency Control
- Limits concurrent AI requests to prevent resource exhaustion
- Configurable concurrency limits
- Automatic load balancing across requests

### 3. Retry Mechanism
- Automatic retry of failed requests
- Exponential backoff for retries
- Configurable retry limits

### 4. Monitoring & Alerting
- Real-time queue statistics
- Performance degradation alerts
- Service unavailability alerts
- Detailed logging

### 5. Timeout Handling
- Configurable processing timeouts
- Automatic cleanup of stuck requests
- Graceful error handling

## Architecture

### Components

1. **MessageQueue Class** - Core queue implementation
2. **Queue Configuration** - Environment-based configuration
3. **Queue Items** - Request wrappers with metadata
4. **Processing Engine** - Concurrent request processor

### Data Flow

```
Client Request → AI Controller → Message Queue → AI Service → Response
                    ↑                ↓              ↑
              Queue Stats      Processing     Retry Logic
```

## Implementation Details

### Queue Item Structure

```typescript
interface QueueItem {
  id: string;                    // Unique identifier
  type: 'alert_prediction' | 'decision_generation';  // Request type
  payload: any;                  // Request data
  resolve: Function;             // Promise resolver
  reject: Function;              // Promise rejector
  timestamp: number;             // Enqueue time
  retries: number;               // Retry count
}
```

### Configuration Options

| Option | Description | Default | Environment Variable |
|--------|-------------|---------|---------------------|
| maxSize | Maximum queue size | 100 | AI_QUEUE_MAX_SIZE |
| maxRetries | Maximum retry attempts | 3 | AI_QUEUE_MAX_RETRIES |
| retryDelay | Base retry delay (ms) | 1000 | AI_QUEUE_RETRY_DELAY |
| processingTimeout | Request timeout (ms) | 30000 | AI_QUEUE_PROCESSING_TIMEOUT |
| concurrencyLimit | Max concurrent requests | 3 | AI_QUEUE_CONCURRENCY_LIMIT |
| alertThreshold | Queue usage alert (%) | 80 | AI_QUEUE_ALERT_THRESHOLD |

### Queue Statistics

The queue provides detailed statistics:
- Current queue length
- Number of processing requests
- Concurrency count
- Usage percentage

## Integration Points

### Controllers
AI controllers now use the message queue instead of direct AI service calls:

```typescript
// Before
const aiResponse = await CheckInferenciaIA(user);

// After
const aiResponse = await aiMessageQueue.enqueue('alert_prediction', user);
```

### Routes
New endpoint for queue monitoring:
```
GET /ai/queue/stats
```

## Benefits

### 1. Improved Reliability
- Prevents system overload during high demand
- Graceful degradation when AI service is slow
- Automatic retry of transient failures

### 2. Better Resource Management
- Controlled concurrency prevents resource exhaustion
- Efficient request processing
- Memory leak prevention

### 3. Enhanced Monitoring
- Real-time queue visibility
- Performance alerts
- Detailed logging for debugging

### 4. Scalability
- Configurable limits for different environments
- Horizontal scaling support
- Load distribution

## Usage Examples

### Basic Usage
```typescript
import { aiMessageQueue } from '../utils/messageQueue';

// Enqueue an AI request
const result = await aiMessageQueue.enqueue('alert_prediction', userData);
```

### Queue Monitoring
```typescript
// Get queue statistics
const stats = aiMessageQueue.getStats();
console.log(`Queue length: ${stats.queueLength}`);
```

## Error Handling

### Queue Full
When the queue reaches maximum capacity:
- Returns HTTP 503 with code `AI_QUEUE_FULL`
- Creates alert for system administrators
- Logs warning with queue statistics

### Processing Failures
When requests fail after maximum retries:
- Returns fallback response
- Creates high-severity alert
- Logs detailed error information

### Timeouts
When requests exceed processing timeout:
- Automatically rejects request
- Retries according to retry policy
- Logs timeout event

## Configuration

### Environment Variables
```bash
# Queue configuration
AI_QUEUE_MAX_SIZE=100
AI_QUEUE_MAX_RETRIES=3
AI_QUEUE_RETRY_DELAY=1000
AI_QUEUE_PROCESSING_TIMEOUT=30000
AI_QUEUE_CONCURRENCY_LIMIT=3
AI_QUEUE_ALERT_THRESHOLD=80
AI_QUEUE_LOGGING_ENABLED=true
```

## Monitoring Endpoints

### Queue Statistics
```
GET /ai/queue/stats

Response:
{
  "success": true,
  "message": "AI queue statistics retrieved successfully.",
  "data": {
    "queueLength": 0,
    "processingCount": 0,
    "concurrencyCount": 0,
    "maxSize": 100,
    "usagePercentage": 0
  }
}
```

## Future Enhancements

1. **Persistent Queue** - Store requests in database for crash recovery
2. **Priority Queuing** - Different priority levels for requests
3. **Dynamic Scaling** - Adjust concurrency based on system load
4. **Advanced Metrics** - Detailed performance analytics
5. **Distributed Queue** - Support for multi-instance deployments

## Testing

The implementation includes:
- Unit tests for queue operations
- Integration tests with AI service
- Load testing scenarios
- Failure simulation tests