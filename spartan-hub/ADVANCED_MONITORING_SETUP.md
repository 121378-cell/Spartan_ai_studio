# 🔧 ADVANCED MONITORING SETUP GUIDE

**Version:** 2.0  
**Date:** March 1, 2026  
**Level:** DevOps / System Administrator

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [OpenTelemetry Setup](#opentelemetry-setup)
4. [Prometheus Configuration](#prometheus-configuration)
5. [Grafana Dashboards](#grafana-dashboards)
6. [Alerting Rules](#alerting-rules)
7. [SLA Monitoring](#sla-monitoring)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 OVERVIEW

### What is Advanced Monitoring?

Advanced Monitoring provides **real-time visibility** into your Spartan Hub 2.0 application performance, health, and business metrics.

**Components:**

- 📊 **OpenTelemetry** - Unified telemetry data collection
- 📈 **Prometheus** - Metrics storage and alerting
- 📉 **Grafana** - Visualization and dashboards
- 🔔 **AlertManager** - Notification routing
- 🕵️ **Jaeger** - Distributed tracing (optional)

---

## 🏗️ ARCHITECTURE

### Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)        Backend (Express)    AI Service    │
│  ┌─────────────┐        ┌─────────────┐     ┌───────────┐  │
│  │ OTel Web    │        │ OTel Node   │     │ OTel Py   │  │
│  │ SDK        │        │ SDK        │     │ SDK       │  │
│  └──────┬──────┘        └──────┬──────┘     └─────┬─────┘  │
│         │                      │                   │        │
│         └──────────────────────┼───────────────────┘        │
│                                │                            │
└────────────────────────────────┼────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   OpenTelemetry        │
                    │   Collector            │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼────────┐ ┌──────▼───────┐ ┌───────▼───────┐
    │   Prometheus     │ │   Jaeger     │ │  AlertManager │
    │   (Metrics)      │ │   (Tracing)  │ │  (Alerts)     │
    └─────────┬────────┘ └──────────────┘ └───────┬───────┘
              │                                   │
    ┌─────────▼────────┐                         │
    │    Grafana       │◄────────────────────────┘
    │   (Dashboards)   │
    └──────────────────┘
```

---

## 📡 OPENTELEMETRY SETUP

### Backend (Node.js) Configuration

#### 1. Install Dependencies

```bash
cd spartan-hub/backend

npm install @opentelemetry/api
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/exporter-metrics-otlp-http
```

#### 2. Create OpenTelemetry Configuration

**File:** `backend/src/utils/openTelemetry.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'spartan-hub-backend',
    [SEMRESATTRS_SERVICE_VERSION]: '2.0.0',
  }),
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000, // Export every 10 seconds
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (request) => {
          // Ignore health check endpoints
          return request.url?.includes('/health') || false;
        },
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
        ignoreLayersType: ['router'],
      },
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
```

#### 3. Initialize in Server

**File:** `backend/src/server.ts`

```typescript
// Import at the very top (before any other imports)
import './utils/openTelemetry';

import express from 'express';
// ... rest of imports
```

#### 4. Add Custom Metrics

**File:** `backend/src/utils/metrics.ts`

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('spartan-hub-backend');

// Counter for API requests
const requestCounter = meter.createCounter('api_requests_total', {
  description: 'Total number of API requests',
});

// Histogram for response time
const responseTimeHistogram = meter.createHistogram('api_response_time', {
  description: 'API response time in milliseconds',
});

// Gauge for active users
const activeUsersGauge = meter.createGauge('active_users', {
  description: 'Number of active users',
});

// Usage examples
export function recordRequest(method: string, route: string, statusCode: number) {
  requestCounter.add(1, { method, route, status_code: statusCode });
}

export function recordResponseTime(route: string, durationMs: number) {
  responseTimeHistogram.record(durationMs, { route });
}

export function updateActiveUsers(count: number) {
  activeUsersGauge.set(count);
}
```

---

### Frontend (React) Configuration

#### 1. Install Dependencies

```bash
cd spartan-hub

npm install @opentelemetry/api
npm install @opentelemetry/sdk-web
npm install @opentelemetry/auto-instrumentations-web
npm install @opentelemetry/exporter-trace-otlp-http
```

#### 2. Create OpenTelemetry Configuration

**File:** `src/utils/openTelemetry.ts`

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const provider = new WebTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'spartan-hub-frontend',
  }),
});

