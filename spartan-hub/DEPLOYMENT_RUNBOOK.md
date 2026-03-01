# Deployment Runbook - Spartan Hub 2.0

**Version:** 2.0  
**Last Updated:** March 1, 2026  
**Status:** Production Ready  
**Classification:** Operational Document

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Staging Deployment](#staging-deployment)
4. [Production Deployment](#production-deployment)
5. [Blue-Green Deployment Procedure](#blue-green-deployment-procedure)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Emergency Procedures](#emergency-procedures)
9. [Deployment Calendar](#deployment-calendar)

---

## Overview

This runbook provides step-by-step procedures for deploying Spartan Hub 2.0 to staging and production environments. Follow these procedures carefully to ensure successful deployments.

### Deployment Schedule

| Environment | Day | Time (UTC) | Frequency |
|-------------|-----|------------|-----------|
| Staging | Tuesday, Thursday | 14:00 | Twice weekly |
| Production | Wednesday | 10:00 | Weekly (after staging validation) |
| Emergency | Any | Any | As needed (approval required) |

### Deployment Team Roles

| Role | Responsibility | Contact |
|------|----------------|---------|
| Deployment Lead | Overall coordination | tech-lead@spartan-hub.com |
| DevOps Engineer | Infrastructure changes | devops@spartan-hub.com |
| QA Engineer | Verification testing | qa@spartan-hub.com |
| On-Call Engineer | Emergency response | oncall@spartan-hub.com |

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] All tests passing (unit, integration, E2E)
- [ ] Code coverage >= 80%
- [ ] No critical security vulnerabilities
- [ ] Code review completed and approved
- [ ] CHANGELOG updated
- [ ] Version number bumped

### Infrastructure Readiness

- [ ] Kubernetes cluster healthy
- [ ] Sufficient resources available
- [ ] Database backups completed
- [ ] Monitoring dashboards accessible
- [ ] Alert rules configured
- [ ] Rollback procedure tested

### Team Readiness

- [ ] Deployment team available
- [ ] Stakeholders notified
- [ ] Support team briefed
- [ ] Communication channels open

### Pre-Flight Commands

```bash
# Check cluster health
kubectl get nodes
kubectl get pods -n spartan-hub
kubectl get events -n spartan-hub --sort-by='.lastTimestamp'

# Check resource availability
kubectl top nodes
kubectl describe quota -n spartan-hub

# Verify database backup
aws s3 ls s3://spartan-hub-backups/postgres/ | tail -5

# Check monitoring
curl -f https://grafana.spartan-hub.com/api/health
```

---

## Staging Deployment

### Automated Deployment (Recommended)

**Trigger:** Push to `develop` branch

```bash
# GitHub Actions will automatically:
# 1. Run all tests
# 2. Build Docker images
# 3. Push to container registry
# 4. Deploy to staging
# 5. Run smoke tests
```

### Manual Staging Deployment

#### Step 1: Prepare Deployment

```bash
# Set environment variables
export KUBECONFIG=~/.kube/staging-config
export NAMESPACE=spartan-hub-staging
export VERSION=$(git rev-parse --short HEAD)
export IMAGE_TAG="ghcr.io/spartan-hub/backend:$VERSION"

# Verify context
kubectl config current-context  # Should show staging
```

#### Step 2: Deploy Backend

```bash
# Update deployment image
kubectl set image deployment/backend \
  backend=$IMAGE_TAG \
  -n $NAMESPACE

# Watch rollout status
kubectl rollout status deployment/backend -n $NAMESPACE --timeout=300s
```

#### Step 3: Deploy Frontend

```bash
kubectl set image deployment/frontend \
  frontend=ghcr.io/spartan-hub/frontend:$VERSION \
  -n $NAMESPACE

kubectl rollout status deployment/frontend -n $NAMESPACE --timeout=300s
```

#### Step 4: Run Database Migrations

```bash
kubectl exec -n $NAMESPACE deployment/backend -- npm run migrate
```

#### Step 5: Smoke Tests

```bash
# Run smoke test script
./scripts/smoke-tests.sh https://staging.spartan-hub.com

# Or manually verify
curl -f https://staging.spartan-hub.com/api/health
curl -f https://staging.spartan-hub.com/
```

#### Step 6: Verify Deployment

```bash
# Check pods
kubectl get pods -n $NAMESPACE

# Check services
kubectl get svc -n $NAMESPACE

# Check ingress
kubectl get ingress -n $NAMESPACE

# View recent logs
kubectl logs -n $NAMESPACE deployment/backend --tail=50
```

---

## Production Deployment

### Prerequisites

- [ ] Staging deployment successful (24+ hours validation)
- [ ] No critical bugs reported in staging
- [ ] All stakeholders approved
- [ ] Deployment window confirmed
- [ ] On-call engineer available

### Production Deployment Procedure

#### Step 1: Pre-Deployment Backup

```bash
# Create database backup
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  pg_dump -U spartan_admin spartan_hub_prod | gzip > backup-pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz

# Upload backup to S3
aws s3 cp backup-pre-deploy-*.sql.gz s3://spartan-hub-backups/pre-deploy/

# Export current deployment state
kubectl get deployment -n spartan-hub -o yaml > deployment-backup-$(date +%Y%m%d).yaml
```

#### Step 2: Create Production Release

```bash
# Tag the release
git tag -a v$(date +%Y.%m.%d)-prod -m "Production release $(date)"
git push origin v$(date +%Y.%m.%d)-prod

# Create GitHub release
gh release create v$(date +%Y.%m.%d)-prod \
  --title "Production Release $(date)" \
  --notes "Automated production deployment"
```

#### Step 3: Deploy Using Helm (Recommended)

```bash
# Set production variables
export NAMESPACE=spartan-hub-production
export VERSION=$(git rev-parse --short HEAD)

# Deploy with Helm
helm upgrade spartan-hub-production ./helm/spartan-hub \
  --namespace $NAMESPACE \
  --set image.tag=$VERSION \
  --set replicaCount=5 \
  --set autoscaling.minReplicas=5 \
  --set autoscaling.maxReplicas=15 \
  --wait \
  --timeout 600s \
  --atomic

# Verify deployment
helm status spartan-hub-production -n $NAMESPACE
```

#### Step 4: Deploy Using kubectl (Alternative)

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/namespaces/01-namespace.yml
kubectl apply -f k8s/configmaps/
kubectl apply -f k8s/secrets/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/ingress/

# Update images
kubectl set image deployment/backend \
  backend=ghcr.io/spartan-hub/backend:$VERSION \
  -n spartan-hub

kubectl set image deployment/frontend \
  frontend=ghcr.io/spartan-hub/frontend:$VERSION \
  -n spartan-hub

# Wait for rollout
kubectl rollout status deployment/backend -n spartan-hub --timeout=600s
kubectl rollout status deployment/frontend -n spartan-hub --timeout=600s
```

#### Step 5: Run Database Migrations

```bash
# Run migrations
kubectl exec -n spartan-hub deployment/backend -- npm run migrate

# Verify migration status
kubectl exec -n spartan-hub deployment/backend -- npm run migrate:status
```

#### Step 6: Health Verification

```bash
# Check deployment status
kubectl get pods -n spartan-hub
kubectl get svc -n spartan-hub
kubectl get ingress -n spartan-hub

# Run health checks
./scripts/health-check.sh production

# Verify metrics endpoint
kubectl exec -n spartan-hub deployment/backend -- curl -s http://localhost:3001/health
```

---

## Blue-Green Deployment Procedure

### Overview

Blue-green deployment minimizes downtime and risk by running two identical production environments. Only one environment (Blue or Green) receives production traffic at any time.

### Blue-Green Architecture

```
                    ┌─────────────────┐
                    │   Ingress       │
                    │   (Traffic      │
                    │    Switch)      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   Blue          │           │   Green         │
    │   (Active)      │           │   (Standby)     │
    │   v1.0.0        │           │   v1.1.0        │
    │   5 replicas    │           │   5 replicas    │
    └─────────────────┘           └─────────────────┘
```

### Deployment Steps

#### Step 1: Deploy to Green Environment

```bash
# Deploy new version to Green
kubectl apply -f k8s/deployment-green.yml

# Wait for Green to be ready
kubectl rollout status deployment/backend-green -n spartan-hub --timeout=600s

# Run health checks on Green
kubectl exec -n spartan-hub deployment/backend-green -- curl -s http://localhost:3001/health
```

#### Step 2: Verify Green Environment

```bash
# Run smoke tests against Green
./scripts/smoke-tests.sh http://backend-green:3001

# Check metrics
kubectl exec -n spartan-hub deployment/backend-green -- curl -s http://localhost:3001/metrics

# Verify database connectivity
kubectl exec -n spartan-hub deployment/backend-green -- npm run db:check
```

#### Step 3: Switch Traffic to Green

```bash
# Update ingress to point to Green
kubectl patch ingress spartan-hub -n spartan-hub \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "backend-green"}]'

# Verify traffic switch
kubectl get ingress spartan-hub -n spartan-hub

# Monitor error rates
kubectl logs -n spartan-hub deployment/backend-green --tail=100 | grep -i error
```

#### Step 4: Monitor and Validate

```bash
# Monitor for 15 minutes
watch -n 30 'kubectl get pods -n spartan-hub'

# Check Grafana dashboards
# URL: https://grafana.spartan-hub.com

# Check error rates
curl -s https://prometheus.spartan-hub.com/api/v1/query?query=rate(http_requests_total{status=~"5.."}[5m])
```

#### Step 5: Scale Down Blue

```bash
# After 1 hour of successful operation, scale down Blue
kubectl scale deployment/backend-blue --replicas=0 -n spartan-hub

# Keep Blue for quick rollback if needed
```

---

## Post-Deployment Verification

### Automated Verification Script

```bash
#!/bin/bash
# scripts/post-deploy-verify.sh

set -e

ENVIRONMENT=${1:-production}
BASE_URL=${2:-https://spartan-hub.com}

echo "=== Post-Deployment Verification ==="
echo "Environment: $ENVIRONMENT"
echo "Base URL: $BASE_URL"
echo ""

# 1. Health Check
echo "[1/8] Checking health endpoint..."
curl -f "$BASE_URL/api/health" || exit 1
echo "✓ Health check passed"

# 2. API Authentication
echo "[2/8] Testing authentication..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@spartan-hub.com","password":"test"}' | jq -r '.token')
[ -n "$TOKEN" ] && echo "✓ Authentication working" || exit 1

# 3. Database Connectivity
echo "[3/8] Testing database..."
curl -f -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/users/me" || exit 1
echo "✓ Database connectivity OK"

# 4. Cache Functionality
echo "[4/8] Testing cache..."
curl -f -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/activities" || exit 1
echo "✓ Cache working"

# 5. AI Service
echo "[5/8] Testing AI service..."
curl -f "$BASE_URL/api/ai/health" || echo "⚠ AI service unavailable (non-critical)"

# 6. Static Assets
echo "[6/8] Testing static assets..."
curl -f "$BASE_URL/assets/logo.png" || exit 1
echo "✓ Static assets OK"

# 7. Response Time Check
echo "[7/8] Checking response times..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/api/health")
if (( $(echo "$RESPONSE_TIME < 1" | bc -l) )); then
  echo "✓ Response time OK (${RESPONSE_TIME}s)"
