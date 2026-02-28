# 🚨 OPERATIONS RUNBOOKS

**Version:** 2.0  
**Date:** March 1, 2026  
**Audience:** DevOps, On-Call Engineers

---

## 📋 TABLE OF CONTENTS

1. [Deployment Procedures](#deployment-procedures)
2. [Incident Response](#incident-response)
3. [Database Maintenance](#database-maintenance)
4. [Backup & Recovery](#backup--recovery)
5. [Performance Troubleshooting](#performance-troubleshooting)
6. [Security Incidents](#security-incidents)

---

## 🚀 DEPLOYMENT PROCEDURES

### Runbook: Deploy to Staging

**Trigger:** New code merged to `develop` branch  
**Duration:** 15-20 minutes  
**Risk:** Low

#### Pre-Deployment Checklist

- [ ] All tests passing in CI/CD
- [ ] Code review completed
- [ ] No critical bugs in Jira
- [ ] Database migrations reviewed
- [ ] Rollback plan documented

#### Deployment Steps

**Step 1: Verify Build**

```bash
# Check build status in GitHub Actions
gh run list --workflow=ci.yml --branch develop

# Verify all checks passed
gh run view <run-id>
```

**Step 2: Deploy to Staging**

```bash
# If using Helm
helm upgrade --install spartan-hub-staging ./scripts/deployment/helm/spartan-hub \
  --namespace spartan-hub-staging \
  --values ./scripts/deployment/helm/spartan-hub/values-staging.yaml \
  --set image.tag=<commit-sha> \
  --wait --timeout=10m

# If using Docker Compose
cd staging
docker-compose pull
docker-compose up -d
```

**Step 3: Verify Deployment**

```bash
# Check pod status
kubectl get pods -n spartan-hub-staging

# Check logs
kubectl logs -f deployment/spartan-hub-backend -n spartan-hub-staging

# Run smoke tests
curl -f https://staging-api.spartan-hub.com/health
curl -f https://staging.spartan-hub.com/
```

**Step 4: Run Smoke Tests**

```bash
# Execute automated smoke tests
npm run test:smoke -- --env=staging

# Manual verification checklist
# - Login works
# - Dashboard loads
# - Video analysis starts
# - API health endpoint returns 200
```

#### Post-Deployment

- [ ] Smoke tests passing
- [ ] No errors in logs
- [ ] Metrics look normal
- [ ] Team notified in Slack

#### Rollback (If Needed)

```bash
# Helm rollback
helm rollback spartan-hub-staging -n spartan-hub-staging

# Docker Compose rollback
docker-compose pull spartan-hub-backend:<previous-tag>
docker-compose up -d spartan-hub-backend
```

---

### Runbook: Deploy to Production

**Trigger:** Manual deployment approved  
**Duration:** 30-45 minutes  
**Risk:** Medium

#### Pre-Deployment Checklist

- [ ] All staging tests passed
- [ ] Product owner approval
- [ ] Database backup created
- [ ] Rollback plan tested
- [ ] On-call engineer available
- [ ] No major marketing campaigns running

#### Deployment Steps

**Step 1: Create Production Backup**

```bash
# Database backup
npm run backup:create -- --env=production

# Verify backup
npm run backup:verify -- --file=backups/prod-backup-$(date +%Y%m%d).db
```

**Step 2: Deploy Backend**

```bash
# Deploy with Helm
helm upgrade --install spartan-hub-production ./scripts/deployment/helm/spartan-hub \
  --namespace spartan-hub-production \
  --values ./scripts/deployment/helm/spartan-hub/values-production.yaml \
  --set image.tag=<commit-sha> \
  --wait --timeout=15m

# Monitor rollout
kubectl rollout status deployment/spartan-hub-backend -n spartan-hub-production
```

**Step 3: Run Database Migrations**

```bash
# Execute migrations
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- npm run migrate

# Verify migrations
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- npm run db:verify
```

**Step 4: Deploy Frontend**

```bash
# Deploy frontend (CDN invalidation included)
helm upgrade --install spartan-hub-frontend ./scripts/deployment/helm/spartan-hub-frontend \
  --namespace spartan-hub-production \
  --set image.tag=<commit-sha> \
  --wait
```

**Step 5: Verify Production**

```bash
# Health checks
curl -f https://api.spartan-hub.com/health
curl -f https://spartan-hub.com/

# Check metrics
kubectl top pods -n spartan-hub-production

# Verify error rates
# Go to Grafana → Production Dashboard → Error Rate
# Should be < 0.1%
```

#### Post-Deployment

- [ ] Monitor error rates for 30 minutes
- [ ] Check user feedback channels
- [ ] Verify key metrics (latency, throughput)
- [ ] Update status page
- [ ] Notify stakeholders

---

## 🔥 INCIDENT RESPONSE

### Runbook: High Error Rate

**Alert:** `HighErrorRate - Error rate is >5%`  
**Severity:** Critical  
**Response Time:** <15 minutes

#### Triage

**Step 1: Assess Impact**

```bash
# Check current error rate
# Grafana → System Overview → Error Rate

# Check affected endpoints
# Grafana → API Performance → Errors by Endpoint

# Check user reports
# Slack #user-reports channel
# Intercom customer support tickets
```

**Step 2: Identify Root Cause**

```bash
# Check recent deployments
gh run list --workflow=production-pipeline.yml --limit 5

# Check error logs
kubectl logs -f deployment/spartan-hub-backend -n spartan-hub-production --tail=1000 | grep ERROR

# Check for patterns
# - Specific endpoint?
# - Specific user segment?
# - Specific error type?
```

#### Resolution

**If caused by recent deployment:**

```bash
# Rollback immediately
helm rollback spartan-hub-production -n spartan-hub-production

# Notify team
# Slack: @channel Rolling back production due to high error rate
```

**If caused by external service:**

```bash
# Check third-party service status
# - Garmin API status
# - AWS Service Health Dashboard
# - Ollama service status

# Enable circuit breaker if needed
curl -X POST https://api.spartan-hub.com/admin/circuit-breaker/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**If caused by database:**

```bash
# Check database connections
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "SELECT COUNT(*) FROM sqlite_master;"

# Check for locks
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "PRAGMA locking_mode;"

# Restart database if needed
kubectl rollout restart statefulset/postgres -n spartan-hub-production
```

#### Post-Incident

- [ ] Error rate back to normal (<0.1%)
- [ ] Root cause documented
- [ ] Post-mortem scheduled
- [ ] Action items created
- [ ] Stakeholders notified

---

### Runbook: High Response Time

**Alert:** `HighResponseTime - p95 latency >500ms`  
**Severity:** Warning  
**Response Time:** <30 minutes

#### Triage

**Step 1: Identify Slow Endpoints**

```bash
# Grafana → API Performance → Response Time by Endpoint
# Look for endpoints with p95 > 500ms

# Check if it's global or specific to certain routes
```

**Step 2: Check System Resources**

```bash
# CPU usage
kubectl top pods -n spartan-hub-production

# Memory usage
kubectl top pods -n spartan-hub-production --containers

# Check for throttling
kubectl describe pod <pod-name> -n spartan-hub-production | grep -A 5 "Limits"
```

#### Resolution

**If CPU-bound:**

```bash
# Scale horizontally
kubectl scale deployment/spartan-hub-backend --replicas=10 -n spartan-hub-production

# Or update HPA
kubectl edit hpa/backend-hpa -n spartan-hub-production
# Increase maxReplicas
```

**If database-bound:**

```bash
# Check slow queries
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "PRAGMA query_only = ON; EXPLAIN QUERY PLAN SELECT ...;"

# Add missing indexes
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- npm run db:optimize
```

**If external API-bound:**

```bash
# Enable caching
curl -X POST https://api.spartan-hub.com/admin/cache/enable \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check external API status
# Contact third-party support if needed
```

---

## 💾 DATABASE MAINTENANCE

### Runbook: Weekly Database Optimization

**Schedule:** Every Sunday at 3 AM  
**Duration:** 10-15 minutes  
**Risk:** Low

#### Steps

**Step 1: Backup Database**

```bash
# Create backup
npm run backup:create -- --env=production

# Verify backup
npm run backup:verify
```

**Step 2: Run VACUUM**

```bash
# Reclaim space
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "VACUUM;"
```

**Step 3: Analyze Tables**

```bash
# Update statistics
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "ANALYZE;"
```

**Step 4: Check Integrity**

```bash
# Verify database integrity
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "PRAGMA integrity_check;"

# Should return "ok"
```

**Step 5: Clean Old Data**

```bash
# Remove old sessions (older than 30 days)
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "DELETE FROM sessions WHERE expires_at < datetime('now', '-30 days');"

# Remove old notifications (older than 90 days)
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "DELETE FROM notifications WHERE created_at < datetime('now', '-90 days');"
```

---

## 🔄 BACKUP & RECOVERY

### Runbook: Restore Database from Backup

**Trigger:** Database corruption or data loss  
**Severity:** Critical  
**Duration:** 30-60 minutes

#### Steps

**Step 1: Stop Application**

```bash
# Scale down to prevent writes
kubectl scale deployment/spartan-hub-backend --replicas=0 -n spartan-hub-production
```

**Step 2: Download Backup**

```bash
# List available backups
aws s3 ls s3://spartan-hub-backups/production/

# Download latest good backup
aws s3 cp s3://spartan-hub-backups/production/backup-2026-03-01.db ./backup.db
```

**Step 3: Restore Database**

```bash
# Copy backup to database location
kubectl cp ./backup.db spartan-hub-backend-<pod-id>:/app/data/spartan_hub.db \
  -n spartan-hub-production

# Verify restore
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "PRAGMA integrity_check;"
```

**Step 4: Restart Application**

```bash
# Scale back up
kubectl scale deployment/spartan-hub-backend --replicas=5 -n spartan-hub-production

# Monitor startup
kubectl logs -f deployment/spartan-hub-backend -n spartan-hub-production
```

**Step 5: Verify Data**

```bash
# Check row counts
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'workouts', COUNT(*) FROM workouts;"

# Verify critical data
# - Users can login
# - Workouts are accessible
# - Video analyses are present
```

---

## 🔍 PERFORMANCE TROUBLESHOOTING

### Runbook: Investigate Slow API

**Trigger:** User reports or monitoring alert  
**Severity:** Medium  
**Duration:** 30-60 minutes

#### Investigation Steps

**Step 1: Reproduce the Issue**

```bash
# Test endpoint manually
time curl -H "Authorization: Bearer $TOKEN" \
  https://api.spartan-hub.com/api/video-analysis/sessions

# Check response time
# Should be < 200ms for simple endpoints
```

**Step 2: Check Application Logs**

```bash
# Search for slow queries
kubectl logs deployment/spartan-hub-backend -n spartan-hub-production | \
  grep "query took" | tail -50

# Check for errors
kubectl logs deployment/spartan-hub-backend -n spartan-hub-production | \
  grep ERROR | tail -20
```

**Step 3: Check Database Performance**

```bash
# Check active queries
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "SELECT * FROM sqlite_stat1 ORDER BY stat DESC LIMIT 10;"

# Check for missing indexes
# Look for full table scans in query plans
```

**Step 4: Check External Dependencies**

```bash
# Test external API latency
time curl https://api.garmin.com/health

# Check Redis latency
kubectl exec deployment/redis-0 -n spartan-hub-production -- \
  redis-cli --latency
```

**Step 5: Profile the Application**

```bash
# Enable profiling (if not already enabled)
curl -X POST https://api.spartan-hub.com/admin/profiling/enable

# Reproduce issue
# Check profiling results
curl https://api.spartan-hub.com/admin/profiling/results
```

---

## 🔒 SECURITY INCIDENTS

### Runbook: Suspected Data Breach

**Trigger:** Security alert or suspicious activity  
**Severity:** Critical  
**Response Time:** Immediate

#### Immediate Actions

**Step 1: Contain the Breach**

```bash
# Revoke all active sessions
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "DELETE FROM sessions;"

# Rotate all API keys
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  npm run secrets:rotate

# Enable enhanced logging
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  npm run logging:enhanced enable
```

**Step 2: Preserve Evidence**

```bash
# Backup logs
kubectl logs deployment/spartan-hub-backend -n spartan-hub-production > breach-logs-$(date +%Y%m%d-%H%M%S).txt

# Backup database
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db ".backup 'breach-evidence-$(date +%Y%m%d-%H%M%S).db'"
```

**Step 3: Notify Stakeholders**

- [ ] Security team notified
- [ ] Legal team notified
- [ ] Executive team briefed
- [ ] PR team prepared (if public disclosure needed)

**Step 4: Investigate**

- Review access logs
- Identify compromised accounts
- Determine scope of breach
- Identify attack vector

**Step 5: Remediate**

- Patch vulnerability
- Reset affected user passwords
- Notify affected users
- File regulatory reports if required

---

**Last Updated:** March 1, 2026  
**Version:** 2.0  
**Maintainer:** DevOps Team  
**Review Cycle:** Quarterly