const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces',
});

provider.addSpanProcessor(
  new BatchSpanProcessor(traceExporter, {
    scheduledDelayMillis: 5000, // Export every 5 seconds
  })
);

provider.register();

registerInstrumentations({
  instrumentations: [
    getWebAutoInstrumentations({
      '@opentelemetry/instrumentation-fetch': {
        enabled: true,
        propagateTraceHeaderCorsUrls: /.*/,
      },
      '@opentelemetry/instrumentation-xml-http-request': {
        enabled: true,
      },
    }),
  ],
});

export const tracer = provider.getTracer('spartan-hub-frontend');
```

#### 3. Initialize in App

**File:** `src/App.tsx`

```typescript
// Import at the very top
import './utils/openTelemetry';

import React from 'react';
// ... rest of imports
```

---

## 📈 PROMETHEUS CONFIGURATION

### Docker Compose Setup

**File:** `docker-compose.monitoring.yml`

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.45.0
    container_name: spartan_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
    networks:
      - spartan-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.0.0
    container_name: spartan_grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=https://grafana.spartan-hub.com
    networks:
      - spartan-network
    restart: unless-stopped

  otel-collector:
    image: otel/opentelemetry-collector:0.80.0
    container_name: spartan_otel_collector
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    volumes:
      - ./otel-collector-config.yml:/etc/otelcol/config.yml
    networks:
      - spartan-network
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:

networks:
  spartan-network:
    external: true
```

### Prometheus Configuration

**File:** `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'spartan-hub-monitor'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "alert_rules.yml"

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Backend metrics
  - job_name: 'spartan-hub-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # Frontend metrics (via Node.js server)
  - job_name: 'spartan-hub-frontend'
    static_configs:
      - targets: ['frontend:80']

  # OpenTelemetry Collector metrics
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8888']

  # Node Exporter (host metrics)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  # PostgreSQL metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

### Alert Rules

**File:** `alert_rules.yml`

```yaml
groups:
  - name: spartan-hub-alerts
    interval: 30s
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} over the last 5 minutes"

      # High Response Time (p95)
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value | humanizeDuration }}"

      # Service Down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute"

      # High CPU Usage
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% on {{ $labels.instance }}"

      # Low Disk Space
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 20
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low disk space detected"
          description: "Disk space is below 20% on {{ $labels.instance }}"

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 85% on {{ $labels.instance }}"

      # Database Connection Pool Exhausted
      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_available_connections / db_pool_max_connections < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "Less than 10% of database connections available"

      # Active Users Drop
      - alert: ActiveUsersDrop
        expr: active_users < active_users * 0.5 offset 1w
        for: 30m
        labels:
          severity: info
        annotations:
          summary: "Significant drop in active users"
          description: "Active users dropped by more than 50% compared to last week"