else
  echo "⚠ Response time slow (${RESPONSE_TIME}s)"
fi

# 8. Error Rate Check
echo "[8/8] Checking error rates..."
ERROR_COUNT=$(kubectl logs -n spartan-hub deployment/backend --since=5m | grep -c "ERROR" || true)
if [ "$ERROR_COUNT" -lt 10 ]; then
  echo "✓ Error rate acceptable ($ERROR_COUNT errors in 5m)"
else
  echo "⚠ High error rate ($ERROR_COUNT errors in 5m)"
fi

echo ""
echo "=== Verification Complete ==="
echo "All critical checks passed!"
```

### Manual Verification Checklist

- [ ] Homepage loads correctly
- [ ] User login works
- [ ] Dashboard displays data
- [ ] Activities can be logged
- [ ] Challenges are accessible
- [ ] Community features work
- [ ] AI recommendations generate
- [ ] Mobile responsive design works
- [ ] No console errors

### Monitoring Verification

```bash
# Check Grafana dashboards
# 1. Open https://grafana.spartan-hub.com
# 2. Verify "Spartan Hub Performance" dashboard
# 3. Check all panels show data
# 4. Verify no alerts firing

# Check Prometheus targets
curl -s https://prometheus.spartan-hub.com/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Check for new errors
kubectl logs -n spartan-hub deployment/backend --since=10m | grep -i "error\|exception" | tail -20
```

---

## Rollback Procedure

### When to Rollback

Rollback should be initiated when:
- Critical bug discovered in production
- Error rate exceeds 5%
- Service unavailable for > 5 minutes
- Data corruption detected
- Security vulnerability discovered

### Quick Rollback (Helm)

```bash
# Rollback to previous release
helm rollback spartan-hub-production -n spartan-hub-production

