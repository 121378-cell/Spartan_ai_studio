# CI/CD Pipeline Guide - Spartan Hub 2.0

**Version:** 2.0  
**Last Updated:** March 1, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Pipeline Architecture](#pipeline-architecture)
3. [GitHub Actions Workflows](#github-actions-workflows)
4. [Build Process](#build-process)
5. [Testing Strategy](#testing-strategy)
6. [Security Scanning](#security-scanning)
7. [Deployment Process](#deployment-process)
8. [Environment Promotion](#environment-promotion)
9. [Monitoring & Notifications](#monitoring--notifications)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Spartan Hub 2.0 uses GitHub Actions for continuous integration and continuous deployment (CI/CD). The pipeline automates testing, building, security scanning, and deployment across staging and production environments.

### Pipeline Features

- ✅ Automated testing on every commit
- ✅ Code quality gates (ESLint, SonarQube)
- ✅ Security scanning (Snyk, Trivy)
- ✅ Container image building and pushing
- ✅ Staging deployment with smoke tests
- ✅ Production deployment with blue-green strategy
- ✅ Automated rollback on failure
- ✅ Comprehensive notifications

### Pipeline Triggers

| Event | Branch | Actions Triggered |
|-------|--------|-------------------|
| Push | `develop` | Test → Build → Deploy Staging |
| Push | `main` | Test → Build → Deploy Production |
| Pull Request | Any | Test → Quality → Security |
| Manual | Any | Selected workflow |

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline Flow                                  │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │ Code Commit  │
     │   (Push)     │
     └──────┬───────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTINUOUS INTEGRATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Install   │─▶│    Lint     │─▶│    Type     │─▶│    Test     │        │
│  │  Deps (npm) │  │   (ESLint)  │  │   Check     │  │   (Jest)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                          │                  │
│                                                          ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Coverage  │◀─│  Security   │◀─│   Quality   │◀─│  Integration│        │
│  │   Report    │  │   (Snyk)    │  │  (SonarQube)│  │   Tests     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONTINUOUS DEPLOYMENT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Build    │─▶│    Push     │─▶│   Deploy    │─▶│   Smoke     │        │
│  │   (Docker)  │  │  (GHCR)     │  │  Staging    │  │   Tests     │        │
│  └─────────────┘  └─────────────┘  └──────┬──────┘  └─────────────┘        │
│                                           │                                 │
│                                           ▼                                 │
│                                    ┌─────────────┐                          │
│                                    │   Manual    │                          │
│                                    │   Approval  │                          │
│                                    └──────┬──────┘                          │
│                                           │                                 │
│                                           ▼                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Monitor   │◀─│   Health    │◀─│  Production │◀─│   Blue-     │        │
│  │   (Grafana) │  │   Checks    │  │   Deploy    │  │   Green     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## GitHub Actions Workflows

### Workflow Files Location

```
spartan-hub/.github/workflows/
├── comprehensive-cicd.yml      # Main CI/CD pipeline
├── production-pipeline.yml     # Production-specific pipeline
├── deploy.yml                  # Simple deployment workflow
├── pr-automated-checks.yml     # Pull request checks
├── quality.yml                 # Code quality checks
├── security.yml                # Security scanning
└── code-review.yml             # Automated code review
```

### Comprehensive CI/CD Workflow

**File:** `.github/workflows/comprehensive-cicd.yml`

```yaml
name: Comprehensive CI/CD Pipeline

on:
  push:
    branches: [main, develop, release/**]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME_BACKEND: ${{ github.repository_owner }}/spartan-hub-backend
  IMAGE_NAME_AI: ${{ github.repository_owner }}/spartan-hub-ai

jobs:
  # Job 1: Automated Testing
  automated-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./spartan-hub
      
      - name: Run unit tests
        run: npm run test -- --coverage
        working-directory: ./spartan-hub/backend
      
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  # Job 2: Static Analysis
  static-analysis:
    runs-on: ubuntu-latest
    needs: automated-testing
    steps:
      - uses: actions/checkout@v4
      
      - name: Run ESLint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0
      
      - name: SonarQube Scan
        uses: sonarsource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  # Job 3: Security Scanning
  security-scanning:
    runs-on: ubuntu-latest
    needs: static-analysis
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'

  # Job 4: Build and Push
  build:
    runs-on: ubuntu-latest
    needs: security-scanning
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./spartan-hub/backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME_BACKEND }}:${{ github.sha }}

  # Job 5: Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v3
      - uses: azure/setup-helm@v3
      
      - name: Deploy to staging
        run: |
          helm upgrade --install spartan-hub-staging ./helm/spartan-hub \
            --namespace spartan-hub-staging \
            --set image.tag=${{ github.sha }}

  # Job 6: Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v3
      
      - name: Deploy to production
        run: |
          helm upgrade --install spartan-hub-production ./helm/spartan-hub \
            --namespace spartan-hub-production \
            --set image.tag=${{ github.sha }}
```

### Production Pipeline Workflow

**File:** `.github/workflows/production-pipeline.yml`

This workflow includes:
- Code quality gates
- Coverage thresholds (80% minimum)
- Security scans
- Staging deployment with smoke tests
- Production deployment with blue-green strategy
- Automatic rollback on failure

---

## Build Process

### Multi-Stage Docker Build

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

RUN npm ci --only=production && npm cache clean --force

USER nodejs
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3001/health')"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Build Artifacts

| Artifact | Location | Retention |
|----------|----------|-----------|
| Docker Images | ghcr.io/spartan-hub/* | 90 days |
| Test Coverage | codecov.io | 30 days |
| Build Logs | GitHub Actions | 90 days |
| Security Reports | GitHub Security Tab | 1 year |

### Image Tagging Strategy

```
# Branch-based tags
develop-abc123      # develop branch commit
main-def456         # main branch commit
release-1.0.0       # release branch

# Special tags
latest              # Latest main build
staging             # Latest staging build
production          # Latest production build

# Semantic versioning
v1.0.0              # Release version
v1.0.0-rc.1         # Release candidate
```

---

## Testing Strategy

### Test Pyramid

```
                    ┌───────────┐
                   /    E2E      \
                  /    (10%)     \
                 /─────────────────\
                /   Integration      \
               /      (20%)          \
              /───────────────────────\
             /      Unit Tests         \
            /         (70%)            \
           ─────────────────────────────
```

### Test Types and Commands

| Test Type | Command | Coverage Target |
|-----------|---------|-----------------|
| Unit Tests | `npm run test:unit` | 80% |
| Integration Tests | `npm run test:integration` | 70% |
| E2E Tests | `npm run test:e2e` | Critical paths |
| Security Tests | `npm run test:security` | 100% |
| Performance Tests | `npm run test:perf` | SLA compliance |

### Coverage Requirements

```yaml
# Coverage thresholds in package.json
"coverageThreshold": {
  "global": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}
```

### Quality Gates

| Gate | Threshold | Action on Failure |
|------|-----------|-------------------|
| Code Coverage | 80% | Block merge |
| ESLint Errors | 0 | Block merge |
| Security Vulnerabilities (Critical) | 0 | Block merge |
| SonarQube Quality Gate | Pass | Block merge |
| Test Success Rate | 100% | Block merge |

---

## Security Scanning

### Security Tools Integration

| Tool | Purpose | When |
|------|---------|------|
| Snyk | Dependency vulnerabilities | Every PR |
| Trivy | Container/image scanning | Before deploy |
| npm audit | Node.js vulnerabilities | Every build |
| TruffleHog | Secret detection | Every commit |
| CodeQL | Code security analysis | Weekly |

### Security Scan Configuration

```yaml
# Snyk configuration
- name: Run Snyk
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
  with:
    args: --severity-threshold=high

# Trivy configuration
- name: Run Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'image'
    image-ref: 'ghcr.io/${{ github.repository }}/backend:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
```

### Vulnerability Response

| Severity | Response Time | Action |
|----------|---------------|--------|
| Critical | Immediate | Block deploy, fix within 24h |
| High | 24 hours | Fix within 72h |
| Medium | 7 days | Fix in next sprint |
| Low | 30 days | Backlog item |

---

## Deployment Process

### Deployment Environments

| Environment | Branch | URL | Approval |
|-------------|--------|-----|----------|
| Staging | `develop` | staging.spartan-hub.com | Auto |
| Production | `main` | spartan-hub.com | Required |

### Blue-Green Deployment Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    Blue-Green Deployment                         │
└─────────────────────────────────────────────────────────────────┘

     Current Production (Blue)              New Deployment (Green)
     ┌─────────────────────┐                ┌─────────────────────┐
     │  Backend v1.0.0     │                │  Backend v1.1.0     │
     │  Frontend v1.0.0    │                │  Frontend v1.1.0    │
     │  Replicas: 5        │                │  Replicas: 5        │
     └──────────┬──────────┘                └──────────┬──────────┘
                │                                      │
                └──────────────────┬───────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │   Load Balancer │
                          │   (Ingress)     │
                          └────────┬────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
           100% Traffic to Blue         Switch to Green
           (Current Production)         (After verification)
```

### Deployment Steps

```yaml
# Production deployment steps
steps:
  - name: Deploy to production
    run: |
      # 1. Deploy new version (Green)
      kubectl apply -f k8s/deployment-green.yml
      
      # 2. Wait for rollout
      kubectl rollout status deployment/backend-green --timeout=300s
      
      # 3. Run health checks
      ./scripts/health-check.sh green
      
      # 4. Switch traffic
      kubectl patch ingress spartan-hub \
        -p '{"spec":{"backend":{"serviceName":"backend-green"}}}'
      
      # 5. Verify traffic switch
      ./scripts/verify-traffic.sh
      
      # 6. Scale down old version (Blue)
      kubectl scale deployment/backend-blue --replicas=0
```

### Smoke Tests

```bash
#!/bin/bash
# scripts/smoke-tests.sh

set -e

BASE_URL="${1:-https://spartan-hub.com}"

echo "Running smoke tests against $BASE_URL"

# Health check
curl -f "$BASE_URL/api/health" || exit 1

# API endpoint check
curl -f "$BASE_URL/api/users/me" -H "Authorization: Bearer test-token" || exit 1

# Frontend check
curl -f "$BASE_URL/" || exit 1

echo "All smoke tests passed!"
```

---

## Environment Promotion

### Promotion Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Development │────▶│   Staging   │────▶│ Production  │
│   (local)   │     │  (develop)  │     │   (main)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
  Manual testing      Automated tests      Production
  Unit tests          Integration tests    Smoke tests
                      E2E tests            Monitoring
```

### Environment Variable Management

```yaml
# GitHub Environments configuration
environments:
  staging:
    url: https://staging.spartan-hub.com
    secrets:
      - KUBE_CONFIG_STAGING
      - STAGING_API_KEYS
  production:
    url: https://spartan-hub.com
    secrets:
      - KUBE_CONFIG_PRODUCTION
      - PROD_API_KEYS
    protection_rules:
      - required_reviewers: 1
        wait_timer: 5
```

### Database Migration Automation

```yaml
- name: Run database migrations
  run: |
    kubectl exec -n spartan-hub deployment/backend -- \
      npm run migrate
    
- name: Verify migration
  run: |
    kubectl exec -n spartan-hub deployment/backend -- \
      npm run migrate:status
```

---

## Monitoring & Notifications

### Pipeline Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Build Time | < 10 min | 7 min |
| Test Time | < 15 min | 12 min |
| Deploy Time (Staging) | < 5 min | 3 min |
| Deploy Time (Production) | < 10 min | 8 min |
| Success Rate | > 95% | 98% |

### Notification Channels

| Event | Channel | Recipients |
|-------|---------|------------|
| Build Success | Slack #ci-cd | Dev Team |
| Build Failure | Slack #ci-cd + Email | Dev Team + Lead |
| Deploy Success | Slack #deployments | All Teams |
| Deploy Failure | Slack #deployments + PagerDuty | Ops Team |
| Security Alert | Slack #security + Email | Security Team |

### Notification Configuration

```yaml
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{
        "channel": "#ci-cd",
        "username": "GitHub Actions",
        "text": "❌ Pipeline failed: ${{ github.workflow }}",
        "icon_emoji": ":x:"
      }'
```

---

## Troubleshooting

### Common Issues

#### Build Failures

**Issue:** Docker build fails with "out of memory"
```bash
# Solution: Increase build resources
# In GitHub Actions, use larger runner
runs-on: ubuntu-latest-8-cores
```

**Issue:** npm install fails
```bash
# Solution: Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### Test Failures

**Issue:** Tests fail in CI but pass locally
```bash
# Solution: Check environment differences
# Add debug logging
DEBUG=* npm test

# Check Node version
node --version

# Check for flaky tests
npm run test -- --retry=3
```

#### Deployment Failures

**Issue:** Kubernetes deployment fails
```bash
# Check deployment status
kubectl describe deployment backend -n spartan-hub

# Check pod logs
kubectl logs -n spartan-hub -l app=backend --tail=100

# Check events
kubectl get events -n spartan-hub --sort-by='.lastTimestamp'
```

**Issue:** Health check fails
```bash
# Test health endpoint manually
kubectl port-forward deployment/backend 3001:3001 -n spartan-hub
curl http://localhost:3001/health

# Check application logs
kubectl logs -n spartan-hub deployment/backend | grep -i error
```

### Pipeline Debug Mode

```yaml
# Enable debug logging
env:
  ACTIONS_RUNNER_DEBUG: true
  ACTIONS_STEP_DEBUG: true

# Add debug steps
- name: Debug environment
  run: |
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Working directory: $(pwd)"
    echo "Environment: $NODE_ENV"
```

### Rollback Commands

```bash
# Rollback Helm release
helm rollback spartan-hub-production -n spartan-hub-production

# Rollback Kubernetes deployment
kubectl rollout undo deployment/backend -n spartan-hub

# Rollback to specific revision
kubectl rollout undo deployment/backend -n spartan-hub --to-revision=2
```

---

## Support

For CI/CD pipeline support:
- **Documentation:** See workflow files in `.github/workflows/`
- **Issues:** Create GitHub issue with workflow run URL
- **Emergency:** Contact ops@spartan-hub.com

---

*Last Updated: March 1, 2026*  
*Spartan Hub 2.0 - CI/CD Pipeline Guide*
