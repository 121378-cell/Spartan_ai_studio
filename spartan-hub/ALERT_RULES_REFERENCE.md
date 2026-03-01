# Alert Rules Reference - Spartan Hub 2.0
## Comprehensive Alert Documentation

**Version:** 1.0
**Last Updated:** March 1, 2026
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Alert Severity Levels](#alert-severity-levels)
3. [System Health Alerts](#system-health-alerts)
4. [Performance Alerts](#performance-alerts)
5. [Database Alerts](#database-alerts)
6. [Redis Alerts](#redis-alerts)
7. [Resource Alerts](#resource-alerts)
8. [SLA Alerts](#sla-alerts)
9. [Business Metrics Alerts](#business-metrics-alerts)
10. [AI Service Alerts](#ai-service-alerts)
11. [Security Alerts](#security-alerts)
12. [Alert Suppression & Inhibition](#alert-suppression--inhibition)

---

## Overview

This document provides a comprehensive reference for all alert rules configured in Spartan Hub 2.0's monitoring system. Each alert includes the PromQL expression, thresholds, and recommended actions.

### Alert Configuration Location

- **Rules File:** `spartan-hub/monitoring/prometheus.rules.yml`
- **Alertmanager:** `spartan-hub/monitoring/alertmanager.yml`
- **Grafana Alerts:** Configured in Grafana UI

### Alert Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Pending   │────▶│   Firing    │────▶│ Acknowledged│────▶│  Resolved   │
│  (for: 2m)  │     │  (notify)   │     │  (on-call)  │     │  (auto)     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

---

## Alert Severity Levels

| Severity | Color | Response Time | Notification | Description |
|----------|-------|---------------|--------------|-------------|
| **Critical** | 🔴 Red | 15 minutes | PagerDuty + Slack + Email | Service down, data loss |
| **Warning** | 🟡 Yellow | 1 hour | Slack + Email | Degraded performance |
| **Info** | 🔵 Blue | 4 hours | Slack | Minor issues, informational |

---

## System Health Alerts

### BackendServiceDown

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 1 minute |

**PromQL:**
```promql
up{job="spartan-hub-backend"} == 0
```

**Description:** Backend service has been unreachable for more than 1 minute

**Impact:** Users cannot access the application

**Runbook:** `/runbooks/backend-down`

**Actions:**
1. Check if all instances are down
2. Review recent deployments
3. Check system resources
4. Restart affected instances
5. Rollback if needed

---

### FrontendServiceDown

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 1 minute |

**PromQL:**
```promql
up{job="spartan-hub-frontend"} == 0
```

**Description:** Frontend service has been unreachable for more than 1 minute

**Impact:** Users cannot access the web interface

**Runbook:** `/runbooks/frontend-down`

---

### AIServiceDown

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | AI |
| **Page** | No |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
up{job="ai-microservice"} == 0
```

**Description:** AI microservice has been unreachable for more than 2 minutes

**Impact:** AI features unavailable, fallback to basic functionality

**Runbook:** `/runbooks/ai-service-down`

---

## Performance Alerts

### HighErrorRate

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.05
```

**Threshold:** > 5% error rate

**Description:** Error rate is above 5%

**Impact:** Users experiencing failures

**Runbook:** `/runbooks/high-error-rate`

**Actions:**
1. Identify affected endpoints
2. Check error logs
3. Review recent changes
4. Rollback if code-related
5. Enable circuit breakers

---

### ElevatedErrorRate

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
```

**Threshold:** > 1% error rate

**Description:** Error rate is elevated but not critical

---

### HighResponseTimeP99

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 1 minute |

**PromQL:**
```promql
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 5
```

**Threshold:** P99 > 5 seconds

**Description:** 99th percentile response time is critically high

**Impact:** Severe user experience degradation

**Runbook:** `/runbooks/high-latency`

---

### HighResponseTimeP95

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
```

**Threshold:** P95 > 2 seconds

**Description:** 95th percentile response time is elevated

---

### HighResponseTimeP90

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | Performance |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
histogram_quantile(0.90, rate(http_request_duration_seconds_bucket[5m])) > 1
```

**Threshold:** P90 > 1 second

---

### HighRequestRate

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
sum(rate(http_requests_total[1m])) > 1000
```

**Threshold:** > 1000 requests/second

**Description:** Unusually high request rate detected

**Possible Causes:**
- Marketing campaign
- DDoS attack
- Bot traffic
- Legitimate traffic spike

**Actions:**
1. Check traffic sources
2. Verify it's legitimate
3. Scale if needed
4. Enable rate limiting

---

## Database Alerts

### DatabaseDown

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 1 minute |

**PromQL:**
```promql
pg_up == 0
```

**Description:** PostgreSQL database is unreachable

**Impact:** All database operations failing

**Runbook:** `/runbooks/database-down`

**Actions:**
1. Check PostgreSQL service
2. Check network connectivity
3. Check disk space
4. Failover to replica if needed

---

### DatabaseConnectionPoolExhaustion

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
database_connections_active / database_connections_max > 0.9
```

**Threshold:** > 90% pool utilization

**Description:** Database connection pool near exhaustion

**Impact:** New connections failing, requests queuing

**Runbook:** `/runbooks/connection-pool-exhaustion`

**Actions:**
1. Check for connection leaks
2. Kill idle connections
3. Increase pool size temporarily
4. Scale database read replicas

---

### DatabaseConnectionPoolWarning

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
database_connections_active / database_connections_max > 0.7
```

**Threshold:** > 70% pool utilization

---

### SlowDatabaseQueries

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m])) > 1
```

**Threshold:** P95 query time > 1 second

**Description:** Database queries are running slowly

**Runbook:** `/runbooks/slow-queries`

**Actions:**
1. Identify slow queries
2. Check query plans
3. Add missing indexes
4. Consider query optimization

---

### DatabaseDeadlocks

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 1 minute |

**PromQL:**
```promql
rate(database_deadlocks_total[5m]) > 0
```

**Description:** Database deadlocks detected

**Actions:**
1. Identify conflicting transactions
2. Review transaction isolation levels
3. Optimize query ordering
4. Consider advisory locks

---

### DatabaseReplicationLag

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
database_replication_lag_seconds > 30
```

**Threshold:** > 30 seconds lag

**Description:** Database replication is significantly behind

**Impact:** Read replicas serving stale data

**Runbook:** `/runbooks/replication-lag`

---

### DatabaseDiskSpaceLow

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
(database_disk_total_bytes - database_disk_used_bytes) / database_disk_total_bytes < 0.1
```

**Threshold:** < 10% disk space remaining

**Description:** Database disk space is critically low

**Runbook:** `/runbooks/disk-space-low`

---

## Redis Alerts

### RedisDown

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 1 minute |

**PromQL:**
```promql
redis_up == 0
```

**Description:** Redis cache is unreachable

**Impact:** Caching, sessions, and rate limiting affected

**Runbook:** `/runbooks/redis-down`

---

### RedisConnectionHigh

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
redis_connected_clients / redis_maxclients > 0.8
```

**Threshold:** > 80% connection utilization

---

### RedisMemoryHigh

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
redis_memory_used_bytes / redis_memory_max_bytes > 0.8
```

**Threshold:** > 80% memory utilization

**Description:** Redis memory usage is high

**Runbook:** `/runbooks/redis-memory`

---

### RedisMemoryCritical

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
redis_memory_used_bytes / redis_memory_max_bytes > 0.9
```

**Threshold:** > 90% memory utilization

**Description:** Redis memory is critically high, eviction may occur

---

### RedisSlowCommands

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
rate(redis_slowlog_length[5m]) > 10
```

**Description:** Slow commands detected in Redis

---

### RedisCacheHitRatioLow

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 10 minutes |

**PromQL:**
```promql
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) < 0.8
```

**Threshold:** < 80% hit ratio

**Description:** Cache efficiency is low

---

### RedisLastSaveAgo

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
time() - redis_last_save_time > 3600
```

**Description:** Redis last persistence was more than 1 hour ago

---

## Resource Alerts

### HighMemoryUsage

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
```

**Threshold:** > 90% system memory

**Description:** System memory usage is critically high

**Runbook:** `/runbooks/high-memory`

---

### ElevatedMemoryUsage

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 10 minutes |

**PromQL:**
```promql
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.75
```

**Threshold:** > 75% system memory

---

### ApplicationMemoryHigh

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
process_resident_memory_bytes{job="spartan-hub-backend"} / 1024 / 1024 / 1024 > 1.5
```

**Threshold:** > 1.5 GB application memory

---

### HighCPUUsage

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
```

**Threshold:** > 80% CPU usage

---

### CriticalCPUUsage

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
```

**Threshold:** > 95% CPU usage

---

### DiskSpaceLow

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
(node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 10
```

**Threshold:** < 10% disk space

**Description:** Disk space is critically low

**Runbook:** `/runbooks/disk-space`

---

### DiskSpaceWarning

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 10 minutes |

**PromQL:**
```promql
(node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 < 20
```

**Threshold:** < 20% disk space

---

### HighDiskIO

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
rate(node_disk_io_time_seconds_total[5m]) > 0.9
```

**Threshold:** > 90% disk I/O utilization

---

### HighNetworkTraffic

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
sum(rate(node_network_receive_bytes_total{device!="lo"}[5m])) > 100 * 1024 * 1024
```

**Threshold:** > 100 MB/s receive traffic

---

## SLA Alerts

### SLAUptimeBreach

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | Ops |
| **Page** | Yes |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
avg(avg_over_time(up{job="spartan-hub-backend"}[7d])) < 0.999
```

**Threshold:** < 99.9% uptime (7-day average)

**Description:** SLA uptime requirement breached

**Runbook:** `/runbooks/sla-breach`

---

### SLAUptimeWarning

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | Ops |
| **Page** | No |
| **For Duration** | 10 minutes |

**PromQL:**
```promql
avg(avg_over_time(up{job="spartan-hub-backend"}[24h])) < 0.9995
```

**Threshold:** < 99.95% uptime (24-hour average)

---

### SLAResponseTimeBreach

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | Performance |
| **Page** | No |
| **For Duration** | 10 minutes |

**PromQL:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[1h])) > 0.5
```

**Threshold:** P95 > 500ms (hourly average)

**Description:** SLA response time requirement breached

---

### SLAErrorRateBreach

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | SRE |
| **Page** | Yes |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
avg_over_time(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))[1h:]) > 0.01
```

**Threshold:** > 1% error rate (hourly average)

**Description:** SLA error rate requirement breached

---

## Business Metrics Alerts

### UserActivityDecline

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | Engagement |
| **Page** | No |
| **For Duration** | 30 minutes |

**PromQL:**
```promql
rate(user_activities_total[1h]) < 0.5 * scalar(avg_over_time(rate(user_activities_total[1h])[7d]))
```

**Description:** User activity has declined by more than 50% compared to weekly average

---

### HighChurnRisk

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | Retention |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
churn_prediction_high_risk_gauge > 10
```

**Description:** More than 10 users at high churn risk

---

### AchievementSystemErrors

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | Engagement |
| **Page** | No |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
rate(achievements_errors_total[5m]) > 0.5
```

**Description:** Achievement system is experiencing errors

---

### ChallengeCompletionDrop

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | Engagement |
| **Page** | No |
| **For Duration** | 30 minutes |

**PromQL:**
```promql
rate(challenges_completed_total[1h]) < rate(challenges_created_total[1h]) * 0.3
```

**Description:** Challenge completion rate is below 30%

---

### LowCommunityActivity

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | Community |
| **Page** | No |
| **For Duration** | 1 hour |

**PromQL:**
```promql
rate(community_posts_total[1h]) < 2
```

**Description:** Less than 2 community posts per hour

---

### HighReportedContent

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | Moderation |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
rate(content_reports_total[30m]) > 5
```

**Description:** More than 5 content reports in 30 minutes

---

## AI Service Alerts

### AIServiceHighLatency

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | AI |
| **Page** | No |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
histogram_quantile(0.95, rate(ai_request_duration_seconds_bucket[5m])) > 10
```

**Threshold:** P95 > 10 seconds

---

### AIServiceHighErrorRate

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | AI |
| **Page** | No |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
sum(rate(ai_errors_total[5m])) / sum(rate(ai_requests_total[5m])) > 0.05
```

**Threshold:** > 5% error rate

---

### AIServiceRateLimiting

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | AI |
| **Page** | No |
| **For Duration** | 1 minute |

**PromQL:**
```promql
rate(ai_rate_limit_rejections_total[5m]) > 0
```

**Description:** AI service is rate limiting requests

---

### AIServiceTokenQuotaWarning

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | AI |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
ai_tokens_used_total / ai_tokens_quota_total > 0.8
```

**Threshold:** > 80% token quota used

---

## Security Alerts

### HighAuthFailureRate

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | Security |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
sum(rate(auth_failures_total[5m])) > 10
```

**Description:** More than 10 authentication failures per minute

---

### PotentialBruteForce

| Property | Value |
|----------|-------|
| **Severity** | Critical |
| **Team** | Security |
| **Page** | Yes |
| **For Duration** | 2 minutes |

**PromQL:**
```promql
sum(rate(auth_failures_total{by_ip="true"}[5m])) by (ip) > 20
```

**Description:** Potential brute force attack from specific IP

**Actions:**
1. Block offending IP
2. Review affected accounts
3. Enable additional security measures

---

### RateLimitingTriggered

| Property | Value |
|----------|-------|
| **Severity** | Warning |
| **Team** | SRE |
| **Page** | No |
| **For Duration** | 5 minutes |

**PromQL:**
```promql
sum(rate(rate_limit_hits_total[5m])) > 100
```

**Description:** High rate limiting activity detected

---

## Alert Suppression & Inhibition

### Inhibition Rules

The following inhibition rules prevent alert storms:

```yaml
inhibit_rules:
  # If service is down, suppress performance alerts
  - source_match:
      alertname: BackendServiceDown
    target_match:
      alertname: HighResponseTimeP95
    equal: ['instance']

  # If database is down, suppress connection pool alerts
  - source_match:
      alertname: DatabaseDown
    target_match:
      alertname: DatabaseConnectionPoolExhaustion

  # If Redis is down, suppress cache alerts
  - source_match:
      alertname: RedisDown
    target_match_re:
      alertname: 'Redis.*'

  # Critical suppresses warning for same alert
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['alertname', 'instance']
```

### Maintenance Windows

To suppress alerts during maintenance:

```yaml
# Add to alertmanager.yml
mute_time_intervals:
  - name: maintenance-window
    time_intervals:
      - times:
          - start_time: '02:00'
            end_time: '04:00'
        weekdays: ['sunday']

routes:
  - match:
      type: maintenance
    receiver: 'null'
    mute_time_intervals:
      - maintenance-window
```

---

## Quick Reference Table

| Alert Name | Severity | Team | Page | For |
|------------|----------|------|------|-----|
| BackendServiceDown | Critical | SRE | Yes | 1m |
| HighErrorRate | Critical | SRE | Yes | 2m |
| HighResponseTimeP99 | Critical | SRE | Yes | 1m |
| DatabaseDown | Critical | SRE | Yes | 1m |
| RedisDown | Critical | SRE | Yes | 1m |
| HighMemoryUsage | Critical | SRE | Yes | 5m |
| CriticalCPUUsage | Critical | SRE | Yes | 2m |
| DiskSpaceLow | Critical | SRE | Yes | 5m |
| SLAUptimeBreach | Critical | Ops | Yes | 5m |
| SLAErrorRateBreach | Critical | SRE | Yes | 5m |
| PotentialBruteForce | Critical | Security | Yes | 2m |
| HighResponseTimeP95 | Warning | SRE | No | 2m |
| SlowDatabaseQueries | Warning | SRE | No | 2m |
| RedisMemoryHigh | Warning | SRE | No | 5m |
| ElevatedMemoryUsage | Warning | SRE | No | 10m |
| HighCPUUsage | Warning | SRE | No | 5m |
| DiskSpaceWarning | Warning | SRE | No | 10m |

---

**Document Created:** March 1, 2026
**Next Review:** Quarterly or when adding new alerts
**Owner:** DevOps Team

---

<p align="center">
  <strong>🔔 Spartan Hub 2.0 - Alert Rules Reference</strong><br>
  <em>Know Your Alerts, Respond Effectively</em>
</p>