# Rollback to specific revision
helm history spartan-hub-production -n spartan-hub-production
helm rollback spartan-hub-production REVISION_NUMBER -n spartan-hub-production

# Verify rollback
helm status spartan-hub-production -n spartan-hub-production
```

### Rollback Using kubectl

```bash
# Rollback deployment
kubectl rollout undo deployment/backend -n spartan-hub
kubectl rollout undo deployment/frontend -n spartan-hub

# Rollback to specific revision
kubectl rollout undo deployment/backend -n spartan-hub --to-revision=2

# Monitor rollback
kubectl rollout status deployment/backend -n spartan-hub
```

### Blue-Green Rollback

```bash
# Switch traffic back to Blue
kubectl patch ingress spartan-hub -n spartan-hub \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "backend-blue"}]'

# Verify traffic switch
kubectl get ingress spartan-hub -n spartan-hub

# Scale down problematic Green
kubectl scale deployment/backend-green --replicas=0 -n spartan-hub
```

### Database Rollback

```bash
# If migration caused issues, restore from backup
# 1. Download backup
aws s3 cp s3://spartan-hub-backups/pre-deploy/backup-pre-deploy-*.sql.gz .

# 2. Decompress
gunzip backup-pre-deploy-*.sql.gz

# 3. Restore
kubectl exec -i -n spartan-hub deployment/postgres-primary -- \
  psql -U spartan_admin spartan_hub_prod < backup-pre-deploy-*.sql

