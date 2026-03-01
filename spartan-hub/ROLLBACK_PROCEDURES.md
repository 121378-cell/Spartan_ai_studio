# Rollback Procedures - Spartan Hub 2.0

**Version:** 2.0  
**Last Updated:** March 1, 2026  
**Status:** Production Ready  
**Classification:** Critical Operational Document

---

## Table of Contents

1. [Overview](#overview)
2. [Rollback Decision Matrix](#rollback-decision-matrix)
3. [Rollback Strategies](#rollback-strategies)
4. [Helm Rollback Procedures](#helm-rollback-procedures)
5. [Kubernetes Rollback Procedures](#kubernetes-rollback-procedures)
6. [Database Rollback](#database-rollback)
7. [Blue-Green Rollback](#blue-green-rollback)
8. [Emergency Rollback](#emergency-rollback)
9. [Post-Rollback Verification](#post-rollback-verification)
10. [Rollback Testing](#rollback-testing)

---

## Overview

This document provides comprehensive rollback procedures for Spartan Hub 2.0. Rollbacks should be executed when deployments cause critical issues that cannot be quickly fixed with a forward fix.

### Rollback Principles

1. **Speed First:** Minimize customer impact
2. **Preserve Data:** Ensure data integrity during rollback
3. **Document Everything:** Record all actions taken
4. **Communicate:** Keep stakeholders informed
5. **Verify:** Confirm rollback success

### Rollback Time Targets

| Scenario | Target Time | Maximum Time |
|----------|-------------|--------------|
| Critical Service Outage | 5 minutes | 10 minutes |
| High Error Rate | 10 minutes | 15 minutes |
| Data Corruption | 15 minutes | 30 minutes |
| Security Incident | Immediate | 5 minutes |

---

## Rollback Decision Matrix

### When to Rollback

| Issue | Severity | Action | Timeframe |
|-------|----------|--------|-----------|
| Service completely down | P1 | Immediate rollback | < 5 min |
| Error rate > 10% | P1 | Immediate rollback | < 5 min |
| Error rate 5-10% | P2 | Rollback if no fix in 15 min | < 20 min |
| Data corruption detected | P1 | Immediate rollback | < 5 min |
| Security vulnerability | P1 | Immediate rollback | < 5 min |
| Performance degradation > 50% | P2 | Rollback if no fix in 30 min | < 45 min |
| Minor bugs | P3 | Forward fix | Next deployment |
| UI issues (non-critical) | P4 | Forward fix | Next deployment |

### Decision Flow

```
┌─────────────────┐
│ Issue Detected  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Is Service     │────▶│  Forward Fix    │
│  Completely     │ No  │  Possible?      │
│  Down?          │     └────────┬────────┘
└────────┬────────┘              │
         │ Yes                   │ Yes + Quick
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Immediate      │     │  Apply Fix      │
│  Rollback       │     │  & Monitor      │
└─────────────────┘     └─────────────────┘
                               │
                               │ No or Slow
                               ▼
                        ┌─────────────────┐
                        │  Rollback       │
                        │  Immediately    │
                        └─────────────────┘
```

---

## Rollback Strategies

### Strategy Comparison

| Strategy | Speed | Complexity | Risk | Use Case |
|----------|-------|------------|------|----------|
| Helm Rollback | Fast | Low | Low | Standard deployments |
| Kubernetes Rollout Undo | Fast | Low | Low | kubectl deployments |
| Blue-Green Switch | Fastest | Medium | Lowest | Zero-downtime required |
| Database Restore | Slow | High | High | Data corruption |
| Emergency Shutdown | Immediate | Low | Medium | Security incidents |

### Strategy Selection

```
                    ┌─────────────────────────────────────┐
                    │         What was deployed?          │
                    └─────────────────┬───────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │   Application   │     │    Database     │     │  Infrastructure │
    │   Code Only     │     │    Migration    │     │     Changes     │
    └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
             │                       │                       │
             ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │  Helm Rollback  │     │  DB Restore +   │     │  Terraform      │
    │  or kubectl     │     │  Helm Rollback  │     │  Apply (prev)   │
    │  Rollout Undo   │     │                 │     │                 │
    └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Helm Rollback Procedures

### Standard Helm Rollback

**Use Case:** Most application deployments

```bash
# 1. Check current release status
helm status spartan-hub-production -n spartan-hub-production

# 2. View release history
helm history spartan-hub-production -n spartan-hub-production

# Example output:
# REVISION  UPDATED                   STATUS      CHART              APP VERSION  DESCRIPTION
# 1         Mon Jan 15 10:00:00 2026  superseded  spartan-hub-1.0.0  1.0.0        Install complete
# 2         Wed Jan 17 14:00:00 2026  deployed    spartan-hub-1.1.0  1.1.0        Upgrade complete

# 3. Rollback to previous revision
helm rollback spartan-hub-production -n spartan-hub-production

# 4. Or rollback to specific revision
helm rollback spartan-hub-production 1 -n spartan-hub-production

# 5. Verify rollback
helm status spartan-hub-production -n spartan-hub-production

# 6. Check pods are running
kubectl get pods -n spartan-hub-production
```

### Helm Rollback with Dry Run

```bash
# Preview rollback without executing
helm rollback spartan-hub-production --dry-run -n spartan-hub-production

# See what changes will be made
helm get manifest spartan-hub-production -n spartan-hub-production > current.yaml
helm rollback spartan-hub-production --dry-run --output-yaml -n spartan-hub-production > rollback.yaml
diff current.yaml rollback.yaml
```

### Helm Rollback Script

```bash
#!/bin/bash
# scripts/rollback-helm.sh

set -e

RELEASE_NAME=${1:-spartan-hub-production}
NAMESPACE=${2:-spartan-hub-production}
REVISION=${3:-}

echo "=== Helm Rollback ==="
echo "Release: $RELEASE_NAME"
echo "Namespace: $NAMESPACE"

# Check current status
echo ""
echo "[1/5] Checking current release status..."
helm status $RELEASE_NAME -n $NAMESPACE

# Show history
echo ""
echo "[2/5] Release history:"
helm history $RELEASE_NAME -n $NAMESPACE

if [ -n "$REVISION" ]; then
    echo ""
    echo "[3/5] Rolling back to revision $REVISION..."
    helm rollback $RELEASE_NAME $REVISION -n $NAMESPACE
else
    echo ""
    echo "[3/5] Rolling back to previous revision..."
    helm rollback $RELEASE_NAME -n $NAMESPACE
fi

echo ""
echo "[4/5] Verifying rollback..."
helm status $RELEASE_NAME -n $NAMESPACE

echo ""
echo "[5/5] Checking pods..."
kubectl get pods -n $NAMESPACE

echo ""
echo "=== Rollback Complete ==="
```

---

## Kubernetes Rollback Procedures

### Standard kubectl Rollback

**Use Case:** Direct kubectl deployments

```bash
# 1. Check rollout history
kubectl rollout history deployment/backend -n spartan-hub

# Example output:
# deployment.apps/backend
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Update to v1.1.0
# 3         Update to v1.2.0

# 2. Rollback to previous revision
kubectl rollout undo deployment/backend -n spartan-hub

# 3. Rollback to specific revision
kubectl rollout undo deployment/backend -n spartan-hub --to-revision=2

# 4. Monitor rollback progress
kubectl rollout status deployment/backend -n spartan-hub --timeout=300s

# 5. Verify rollback
kubectl get deployment backend -n spartan-hub -o yaml | grep image:
```

### Rollback Multiple Deployments

```bash
# Rollback all deployments in namespace
for deploy in $(kubectl get deployments -n spartan-hub -o jsonpath='{.items[*].metadata.name}'); do
    echo "Rolling back $deploy..."
    kubectl rollout undo deployment/$deploy -n spartan-hub
done

# Wait for all rollbacks
kubectl rollout status deployment/backend -n spartan-hub
kubectl rollout status deployment/frontend -n spartan-hub
kubectl rollout status deployment/ai-microservice -n spartan-hub
```

### kubectl Rollback Script

```bash
#!/bin/bash
# scripts/rollback-kubectl.sh

set -e

NAMESPACE=${1:-spartan-hub}
DEPLOYMENTS=${2:-"backend frontend ai-microservice"}
REVISION=${3:-}

echo "=== Kubernetes Rollback ==="
echo "Namespace: $NAMESPACE"
echo "Deployments: $DEPLOYMENTS"

for deploy in $DEPLOYMENTS; do
    echo ""
    echo "----------------------------------------"
    echo "Rolling back: $deploy"
    echo "----------------------------------------"
    
    # Show history
    echo "History:"
    kubectl rollout history deployment/$deploy -n $NAMESPACE
    
    if [ -n "$REVISION" ]; then
        echo "Rolling back to revision $REVISION..."
        kubectl rollout undo deployment/$deploy -n $NAMESPACE --to-revision=$REVISION
    else
        echo "Rolling back to previous revision..."
        kubectl rollout undo deployment/$deploy -n $NAMESPACE
    fi
    
    # Wait for rollout
    echo "Waiting for rollout to complete..."
    kubectl rollout status deployment/$deploy -n $NAMESPACE --timeout=300s
done

echo ""
echo "=== All Rollbacks Complete ==="
kubectl get deployments -n $NAMESPACE
```

---

## Database Rollback

### When Database Rollback is Needed

- Schema migration caused errors
- Data corruption during migration
- Incompatible data changes
- Migration script bugs

### Pre-Rollback Database Backup

```bash
# ALWAYS backup before rollback
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create backup
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  pg_dump -U spartan_admin spartan_hub_prod | gzip > backup-pre-rollback-$TIMESTAMP.sql.gz

# Upload to S3
aws s3 cp backup-pre-rollback-$TIMESTAMP.sql.gz \
  s3://spartan-hub-backups/pre-rollback/

echo "Backup created: backup-pre-rollback-$TIMESTAMP.sql.gz"
```

### Rollback Migration

```bash
# If using a migration tool with rollback support
kubectl exec -n spartan-hub deployment/backend -- npm run migrate:rollback

# Check migration status
kubectl exec -n spartan-hub deployment/backend -- npm run migrate:status
```

### Full Database Restore

```bash
# 1. Find the backup to restore
aws s3 ls s3://spartan-hub-backups/postgres/ | grep -E "^[0-9]" | tail -10

# 2. Download backup
aws s3 cp s3://spartan-hub-backups/postgres/backup-YYYYMMDD-HHMMSS.sql.gz .

# 3. Decompress
gunzip backup-YYYYMMDD-HHMMSS.sql.gz

# 4. Scale down application to prevent writes
kubectl scale deployment/backend --replicas=0 -n spartan-hub
kubectl scale deployment/frontend --replicas=0 -n spartan-hub

# 5. Restore database
kubectl exec -i -n spartan-hub deployment/postgres-primary -- \
  psql -U spartan_admin spartan_hub_prod < backup-YYYYMMDD-HHMMSS.sql

# 6. Verify restoration
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  psql -U spartan_admin -c "SELECT COUNT(*) FROM users;"

# 7. Scale application back up
kubectl scale deployment/backend --replicas=5 -n spartan-hub
kubectl scale deployment/frontend --replicas=2 -n spartan-hub
```

### Database Rollback Script

```bash
#!/bin/bash
# scripts/rollback-database.sh

set -e

BACKUP_FILE=${1:-}
NAMESPACE=${2:-spartan-hub}

if [ -z "$BACKUP_FILE" ]; then
    echo "Error: Backup file required"
    echo "Usage: $0 <backup-file.sql.gz> [namespace]"
    exit 1
fi

echo "=== Database Rollback ==="
echo "Backup file: $BACKUP_FILE"
echo "Namespace: $NAMESPACE"

# Confirm
read -p "This will DESTROY current database data. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 1
fi

# Scale down application
echo "[1/6] Scaling down application..."
kubectl scale deployment/backend --replicas=0 -n $NAMESPACE
kubectl scale deployment/frontend --replicas=0 -n $NAMESPACE

# Wait for pods to terminate
sleep 10

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "[2/6] Decompressing backup..."
    gunzip -k $BACKUP_FILE
    BACKUP_FILE=${BACKUP_FILE%.gz}
fi

# Restore
echo "[3/6] Restoring database..."
kubectl exec -i -n $NAMESPACE deployment/postgres-primary -- \
  psql -U spartan_admin spartan_hub_prod < $BACKUP_FILE

# Verify
echo "[4/6] Verifying restoration..."
kubectl exec -n $NAMESPACE deployment/postgres-primary -- \
  psql -U spartan_admin -c "SELECT COUNT(*) as user_count FROM users;"

# Run migrations
echo "[5/6] Running migrations..."
kubectl exec -n $NAMESPACE deployment/backend -- npm run migrate

# Scale up
echo "[6/6] Scaling up application..."
kubectl scale deployment/backend --replicas=5 -n $NAMESPACE
kubectl scale deployment/frontend --replicas=2 -n $NAMESPACE

echo ""
echo "=== Database Rollback Complete ==="
```

---

## Blue-Green Rollback

### Immediate Traffic Switch

**Use Case:** Zero-downtime rollback

```bash
# Current state: Green is active (problematic), Blue is standby (known good)

# 1. Switch traffic back to Blue
kubectl patch ingress spartan-hub -n spartan-hub \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "backend-blue"}]'

# 2. Verify traffic switch
kubectl get ingress spartan-hub -n spartan-hub

# 3. Check Blue health
kubectl exec -n spartan-hub deployment/backend-blue -- curl -s http://localhost:3001/health

# 4. Monitor error rates
kubectl logs -n spartan-hub deployment/backend-blue --tail=100 | grep -c "ERROR"
```

### Blue-Green Rollback Script

```bash
#!/bin/bash
# scripts/rollback-blue-green.sh

set -e

NAMESPACE=${1:-spartan-hub}
ACTIVE_COLOR=${2:-green}  # Current active (problematic)
STANDBY_COLOR=${3:-blue}  # Target (known good)

echo "=== Blue-Green Rollback ==="
echo "Switching from $ACTIVE_COLOR to $STANDBY_COLOR"

# Verify standby is healthy
echo "[1/4] Verifying $STANDBY_COLOR health..."
HEALTH=$(kubectl exec -n $NAMESPACE deployment/backend-$STANDBY_COLOR -- \
  curl -s http://localhost:3001/health | jq -r '.status')

if [ "$HEALTH" != "ok" ]; then
    echo "ERROR: $STANDBY_COLOR is not healthy!"
    exit 1
fi
echo "✓ $STANDBY_COLOR is healthy"

# Switch traffic
echo "[2/4] Switching traffic to $STANDBY_COLOR..."
kubectl patch ingress spartan-hub -n $NAMESPACE \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "backend-'$STANDBY_COLOR'"}]'

# Verify switch
echo "[3/4] Verifying traffic switch..."
sleep 5
CURRENT_SERVICE=$(kubectl get ingress spartan-hub -n $NAMESPACE -o jsonpath='{.spec.rules[0].http.paths[0].backend.service.name}')
if [ "$CURRENT_SERVICE" == "backend-$STANDBY_COLOR" ]; then
    echo "✓ Traffic switched to backend-$STANDBY_COLOR"
else
    echo "ERROR: Traffic switch failed!"
    exit 1
fi

# Scale down problematic deployment
echo "[4/4] Scaling down problematic $ACTIVE_COLOR..."
kubectl scale deployment/backend-$ACTIVE_COLOR --replicas=0 -n $NAMESPACE

echo ""
echo "=== Rollback Complete ==="
echo "Traffic is now routed to $STANDBY_COLOR"
```

---

## Emergency Rollback

### Emergency Rollback Procedure

**Use Case:** Critical incidents requiring immediate action

```bash
#!/bin/bash
# scripts/emergency-rollback.sh

set -e

echo "=============================================="
echo "         EMERGENCY ROLLBACK INITIATED         "
echo "=============================================="
echo ""
echo "Time: $(date)"
echo "User: $(whoami)"
echo ""

# Notify team
echo "[ALERT] Notifying team..."
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{
    "channel": "#incidents",
    "username": "Emergency Rollback",
    "text": "🚨 EMERGENCY ROLLBACK INITIATED",
    "attachments": [{
      "color": "danger",
      "fields": [
        {"title": "Time", "value": "'$(date)'", "short": true},
        {"title": "User", "value": "'$(whoami)'", "short": true}
      ]
    }]
  }'

# Immediate rollback
echo "[1/3] Executing immediate rollback..."
helm rollback spartan-hub-production -n spartan-hub-production --wait

# Scale up if needed
echo "[2/3] Ensuring minimum replicas..."
kubectl scale deployment/backend --replicas=5 -n spartan-hub-production

# Verify
echo "[3/3] Verifying service health..."
for i in {1..5}; do
    HEALTH=$(kubectl exec -n spartan-hub-production deployment/backend -- \
      curl -s http://localhost:3001/health | jq -r '.status' || echo "failed")
    if [ "$HEALTH" == "ok" ]; then
        echo "✓ Service healthy"
        break
    fi
    echo "Waiting for service... ($i/5)"
    sleep 5
done

echo ""
echo "=============================================="
echo "         EMERGENCY ROLLBACK COMPLETE          "
echo "=============================================="

# Post-rollback notification
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{
    "channel": "#incidents",
    "username": "Emergency Rollback",
    "text": "✅ EMERGENCY ROLLBACK COMPLETE",
    "attachments": [{"color": "good"}]
  }'
```

### Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| On-Call Engineer | PagerDuty | Immediate |
| DevOps Lead | +1-XXX-XXX-XXXX | 5 minutes |
| Tech Lead | +1-XXX-XXX-XXXX | 10 minutes |
| CTO | +1-XXX-XXX-XXXX | 15 minutes |

---

## Post-Rollback Verification

### Verification Checklist

- [ ] Service health endpoint returns OK
- [ ] Error rate returned to normal (< 1%)
- [ ] Response times within SLA
- [ ] Database connectivity working
- [ ] Cache functioning
- [ ] All pods running
- [ ] No new errors in logs
- [ ] Monitoring dashboards normal
- [ ] No alerts firing
- [ ] User-facing functionality working

### Automated Verification

```bash
#!/bin/bash
# scripts/verify-rollback.sh

set -e

NAMESPACE=${1:-spartan-hub-production}
BASE_URL=${2:-https://spartan-hub.com}

echo "=== Post-Rollback Verification ==="

# Health check
echo "[1/6] Health check..."
curl -f $BASE_URL/api/health || exit 1

# Error rate
echo "[2/6] Checking error rate..."
ERROR_RATE=$(kubectl logs -n $NAMESPACE deployment/backend --since=5m | grep -c "ERROR" || echo "0")
if [ "$ERROR_RATE" -gt 50 ]; then
    echo "⚠ High error count: $ERROR_RATE"
else
    echo "✓ Error rate acceptable: $ERROR_RATE"
fi

# Pod status
echo "[3/6] Checking pods..."
kubectl get pods -n $NAMESPACE

# Database
echo "[4/6] Testing database..."
kubectl exec -n $NAMESPACE deployment/backend -- npm run db:check

# Response time
echo "[5/6] Checking response time..."
RESPONSE=$(curl -s -o /dev/null -w "%{time_total}" $BASE_URL/api/health)
echo "Response time: ${RESPONSE}s"

# Alerts
echo "[6/6] Checking alerts..."
ALERTS=$(curl -s https://alertmanager.spartan-hub.com/api/v1/alerts | jq '.[] | select(.status.state == "active")' | wc -l)
if [ "$ALERTS" -gt 0 ]; then
    echo "⚠ Active alerts: $ALERTS"
else
    echo "✓ No active alerts"
fi

echo ""
echo "=== Verification Complete ==="
```

---

## Rollback Testing

### Monthly Rollback Drill

**Schedule:** First Tuesday of every month

**Procedure:**
1. Deploy test version to staging
2. Execute rollback procedure
3. Verify rollback success
4. Document results
5. Update procedures if needed

### Rollback Test Script

```bash
#!/bin/bash
# scripts/test-rollback.sh

echo "=== Rollback Test (Staging) ==="

# Deploy test version
echo "[1/4] Deploying test version..."
kubectl set image deployment/backend \
  backend=test-image:rollback-test \
  -n spartan-hub-staging

kubectl rollout status deployment/backend -n spartan-hub-staging

# Verify test version
echo "[2/4] Verifying test version..."
kubectl exec -n spartan-hub-staging deployment/backend -- \
  curl -s http://localhost:3001/health

# Execute rollback
echo "[3/4] Executing rollback..."
kubectl rollout undo deployment/backend -n spartan-hub-staging
kubectl rollout status deployment/backend -n spartan-hub-staging

# Verify rollback
echo "[4/4] Verifying rollback..."
kubectl get deployment backend -n spartan-hub-staging -o jsonpath='{.spec.template.spec.containers[0].image}'

echo ""
echo "=== Rollback Test Complete ==="
```

### Test Results Template

```markdown
## Rollback Test Results

**Date:** YYYY-MM-DD  
**Environment:** Staging  
**Tester:** [Name]

### Metrics
| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Rollback Time | < 5 min | X min | Pass/Fail |
| Service Downtime | < 30s | Xs | Pass/Fail |
| Data Integrity | 100% | X% | Pass/Fail |

### Issues Found
- [List any issues]

### Action Items
- [List improvements needed]
```

---

## Support

For rollback support:
- **Documentation:** This document
- **Slack Channel:** #incidents
- **Emergency:** PagerDuty escalation
- **Post-Mortem:** #incident-review

---

*Last Updated: March 1, 2026*  
*Spartan Hub 2.0 - Rollback Procedures*
