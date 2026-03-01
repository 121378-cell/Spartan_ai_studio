# 🎯 SPARTAN HUB 2.0 - STAGING ENVIRONMENT GUIDE
## Beta Testing Environment Setup

**Version:** 2.0.0  
**Last Updated:** March 1, 2026  
**Status:** ✅ READY FOR BETA TESTING

---

## 📋 TABLE OF CONTENTS

- [Overview](#-overview)
- [Environment Comparison](#-environment-comparison)
- [Quick Start](#-quick-start)
- [Setup Instructions](#-setup-instructions)
- [Feature Flags](#-feature-flags)
- [Beta Testing Plan](#-beta-testing-plan)
- [Monitoring & Observability](#-monitoring--observability)
- [Issue Management](#-issue-management)
- [Deployment Process](#-deployment-process)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Support](#-support)

---

## 📋 OVERVIEW

The staging environment is a production-like environment for beta testing with real users before the full production launch of Spartan Hub 2.0.

### Purpose

- **Beta Testing**: Validate features with 50-100 real users
- **Performance Validation**: Test under realistic load conditions
- **Feature Flag Testing**: Gradual feature rollout control
- **Canary Release**: Safe production deployment strategy
- **User Feedback**: Gather insights before full launch

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │ │
│  │   (React)    │     │   (Node.js)  │     │   (Staging)  │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│         │                    │                    │          │
│         │                    ▼                    │          │
│         │            ┌──────────────┐            │          │
│         │            │    Redis     │            │          │
│         │            │   (Cache)    │            │          │
│         │            └──────────────┘            │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │    CDN       │     │  AI Services │     │   S3 Bucket  │ │
│  │  (Static)    │     │   (Groq)     │     │  (Uploads)   │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌍 ENVIRONMENT COMPARISON

| Feature | Development | Staging | Production |
|---------|-------------|---------|------------|
| **Purpose** | Local development | Beta testing | Public launch |
| **Users** | Developers | 50-100 beta testers | All users |
| **Data** | Dummy/seed data | Mix of dummy + real | Real user data |
| **Domain** | localhost:5173 | staging.spartan-hub.com | spartan-hub.com |
| **SSL** | Optional | Required | Required |
| **Monitoring** | Basic | Full | Full + alerts |
| **Rate Limiting** | Disabled | Permissive | Strict |
| **Logging** | Debug | Debug | Info/Warn |
| **Backups** | None | Daily | Hourly + real-time |
| **Scaling** | Single instance | 2-3 instances | Auto-scaling |

---

## 🚀 QUICK START

### One-Command Setup

```bash
# Navigate to project root
cd "C:\Proyectos\Spartan hub 2.0 - codex - copia"

# Run the staging setup script
./spartan-hub/scripts/setup-staging.sh
```

### Manual Deployment

```bash
# Using GitHub CLI
gh workflow run deploy-staging-manual.yml \
  --field version='v2.0.0' \
  --field beta_testers='50'
```

---

## 📝 SETUP INSTRUCTIONS

### Prerequisites

Before setting up the staging environment, ensure you have:

- [ ] Node.js 18 or higher installed
- [ ] npm package manager
- [ ] Git installed
- [ ] GitHub CLI (optional but recommended)
- [ ] SSH access to staging server
- [ ] AWS credentials for RDS/S3/Secrets Manager

### Step-by-Step Setup

#### Step 1: Clone and Navigate

```bash
cd "C:\Proyectos\Spartan hub 2.0 - codex - copia"
```

#### Step 2: Create Environment Files

```bash
# Frontend environment
cd spartan-hub
cp .env.staging.example .env.staging

# Backend environment
cd backend
cp .env.staging.example .env.staging
```

#### Step 3: Configure Secrets

Edit `spartan-hub/.env.staging` and `spartan-hub/backend/.env.staging`:

```env
# Replace placeholder values with actual secrets
POSTGRES_PASSWORD=your-actual-password-from-secrets-manager
JWT_SECRET=your-actual-jwt-secret
SESSION_SECRET=your-actual-session-secret
GROQ_API_KEY=your-actual-groq-api-key
REDIS_URL=redis://your-actual-redis-url:6379
POSTGRES_HOST=your-actual-rds-endpoint
```

#### Step 4: Run Setup Script

```bash
cd spartan-hub
bash scripts/setup-staging.sh
```

#### Step 5: Deploy

```bash
# Using GitHub CLI
gh workflow run deploy-staging-manual.yml \
  --field version='v2.0.0' \
  --field beta_testers='50'
```

---

## 🚩 FEATURE FLAGS

### Overview

Feature flags control feature availability across environments and enable gradual rollouts.

### Configuration Files

| File | Purpose |
|------|---------|
| `spartan-hub/src/config/featureFlags.ts` | Frontend feature flags |
| `spartan-hub/backend/src/middleware/featureFlags.ts` | Backend feature flags |

### Feature Categories

#### Core MVP Features (100% Enabled)

| Feature | Description | Environments |
|---------|-------------|--------------|
| `VIDEO_ANALYSIS` | AI-powered video form analysis | staging, production |
| `AI_COACH` | AI coaching and recommendations | staging, production |
| `WORKOUT_TRACKING` | Track workouts and progress | staging, production |
| `WEARABLE_SYNC` | Garmin, Google Fit, Health Connect | staging, production |
| `NUTRITION_TRACKING` | Nutrition and meal planning | staging, production |
| `PROGRESS_DASHBOARD` | Visual progress analytics | staging, production |

#### Beta Features (Staging First)

| Feature | Description | Environments |
|---------|-------------|--------------|
| `COMMUNITY_FEATURES` | Forums, challenges, social | staging |
| `PREMIUM_ANALYTICS` | Advanced analytics for premium | staging |
| `ML_INJURY_PREDICTION` | ML-based injury risk | staging |
| `ML_WORKOUT_FORECAST` | ML workout forecasting | staging |

#### Gradual Rollout Features

| Feature | Description | Rollout % |
|---------|-------------|-----------|
| `SMART_NOTIFICATIONS` | Intelligent push notifications | 50% |
| `PERSONALIZED_WORKOUTS` | AI-personalized workouts | 75% |

#### Experimental Features (Disabled)

| Feature | Description | Status |
|---------|-------------|--------|
| `SOCIAL_SHARING` | Share on social media | Disabled |
| `MOBILE_APP` | Native mobile app | Disabled |
| `VR_WORKOUTS` | Virtual reality workouts | Disabled |
| `LIVE_COACHING` | Real-time coaching | Disabled |

### Usage Examples

#### Frontend (React)

```typescript
import { isFeatureEnabled, getEnabledFeatures } from './config/featureFlags';

// Check if a feature is enabled
if (isFeatureEnabled('COMMUNITY_FEATURES', 'staging')) {
  // Show community features
}

// Get all enabled features
const features = getEnabledFeatures('staging');
```

#### Backend (Express Middleware)

```typescript
import { checkFeatureFlag } from './middleware/featureFlags';

// Protect a route with feature flag
router.post('/api/video-analysis',
  checkFeatureFlag('VIDEO_ANALYSIS'),
  videoAnalysisController
);

// Check in controller
if (isFeatureEnabled('COMMUNITY_FEATURES')) {
  // Enable community features
}
```

---

## 🧪 BETA TESTING PLAN

### Phase 1: Internal Testing (Days 1-2)

**Participants:** Team members (5-10 people)

**Objectives:**
- Validate all critical user flows
- Test on various devices and browsers
- Verify monitoring and alerting
- Test rollback procedures

**Checklist:**
- [ ] Health check endpoints accessible
- [ ] User registration working
- [ ] Login/logout functional
- [ ] Video analysis operational
- [ ] AI Coach responding correctly
- [ ] Wearable sync (Garmin/Google Fit) working
- [ ] No console errors in browser
- [ ] API response time <500ms p95
- [ ] Database queries optimized
- [ ] Error handling graceful

**Success Criteria:**
- All critical flows pass
- No P0/P1 bugs
- Performance metrics acceptable

---

### Phase 2: Closed Beta (Days 3-11)

**Participants:** 50-100 invited beta testers

**Objectives:**
- Gather real user feedback
- Identify edge case bugs
- Validate feature usability
- Test system scalability

**Success Metrics:**
| Metric | Target |
|--------|--------|
| Registrations | 50+ users |
| Daily Active Users | 30+ users |
| Error Rate | <1% |
| Response Time p95 | <500ms |
| User Satisfaction | ≥4/5 |

**Feedback Collection:**
- In-app feedback form
- Weekly surveys
- User interviews
- Usage analytics

---

### Phase 3: Canary Release (Days 12-19)

**Traffic:** 10% → 50% → 100%

**Objectives:**
- Gradual traffic increase
- Monitor performance under load
- Catch issues before full rollout
- Validate infrastructure scaling

**Decision Points:**
| Transition | Condition | Action |
|------------|-----------|--------|
| 10% → 50% | Error rate <1% for 24h | Increase traffic |
| 50% → 100% | Error rate <1% for 48h | Full rollout |
| Any → Rollback | Error rate >5% | Immediate rollback |

---

## 📊 MONITORING & OBSERVABILITY

### Key Metrics

#### Business Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| User Registrations | New signups per day | 10+/day |
| Daily Active Users | Unique daily users | 30+ |
| Feature Usage | % using each feature | Track all |
| Retention Rate | Users returning after 7 days | >40% |
| Session Duration | Average time per session | >5 min |

#### Technical Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Error Rate | % of requests with errors | <1% |
| Response Time p95 | 95th percentile latency | <500ms |
| Response Time p99 | 99th percentile latency | <1000ms |
| Throughput | Requests per second | Track |
| CPU Usage | Server CPU utilization | <70% |
| Memory Usage | Server memory utilization | <80% |
| Database Connections | Active DB connections | <80% pool |

### Dashboards

#### Grafana

**URL:** https://staging-grafana.spartan-hub.com

**Available Dashboards:**
1. **System Overview** - High-level health metrics
2. **Application Performance** - Response times, throughput
3. **Database Health** - Query performance, connections
4. **Business Metrics** - User activity, feature usage
5. **Error Tracking** - Error rates, types, trends

#### Logs

```bash
# View application logs via SSH
ssh user@staging.spartan-hub.com 'pm2 logs spartan-hub-staging'

# View last 100 lines
ssh user@staging.spartan-hub.com 'pm2 logs spartan-hub-staging --lines 100'

# View nginx access logs
ssh user@staging.spartan-hub.com 'tail -f /var/log/nginx/access.log'

# View nginx error logs
ssh user@staging.spartan-hub.com 'tail -f /var/log/nginx/error.log'
```

### Alerts

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | Error rate >5% for 5min | P0 | Page on-call |
| High Latency | p95 >1s for 10min | P1 | Investigate |
| High CPU | CPU >90% for 5min | P1 | Scale up |
| High Memory | Memory >90% for 5min | P1 | Investigate leak |
| Database Down | DB connection failed | P0 | Failover |
| Service Down | Health check failed | P0 | Restart service |

---

## 🐛 ISSUE MANAGEMENT

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0** | Critical - Service down | Immediate | API unavailable |
| **P1** | High - Core feature broken | <1 hour | Login not working |
| **P2** | Medium - Feature degraded | <4 hours | Slow performance |
| **P3** | Low - Cosmetic/minor | <24 hours | UI alignment issue |

### Reporting Issues

**Use this template:**

```markdown
## Issue: [Brief description]

**Severity:** P0/P1/P2/P3

**Environment:** Staging

**Date/Time:** 2026-03-01 14:30 UTC

**Steps to Reproduce:**
1. Go to https://staging.spartan-hub.com/dashboard
2. Click on "Video Analysis"
3. Upload a video
4. See error message

**Expected Behavior:**
Video should be analyzed and results displayed

**Actual Behavior:**
Error message: "Failed to process video"

**Screenshots:**
[Attach if applicable]

**Browser/Device:**
Chrome 121.0 on Windows 11

**Logs:**
```
[Attach relevant error logs]
```

**Additional Context:**
[Any other relevant information]
```

### Issue Triage Process

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Report    │────▶│    Triage   │────▶│  Assign     │
│   Issue     │     │  Severity   │     │  to Team    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Close     │◀────│   Verify    │◀────│    Fix &    │
│   Issue     │     │     Fix     │     │   Deploy    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 🔄 DEPLOYMENT PROCESS

### Deploy to Staging

#### Using GitHub CLI

```bash
# Basic deployment
gh workflow run deploy-staging-manual.yml \
  --field version='v2.0.0'

# With options
gh workflow run deploy-staging-manual.yml \
  --field version='v2.0.0' \
  --field beta_testers='50' \
  --field deploy_backend='true' \
  --field deploy_frontend='true' \
  --field run_smoke_tests='true'
```

#### Using GitHub UI

1. Go to **Actions** tab
2. Select **Deploy to Staging (Manual)**
3. Click **Run workflow**
4. Fill in parameters:
   - Version: `v2.0.0`
   - Beta testers: `50`
5. Click **Run workflow**

### Rollback Procedure

#### Quick Rollback

```bash
# Rollback to previous version
gh workflow run deploy-rollback.yml \
  --field target_version='v1.9.0' \
  --field environment='staging'
```

#### Manual Rollback

```bash
# SSH to staging server
ssh user@staging.spartan-hub.com

# List PM2 applications
pm2 list

# Restart previous version
cd /var/www/spartan-hub/backups/[timestamp]
pm2 restart spartan-hub-staging
```

### Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Rollback plan ready

**Post-Deployment:**
- [ ] Health checks passing
- [ ] No errors in logs
- [ ] Performance metrics normal
- [ ] Smoke tests passing
- [ ] Team notified

---

## 🔐 SECURITY

### Access Control

- Staging environment is **NOT public**
- Requires invitation/login for access
- Separate credentials from production
- No real production data in staging

### Secrets Management

**Best Practices:**
1. Never commit `.env.staging` files
2. Use GitHub Secrets for CI/CD
3. Use AWS Secrets Manager for runtime
4. Rotate secrets regularly (quarterly)
5. Audit secret access monthly

**Secrets Locations:**

| Secret | Storage | Rotation |
|--------|---------|----------|
| Database Password | AWS Secrets Manager | Quarterly |
| JWT Secret | GitHub Secrets + AWS SM | Quarterly |
| Session Secret | AWS Secrets Manager | Quarterly |
| API Keys | AWS Secrets Manager | As needed |
| SSH Keys | GitHub Secrets | Annually |

### Security Scanning

```bash
# Run security audit
cd spartan-hub
npm audit --audit-level=high

# Run backend security scan
cd backend
npm audit --audit-level=high

# Run dependency check
npm run security-audit
```

---

## 🔧 TROUBLESHOOTING

### Common Issues

#### Issue: Deployment Fails

**Symptoms:**
- GitHub Actions workflow fails
- Error: "SSH connection refused"

**Solution:**
```bash
# Verify SSH key is configured
gh secret list --env staging

# Regenerate SSH key if needed
ssh-keygen -t ed25519 -C "staging-deploy"

# Add public key to staging server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@staging.spartan-hub.com
```

#### Issue: Health Check Fails

**Symptoms:**
- Deployment completes but health check fails
- 502 Bad Gateway error

**Solution:**
```bash
# SSH to server
ssh user@staging.spartan-hub.com

# Check PM2 status
pm2 status

# Check logs
pm2 logs spartan-hub-staging

# Restart application
pm2 restart spartan-hub-staging

# Check if port is listening
netstat -tlnp | grep 3001
```

#### Issue: Database Connection Failed

**Symptoms:**
- Error: "Cannot connect to database"
- API returns 500 errors

**Solution:**
```bash
# Check database connectivity
ssh user@staging.spartan-hub.com
psql -h staging-db.rds.amazonaws.com -U spartan_staging_user -d spartan_hub_staging

# Verify environment variables
pm2 show spartan-hub-staging

# Check RDS security group
# Ensure staging server IP is allowed
```

#### Issue: High Memory Usage

**Symptoms:**
- Memory usage >90%
- Application slow or unresponsive

**Solution:**
```bash
# Check memory usage
ssh user@staging.spartan-hub.com
free -h

# Check PM2 memory
pm2 list

# Restart application
pm2 restart spartan-hub-staging

# If persistent, increase server resources
```

---

## 📞 SUPPORT

### Contact Information

| Team | Email | Purpose |
|------|-------|---------|
| DevOps | devops@spartan-hub.com | Infrastructure issues |
| Beta Support | beta-support@spartan-hub.com | User feedback |
| Emergency | emergency@spartan-hub.com | P0 incidents |

### Resources

| Resource | Location |
|----------|----------|
| Setup Script | `spartan-hub/scripts/setup-staging.sh` |
| Deployment Workflow | `.github/workflows/deploy-staging-manual.yml` |
| Feature Flags (Frontend) | `spartan-hub/src/config/featureFlags.ts` |
| Feature Flags (Backend) | `spartan-hub/backend/src/middleware/featureFlags.ts` |
| Environment Config | `spartan-hub/.env.staging` |
| Backend Config | `spartan-hub/backend/.env.staging` |

### Documentation

- [Production Environment Guide](./PRODUCTION_ENVIRONMENT_GUIDE.md)
- [Deployment Runbook](./spartan-hub/DEPLOYMENT_RUNBOOK.md)
- [Monitoring and Alerting](./spartan-hub/MONITORING_AND_ALERTING.md)
- [Rollback Procedures](./spartan-hub/ROLLBACK_PROCEDURES.md)

---

## 📈 APPENDIX

### Environment Variables Reference

#### Frontend (.env.staging)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `staging` |
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | Allowed CORS origin | `https://staging.spartan-hub.com` |
| `POSTGRES_HOST` | Database host | `staging-db.rds.amazonaws.com` |
| `POSTGRES_DB` | Database name | `spartan_hub_staging` |
| `REDIS_URL` | Redis connection URL | `redis://...` |
| `JWT_SECRET` | JWT signing secret | (from Secrets Manager) |
| `GROQ_API_KEY` | AI service API key | (from Secrets Manager) |

#### Backend (.env.staging)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `staging` |
| `PORT` | Server port | `3001` |
| `HOST` | Bind address | `0.0.0.0` |
| `POSTGRES_PRIMARY_HOST` | Primary DB host | `staging-db.rds.amazonaws.com` |
| `ENABLE_READ_REPLICAS` | Use read replicas | `false` |
| `LOG_LEVEL` | Logging verbosity | `debug` |

### URL Reference

| Service | URL |
|---------|-----|
| Frontend | https://staging.spartan-hub.com |
| Backend API | https://staging-api.spartan-hub.com |
| Health Check | https://staging-api.spartan-hub.com/api/health |
| Grafana | https://staging-grafana.spartan-hub.com |
| API Docs | https://staging-api.spartan-hub.com/api-docs |

---

**Document Version:** 1.0  
**Last Updated:** March 1, 2026  
**Next Review:** After beta testing completion  
**Owner:** DevOps Team

---

<p align="center">
  <strong>🎯 Spartan Hub 2.0 - Staging Environment Ready</strong><br>
  <em>Ready for Beta Testing</em>
</p>
