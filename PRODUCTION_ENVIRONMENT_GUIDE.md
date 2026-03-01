# 🔧 PRODUCTION ENVIRONMENT CONFIGURATION GUIDE
## Spartan Hub 2.0

**Version:** 2.0.0  
**Last Updated:** March 1, 2026  
**Status:** ✅ Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Environment Files](#environment-files)
3. [Secret Management](#secret-management)
4. [Database Configuration](#database-configuration)
5. [Redis Configuration](#redis-configuration)
6. [Security Configuration](#security-configuration)
7. [Deployment Checklist](#deployment-checklist)

---

## 📖 OVERVIEW

This guide covers the complete configuration required for deploying Spartan Hub 2.0 to production. The application supports both SQLite (for small deployments) and PostgreSQL (recommended for production).

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Production Environment                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │   Frontend  │────▶│   Backend   │────▶│  PostgreSQL │  │
│  │   (Vite)    │     │  (Node.js)  │     │  (Primary)  │  │
│  └─────────────┘     └─────────────┘     └─────────────┘  │
│         │                   │                    │          │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │     CDN     │     │    Redis    │────▶│   Replicas  │  │
│  │ (Optional)  │     │   (Cache)   │     │  (Read)     │  │
│  └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 ENVIRONMENT FILES

### Required Files

| File | Purpose | Location |
|------|---------|----------|
| `.env.production` | Production configuration | `spartan-hub/` |
| `.env.production` | Backend production config | `spartan-hub/backend/` |
| `.env.staging` | Staging configuration | `spartan-hub/` |
| `.env.staging` | Backend staging config | `spartan-hub/backend/` |

### Template Files

Template files are provided for reference:
- `.env.production.example`
- `.env.staging.example`

**Never commit actual `.env` files to version control!**

---

## 🔐 SECRET MANAGEMENT

### Required Secrets

The following secrets must be stored securely and never committed to code:

| Secret | Purpose | Generation Command |
|--------|---------|-------------------|
| `JWT_SECRET` | JWT token signing | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SESSION_SECRET` | Session cookie signing | Same as above |
| `POSTGRES_PASSWORD` | Database password | Use strong password generator |
| `REDIS_PASSWORD` | Redis authentication | Same as above |
| `GROQ_API_KEY` | AI service API key | From https://console.groq.com/keys |
| `SMTP_PASSWORD` | Email service password | From your email provider |

### Recommended Secret Managers

1. **GitHub Secrets** (for CI/CD)
   - Free for public repositories
   - Integrated with GitHub Actions
   - Encrypted at rest

2. **AWS Secrets Manager**
   - Automatic rotation
   - Fine-grained access control
   - Audit logging

3. **HashiCorp Vault**
   - Self-hosted option
   - Dynamic secrets
   - Multi-cloud support

4. **Doppler**
   - Developer-friendly
   - Environment sync
   - Secret versioning

### Using GitHub Secrets

```yaml
# In your GitHub Actions workflow
env:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
  GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

---

## 🗄️ DATABASE CONFIGURATION

### Option 1: SQLite (Small Deployments)

**Best for:**
- Single server deployments
- < 1000 concurrent users
- Development/testing

**Configuration:**
```env
DATABASE_TYPE=sqlite
DB_PATH=./data/spartan_hub_production.db
```

**Pros:**
- Simple setup
- No external dependencies
- Good for small scale

**Cons:**
- Limited concurrency
- No read replicas
- Single point of failure

---

### Option 2: PostgreSQL (Recommended)

**Best for:**
- Production deployments
- > 1000 concurrent users
- High availability requirements

**Configuration:**
```env
DATABASE_TYPE=postgres
POSTGRES_PRIMARY_HOST=your-db-host.com
POSTGRES_PRIMARY_PORT=5432
POSTGRES_DB=spartan_hub_production
POSTGRES_USER=spartan_prod_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD_FROM_SECRET_MANAGER}
POSTGRES_SSL=require

# Connection Pool
POSTGRES_MAX_CLIENTS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=10000
```

**Read Replicas (Optional):**
```env
ENABLE_READ_REPLICAS=true
POSTGRES_REPLICA_1_HOST=replica-1-host.com
POSTGRES_REPLICA_2_HOST=replica-2-host.com
READ_REPLICA_STRATEGY=round-robin
```

**Pros:**
- High availability
- Read replicas for scaling
- ACID compliance
- Advanced features

**Cons:**
- More complex setup
- Requires database management

---

### Database Migration

**Running Migrations in Production:**

```bash
# Navigate to backend directory
cd spartan-hub/backend

# Run migrations
npm run migrate

# Verify migrations
npm run db:verify
```

**Best Practices:**
1. Always backup before migrating
2. Test migrations in staging first
3. Run during low-traffic periods
4. Monitor migration progress
5. Have rollback plan ready

---

## 🔴 REDIS CONFIGURATION

### Purpose

Redis is used for:
- Rate limiting (required in production)
- Session caching
- Biometric data caching
- Real-time features

### Configuration

```env
REDIS_URL=redis://your-redis-host:6379
REDIS_TLS_ENABLED=true
REDIS_PASSWORD=${REDIS_PASSWORD_FROM_SECRET_MANAGER}
REDIS_CONNECTION_POOL_SIZE=10
```

### Redis Cluster (Recommended for High Traffic)

```env
REDIS_URL=redis://node1:6379,node2:6379,node3:6379
REDIS_CLUSTER_ENABLED=true
REDIS_TLS_ENABLED=true
```

### Redis Security

1. **Enable TLS:** Always use encrypted connections
2. **Password Protection:** Require authentication
3. **Network Isolation:** Keep Redis in private network
4. **Memory Limits:** Set maxmemory policy

```conf
# Redis configuration
requirepass your-strong-password
tls-port 6379
port 0  # Disable non-TLS
maxmemory 2gb
maxmemory-policy allkeys-lru
```

---

## 🔒 SECURITY CONFIGURATION

### JWT Configuration

```env
JWT_SECRET=${JWT_SECRET_FROM_SECRET_MANAGER}
JWT_ALGO=HS256
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

**Best Practices:**
- Use HS256 or RS256 algorithm
- Short expiration for access tokens (15-30 min)
- Longer expiration for refresh tokens (7-30 days)
- Rotate secrets periodically

### Cookie Security

```env
COOKIE_SECURE=true          # Only send over HTTPS
COOKIE_HTTP_ONLY=true       # Prevent XSS access
COOKIE_SAME_SITE=strict     # Prevent CSRF
COOKIE_DOMAIN=.your-domain.com
```

### CSRF Protection

```env
CSRF_ENABLED=true
CSRF_COOKIE_SECURE=true
CSRF_COOKIE_HTTP_ONLY=true
```

### Rate Limiting

```env
RATE_LIMIT_GLOBAL=100           # 100 requests per 15 min
RATE_LIMIT_AUTH=5               # 5 login attempts per 15 min
RATE_LIMIT_API=200              # 200 API calls per 15 min
RATE_LIMIT_HEAVY_API=20         # 20 heavy operations per 15 min
```

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Secrets stored in secret manager
- [ ] Database configured and accessible
- [ ] Redis configured and tested
- [ ] SSL certificates valid
- [ ] Domain DNS configured
- [ ] Backup procedures tested

### Security

- [ ] JWT_SECRET generated (min 32 chars)
- [ ] SESSION_SECRET generated (min 32 chars)
- [ ] Database password strong
- [ ] Redis password set
- [ ] HTTPS enforced
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured (no `*`)

### Database

- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] User created with proper permissions
- [ ] SSL enabled
- [ ] Connection pool configured
- [ ] Migrations run successfully
- [ ] Backup procedure tested

### Redis

- [ ] Redis installed and running
- [ ] Password authentication enabled
- [ ] TLS enabled (if possible)
- [ ] Connection tested from app server
- [ ] Memory limits configured

### Monitoring

- [ ] Logging configured (info level)
- [ ] Health check endpoint accessible
- [ ] Error tracking configured
- [ ] Performance monitoring enabled

### Post-Deployment

- [ ] Application starts successfully
- [ ] Health check returns 200
- [ ] Login/logout works
- [ ] Database queries working
- [ ] Redis caching working
- [ ] Rate limiting active
- [ ] No errors in logs
- [ ] Performance acceptable

---

## 📊 ENVIRONMENT COMPARISON

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| `NODE_ENV` | development | staging | production |
| `LOG_LEVEL` | debug | debug | info |
| `DATABASE_TYPE` | sqlite | postgres | postgres |
| `COOKIE_SECURE` | false | true | true |
| `RATE_LIMIT` | relaxed | moderate | strict |
| `AI_PROVIDER` | local | groq | groq |
| `REDIS` | optional | required | required |
| `HTTPS` | optional | required | required |

---

## 🔧 TROUBLESHOOTING

### Database Connection Issues

**Problem:** Cannot connect to database

```bash
# Test connection
psql -h your-db-host -U spartan_prod_user -d spartan_hub_production

# Check SSL
psql "sslmode=require" -h your-db-host -U spartan_prod_user -d spartan_hub_production
```

### Redis Connection Issues

**Problem:** Cannot connect to Redis

```bash
# Test connection
redis-cli -h your-redis-host -a your-password ping

# Test with TLS
redis-cli -h your-redis-host -a your-password --tls ping
```

### Environment Variable Issues

**Problem:** Application not reading environment variables

```bash
# Check current environment
echo $NODE_ENV
echo $DATABASE_TYPE

# List all environment variables
env | grep -E '(JWT|SESSION|DATABASE|REDIS)'
```

---

## 📞 SUPPORT

For issues or questions:
- Check existing documentation
- Review error logs
- Contact DevOps team

---

**Document Version:** 1.0  
**Last Reviewed:** March 1, 2026  
**Next Review:** After first production deployment
