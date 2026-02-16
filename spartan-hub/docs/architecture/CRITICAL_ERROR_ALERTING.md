# Critical Error Condition Alerting System

## Overview

The Critical Error Condition Alerting System is designed to monitor, detect, and notify administrators of critical issues within the Spartan Hub application. This system provides real-time alerts for various types of critical conditions including system errors, performance degradation, security incidents, service unavailability, and AI service failures.

## Features

### 1. Comprehensive Alert Types
- **System Errors**: Unexpected application errors that could impact functionality
- **Performance Degradation**: Slow response times or resource exhaustion
- **Security Incidents**: Unauthorized access attempts or suspicious activities
- **Service Unavailability**: Critical services like databases or external APIs becoming unreachable
- **Rate Limit Exceeded**: Clients exceeding request quotas
- **AI Service Failures**: Issues with the AI inference engine
- **Database Connection Errors**: Problems connecting to the database

### 2. Configurable Severity Levels
- **Low**: Informational alerts that require monitoring
- **Medium**: Issues that should be investigated within 24 hours
- **High**: Serious problems requiring immediate attention
- **Critical**: Emergency situations requiring immediate intervention

### 3. Intelligent Alert Management
- **Throttling**: Prevents alert spam by limiting the frequency of similar alerts
- **Filtering**: Only alerts meeting minimum severity thresholds are processed
- **Retention**: Automatically cleans up old resolved alerts to prevent memory bloat
- **Deduplication**: Prevents duplicate alerts for the same issue

### 4. Multiple Notification Channels
- **Console Output**: Immediate visibility in application logs
- **File Logging**: Persistent storage of alerts for audit trails
- **Integration Ready**: Extensible for email, SMS, or webhook notifications

## Architecture

### Alert Service
The core of the alerting system is the `AlertService` class, which manages:
- Alert creation and storage
- Severity filtering and throttling
- Notification dispatch
- Alert lifecycle management (resolution, cleanup)

### Alert Configuration
Alert behavior is controlled through the `AlertConfig` interface:
- Enable/disable alerting system
- Set minimum severity threshold
- Configure throttling parameters
- Define notification channels
- Control alert retention policies

### Integration Points
1. **Error Handler Middleware**: Automatically creates alerts for critical application errors
2. **Rate Limiting Middleware**: Generates alerts when clients exceed request quotas
3. **AI Service**: Triggers alerts when AI inference fails
4. **Custom Integration**: Services can programmatically create alerts using the API

## Implementation Details

### Creating Alerts Programmatically
Services can create alerts directly using the alert service:

```typescript
import { alertService, AlertType, AlertSeverity } from '../services/alertService';

// Create a critical alert for a database connection failure
alertService.createAlert(
  AlertType.DATABASE_CONNECTION_ERROR,
  AlertSeverity.CRITICAL,
  'Failed to connect to PostgreSQL database',
  'databaseService',
  {
    host: 'db.example.com',
    port: 5432,
    error: 'Connection timeout'
  }
);
```

### Alert Configuration
The alert system can be configured through environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `ALERTING_ENABLED` | Enable/disable alerting system | `true` |
| `ALERT_MIN_SEVERITY` | Minimum severity level for alerts | `medium` |
| `ALERT_THROTTLE_WINDOW_MS` | Time window for throttling (ms) | `60000` (1 minute) |
| `ALERT_MAX_PER_WINDOW` | Maximum alerts per throttle window | `10` |
| `ALERT_CONSOLE_NOTIFICATIONS` | Enable console notifications | `true` |
| `ALERT_FILE_NOTIFICATIONS` | Enable file notifications | `true` |
| `ALERT_NOTIFICATION_FILE_PATH` | Path to alert log file | `./logs/alerts.log` |
| `ALERT_MAX_STORED` | Maximum stored alerts | `100` |
| `ALERT_RETENTION_HOURS` | Hours to retain resolved alerts | `24` |

### Alert Data Structure
Each alert contains the following information:

```typescript
interface Alert {
  id: string;                    // Unique identifier
  timestamp: string;             // ISO timestamp of creation
  type: AlertType;               // Type of alert
  severity: AlertSeverity;       // Severity level
  message: string;               // Human-readable message
  context?: string;              // Context where alert originated
  metadata?: Record<string, any>; // Additional data
  resolved: boolean;             // Whether alert is resolved
  resolvedAt?: string;           // ISO timestamp of resolution
  notified: boolean;             // Whether notification was sent
}
```

## Best Practices

### 1. Appropriate Alert Types
Choose the most specific alert type for your situation:
- Use `AI_SERVICE_FAILURE` for Ollama issues
- Use `SERVICE_UNAVAILABLE` for external API problems
- Use `SYSTEM_ERROR` for unexpected application errors
- Use `SECURITY_INCIDENT` for authentication/authorization issues

### 2. Meaningful Messages
Provide clear, actionable messages that help with troubleshooting:
```typescript
// Good
"Database connection failed: Connection timeout after 30 seconds"

// Bad
"DB error"
```

### 3. Rich Metadata
Include contextual information that aids investigation:
```typescript
{
  userId: "user123",
  endpoint: "/api/users/profile",
  requestBodySize: 1024,
  responseTimeMs: 5240
}
```

### 4. Alert Resolution
Mark alerts as resolved when issues are fixed:
```typescript
alertService.resolveAlert(alertId);
```

## Testing

The alert system includes comprehensive tests covering:
- Alert creation and filtering
- Severity threshold enforcement
- Rate limiting and throttling
- Alert resolution and cleanup
- Middleware integration

Run tests with:
```bash
npm test alertService
```

## Monitoring and Maintenance

### Health Checks
Monitor the alert service itself through the `/health` endpoint which includes alert statistics.

### Regular Cleanup
The system automatically cleans up resolved alerts based on the retention policy, but you can manually trigger cleanup:
```typescript
alertService.cleanupOldAlerts();
```

### Performance Metrics
The alert service exposes metrics through the main metrics endpoint at `/metrics`.

## Future Enhancements

1. **Advanced Notification Channels**: Email, SMS, Slack, and webhook integrations
2. **Alert Correlation**: Group related alerts to reduce noise
3. **Escalation Policies**: Automatically escalate unresolved alerts
4. **Dashboard UI**: Visual alert management interface
5. **Historical Analytics**: Trend analysis and reporting