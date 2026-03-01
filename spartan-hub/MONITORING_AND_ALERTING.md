# Monitoring and Alerting Guide - Spartan Hub 2.0

**Version:** 2.0  
**Last Updated:** March 1, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Architecture](#monitoring-architecture)
3. [Prometheus Configuration](#prometheus-configuration)
4. [Grafana Dashboards](#grafana-dashboards)
5. [Alert Rules](#alert-rules)
6. [Alertmanager Configuration](#alertmanager-configuration)
7. [Application Performance Monitoring](#application-performance-monitoring)
8. [Logging Infrastructure](#logging-infrastructure)
9. [Distributed Tracing](#distributed-tracing)
10. [On-Call Procedures](#on-call-procedures)

---

## Overview

Spartan Hub 2.0 uses a comprehensive monitoring stack based on the Prometheus-Grafana ecosystem, supplemented by Loki for logging and OpenTelemetry for distributed tracing.

### Monitoring Stack Components

| Component | Purpose | Port |
|-----------|---------|------|
| Prometheus | Metrics collection | 9090 |
| Grafana | Visualization & dashboards | 3000 |
| Alertmanager | Alert routing & notification | 9093 |
| Loki | Log aggregation | 3100 |
| Promtail | Log shipping | - |
| Node Exporter | System metrics | 9100 |
| Redis Exporter | Redis metrics | 9121 |
| Postgres Exporter | Database metrics | 9187 |

### Monitoring Goals

- **Availability:** 99.9% uptime target
- **Performance:** P95 latency < 500ms
- **Error Rate:** < 1% of requests
- **Recovery:** MTTR < 30 minutes

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Monitoring Stack Architecture                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Application   │    │   Application   │
│   Backend :3001 │    │   Frontend :80  │    │   AI Service    │
│                 │    │                 │    │   :8000         │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │  /metrics            │  /metrics            │  /metrics
         │  /health             │  /health             │  /health
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Prometheus                                       │
│                         (Scrape Interval: 15s)                               │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Scrape Targets                                │   │
│  │  - spartan-hub-backend:8000/metrics                                   │   │
│  │  - spartan-hub-frontend:80/metrics                                    │   │
│  │  - ai-microservice:8000/metrics                                       │   │
│  │  - node-exporter:9100/metrics                                         │   │
│  │  - redis-exporter:9121/metrics                                        │   │
│  │  - postgres-exporter:9187/metrics                                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │  Query (PromQL)
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Grafana                                        │
│                         (Dashboards & Alerts)                               │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Performance │  │     SLA      │  │   Business   │  │  System      │    │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │  Alert Rules
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Alertmanager                                      │
│                         (Alert Routing)                                     │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Slack     │  │    Email     │  │  PagerDuty   │  │   Webhook    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Application    │    │   System        │    │   Kubernetes    │
│  Logs           │    │   Logs          │    │   Logs          │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Promtail                                         │
│                         (Log Collection)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Loki                                            │
│                         (Log Aggregation)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Prometheus Configuration

### Configuration File

**Location:** `spartan-hub/monitoring/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'spartan-hub-production'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "alert.rules"

scrape_configs:
  # Backend Application
  - job_name: "spartan-hub-backend"
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - spartan-hub
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: backend
      - source_labels: [__meta_kubernetes_pod_container_port_number]
        action: keep
        regex: 3001
    metrics_path: "/metrics"
    scrape_interval: 10s

  # Frontend Application
  - job_name: "spartan-hub-frontend"
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - spartan-hub
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: frontend
    metrics_path: "/metrics"
    scrape_interval: 30s

  # AI Microservice
  - job_name: "ai-microservice"
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
            - spartan-hub
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: ai-microservice
    metrics_path: "/metrics"
    scrape_interval: 15s

  # Node Exporter (System Metrics)
  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]
    scrape_interval: 15s

  # Redis Exporter
  - job_name: "redis-exporter"
    static_configs:
      - targets: ["redis-exporter:9121"]
    scrape_interval: 15s

  # PostgreSQL Exporter
  - job_name: "postgres-exporter"
    static_configs:
      - targets: ["postgres-exporter:9187"]
    scrape_interval: 15s

  # Kubernetes API Server
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https

  # Kubernetes Nodes
  - job_name: 'kubernetes-nodes'
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
```

### Retention Configuration

```yaml
# Prometheus storage configuration
command:
  - '--storage.tsdb.path=/prometheus'
  - '--storage.tsdb.retention.time=15d'
  - '--storage.tsdb.retention.size=10GB'
```

---

## Grafana Dashboards

### Dashboard List

| Dashboard | UID | Purpose |
|-----------|-----|---------|
| Spartan Hub Performance | spartan-hub-perf | Application metrics |
| SLA Monitoring | sla-monitoring | SLA compliance |
| Business Metrics | business-metrics | Business KPIs |
| System Resources | system-resources | Infrastructure |

### Accessing Dashboards

```bash
# Port-forward Grafana
kubectl port-forward service/grafana 3000:80 -n monitoring

# Access in browser
# URL: http://localhost:3000
# Username: admin
# Password: (from secret)
```

### Dashboard Panels

#### Spartan Hub Performance Dashboard

```json
{
  "panels": [
    {
      "title": "HTTP Request Duration",
      "type": "graph",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
      }]
    },
    {
      "title": "HTTP Requests Rate",
      "type": "graph",
      "targets": [{
        "expr": "rate(http_requests_total[5m])"
      }]
    },
    {
      "title": "Error Rate",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
      }]
    },
    {
      "title": "Active Connections",
      "type": "stat",
      "targets": [{
        "expr": "nodejs_active_handles_total"
      }]
    }
  ]
}
```

#### SLA Monitoring Dashboard

Key metrics:
- Uptime percentage (target: 99.9%)
- P95 response time (target: < 500ms)
- Error rate (target: < 1%)
- API availability

#### Business Metrics Dashboard

Key metrics:
- Daily active users
- User retention rate
- Challenge completion rate
- Achievement unlock rate
- Community engagement

---

## Alert Rules

### Alert Configuration

**Location:** `spartan-hub/monitoring/alert.rules`

### Critical Alerts

```yaml
groups:
  - name: spartan-hub-critical
    interval: 30s
    rules:
      # Service Down
      - alert: BackendServiceDown
        expr: up{job="spartan-hub-backend"} == 0
        for: 1m
        labels:
          severity: critical
          team: sre
          page: "true"
        annotations:
          summary: "Backend service is down"
          description: "Spartan Hub backend has been unreachable for more than 1 minute"
          runbook_url: "https://wiki.spartan-hub.com/runbooks/backend-down"
          dashboard: "http://grafana/d/spartan-hub-perf"

      # High Error Rate
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
        for: 2m
        labels:
          severity: critical
          team: sre
          page: "true"
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | printf \"%.2f%%\" }} (threshold: 5%)"
          runbook_url: "https://wiki.spartan-hub.com/runbooks/high-error-rate"

      # Database Down
      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
          team: sre
          page: "true"
        annotations:
          summary: "PostgreSQL database is down"
          description: "Database has been unreachable for more than 1 minute"

      # Redis Down
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
          team: sre
          page: "true"
        annotations:
          summary: "Redis cache is down"
          description: "Redis has been unreachable for more than 1 minute"
```

### Warning Alerts

```yaml
  - name: spartan-hub-warnings
    rules:
      # High Memory Usage
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes{job="spartan-hub-backend"} / 1024 / 1024 / 1024 > 1.5
        for: 5m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "High memory usage"
          description: "Backend memory usage is {{ $value | printf \"%.2f\" }} GB"

      # High CPU Usage
      - alert: HighCPUUsage
        expr: rate(process_cpu_seconds_total{job="spartan-hub-backend"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "High CPU usage"
          description: "Backend CPU usage is {{ $value | printf \"%.1f\" }}%"

      # High Latency P95
      - alert: HighLatencyP95
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "High API latency (P95)"
          description: "95th percentile latency is {{ $value | printf \"%.2f\" }}s (threshold: 0.5s)"

      # Low Cache Hit Ratio
      - alert: LowCacheHitRatio
        expr: sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) < 0.8
        for: 10m
        labels:
          severity: warning
          team: sre
        annotations:
          summary: "Low cache hit ratio"
          description: "Cache hit ratio is {{ $value | printf \"%.2f%%\" }} (threshold: 80%)"
```

### SLA Breach Alerts

```yaml
  - name: spartan-hub-sla
    rules:
      # Uptime SLA Breach
      - alert: SLAUptimeBreach
        expr: avg(avg_over_time(up{job="spartan-hub-backend"}[7d])) < 0.999
        for: 5m
        labels:
          severity: critical
          team: ops
          page: "true"
        annotations:
          summary: "SLA uptime breach (99.9% requirement)"
          description: "7-day uptime is {{ $value | printf \"%.3f%%\" }}"

      # Response Time SLA Breach
      - alert: SLAResponseTimeBreach
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1h])) > 0.5
        for: 10m
        labels:
          severity: warning
          team: perf
        annotations:
          summary: "SLA response time breach (P95 > 500ms)"
          description: "Hourly P95 response time is {{ $value | printf \"%.2f\" }}s"
```

### Business Metric Alerts

```yaml
  - name: spartan-hub-business
    rules:
      # High Churn Risk
      - alert: HighChurnRisk
        expr: churn_prediction_high_risk_gauge > 10
        for: 5m
        labels:
          severity: critical
          team: retention
        annotations:
          summary: "High churn risk spike"
          description: "{{ $value }} users currently at high churn risk"

      # Low Community Activity
      - alert: LowCommunityActivity
        expr: rate(community_posts_total[1h]) < 2
        for: 1h
        labels:
          severity: warning
          team: community
        annotations:
          summary: "Low community activity"
          description: "Only {{ $value | printf \"%.1f\" }} posts per hour"
```

---

## Alertmanager Configuration

### Configuration File

**Location:** `spartan-hub/monitoring/alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@spartan-hub.com'
  smtp_auth_username: 'alerts@spartan-hub.com'
  smtp_auth_password: '<SMTP_PASSWORD>'

templates:
  - '/etc/alertmanager/templates/*.tmpl'

route:
  group_by: ['alertname', 'severity', 'team']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
    - match:
        severity: critical
        page: "true"
      receiver: 'pagerduty-critical'
      continue: true
    
    - match:
        severity: critical
      receiver: 'slack-critical'
    
    - match:
        severity: warning
      receiver: 'slack-warnings'
    
    - match:
        team: sre
      receiver: 'sre-team'
    
    - match:
        team: ops
      receiver: 'ops-team'

receivers:
  - name: 'default-receiver'
    email_configs:
      - to: 'team@spartan-hub.com'
        send_resolved: true

  - name: 'slack-critical'
    slack_configs:
      - api_url: '<SLACK_WEBHOOK_URL>'
        channel: '#alerts-critical'
        title: '🚨 Critical Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'slack-warnings'
    slack_configs:
      - api_url: '<SLACK_WEBHOOK_URL>'
        channel: '#alerts-warnings'
        title: '⚠️ Warning: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_SERVICE_KEY>'
        description: '{{ .GroupLabels.alertname }}: {{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'sre-team'
    email_configs:
      - to: 'sre@spartan-hub.com'
        send_resolved: true

  - name: 'ops-team'
    email_configs:
      - to: 'ops@spartan-hub.com'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

---

## Application Performance Monitoring

### Metrics Endpoints

```javascript
// Backend metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Number of active users'
});

const churnRiskGauge = new promClient.Gauge({
  name: 'churn_prediction_high_risk_gauge',
  help: 'Number of users at high churn risk'
});
```

### OpenTelemetry Integration

```javascript
// OpenTelemetry setup
const { NodeTracerProvider } = require('@opentelemetry/node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider({
  serviceName: 'spartan-hub-backend'
});

provider.addSpanProcessor(
  new SimpleSpanProcessor(
    new JaegerExporter({
      host: 'jaeger',
      port: 14268,
    })
  )
);

provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
  ],
});
```

### Performance Metrics to Track

| Metric | Type | Target |
|--------|------|--------|
| Request Duration | Histogram | P95 < 500ms |
| Error Rate | Rate | < 1% |
| Throughput | Rate | Scale with load |
| Active Connections | Gauge | < 1000 |
| Memory Usage | Gauge | < 1.5GB |
| CPU Usage | Rate | < 80% |
| Cache Hit Ratio | Ratio | > 80% |
| Database Query Time | Histogram | P95 < 100ms |

---

## Logging Infrastructure

### Loki Configuration

**Location:** `spartan-hub/monitoring/loki-config.yml`

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093

limits_config:
  retention_period: 168h  # 7 days
  max_entries_limit_per_query: 5000
```

### Promtail Configuration

**Location:** `spartan-hub/monitoring/promtail-config.yml`

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: kubernetes-pods
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container

  - job_name: application-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: spartan-hub
          __path__: /var/log/spartan-hub/*.log
```

### Log Retention Policy

| Log Type | Retention | Storage |
|----------|-----------|---------|
| Application Logs | 7 days | Loki |
| Access Logs | 30 days | S3 |
| Error Logs | 90 days | S3 |
| Audit Logs | 1 year | S3 (Glacier) |
| Security Logs | 1 year | S3 (Glacier) |

### Log Query Examples

```logql
# Find all errors in the last hour
{app="backend", namespace="spartan-hub"} |= "error" | json | level="error"

# Count errors by route
sum by (route) (rate({app="backend"} |= "error" [5m]))

# Find slow requests
{app="backend"} | json | duration_ms > 1000

# User activity tracking
{app="backend"} | json | user_id="user-123"
```

---

## Distributed Tracing

### Jaeger Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
        - name: jaeger
          image: jaegertracing/all-in-one:1.45
          ports:
            - containerPort: 5775
              protocol: UDP
            - containerPort: 6831
              protocol: UDP
            - containerPort: 6832
              protocol: UDP
            - containerPort: 5778
              protocol: TCP
            - containerPort: 16686
              protocol: TCP
            - containerPort: 14268
              protocol: TCP
            - containerPort: 14250
              protocol: TCP
          env:
            - name: COLLECTOR_ZIPKIN_HOST_PORT
              value: ":9411"
          resources:
            requests:
              memory: 256Mi
              cpu: 100m
            limits:
              memory: 512Mi
              cpu: 500m
```

### Trace Context Propagation

```javascript
// Express middleware for trace context
app.use((req, res, next) => {
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  const spanId = generateSpanId();
  
  req.traceContext = { traceId, spanId };
  res.setHeader('X-Trace-ID', traceId);
  
  next();
});
```

---

## On-Call Procedures

### On-Call Rotation

| Week | Primary | Secondary |
|------|---------|-----------|
| Week 1 | Engineer A | Engineer B |
| Week 2 | Engineer B | Engineer C |
| Week 3 | Engineer C | Engineer A |
| Week 4 | Engineer A | Engineer B |

### Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| P1 (Critical) | 15 minutes | Immediate page |
| P2 (High) | 1 hour | Slack + Email |
| P3 (Medium) | 4 hours | Email |
| P4 (Low) | 24 hours | Ticket |

### Incident Response Procedure

```
1. ACKNOWLEDGE
   - Acknowledge alert in PagerDuty
   - Join incident channel (#incidents)

2. ASSESS
   - Check Grafana dashboards
   - Review recent deployments
   - Check error logs

3. COMMUNICATE
   - Post status update in #incidents
   - Update status page if customer-facing

4. MITIGATE
   - Implement immediate fix or rollback
   - Verify fix with monitoring

5. RESOLVE
   - Confirm issue resolved
   - Post resolution update
   - Close incident

6. REVIEW
   - Schedule post-mortem
   - Document lessons learned
   - Create action items
```

### Runbook Links

| Alert | Runbook |
|-------|---------|
| BackendServiceDown | /runbooks/backend-down |
| HighErrorRate | /runbooks/high-error-rate |
| DatabaseDown | /runbooks/database-down |
| HighLatency | /runbooks/high-latency |
| HighMemoryUsage | /runbooks/high-memory |
| HighCPUUsage | /runbooks/high-cpu |

---

## Support

For monitoring support:
- **Dashboards:** Grafana at monitoring.spartan-hub.com
- **Logs:** Loki at loki.spartan-hub.com
- **Traces:** Jaeger at jaeger.spartan-hub.com
- **Emergency:** Contact on-call engineer via PagerDuty

---

*Last Updated: March 1, 2026*  
*Spartan Hub 2.0 - Monitoring and Alerting Guide*
