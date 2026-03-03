# 🚀 Spartan Hub 2.0 - Deployment Runbook

**Version:** 2.0.0  
**Last Updated:** April 2026  
**Status:** Production Ready

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Rollback Procedures](#rollback-procedures)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Monitoring Setup](#monitoring-setup)
6. [Troubleshooting](#troubleshooting)

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (95%+ coverage)
- [ ] No critical/high security vulnerabilities
- [ ] Code review completed
- [ ] Linting passes
- [ ] TypeScript compilation successful

### Performance
- [ ] Bundle size <500KB
- [ ] Load time <3s
- [ ] Lighthouse score 95+
- [ ] Core Web Vitals passing

### Security
- [ ] Security audit completed
- [ ] No critical vulnerabilities
- [ ] Secrets rotated
- [ ] SSL certificates valid
- [ ] CORS configured correctly

### Database
- [ ] Database migrations ready
- [ ] Backup created
- [ ] Rollback script tested
- [ ] Connection pooling configured

### Infrastructure
- [ ] Environment variables configured
- [ ] Load balancer configured
- [ ] Auto-scaling enabled
- [ ] Monitoring configured
- [ ] Alerts configured

### Documentation
- [ ] API documentation updated
- [ ] Deployment guide updated
- [ ] Rollback procedures documented
- [ ] Team notified

---

## 🚀 Deployment Procedures

### Production Deployment

#### Step 1: Pre-Deployment (T-30 minutes)

```bash
# 1. Run final tests
npm test -- --coverage
npm run security-audit

# 2. Create database backup
npm run db:backup

# 3. Notify team
# Send deployment notification to Slack/Teams
```

#### Step 2: Deploy Backend (T-20 minutes)

```bash
# 1. Navigate to backend directory
cd spartan-hub/backend

# 2. Install dependencies
npm install --production

# 3. Build TypeScript
npm run build

# 4. Run database migrations
npm run migrate

# 5. Restart backend service
pm2 restart spartan-backend

# 6. Verify backend health
curl https://api.spartanhub.io/health
```

#### Step 3: Deploy Frontend (T-10 minutes)

```bash
# 1. Navigate to frontend directory
cd spartan-hub

# 2. Install dependencies
npm install --production

# 3. Build production bundle
npm run build:frontend

# 4. Upload to CDN
# Upload dist/ to S3/CloudFront

# 5. Invalidate CDN cache
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"

# 6. Verify frontend
curl https://spartanhub.io
```

#### Step 4: Verify Deployment (T-0 minutes)

```bash
# 1. Check health endpoints
curl https://api.spartanhub.io/health
curl https://spartanhub.io/health

# 2. Run smoke tests
npm run test:smoke

# 3. Check monitoring dashboard
# Verify no errors in logs
# Verify metrics are normal

# 4. Notify team of successful deployment
```

---

## 🔙 Rollback Procedures

### Immediate Rollback (<5 minutes)

#### Backend Rollback

```bash
# 1. Stop current deployment
pm2 stop spartan-backend

# 2. Restore previous version
cd spartan-hub/backend
git checkout HEAD~1

# 3. Rebuild
npm run build

# 4. Restore database (if needed)
npm run db:restore -- --backup latest

# 5. Restart
pm2 start spartan-backend

# 6. Verify
curl https://api.spartanhub.io/health
```

#### Frontend Rollback

```bash
# 1. Restore previous build
cd spartan-hub
git checkout HEAD~1

# 2. Rebuild
npm run build:frontend

# 3. Upload to CDN
# Upload dist/ to S3/CloudFront

# 4. Invalidate CDN cache
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"

# 5. Verify
curl https://spartanhub.io
```

### Full Rollback (<15 minutes)

```bash
# 1. Notify stakeholders
# Send rollback notification

# 2. Rollback backend
# Follow backend rollback procedure

# 3. Rollback frontend
# Follow frontend rollback procedure

# 4. Rollback database
npm run db:restore -- --backup pre-deployment

# 5. Verify all services
curl https://api.spartanhub.io/health
curl https://spartanhub.io/health

# 6. Post-mortem
# Schedule post-mortem meeting
# Document issues
```

---

## ✅ Post-Deployment Verification

### Automated Checks

```bash
# 1. Health check
curl https://api.spartanhub.io/health

# Expected response:
# {"status": "healthy", "timestamp": "..."}

# 2. API smoke tests
npm run test:smoke

# 3. Performance check
# Check response times <200ms
# Check error rate <0.1%

# 4. Security check
# Verify SSL certificate
# Verify security headers
```

### Manual Checks

- [ ] Login flow working
- [ ] Workout creation working
- [ ] Form analysis working
- [ ] Challenges working
- [ ] Teams working
- [ ] Gamification working
- [ ] Analytics working
- [ ] Mobile responsive
- [ ] No console errors

---

## 📊 Monitoring Setup

### Metrics to Monitor

#### Application Metrics
- **Request Rate:** Target >100 req/min
- **Error Rate:** Target <0.1%
- **Response Time:** Target <200ms (p95)
- **Active Users:** Real-time count

#### System Metrics
- **CPU Usage:** Target <70%
- **Memory Usage:** Target <80%
- **Disk Usage:** Target <80%
- **Network I/O:** Monitor spikes

#### Business Metrics
- **New Registrations:** Daily count
- **Active Workouts:** Real-time count
- **Form Analyses:** Daily count
- **Challenge Participation:** Weekly count

### Alert Configuration

#### Critical Alerts (Page Immediately)
- Service down (>1 minute)
- Error rate >5%
- Response time >2s
- Database connection failed

#### High Priority Alerts (Page Within 15 minutes)
- Error rate >1%
- Response time >1s
- CPU usage >90%
- Memory usage >90%

#### Medium Priority Alerts (Ticket)
- Error rate >0.5%
- Response time >500ms
- CPU usage >80%
- Memory usage >80%

### Monitoring Tools

#### Application Monitoring
- **Tool:** DataDog/New Relic
- **Dashboard:** https://app.datadoghq.com/dashboard/spartan
- **Alerts:** Configured in DataDog

#### Infrastructure Monitoring
- **Tool:** AWS CloudWatch
- **Dashboard:** https://console.aws.amazon.com/cloudwatch
- **Alerts:** Configured in CloudWatch

#### Error Tracking
- **Tool:** Sentry
- **Dashboard:** https://sentry.io/organizations/spartan
- **Alerts:** Configured in Sentry

---

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: High Error Rate

**Symptoms:**
- Error rate >1%
- Increased 5xx responses

**Diagnosis:**
```bash
# Check error logs
tail -f /var/log/spartan/error.log

# Check recent deployments
git log --oneline -10

# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution:**
1. Identify error source from logs
2. Check if related to recent deployment
3. Rollback if deployment-related
4. Fix and redeploy if code issue

---

#### Issue 2: Slow Response Times

**Symptoms:**
- Response time >1s
- User complaints about slowness

**Diagnosis:**
```bash
# Check system resources
top -bn1 | head -20

# Check database query performance
psql -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check CDN cache hit rate
# Check CloudFront metrics
```

**Resolution:**
1. Optimize slow database queries
2. Enable/optimize caching
3. Scale up resources if needed
4. Optimize bundle size

---

#### Issue 3: Database Connection Issues

**Symptoms:**
- Database connection errors
- Timeout errors

**Diagnosis:**
```bash
# Check database status
psql -c "SELECT 1;"

# Check connection pool
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check database logs
tail -f /var/log/postgresql/postgresql.log
```

**Resolution:**
1. Restart database if needed
2. Increase connection pool size
3. Check for long-running queries
4. Scale database resources

---

#### Issue 4: CDN Issues

**Symptoms:**
- Static assets not loading
- 404 errors for assets

**Diagnosis:**
```bash
# Check CDN distribution
aws cloudfront get-distribution --id XXXXX

# Check cache invalidation
aws cloudfront get-invalidation-batch --distribution-id XXXXX --id XXXXX

# Check S3 bucket
aws s3 ls s3://spartan-hub-static/
```

**Resolution:**
1. Invalidate CDN cache
2. Re-upload assets to S3
3. Check CDN distribution configuration
4. Check SSL certificate

---

## 📞 Emergency Contacts

### On-Call Engineer
- **Primary:** John Doe - +1-234-567-8901
- **Secondary:** Jane Smith - +1-234-567-8902

### Management
- **CTO:** Mike Johnson - +1-234-567-8903
- **VP Engineering:** Sarah Williams - +1-234-567-8904

### Support Channels
- **Slack:** #spartan-alerts
- **PagerDuty:** spartan-hub
- **Email:** oncall@spartanhub.io

---

## 📝 Deployment History

| Date | Version | Deployed By | Status | Notes |
|------|---------|-------------|--------|-------|
| 2026-04-13 | 2.0.0 | John Doe | ✅ Success | Phase B Launch |
| 2026-03-30 | 1.9.0 | Jane Smith | ✅ Success | Gamification |
| 2026-03-15 | 1.8.0 | John Doe | ✅ Success | Social Features |

---

**© 2026 Spartan Hub. All rights reserved.**
