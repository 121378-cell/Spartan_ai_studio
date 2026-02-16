# Performance Metrics System

The Spartan Hub backend implements a comprehensive performance metrics collection system to monitor and analyze application performance, resource usage, and service health.

## Features

### 1. Metric Types

The system supports three main types of metrics:

#### Counter
- **Purpose**: Track cumulative values that only increase (e.g., total requests, errors)
- **Characteristics**: Monotonically increasing, reset on application restart
- **Examples**: HTTP requests total, database queries total, AI service errors

#### Gauge
- **Purpose**: Track instantaneous values that can go up and down (e.g., memory usage, active connections)
- **Characteristics**: Point-in-time measurements
- **Examples**: CPU usage, memory consumption, concurrent users

#### Histogram
- **Purpose**: Track distributions of values (e.g., request durations, response sizes)
- **Characteristics**: Provides statistical summaries with configurable buckets
- **Examples**: HTTP request duration, database query time, response sizes

### 2. Predefined Metrics

The system automatically collects metrics for key application components:

#### HTTP Metrics
- `http_requests_total`: Total number of HTTP requests by method and path
- `http_request_duration_seconds`: HTTP request duration distribution
- `http_responses_total`: Total number of HTTP responses by status code
- `http_response_size_bytes`: HTTP response size distribution

#### Database Metrics
- `database_queries_total`: Total number of database queries by type
- `database_query_duration_seconds`: Database query duration distribution

#### AI Service Metrics
- `ai_requests_total`: Total number of AI service requests by endpoint
- `ai_request_duration_seconds`: AI service request duration distribution
- `ai_errors_total`: Total number of AI service errors by type

#### System Metrics
- `process_cpu_seconds_total`: Total CPU time consumed by the process
- `process_resident_memory_bytes`: Physical memory usage
- `process_heap_bytes`: Heap memory usage

### 3. Integration Points

#### Middleware Integration
The metrics collection is implemented as Express middleware that automatically tracks:
- Request count and response status codes
- Request duration timing
- Response size measurements

#### Health Service Integration
Performance metrics are exposed through the health service endpoint, allowing monitoring systems to access both health status and performance data.

#### Logging Integration
Performance metrics are automatically logged using the structured logging system, making it easy to analyze performance trends over time.

## Implementation

### Metrics Registry
The system uses a centralized metrics registry that manages all metric definitions and values. This registry provides methods to:
- Create and register new metrics
- Update metric values
- Export metrics in various formats (Prometheus text format, JSON)

### Automatic Collection
Metrics are collected automatically through:
- Middleware that wraps HTTP request processing
- Instrumentation points in key service functions
- Periodic system metric collection (every 30 seconds)

### Label Support
All metrics support labeled dimensions for richer analysis:
```typescript
// Example with labels
metricsRegistry.incrementCounter('http_requests_total', { 
  method: 'GET', 
  path: '/api/users',
  status_code: 200 
});
```

## Usage

### Accessing Metrics

#### HTTP Endpoint
Metrics are exposed via a dedicated HTTP endpoint:
```
GET /metrics
```

This endpoint returns metrics in Prometheus text format, compatible with Prometheus monitoring systems.

#### Programmatic Access
Metrics can be accessed programmatically:
```typescript
import { metricsRegistry } from './utils/metricsCollector';

// Get metrics as JSON
const metricsJson = metricsRegistry.getMetricsAsJSON();

// Get metrics as Prometheus-formatted string
const metricsString = metricsRegistry.getMetricsAsString();
```

### Custom Metrics

#### Creating Custom Counters
```typescript
import { metricsRegistry } from './utils/metricsCollector';

// Create a new counter
metricsRegistry.createCounter('custom_events_total', 'Description of the counter');

// Increment the counter
metricsRegistry.incrementCounter('custom_events_total', { 
  event_type: 'user_login' 
}, 1);
```

#### Creating Custom Gauges
```typescript
// Create a new gauge
metricsRegistry.createGauge('active_users', 'Number of currently active users');

// Set the gauge value
metricsRegistry.setGauge('active_users', 42, { 
  user_type: 'premium' 
});
```

#### Creating Custom Histograms
```typescript
// Create a new histogram with custom buckets
metricsRegistry.createHistogram(
  'processing_duration_seconds', 
  'Time taken to process items',
  [0.1, 0.5, 1, 2, 5, 10] // Custom buckets in seconds
);

// Observe a value
metricsRegistry.observeHistogram('processing_duration_seconds', 1.5, {
  item_type: 'document'
});
```

## Monitoring and Alerting

### Prometheus Integration
The metrics endpoint is compatible with Prometheus scraping:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spartan-hub'
    static_configs:
      - targets: ['localhost:3001']
```

### Grafana Dashboards
Metrics can be visualized in Grafana using queries like:
```
# Request rate by endpoint
rate(http_requests_total[5m])

# 95th percentile request latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_responses_total{status_code=~"5.."}[5m])
```

### Log Analysis
Performance metrics are also logged through the structured logging system, enabling analysis with tools like:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Custom log analysis scripts

Example log entry:
```json
{
  "timestamp": "2023-01-01T12:00:00.000Z",
  "level": "info",
  "message": "Metric: http_get_request",
  "service": "spartan-hub-backend",
  "context": "metric",
  "duration": 0.042,
  "metadata": {
    "path": "/api/users/:id",
    "statusCode": 200,
    "responseSize": 1024
  }
}
```

## Best Practices

### 1. High-Cardinality Labels
Avoid labels with high cardinality (many unique values) as they can cause memory issues:
```typescript
// ❌ Avoid: High cardinality
metricsRegistry.incrementCounter('http_requests_total', { 
  user_id: 'user-12345'  // Thousands of unique users
});

// ✅ Prefer: Low cardinality
metricsRegistry.incrementCounter('http_requests_total', { 
  user_type: 'premium'  // Few distinct values
});
```

### 2. Consistent Naming
Use consistent naming conventions:
- Use base units (seconds, bytes, etc.)
- Follow Prometheus naming conventions
- Use descriptive help texts

### 3. Performance Impact
The metrics collection system is designed to have minimal performance impact:
- Efficient data structures for metric storage
- Asynchronous system metric collection
- Minimal overhead in request processing path

## Troubleshooting

### Common Issues

#### Missing Metrics
If metrics are not appearing:
1. Verify the metrics endpoint is accessible: `curl http://localhost:3001/metrics`
2. Check application logs for metric collection errors
3. Ensure middleware is properly registered in the Express app

#### High Memory Usage
If memory usage increases unexpectedly:
1. Review label usage for high-cardinality values
2. Check for proper cleanup of unused metrics
3. Monitor the metrics registry size over time

### Debugging
Enable debug logging to troubleshoot metrics collection:
```bash
# Set log level to debug
LOG_LEVEL=debug npm start
```

This will provide detailed information about metric collection and export operations.