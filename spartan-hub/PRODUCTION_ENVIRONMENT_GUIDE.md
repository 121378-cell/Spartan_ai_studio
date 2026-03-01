# Production Environment Guide - Spartan Hub 2.0

**Version:** 2.0  
**Last Updated:** March 1, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Redis Configuration](#redis-configuration)
5. [SSL/TLS Configuration](#ssltls-configuration)
6. [Secret Management](#secret-management)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides comprehensive instructions for setting up and configuring the production environment for Spartan Hub 2.0. The production environment is designed for high availability, security, and performance.

### Environment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Production Environment                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Frontend   │  │   Backend   │  │     AI      │              │
│  │  (React 19) │  │  (Node.js)  │  │  Service    │              │
│  │  x2-x5      │  │   x3-x10    │  │    x2-x5    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Redis    │  │  PostgreSQL │  │  PostgreSQL │              │
│  │   Cluster   │  │   Primary   │  │   Replicas  │              │
│  │   :6379     │  │   :5432     │  │  :5433-5434 │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Prerequisites

- Kubernetes cluster (EKS/GKE) with version 1.25+
- Docker 20.10+
- Helm 3.10+
- kubectl configured with cluster access
- Domain name with DNS configured
- SSL certificates (or cert-manager for auto-provisioning)

---

## Environment Configuration

### Environment Files Structure

```
spartan-hub/
├── .env.example              # Template for all environments
├── .env.development          # Local development
├── .env.test                 # Testing environment
├── .env.staging              # Staging environment
└── .env.production.example   # Production template (commit this)
```

### Creating Production Environment File

1. **Copy the template:**
```bash
cd spartan-hub
cp .env.production.example .env.production
```

2. **Generate secure secrets:**
```bash
# Generate JWT Secret (32+ characters)
openssl rand -base64 32

# Generate Session Secret
openssl rand -base64 48

# Generate Database Password
openssl rand -base64 32
```

3. **Update .env.production with real values:**
```bash
# NEVER commit .env.production with real values
# Add to .gitignore if not already present
echo ".env.production" >> .gitignore
```

---

## Database Setup

### PostgreSQL Production Configuration

#### Option 1: Managed PostgreSQL (Recommended)

**AWS RDS PostgreSQL:**
```yaml
# Kubernetes Secret
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
  namespace: spartan-hub
type: Opaque
stringData:
  host: spartan-hub-prod.xxxxxx.us-east-1.rds.amazonaws.com
  port: "5432"
  database: spartan_hub_prod
  username: spartan_admin
  password: <GENERATED_PASSWORD>
```

**Configuration Steps:**
1. Create RDS PostgreSQL instance (version 15+)
2. Configure security groups for VPC access
3. Enable Multi-AZ for high availability
4. Configure automated backups (7-day retention)
5. Create database and user
6. Update Kubernetes secrets

#### Option 2: Self-Hosted PostgreSQL in Kubernetes

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-primary
  namespace: spartan-hub
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
      role: primary
  template:
    metadata:
      labels:
        app: postgres
        role: primary
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: spartan_hub_prod
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: 2Gi
            cpu: 1000m
          limits:
            memory: 4Gi
            cpu: 2000m
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 50Gi
```

### Connection Pooling Configuration

```yaml
# PgBouncer Configuration (Optional for high-traffic)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: spartan-hub
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    spec:
      containers:
      - name: pgbouncer
        image: edoburu/pgbouncer:1.19
        ports:
        - containerPort: 5432
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: connection_string
        - name: POOL_MODE
          value: transaction
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "50"
```

### Database Migration Scripts

```bash
# Run migrations in production
kubectl exec -n spartan-hub deployment/backend -- npm run migrate

# Verify migration status
kubectl exec -n spartan-hub deployment/backend -- npm run migrate:status

# Rollback if needed
kubectl exec -n spartan-hub deployment/backend -- npm run migrate:rollback
```

### Backup and Recovery Procedures

#### Automated Backups

```yaml
# CronJob for daily backups
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: spartan-hub
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM UTC
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz
              # Upload to S3
              aws s3 cp /backups/ s3://spartan-hub-backups/postgres/ --recursive
              # Clean old backups (keep 30 days)
              find /backups -mtime +30 -delete
            env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: host
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: DB_NAME
              value: spartan_hub_prod
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            volumeMounts:
            - name: backup-volume
              mountPath: /backups
          volumes:
          - name: backup-volume
            emptyDir: {}
          restartPolicy: OnFailure
```

#### Manual Backup

```bash
# Create manual backup
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  pg_dump -U spartan_admin spartan_hub_prod | gzip > backup-manual.sql.gz

# Restore from backup
kubectl exec -n spartan-hub -i deployment/postgres-primary -- \
  psql -U spartan_admin spartan_hub_prod < backup-manual.sql
```

---

## Redis Configuration

### Redis Cluster Setup

```yaml
# Redis StatefulSet for production
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: spartan-hub
spec:
  serviceName: redis
  replicas: 6  # 3 masters + 3 replicas
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7.0
        command:
        - redis-server
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - /data/nodes.conf
        - --appendonly
        - "yes"
        ports:
        - containerPort: 6379
        - containerPort: 16379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        resources:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 1Gi
            cpu: 500m
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: gp3
      resources:
        requests:
          storage: 10Gi
```

### Cache Strategy for Production

| Cache Type | TTL | Strategy |
|------------|-----|----------|
| User Sessions | 7 days | Sticky |
| API Responses | 5 minutes | LRU |
| Static Content | 1 hour | LRU |
| Computed Metrics | 15 minutes | LRU |
| ML Predictions | 1 hour | TTL |

### Session Management Configuration

```javascript
// Backend session configuration
const sessionConfig = {
  store: new RedisStore({
    client: redisClient,
    prefix: 'spartan:session:',
    ttl: 7 * 24 * 60 * 60, // 7 days
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,  // HTTPS only
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};
```

---

## SSL/TLS Configuration

### Certificate Management

#### Option 1: cert-manager (Recommended for Kubernetes)

```yaml
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@spartan-hub.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

#### Option 2: Manual Certificate Management

```bash
# Generate CSR
openssl genrsa -out spartan-hub.key 2048
openssl req -new -key spartan-hub.key -out spartan-hub.csr

# Submit CSR to Certificate Authority
# Download certificate and create Kubernetes secret
kubectl create secret tls spartan-hub-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace=spartan-hub
```

### HTTPS Enforcement

```yaml
# Ingress configuration with HTTPS redirect
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spartan-hub-ingress
  namespace: spartan-hub
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/hsts: "true"
    nginx.ingress.kubernetes.io/hsts-include-subdomains: "true"
    nginx.ingress.kubernetes.io/hsts-max-age: "31536000"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - spartan-hub.com
    - www.spartan-hub.com
    secretName: spartan-hub-tls
  rules:
  - host: spartan-hub.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
```

### HSTS Headers Configuration

```nginx
# NGINX HSTS configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## Secret Management

### Kubernetes Secrets

```bash
# Create secrets
kubectl create secret generic backend-secrets \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=session-secret=$(openssl rand -base64 48) \
  --from-literal=database-password=$(openssl rand -base64 32) \
  --namespace=spartan-hub

# Create external API keys secret
kubectl create secret generic external-api-keys \
  --from-literal=api-ninjas-key=YOUR_API_KEY \
  --from-literal=edamam-app-id=YOUR_APP_ID \
  --from-literal=edamam-app-key=YOUR_APP_KEY \
  --namespace=spartan-hub
```

### GitHub Secrets for CI/CD

Required secrets in GitHub repository settings:

| Secret Name | Description |
|-------------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `KUBE_CONFIG_PRODUCTION` | Base64-encoded kubeconfig |
| `KUBE_CONFIG_STAGING` | Base64-encoded kubeconfig (staging) |
| `DOCKER_REGISTRY_PASSWORD` | Container registry password |
| `SNYK_TOKEN` | Snyk security scanning token |
| `SONAR_TOKEN` | SonarQube analysis token |

### Secret Rotation Procedure

```bash
# Rotate database password
# 1. Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# 2. Update database
kubectl exec -n spartan-hub deployment/postgres-primary -- \
  psql -U postgres -c "ALTER USER spartan_admin WITH PASSWORD '$NEW_PASSWORD';"

# 3. Update Kubernetes secret
kubectl create secret generic postgres-credentials \
  --from-literal=password=$NEW_PASSWORD \
  --namespace=spartan-hub \
  --dry-run=client -o yaml | kubectl apply -f -

# 4. Restart backend pods to pick up new secret
kubectl rollout restart deployment/backend -n spartan-hub
```

---

## Environment Variables Reference

### Required Production Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration
DATABASE_TYPE=postgres
POSTGRES_PRIMARY_HOST=<RDS_HOSTNAME>
POSTGRES_PRIMARY_PORT=5432
POSTGRES_DB=spartan_hub_prod
POSTGRES_USER=spartan_admin
POSTGRES_PASSWORD=<STRONG_PASSWORD>

# Redis Configuration
REDIS_HOST=redis-cluster.spartan-hub.internal
REDIS_PORT=6379
REDIS_PASSWORD=<REDIS_PASSWORD>

# Security Configuration
JWT_SECRET=<32_CHAR_MIN_SECRET>
JWT_ALGO=HS256
SESSION_SECRET=<STRONG_SECRET>

# CORS Configuration
CORS_ORIGIN=https://spartan-hub.com

# Logging Configuration
LOG_LEVEL=warn

# External API Keys
API_NINJAS_KEY=<API_KEY>
EXERCISEDB_KEY=<API_KEY>
EDAMAM_APP_ID=<APP_ID>
EDAMAM_APP_KEY=<APP_KEY>
FATSECRET_KEY=<API_KEY>
FATSECRET_SECRET=<SECRET>

# Feature Flags
ENABLE_RATE_LIMITING=true
ENABLE_HELMET_SECURITY=true
ENABLE_CORS=true
ENABLE_METRICS=true
```

### Optional Production Variables

```bash
# Read Replicas
POSTGRES_REPLICA_1_HOST=<REPLICA_HOST_1>
POSTGRES_REPLICA_2_HOST=<REPLICA_HOST_2>
ENABLE_READ_REPLICAS=true
READ_REPLICA_STRATEGY=round-robin

# Connection Pool
POSTGRES_MAX_CLIENTS=50
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=2000

# AI Service
AI_SERVICE_URL=http://ai-microservice:8000
OLLAMA_HOST=https://ollama.spartan-hub.internal:11434

# CDN Configuration
CDN_URL=https://cdn.spartan-hub.com
ASSET_CACHE_TTL=86400
```

---

## Troubleshooting

### Common Issues

#### Database Connection Failures

**Symptoms:**
- Application logs show "ECONNREFUSED" or "connection timeout"
- Health check fails

**Solutions:**
```bash
# Check database pod status
kubectl get pods -n spartan-hub -l app=postgres

# Check database logs
kubectl logs -n spartan-hub deployment/postgres-primary

# Test connection from backend pod
kubectl exec -n spartan-hub deployment/backend -- \
  nc -zv postgres-primary 5432

# Verify secrets
kubectl get secret postgres-credentials -n spartan-hub -o jsonpath='{.data}' | base64 -d
```

#### Redis Connection Issues

**Symptoms:**
- Session data not persisting
- Cache misses increasing

**Solutions:**
```bash
# Check Redis cluster status
kubectl exec -n spartan-hub redis-cluster-0 -- redis-cli cluster info

# Check Redis memory usage
kubectl exec -n spartan-hub redis-cluster-0 -- redis-cli info memory

# Test Redis connection
kubectl exec -n spartan-hub deployment/backend -- \
  redis-cli -h redis-cluster ping
```

#### SSL Certificate Issues

**Symptoms:**
- Browser shows certificate warning
- HTTPS redirect not working

**Solutions:**
```bash
# Check certificate expiry
kubectl get secret spartan-hub-tls -n spartan-hub -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Force certificate renewal
kubectl delete certificate spartan-hub-cert -n spartan-hub
```

#### High Memory Usage

**Symptoms:**
- Pods being OOMKilled
- Performance degradation

**Solutions:**
```bash
# Check memory usage
kubectl top pods -n spartan-hub

# Analyze heap dump
kubectl exec -n spartan-hub deployment/backend -- node --inspect=0.0.0.0:9229

# Increase memory limits
kubectl patch deployment backend -n spartan-hub -p '{"spec":{"template":{"spec":{"containers":[{"name":"backend","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

### Monitoring Commands

```bash
# Check all pods status
kubectl get pods -n spartan-hub -o wide

# Check service endpoints
kubectl get endpoints -n spartan-hub

# Check ingress status
kubectl get ingress -n spartan-hub

# View recent events
kubectl get events -n spartan-hub --sort-by='.lastTimestamp'

# Check resource usage
kubectl top nodes
kubectl top pods -n spartan-hub

# View application logs
kubectl logs -n spartan-hub deployment/backend --tail=100 -f
```

---

## Support

For additional support:
- **Documentation:** See related guides in this repository
- **Issues:** Create GitHub issue with environment details
- **Emergency:** Contact ops@spartan-hub.com

---

*Last Updated: March 1, 2026*  
*Spartan Hub 2.0 - Production Environment Guide*
