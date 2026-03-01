# Monitoring Runbook - Spartan Hub 2.0
## Operations and Incident Response Guide

**Version:** 1.0
**Last Updated:** March 1, 2026
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack Architecture](#monitoring-stack-architecture)
3. [Dashboard Reference](#dashboard-reference)
4. [Alert Response Procedures](#alert-response-procedures)
5. [Troubleshooting Guides](#troubleshooting-guides)
6. [Escalation Matrix](#escalation-matrix)
7. [On-Call Procedures](#on-call-procedures)

---

## Overview

This runbook provides operational procedures for monitoring and responding to incidents in Spartan Hub 2.0. It is intended for on-call engineers, SREs, and operations team members.

### Key Contacts

| Role | Name | Contact | Availability |
|------|------|---------|--------------|
| **Primary On-Call** | See PagerDuty | PagerDuty | 24/7 |
| **Secondary On-Call** | See PagerDuty | PagerDuty | 24/7 |
| **Engineering Lead** | [TBD] | [TBD] | Business Hours |
| **DevOps Lead** | [TBD] | [TBD] | Business Hours |

### Monitoring Stack Components

| Component | URL | Purpose |
|-----------|-----|---------|
| **Grafana** | http://localhost:3001 | Dashboards & Visualization |
| **Prometheus** | http://localhost:9090 | Metrics Collection |
| **Alertmanager** | http://localhost:9093 | Alert Routing |
| **Loki** | http://localhost:3100 | Log Aggregation |
| **Node Exporter** | http://localhost:9100 | System Metrics |
| **Redis Exporter** | http://localhost:9121 | Redis Metrics |
| **Postgres Exporter** | http://localhost:9187 | Database Metrics |

---

## Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Monitoring Stack Overview                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Backend       │    │   Frontend      │    │   Database      │
│   :3001         │    │   :80           │    │   :5432         │
│   /metrics      │    │   /metrics      │    │   (exporter)    │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      Prometheus       │
                    │   (Scrape: 15s)       │
                    │   Retention: 15d      │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
    ┌─────────────────┐ ┌───────────────┐ ┌───────────────┐
    │    Grafana      │ │ Alertmanager  │ │   Thanos      │
    │  (Dashboards)   │ │  (Alerting)   │ │ (Long-term)   │
    └────────┬────────┘ └───────┬───────┘ └───────────────┘
             │                 │
             │                 │ Notifications
             │                 ▼
             │         ┌───────────────┐
             │         │   Slack       │
             │         │   Email       │
             │         │   PagerDuty   │
             │         └───────────────┘
             │
             ▼
    ┌─────────────────┐
    │     Users       │
    │  (Operations)   │
    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│  App Logs       │    │  System Logs    │
└────────┬────────┘    └────────┬────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Promtail                                        │
│                         (Log Collection)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Loki                                           │
│                         (Log Aggregation)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Dashboard Reference

### Grafana Dashboards

| Dashboard | UID | Purpose | URL |
|-----------|-----|---------|-----|
| **System Overview** | system-overview | Overall system health | /d/system-overview |
| **Performance** | spartan-hub-perf | API performance metrics | /d/spartan-hub-perf |
| **Database** | database-health | PostgreSQL health | /d/database-health |
| **Business Metrics** | business-metrics | User engagement KPIs | /d/business-metrics |
| **SLA Monitoring** | sla-monitoring | SLA compliance | /d/sla-monitoring |

### Key Metrics to Watch

#### System Health

| Metric | Query | Normal Range | Alert Threshold |
|--------|-------|--------------|-----------------|
| Uptime | `up{job="backend"}` | 1 | < 1 |
| CPU Usage | `rate(process_cpu_seconds_total[5m])` | < 60% | > 80% |
| Memory Usage | `process_resident_memory_bytes` | < 1GB | > 1.5GB |
| Active Connections | `nodejs_active_handles_total` | < 500 | > 1000 |

#### Performance

| Metric | Query | Normal Range | Alert Threshold |
|--------|-------|--------------|-----------------|
| P95 Latency | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` | < 500ms | > 2s |
| P99 Latency | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` | < 1s | > 5s |
| Error Rate | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` | < 1% | > 5% |
| Request Rate | `sum(rate(http_requests_total[5m]))` | Variable | Spike detection |

#### Database

| Metric | Query | Normal Range | Alert Threshold |
|--------|-------|--------------|-----------------|
| Connections | `database_connections_active` | < 50 | > 90% of max |
| Query Time P95 | `histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))` | < 50ms | > 1s |
| Replication Lag | `database_replication_lag_seconds` | < 1s | > 30s |
| Disk Usage | `database_disk_used_bytes / database_disk_total_bytes` | < 70% | > 90% |

#### Redis

| Metric | Query | Normal Range | Alert Threshold |
|--------|-------|--------------|-----------------|
| Memory Usage | `redis_memory_used_bytes / redis_memory_max_bytes` | < 70% | > 80% |
| Hit Ratio | `redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)` | > 80% | < 80% |
| Connected Clients | `redis_connected_clients` | < 100 | > 80% of max |
| Evicted Keys | `rate(redis_evicted_keys_total[5m])` | 0 | > 0 |

---

## Alert Response Procedures

### P1 - Critical Alerts (Page Immediately)

#### BackendServiceDown

**Alert:** `Backend service is down`

**Impact:** Users cannot access the application

**Response Time:** 15 minutes

**Procedure:**

```
1. ACKNOWLEDGE
   - Acknowledge alert in PagerDuty
   - Post in #incidents: "Investigating backend outage"

2. ASSESS
   - Check Grafana: System Overview dashboard
   - Check if all instances are down or just some
   - Check recent deployments

3. DIAGNOSE
   SSH to affected server:
   $ ssh admin@backend-server
   
   Check service status:
   $ docker service ps spartan-hub_backend
   $ docker logs spartan-hub-backend-1 --tail 100
   
   Check system resources:
   $ docker stats
   $ free -h
   $ df -h

4. REMEDIATE
   If OOM:
   $ docker service scale spartan-hub_backend=+1
   
   If deployment issue:
   $ docker service rollback spartan-hub_backend
   
   If infrastructure issue:
   - Restart affected containers
   - Scale up healthy instances

5. VERIFY
   - Run smoke tests
   - Check error rate in Grafana
   - Monitor for 15 minutes

6. RESOLVE
   - Post resolution in #incidents
   - Update status page
   - Schedule post-mortem
```

#### HighErrorRate

**Alert:** `Error rate is > 5%`

**Impact:** Users experiencing failures

**Response Time:** 15 minutes

**Procedure:**

```
1. ACKNOWLEDGE
   - Acknowledge alert in PagerDuty
   - Post in #incidents

2. ASSESS
   - Check Grafana: Performance dashboard
   - Identify which endpoints are affected
   - Check error logs in Loki

3. DIAGNOSE
   Query Loki for errors:
   {app="backend"} |= "error" | json | level="error"
   
   Check recent changes:
   - Recent deployments?
   - Configuration changes?
   - External service issues?

4. REMEDIATE
   If code issue:
   - Rollback deployment
   
   If external service:
   - Enable fallback/circuit breaker
   
   If database issue:
   - Check database health
   - Restart connection pool

5. VERIFY
   - Monitor error rate
   - Run smoke tests

6. RESOLVE
   - Document root cause
   - Update runbook if needed
```

#### DatabaseDown

**Alert:** `PostgreSQL database is down`

**Impact:** All database operations failing

**Response Time:** 15 minutes

**Procedure:**

```
1. ACKNOWLEDGE
   - Acknowledge alert
   - Page DBA on-call

2. ASSESS
   - Check if primary or replica
   - Check replication status
   - Check application impact

3. DIAGNOSE
   SSH to database server:
   $ ssh admin@db-server
   
   Check PostgreSQL status:
   $ systemctl status postgresql
   $ pg_isready -h localhost
   
   Check logs:
   $ tail -100 /var/log/postgresql/postgresql-15-main.log
   
   Check disk space:
   $ df -h
   $ du -sh /var/lib/postgresql

4. REMEDIATE
   If service stopped:
   $ systemctl start postgresql
   
   If disk full:
   - Clear old logs
   - Archive old data
   
   If failover needed:
   - Promote replica to primary
   - Update connection strings

5. VERIFY
   - Test database connectivity
   - Run database health check
   - Monitor replication

6. RESOLVE
   - Document incident
   - Review capacity
```

### P2 - High Priority Alerts (Respond Within 1 Hour)

#### HighMemoryUsage

**Alert:** `Memory usage > 75%`

**Procedure:**

```
1. Check which process is using memory:
   $ docker stats --no-stream
   
2. Check for memory leaks:
   - Review Grafana memory trends
   - Check for increasing pattern

3. If application memory:
   - Check for memory-intensive operations
   - Consider scaling horizontally
   
4. If system memory:
   - Check for runaway processes
   - Clear caches if safe:
     $ sync; echo 3 > /proc/sys/vm/drop_caches

5. Monitor and alert if continues to increase
```

#### HighCPUUsage

**Alert:** `CPU usage > 80%`

**Procedure:**

```
1. Check which process is using CPU:
   $ docker stats --no-stream
   $ top -H -p $(pgrep -f node)

2. Check for infinite loops or heavy computations:
   - Review recent code changes
   - Check for batch operations

3. If legitimate load:
   - Scale horizontally
   - Consider rate limiting

4. If abnormal:
   - Profile the application
   - Check for crypto mining or attacks
```

#### DiskSpaceLow

**Alert:** `Disk space < 20%`

**Procedure:**

```
1. Identify what's using disk space:
   $ df -h
   $ du -sh /* | sort -h
   
2. Clean up if possible:
   # Clear old logs
   $ find /var/log -name "*.log" -mtime +7 -delete
   
   # Clear Docker images
   $ docker image prune -af
   
   # Clear Docker volumes (careful!)
   $ docker volume prune

3. If database disk:
   - Archive old data
   - Consider expanding storage

4. Set up log rotation if not configured
```

### P3 - Medium Priority Alerts (Respond Within 4 Hours)

#### LowCacheHitRatio

**Alert:** `Cache hit ratio < 80%`

**Procedure:**

```
1. Check cache configuration:
   - Review cache TTL settings
   - Check cache key patterns

2. Analyze cache misses:
   - Query Loki for cache miss patterns
   - Identify frequently missed keys

3. Optimize caching:
   - Increase cache size if needed
   - Adjust cache eviction policy
   - Add missing cache entries

4. Monitor improvement
```

#### SlowDatabaseQueries

**Alert:** `P95 query time > 1s`

**Procedure:**

```
1. Identify slow queries:
   $ psql -c "SELECT query, calls, total_time, mean_time 
              FROM pg_stat_statements 
              ORDER BY mean_time DESC LIMIT 10;"

2. Analyze query plans:
   $ psql -c "EXPLAIN ANALYZE <slow_query>"

3. Optimize:
   - Add missing indexes
   - Rewrite inefficient queries
   - Consider query caching

4. Monitor improvement
```

---

## Troubleshooting Guides

### Application Not Responding

```
Symptoms:
- Health checks failing
- Requests timing out
- Connection refused errors

Diagnosis:
1. Check if service is running:
   $ docker ps | grep spartan-hub

2. Check service logs:
   $ docker logs spartan-hub-backend-1 --tail 100

3. Check resource usage:
   $ docker stats spartan-hub-backend-1

4. Check network connectivity:
   $ docker exec spartan-hub-backend-1 curl -v http://localhost:3001/health

Resolution:
1. If OOM: Scale up or increase memory limit
2. If deadlock: Restart container
3. If network issue: Check Docker network
4. If code issue: Rollback deployment
```

### High Latency

```
Symptoms:
- P95 latency > 1s
- User complaints about slowness
- Timeout errors

Diagnosis:
1. Check Grafana Performance dashboard
2. Identify slow endpoints
3. Check database query times
4. Check external service latencies
5. Check system resources

Resolution:
1. If database: Optimize queries, add indexes
2. If external service: Enable caching, add timeout
3. If resources: Scale horizontally
4. If code: Profile and optimize
```

### Memory Leak

```
Symptoms:
- Memory usage continuously increasing
- OOM kills occurring
- Application restarts

Diagnosis:
1. Check memory trend in Grafana
2. Take heap snapshot:
   $ node --inspect app.js
   # Connect Chrome DevTools
3. Analyze heap for retained objects

Resolution:
1. Fix code causing leak
2. Implement memory limits
3. Set up automatic restarts
4. Monitor closely after fix
```

### Database Connection Issues

```
Symptoms:
- Connection timeout errors
- "Too many connections" errors
- Slow queries

Diagnosis:
1. Check connection pool status:
   $ psql -c "SELECT count(*) FROM pg_stat_activity;"

2. Check for idle connections:
   $ psql -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

3. Check application connection pool:
   - Review pool configuration
   - Check for connection leaks

Resolution:
1. Kill idle connections:
   $ psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle';"

2. Adjust pool size in application
3. Fix connection leaks in code
4. Consider connection pooling (PgBouncer)
```

### Redis Issues

```
Symptoms:
- Cache misses increasing
- Rate limiting not working
- Session issues

Diagnosis:
1. Check Redis connectivity:
   $ redis-cli ping

2. Check memory usage:
   $ redis-cli INFO memory

3. Check slow log:
   $ redis-cli SLOWLOG GET 10

4. Check keyspace:
   $ redis-cli INFO keyspace

Resolution:
1. If memory full: Increase limit or evict keys
2. If slow queries: Optimize commands
3. If persistence issues: Check AOF/RDB
4. If cluster issues: Check node health
```

---

## Escalation Matrix

### Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **P1** | Service down, data loss | 15 minutes | Immediate page |
| **P2** | Degraded performance | 1 hour | Slack + Email |
| **P3** | Minor issues | 4 hours | Email |
| **P4** | Questions, enhancements | 24 hours | Ticket |

### Escalation Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Escalation Flow                                     │
└─────────────────────────────────────────────────────────────────────────────┘

P1 Alert Received
       │
       ▼
┌─────────────┐
│ Primary     │◄──── 15 min no response
│ On-Call     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Secondary   │◄──── 15 min no response
│ On-Call     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Engineering │◄──── 30 min no response
│ Lead        │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ VP/Director │
│ of Eng      │
└─────────────┘
```

### Contact Information

| Level | Contact Method | Details |
|-------|---------------|---------|
| **Primary On-Call** | PagerDuty | See PagerDuty rotation |
| **Secondary On-Call** | PagerDuty | See PagerDuty rotation |
| **Engineering Lead** | Phone/Slack | [TBD] |
| **DevOps Lead** | Phone/Slack | [TBD] |
| **DBA On-Call** | PagerDuty | See PagerDuty rotation |

---

## On-Call Procedures

### Shift Handover

**Before shift ends:**

1. Review open incidents
2. Check alert trends
3. Update runbook if needed
4. Brief incoming on-call

**Handover checklist:**

- [ ] Any active incidents?
- [ ] Any pending changes?
- [ ] Any known issues?
- [ ] Any upcoming events (deployments, maintenance)?

### Daily On-Call Tasks

**Morning:**

1. Check overnight alerts
2. Review system health dashboard
3. Check error trends
4. Review open tickets

**Throughout day:**

1. Respond to alerts promptly
2. Document all incidents
3. Update status page if needed
4. Communicate with team

**End of day:**

1. Review day's incidents
2. Update documentation
3. Prepare handover notes
4. Ensure alerts are acknowledged

### Weekly On-Call Tasks

1. Review alert fatigue (false positives)
2. Update runbooks based on incidents
3. Review capacity trends
4. Participate in incident post-mortems

---

## Appendix: Useful Commands

### Prometheus Queries

```promql
# Error rate by endpoint
sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))

# P95 latency by endpoint
histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))

# Top 10 slowest queries
topk(10, sort_desc(avg by (query) (rate(database_query_duration_seconds_sum[5m]))))

# Cache hit ratio
sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))

# Request rate by status code
sum by (status) (rate(http_requests_total[5m]))
```

### Loki Queries

```logql
# All errors in last hour
{app="backend"} |= "error" | json | level="error"

# Errors by route
sum by (route) (rate({app="backend"} |= "error" [5m]))

# Slow requests
{app="backend"} | json | duration_ms > 1000

# User-specific logs
{app="backend"} | json | user_id="user-123"
```

### Docker Commands

```bash
# View service status
docker service ls
docker service ps spartan-hub_backend

# View logs
docker service logs spartan-hub_backend --tail 100

# Scale service
docker service scale spartan-hub_backend=5

# Rollback service
docker service rollback spartan-hub_backend

# View resource usage
docker stats
```

### Kubernetes Commands

```bash
# View pod status
kubectl get pods -n spartan-hub

# View logs
kubectl logs -f deployment/spartan-hub-backend -n spartan-hub

# Scale deployment
kubectl scale deployment spartan-hub-backend --replicas=5 -n spartan-hub

# Rollback deployment
kubectl rollout undo deployment/spartan-hub-backend -n spartan-hub

# View resource usage
kubectl top pods -n spartan-hub
```

---

**Document Created:** March 1, 2026
**Next Review:** Quarterly or after major incidents
**Owner:** DevOps Team

---

<p align="center">
  <strong>📖 Spartan Hub 2.0 - Monitoring Runbook</strong><br>
  <em>Operational Excellence Through Preparedness</em>
</p>