```

---

## 📊 GRAFANA DASHBOARDS

### Dashboard 1: System Overview

**Dashboard JSON:** `grafana/dashboards/system-overview.json`

```json
{
  "dashboard": {
    "title": "Spartan Hub - System Overview",
    "tags": ["spartan-hub", "overview"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "active_users",
            "legendFormat": "Active Users"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "red", "value": 0 },
                { "color": "yellow", "value": 50 },
                { "color": "green", "value": 100 }
              ]
            }
          }
        },
        "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 }
      },
      {
        "id": 2,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(api_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 6, "y": 0 }
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(api_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(api_requests_total[5m])) * 100",
            "legendFormat": "Error Rate %"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 }
      },
      {
        "id": 4,
        "title": "Response Time (p50, p95, p99)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, sum(rate(api_response_time_bucket[5m])) by (le))",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, sum(rate(api_response_time_bucket[5m])) by (le))",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, sum(rate(api_response_time_bucket[5m])) by (le))",
            "legendFormat": "p99"
          }
        ],
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
      }
    ],
    "refresh": "10s",
    "time": {
      "from": "now-1h",
      "to": "now"
    }
  }
}
```

### Dashboard 2: Business Metrics

**File:** `grafana/dashboards/business-metrics.json`

Key panels:

- **Form Analysis Sessions** (daily/weekly/monthly)
- **Wearable Sync Success Rate**
- **User Engagement Score**
- **Subscription Conversion Rate**
- **Feature Adoption Rate**

### Dashboard 3: Application Performance

**File:** `grafana/dashboards/app-performance.json`

Key panels:

- **API Endpoint Performance** (by route)
- **Database Query Performance**
- **Cache Hit/Miss Ratio**
- **Memory Usage by Service**
- **CPU Usage by Service**

---

## 🔔 ALERTING

### AlertManager Configuration

**File:** `alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@spartan-hub.com'
  smtp_auth_username: 'alerts@spartan-hub.com'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
      receiver: 'critical-receiver'
      repeat_interval: 1h
    - match:
        severity: warning
      receiver: 'warning-receiver'
      repeat_interval: 4h
    - match:
        severity: info
      receiver: 'info-receiver'
      repeat_interval: 12h

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'devops@spartan-hub.com'
        send_resolved: true

  - name: 'critical-receiver'
    email_configs:
      - to: 'devops@spartan-hub.com'
        send_resolved: true
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-critical'
        send_resolved: true

  - name: 'warning-receiver'
    email_configs:
      - to: 'devops@spartan-hub.com'
        send_resolved: true

  - name: 'info-receiver'
    email_configs:
      - to: 'team@spartan-hub.com'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

---

## 📏 SLA MONITORING

### SLA Definitions

**Service Level Objectives (SLOs):**

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **Availability** | 99.9% | 30 days |
| **Latency (p95)** | <500ms | 1 day |
| **Error Rate** | <0.1% | 1 day |
| **Throughput** | >100 req/s | 1 hour |

### SLA Dashboard

**File:** `grafana/dashboards/sla-monitoring.json`

```json
{
  "dashboard": {
    "title": "SLA Monitoring",
    "panels": [
      {
        "id": 1,
        "title": "Availability (30-day rolling)",
        "type": "stat",
        "targets": [
          {
            "expr": "avg_over_time(up[30d]) * 100",
            "legendFormat": "Availability %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                { "color": "red", "value": 0 },
                { "color": "yellow", "value": 99 },
                { "color": "green", "value": 99.9 }
              ]
            },
            "unit": "percent"
          }
        }
      },
      {
        "id": 2,
        "title": "Error Budget Remaining",
        "type": "gauge",
        "targets": [
          {
            "expr": "(0.999 - avg_over_time(up[30d])) / 0.001 * 100",
            "legendFormat": "Error Budget %"
          }
        ]
      }
    ]
  }
}
```

---

## 🆘 TROUBLESHOOTING

### Common Issues

#### No Metrics Showing

**Check:**

1. Is the application exporting metrics?
   ```bash
   curl http://localhost:3001/metrics
   ```

2. Is Prometheus scraping the target?
   ```
   Go to: http://localhost:9090/targets
   Check if status is "UP"
   ```

3. Are there network issues?
   ```bash
   docker network ls
   docker network inspect spartan-network
   ```

---

#### High Cardinality Metrics

**Problem:** Too many unique label combinations

**Solution:**

```typescript
// ❌ Bad - High cardinality (user_id can be millions)
counter.add(1, { user_id: userId });

// ✅ Good - Low cardinality
counter.add(1, { route: '/api/users' });
```

---

#### Memory Issues in Collector

**Symptoms:** OTEL collector using too much memory

**Solution:**

```yaml
# otel-collector-config.yml
processors:
  batch:
    timeout: 1s
    send_batch_size: 1024
    send_batch_max_size: 2048
  memory_limiter:
    check_interval: 1s
    limit_mib: 1000
    spike_limit_mib: 200
```

---

## 📊 QUICK START

### Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps

# View logs
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Prometheus** | http://localhost:9090 | N/A |
| **Grafana** | http://localhost:3000 | admin / admin123 |
| **Jaeger** | http://localhost:16686 | N/A |

---

**Last Updated:** March 1, 2026  
**Version:** 2.0  
**Maintainer:** DevOps Team