# 4. Verify restoration
kubectl exec -n spartan-hub deployment/backend -- npm run db:check
```

### Post-Rollback Verification

```bash
# Run verification script
./scripts/post-deploy-verify.sh production https://spartan-hub.com

# Check error rates
kubectl logs -n spartan-hub deployment/backend --since=10m | grep -c "ERROR"

# Notify team
echo "Rollback completed successfully" | slack-cli -d '#deployments'
```

---

## Emergency Procedures

### Service Outage

**Symptoms:** Service completely unavailable

**Immediate Actions:**
```bash
# 1. Check pod status
kubectl get pods -n spartan-hub

# 2. Check recent events
kubectl get events -n spartan-hub --sort-by='.lastTimestamp'

# 3. Check logs
kubectl logs -n spartan-hub deployment/backend --tail=100

# 4. If pods crashed, restart
kubectl rollout restart deployment/backend -n spartan-hub
kubectl rollout restart deployment/frontend -n spartan-hub

# 5. If database issue, check PostgreSQL
kubectl get pods -n spartan-hub -l app=postgres
kubectl logs -n spartan-hub deployment/postgres-primary
```

### Database Emergency

**Symptoms:** Database connections failing, queries timing out

**Immediate Actions:**
```bash
# 1. Check database pod
kubectl get pods -n spartan-hub -l app=postgres

# 2. Check connections
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  psql -U spartan_admin -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Kill long-running queries
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  psql -U spartan_admin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND query_start < now() - interval '5 minutes';"

# 4. If failover needed
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  psql -U spartan_admin -c "SELECT pg_switch_wal();"
```

### High Error Rate

**Symptoms:** Error rate > 5%

**Immediate Actions:**
```bash
# 1. Check error logs
kubectl logs -n spartan-hub deployment/backend --since=10m | grep -i error | tail -50

# 2. Check recent deployments
kubectl rollout history deployment/backend -n spartan-hub

# 3. If recent deployment, consider rollback
helm rollback spartan-hub-production -n spartan-hub-production

# 4. Scale up if load-related
kubectl scale deployment/backend --replicas=10 -n spartan-hub
```

### Security Incident

**Symptoms:** Suspicious activity, unauthorized access

**Immediate Actions:**
1. **DO NOT** restart pods (preserve evidence)
2. Notify security team immediately
3. Enable enhanced logging
4. Consider isolating affected pods
5. Follow security incident response plan

```bash
# Enable debug logging
kubectl set env deployment/backend LOG_LEVEL=debug -n spartan-hub

# Export logs for forensics
kubectl logs -n spartan-hub deployment/backend --since=1h > incident-logs-$(date +%Y%m%d-%H%M%S).txt
```

---

## Deployment Calendar

### Regular Deployment Schedule

| Week | Monday | Tuesday | Wednesday | Thursday | Friday |
|------|--------|---------|-----------|----------|--------|
| Week 1 | Planning | Staging Deploy | **Prod Deploy** | Staging Deploy | Freeze |
| Week 2 | Planning | Staging Deploy | **Prod Deploy** | Staging Deploy | Freeze |
| Week 3 | Planning | Staging Deploy | **Prod Deploy** | Staging Deploy | Freeze |
| Week 4 | Planning | Staging Deploy | **Prod Deploy** | Staging Deploy | Freeze |

### Deployment Freeze Periods

| Period | Reason | Exceptions |
|--------|--------|------------|
| Weekends | Standard freeze | Critical security fixes |
| Holidays | Business continuity | Critical security fixes |
| Month-end | Financial reporting | Pre-approved changes |
| Major events | Business critical | Emergency only |

### Change Advisory Board (CAB)

**Meeting Schedule:** Every Monday at 15:00 UTC

**Required for:**
- Production deployments
- Database schema changes
- Infrastructure changes
- Security patches

**CAB Members:**
- Tech Lead (Chair)
- DevOps Lead
- Security Lead
- Product Owner

---

## Support

For deployment support:
- **Documentation:** This runbook
- **Slack Channel:** #deployments
- **Emergency:** Contact on-call engineer via PagerDuty
- **Post-Mortems:** #incident-review

---

*Last Updated: March 1, 2026*  
*Spartan Hub 2.0 - Deployment Runbook*
