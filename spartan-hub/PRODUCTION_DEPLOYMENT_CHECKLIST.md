# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

**Version:** 2.0  
**Date:** March 2, 2026  
**Environment:** Production  
**Risk Level:** Medium

---

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Verification](#pre-deployment-verification)
2. [Infrastructure Checklist](#infrastructure-checklist)
3. [Deployment Steps](#deployment-steps)
4. [Post-Deployment Validation](#post-deployment-validation)
5. [Rollback Procedures](#rollback-procedures)
6. [Sign-Off](#sign-off)

---

## ✅ PRE-DEPLOYMENT VERIFICATION

### Code Quality Checks

- [ ] **All Tests Passing**
  ```bash
  # Run all tests
  npm run test:all
  
  # Expected: 100% passing
  # E2E tests: 85+ tests
  # Unit tests: 450+ tests
  ```

- [ ] **TypeScript Compilation**
  ```bash
  # Frontend
  npm run type-check
  
  # Backend
  cd backend && npm run lint
  
  # Expected: 0 errors
  ```

- [ ] **ESLint Passing**
  ```bash
  npm run lint
  
  # Expected: 0 errors, 0 warnings
  ```

- [ ] **Security Scan Clean**
  ```bash
  # NPM audit
  npm audit --audit-level high
  
  # Snyk scan (if configured)
  snyk test
  
  # Expected: 0 critical vulnerabilities
  ```

- [ ] **No Secrets in Code**
  ```bash
  # Git secrets scan
  git secrets --scan
  
  # TruffleHog scan
  trufflehog git file://.
  
  # Expected: 0 secrets found
  ```

### Documentation Checks

- [ ] **CHANGELOG.md Updated**
  - [ ] All changes documented
  - [ ] Breaking changes highlighted
  - [ ] Migration guide included (if needed)

- [ ] **API Documentation Published**
  - [ ] OpenAPI/Swagger spec updated
  - [ ] Deployed to: https://docs.spartan-hub.com

- [ ] **User Documentation Ready**
  - [ ] User manual published
  - [ ] FAQ updated
  - [ ] Video tutorials recorded (if applicable)

---

## 🏗️ INFRASTRUCTURE CHECKLIST

### Database

- [ ] **PostgreSQL Production Instance**
  ```bash
  # Verify instance is running
  kubectl get statefulset postgres -n spartan-hub-production
  
  # Check version (should be 15+)
  kubectl exec postgres-0 -n spartan-hub-production -- psql --version
  
  # Verify connections
  kubectl exec postgres-0 -n spartan-hub-production -- \
    psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
  ```

- [ ] **Database Migrations Ready**
  ```bash
  # List pending migrations
  cd backend && npm run migrate:list
  
  # Expected: All migrations accounted for
  ```

- [ ] **Backup Configured**
  ```bash
  # Verify backup schedule
  kubectl get cronjob backup-job -n spartan-hub-production
  
  # Test backup creation
  npm run backup:create -- --env=production
  
  # Verify backup in S3
  aws s3 ls s3://spartan-hub-backups/production/ --recursive | tail -5
  ```

- [ ] **Connection Pooling Configured**
  ```bash
  # Verify PgBouncer or similar
  kubectl get deployment pgbouncer -n spartan-hub-production
  
  # Check pool size
  kubectl exec deployment/pgbouncer -n spartan-hub-production -- \
    psql -p 6432 -c "SHOW POOLS;"
  ```

### Caching

- [ ] **Redis Cluster Operational**
  ```bash
  # Verify Redis is running
  kubectl get statefulset redis -n spartan-hub-production
  
  # Test connection
  kubectl exec redis-0 -n spartan-hub-production -- \
    redis-cli ping
  
  # Expected: PONG
  
  # Check memory usage
  kubectl exec redis-0 -n spartan-hub-production -- \
    redis-cli INFO memory | grep used_memory_human
  ```

- [ ] **Cache Warm-up Strategy**
  ```bash
  # Pre-warm critical caches
  curl -X POST https://api.spartan-hub.com/admin/cache/warm \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```

### Load Balancing

- [ ] **Load Balancer Configured**
  ```bash
  # Verify ingress
  kubectl get ingress -n spartan-hub-production
  
  # Check SSL certificates
  kubectl get certificate -n spartan-hub-production
  
  # Verify HTTPS redirect
  curl -I http://spartan-hub.com
  
  # Expected: 301 redirect to HTTPS
  ```

- [ ] **Health Checks Passing**
  ```bash
  # Test health endpoint
  curl -f https://api.spartan-hub.com/health
  
  # Expected: 200 OK with status: "healthy"
  ```

### CDN

- [ ] **CDN Configured for Static Assets**
  ```bash
  # Verify CDN distribution
  # AWS CloudFront or similar
  
  # Test asset loading
  curl -I https://cdn.spartan-hub.com/app.js
  
  # Expected: 200 OK with Cache-Control headers
  ```

- [ ] **Cache Invalidation Working**
  ```bash
  # Test cache invalidation
  curl -X POST https://api.spartan-hub.com/admin/cdn/invalidate \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d '{"paths": ["/app.js", "/styles.css"]}'
  ```

### Monitoring

- [ ] **Prometheus Operational**
  ```bash
  # Check Prometheus status
  kubectl get deployment prometheus -n spartan-hub-production
  
  # Access Prometheus UI
  # http://prometheus.spartan-hub.com:9090
  
  # Verify targets
  curl http://prometheus:9090/api/v1/targets | jq '.data.activeTargets | length'
  ```

- [ ] **Grafana Dashboards Ready**
  ```bash
  # Check Grafana status
  kubectl get deployment grafana -n spartan-hub-production
  
  # Access Grafana UI
  # http://grafana.spartan-hub.com:3000
  
  # Verify dashboards imported
  # Expected: 5+ dashboards (System Overview, API Performance, etc.)
  ```

- [ ] **Alert Rules Configured**
  ```bash
  # List alert rules
  curl http://prometheus:9090/api/v1/rules | jq '.data.groups[].rules[].name'
  
  # Expected alerts:
  # - HighErrorRate
  # - HighResponseTime
  # - ServiceDown
  # - HighCPUUsage
  # - LowDiskSpace
  ```

- [ ] **AlertManager Configured**
  ```bash
  # Verify AlertManager
  kubectl get deployment alertmanager -n spartan-hub-production
  
  # Test alert delivery
  curl -X POST http://alertmanager:9093/api/v1/alerts \
    -H "Content-Type: application/json" \
    -d '[{"labels":{"alertname":"TestAlert","severity":"info"}}]'
  ```

### Security

- [ ] **SSL Certificates Valid**
  ```bash
  # Check certificate expiration
  openssl s_client -connect spartan-hub.com:443 2>/dev/null | \
    openssl x509 -noout -dates
  
  # Expected: Not After > 30 days from now
  ```

- [ ] **Firewall Rules Configured**
  ```bash
  # Verify security groups
  aws ec2 describe-security-groups --group-names spartan-hub-prod-sg
  
  # Expected: Only required ports open (80, 443, 5432 internal)
  ```

- [ ] **Secrets Rotated**
  ```bash
  # Verify secrets in AWS Secrets Manager or similar
  aws secretsmanager list-secrets --filters Key=name,Values=spartan-hub/prod
  
  # Check last rotation date
  # Expected: Rotated within last 90 days
  ```

---

## 🚀 DEPLOYMENT STEPS

### Phase 1: Backend Deployment (30 minutes)

**Step 1.1: Scale Down Old Version**
```bash
# Current replica count
kubectl get deployment spartan-hub-backend -n spartan-hub-production

# Scale down gradually (if blue-green not available)
kubectl scale deployment spartan-hub-backend --replicas=2 -n spartan-hub-production
```

**Step 1.2: Deploy New Backend Version**
```bash
# Deploy with Helm
helm upgrade --install spartan-hub-backend ./scripts/deployment/helm/spartan-hub-backend \
  --namespace spartan-hub-production \
  --set image.tag=v2.0.0 \
  --set replicaCount=5 \
  --wait --timeout=10m

# Monitor rollout
kubectl rollout status deployment/spartan-hub-backend -n spartan-hub-production
```

**Step 1.3: Run Database Migrations**
```bash
# Execute migrations
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  npm run migrate

# Verify migrations
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
  sqlite3 data/spartan_hub.db "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

**Step 1.4: Verify Backend Health**
```bash
# Health check
curl -f https://api.spartan-hub.com/health

# Check logs for errors
kubectl logs deployment/spartan-hub-backend -n spartan-hub-production --tail=100 | grep ERROR

# Expected: 0 errors
```

---

### Phase 2: Frontend Deployment (20 minutes)

**Step 2.1: Build Frontend**
```bash
# Build with production optimizations
npm run build:frontend

# Verify build output
ls -lh dist/

# Expected: bundle size < 300KB (gzipped)
```

**Step 2.2: Deploy to CDN**
```bash
# Upload to S3/CDN
aws s3 sync dist/ s3://spartan-hub-cdn/ \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate CDN cache
aws cloudfront create-invalidation \
  --distribution-id $CDN_DISTRIBUTION_ID \
  --paths "/*"
```

**Step 2.3: Update Frontend Deployment**
```bash
# Deploy with Helm
helm upgrade --install spartan-hub-frontend ./scripts/deployment/helm/spartan-hub-frontend \
  --namespace spartan-hub-frontend \
  --set image.tag=v2.0.0 \
  --wait --timeout=10m

# Monitor rollout
kubectl rollout status deployment/spartan-hub-frontend -n spartan-hub-frontend
```

---

### Phase 3: Validation (30 minutes)

**Step 3.1: Smoke Tests**
```bash
# Run automated smoke tests
npm run test:smoke -- --env=production

# Expected: 100% passing
```

**Step 3.2: Manual Verification**
- [ ] Homepage loads (https://spartan-hub.com)
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] Video form analysis starts
- [ ] Wearable sync works (if connected)
- [ ] API health endpoint returns 200

**Step 3.3: Performance Check**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.spartan-hub.com/health

# Expected:
# - DNS lookup: < 10ms
# - Connect: < 50ms
# - TTFB: < 200ms
# - Total: < 300ms
```

**Step 3.4: Monitor Metrics (15 minutes)**
- [ ] Error rate < 0.1%
- [ ] p95 latency < 500ms
- [ ] All pods healthy
- [ ] No memory leaks
- [ ] No CPU throttling

---

## ✅ POST-DEPLOYMENT VALIDATION

### Immediate (0-1 hours)

- [ ] **All Health Checks Passing**
  ```bash
  # Backend health
  curl -f https://api.spartan-hub.com/health
  
  # Frontend
  curl -f https://spartan-hub.com/
  
  # Database
  kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- \
    sqlite3 data/spartan_hub.db "SELECT 1;"
  ```

- [ ] **Error Rates Normal**
  ```bash
  # Check Grafana dashboard
  # Navigate to: System Overview → Error Rate
  
  # Expected: < 0.1%
  ```

- [ ] **Latency Within Targets**
  ```bash
  # Check Grafana dashboard
  # Navigate to: API Performance → Response Time
  
  # Expected: p95 < 500ms
  ```

### Short-Term (1-24 hours)

- [ ] **User Analytics Normal**
  - [ ] DAU tracking correctly
  - [ ] Session duration normal
  - [ ] No unusual drop-offs

- [ ] **Business Metrics Stable**
  - [ ] Form analysis sessions: normal volume
  - [ ] Wearable syncs: successful
  - [ ] API calls: within expected range

- [ ] **No Critical Bugs Reported**
  - [ ] Check Intercom/support tickets
  - [ ] Check social media mentions
  - [ ] Check error tracking (Sentry, etc.)

### Long-Term (1-7 days)

- [ ] **Retention Metrics**
  - [ ] Day 1 retention: > 60%
  - [ ] Day 7 retention: > 40%

- [ ] **Performance Trends**
  - [ ] Latency stable or improving
  - [ ] Error rate < 0.1%
  - [ ] Uptime > 99.9%

- [ ] **User Feedback**
  - [ ] NPS score: > 50
  - [ ] App store ratings: > 4.5 stars
  - [ ] Support tickets: < 10 critical

---

## 🔄 ROLLBACK PROCEDURES

### Trigger Conditions

Rollback if ANY of the following occur within 24 hours of deployment:

- ❌ Error rate > 1%
- ❌ p95 latency > 2000ms
- ❌ Critical bug affecting > 50% of users
- ❌ Database corruption detected
- ❌ Security vulnerability discovered

### Rollback Steps

**Step 1: Decision to Rollback**
```bash
# Notify team
# Slack: @channel Rolling back production deployment due to [reason]

# Document reason
echo "$(date): Rollback initiated due to [reason]" >> rollback-log.txt
```

**Step 2: Execute Rollback**
```bash
# Backend rollback
helm rollback spartan-hub-backend -n spartan-hub-production

# Frontend rollback
helm rollback spartan-hub-frontend -n spartan-hub-frontend

# Monitor rollout
kubectl rollout status deployment/spartan-hub-backend -n spartan-hub-production
kubectl rollout status deployment/spartan-hub-frontend -n spartan-hub-frontend
```

**Step 3: Verify Rollback**
```bash
# Check versions
kubectl get deployment spartan-hub-backend -n spartan-hub-production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Expected: Previous version tag

# Run smoke tests
npm run test:smoke -- --env=production
```

**Step 4: Post-Rollback Actions**
- [ ] Notify stakeholders
- [ ] Document root cause
- [ ] Schedule post-mortem
- [ ] Create action items
- [ ] Update status page

---

## 📝 SIGN-OFF

### Deployment Team

| Role | Name | Sign-Off | Time |
|------|------|----------|------|
| **Deployment Lead** | | [ ] | |
| **DevOps Engineer** | | [ ] | |
| **Backend Lead** | | [ ] | |
| **Frontend Lead** | | [ ] | |
| **QA Lead** | | [ ] | |
| **Product Owner** | | [ ] | |

### Go/No-Go Decision

**Decision Time:** [Time]

**Vote:**
- [ ] **GO** - All checks passed, proceed with deployment
- [ ] **NO-GO** - Issues found, abort deployment

**Signatures:**

```
Deployment Lead: ___________________ Date: _______
Product Owner:   ___________________ Date: _______
CTO:             ___________________ Date: _______
```

---

## 📞 EMERGENCY CONTACTS

| Role | Name | Phone | Email |
|------|------|-------|-------|
| **On-Call Engineer** | | | |
| **DevOps Lead** | | | |
| **Backend Lead** | | | |
| **Frontend Lead** | | | |
| **Product Owner** | | | |
| **CTO** | | | |

---

**Document Version:** 2.0  
**Last Updated:** March 2, 2026  
**Next Review:** After each production deployment  
**Owner:** DevOps Team
