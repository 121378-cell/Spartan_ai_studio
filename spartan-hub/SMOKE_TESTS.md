# Smoke Tests Guide - Spartan Hub 2.0
## Production Health Verification Tests

**Version:** 1.0
**Last Updated:** March 1, 2026
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Health Check Tests](#health-check-tests)
4. [Authentication Tests](#authentication-tests)
5. [API Endpoint Tests](#api-endpoint-tests)
6. [Database Connectivity Tests](#database-connectivity-tests)
7. [Redis Connectivity Tests](#redis-connectivity-tests)
8. [Integration Tests](#integration-tests)
9. [Automated Smoke Test Suite](#automated-smoke-test-suite)
10. [CI/CD Integration](#cicd-integration)

---

## Overview

Smoke tests are a subset of tests used to verify that the most critical functionality of Spartan Hub 2.0 is working after deployment. These tests should run quickly (under 5 minutes) and provide confidence that the deployment was successful.

### Test Categories

| Category | Purpose | Frequency | Duration |
|----------|---------|-----------|----------|
| Health Checks | Service availability | Every 30s | < 1s |
| Authentication | Login/logout flow | Post-deployment | < 30s |
| API Endpoints | Core API functionality | Post-deployment | < 60s |
| Database | Connection & queries | Post-deployment | < 30s |
| Redis | Cache connectivity | Post-deployment | < 10s |
| Integration | End-to-end flows | Post-deployment | < 2 min |

### Success Criteria

| Test | Expected Result |
|------|-----------------|
| Health Check | HTTP 200, status: "healthy" |
| Login | JWT token received |
| API Response | HTTP 200, valid JSON |
| Database Query | Query executes < 100ms |
| Redis Ping | PONG response |
| Page Load | < 3 seconds |

---

## Test Environment Setup

### Prerequisites

```bash
# Required tools
npm install -g newman  # For Postman collections
npm install -g k6      # For load testing
pip install requests   # For Python scripts

# Environment variables
export BASE_URL="https://api.spartan-hub.com"
export FRONTEND_URL="https://spartan-hub.com"
export TEST_EMAIL="test@spartan-hub.com"
export TEST_PASSWORD="TestPassword123!"
```

### Test Configuration

```yaml
# smoke-tests-config.yml
base_url: https://api.spartan-hub.com
frontend_url: https://spartan-hub.com
timeout: 5000
retry_count: 3
retry_delay: 1000

credentials:
  test_email: test@spartan-hub.com
  test_password: ${TEST_PASSWORD}

endpoints:
  health: /api/health
  auth_login: /api/auth/login
  auth_logout: /api/auth/logout
  users: /api/users
  workouts: /api/workouts
  challenges: /api/challenges
```

---

## Health Check Tests

### Basic Health Check

```bash
#!/bin/bash
# scripts/smoke-tests/health-check.sh

echo "=== Health Check Tests ==="

# Backend Health
echo "Testing backend health..."
BACKEND_RESPONSE=$(curl -s -w "\n%{http_code}" ${BASE_URL}/api/health)
BACKEND_BODY=$(echo "$BACKEND_RESPONSE" | head -n -1)
BACKEND_STATUS=$(echo "$BACKEND_RESPONSE" | tail -n 1)

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✓ Backend health check passed (HTTP $BACKEND_STATUS)"
    echo "Response: $BACKEND_BODY"
else
    echo "✗ Backend health check failed (HTTP $BACKEND_STATUS)"
    exit 1
fi

# Frontend Health
echo "Testing frontend health..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${FRONTEND_URL})

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✓ Frontend health check passed (HTTP $FRONTEND_STATUS)"
else
    echo "✗ Frontend health check failed (HTTP $FRONTEND_STATUS)"
    exit 1
fi

# Database Health (via API)
echo "Testing database connectivity..."
DB_RESPONSE=$(curl -s ${BASE_URL}/api/health/database)
DB_STATUS=$(echo "$DB_RESPONSE" | jq -r '.status')

if [ "$DB_STATUS" = "connected" ]; then
    echo "✓ Database connectivity check passed"
else
    echo "✗ Database connectivity check failed"
    exit 1
fi

# Redis Health (via API)
echo "Testing Redis connectivity..."
REDIS_RESPONSE=$(curl -s ${BASE_URL}/api/health/redis)
REDIS_STATUS=$(echo "$REDIS_RESPONSE" | jq -r '.status')

if [ "$REDIS_STATUS" = "connected" ]; then
    echo "✓ Redis connectivity check passed"
else
    echo "✗ Redis connectivity check failed"
    exit 1
fi

echo ""
echo "=== All Health Checks Passed ==="
```

### Detailed Health Check Response

```json
// Expected /api/health response
{
  "status": "healthy",
  "timestamp": "2026-03-01T10:00:00.000Z",
  "uptime": 86400,
  "version": "2.0.0",
  "environment": "production",
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 5
    },
    "redis": {
      "status": "connected",
      "responseTime": 2
    },
    "ai": {
      "status": "available",
      "responseTime": 150
    }
  },
  "metrics": {
    "memory": {
      "used": "256MB",
      "total": "512MB"
    },
    "connections": {
      "active": 45,
      "max": 100
    }
  }
}
```

---

## Authentication Tests

### Login/Logout Flow

```bash
#!/bin/bash
# scripts/smoke-tests/auth-tests.sh

echo "=== Authentication Tests ==="

# Test Login
echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | jq -r '.status')
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$LOGIN_STATUS" = "success" ] && [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✓ Login test passed"
    echo "Token received (length: ${#TOKEN})"
else
    echo "✗ Login test failed"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

# Test Token Validation
echo "Testing token validation..."
VALIDATE_RESPONSE=$(curl -s ${BASE_URL}/api/auth/me \
  -H "Authorization: Bearer ${TOKEN}")

VALIDATE_STATUS=$(echo "$VALIDATE_RESPONSE" | jq -r '.status')

if [ "$VALIDATE_STATUS" = "success" ]; then
    echo "✓ Token validation test passed"
else
    echo "✗ Token validation test failed"
    exit 1
fi

# Test Logout
echo "Testing logout..."
LOGOUT_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/logout \
  -H "Authorization: Bearer ${TOKEN}")

LOGOUT_STATUS=$(echo "$LOGOUT_RESPONSE" | jq -r '.status')

if [ "$LOGOUT_STATUS" = "success" ]; then
    echo "✓ Logout test passed"
else
    echo "✗ Logout test failed"
    exit 1
fi

# Test Invalid Credentials
echo "Testing invalid credentials..."
INVALID_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"wrongpassword\"}")

INVALID_STATUS=$(echo "$INVALID_RESPONSE" | jq -r '.status')

if [ "$INVALID_STATUS" = "error" ]; then
    echo "✓ Invalid credentials test passed (correctly rejected)"
else
    echo "✗ Invalid credentials test failed (should have been rejected)"
    exit 1
fi

echo ""
echo "=== All Authentication Tests Passed ==="
```

### JWT Token Tests

```javascript
// smoke-tests/auth-jwt.test.js
const jwt = require('jsonwebtoken');

async function testJWTToken(token) {
  const tests = [];
  
  // Test 1: Token is valid JWT
  try {
    const decoded = jwt.decode(token);
    tests.push({ name: 'Valid JWT format', passed: !!decoded });
  } catch (e) {
    tests.push({ name: 'Valid JWT format', passed: false, error: e.message });
  }
  
  // Test 2: Token has required claims
  const decoded = jwt.decode(token);
  tests.push({ name: 'Has userId claim', passed: !!decoded?.userId });
  tests.push({ name: 'Has email claim', passed: !!decoded?.email });
  tests.push({ name: 'Has exp claim', passed: !!decoded?.exp });
  tests.push({ name: 'Has iat claim', passed: !!decoded?.iat });
  
  // Test 3: Token is not expired
  const now = Math.floor(Date.now() / 1000);
  tests.push({ name: 'Not expired', passed: decoded?.exp > now });
  
  // Test 4: Token was issued recently
  tests.push({ name: 'Recently issued', passed: now - decoded?.iat < 300 });
  
  return tests;
}

module.exports = { testJWTToken };
```

---

## API Endpoint Tests

### Core API Tests

```bash
#!/bin/bash
# scripts/smoke-tests/api-tests.sh

echo "=== API Endpoint Tests ==="

# Get auth token first
TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" \
  | jq -r '.token')

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

# Test Users Endpoint
echo "Testing /api/users endpoint..."
USERS_RESPONSE=$(curl -s ${BASE_URL}/api/users \
  -H "$AUTH_HEADER")
USERS_STATUS=$(echo "$USERS_RESPONSE" | jq -r '.status')

if [ "$USERS_STATUS" = "success" ]; then
    echo "✓ Users endpoint test passed"
else
    echo "✗ Users endpoint test failed"
    exit 1
fi

# Test Workouts Endpoint
echo "Testing /api/workouts endpoint..."
WORKOUTS_RESPONSE=$(curl -s ${BASE_URL}/api/workouts \
  -H "$AUTH_HEADER")
WORKOUTS_STATUS=$(echo "$WORKOUTS_RESPONSE" | jq -r '.status')

if [ "$WORKOUTS_STATUS" = "success" ]; then
    echo "✓ Workouts endpoint test passed"
else
    echo "✗ Workouts endpoint test failed"
    exit 1
fi

# Test Challenges Endpoint
echo "Testing /api/challenges endpoint..."
CHALLENGES_RESPONSE=$(curl -s ${BASE_URL}/api/challenges \
  -H "$AUTH_HEADER")
CHALLENGES_STATUS=$(echo "$CHALLENGES_RESPONSE" | jq -r '.status')

if [ "$CHALLENGES_STATUS" = "success" ]; then
    echo "✓ Challenges endpoint test passed"
else
    echo "✗ Challenges endpoint test failed"
    exit 1
fi

# Test Achievements Endpoint
echo "Testing /api/achievements endpoint..."
ACHIEVEMENTS_RESPONSE=$(curl -s ${BASE_URL}/api/achievements \
  -H "$AUTH_HEADER")
ACHIEVEMENTS_STATUS=$(echo "$ACHIEVEMENTS_RESPONSE" | jq -r '.status')

if [ "$ACHIEVEMENTS_STATUS" = "success" ]; then
    echo "✓ Achievements endpoint test passed"
else
    echo "✗ Achievements endpoint test failed"
    exit 1
fi

# Test Community Endpoint
echo "Testing /api/community endpoint..."
COMMUNITY_RESPONSE=$(curl -s ${BASE_URL}/api/community/posts \
  -H "$AUTH_HEADER")
COMMUNITY_STATUS=$(echo "$COMMUNITY_RESPONSE" | jq -r '.status')

if [ "$COMMUNITY_STATUS" = "success" ]; then
    echo "✓ Community endpoint test passed"
else
    echo "✗ Community endpoint test failed"
    exit 1
fi

# Test AI Endpoint
echo "Testing /api/ai/suggest endpoint..."
AI_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/ai/suggest \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"workout\",\"context\":\"beginner\"}")
AI_STATUS=$(echo "$AI_RESPONSE" | jq -r '.status')

if [ "$AI_STATUS" = "success" ]; then
    echo "✓ AI endpoint test passed"
else
    echo "✗ AI endpoint test failed"
    exit 1
fi

echo ""
echo "=== All API Endpoint Tests Passed ==="
```

### API Response Time Tests

```bash
#!/bin/bash
# scripts/smoke-tests/api-response-time.sh

echo "=== API Response Time Tests ==="

TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" \
  | jq -r '.token')

AUTH_HEADER="Authorization: Bearer ${TOKEN}"
MAX_RESPONSE_TIME=1000  # 1 second

test_endpoint() {
  local name=$1
  local url=$2
  local method=${3:-GET}
  local data=${4:-""}
  
  if [ "$method" = "GET" ]; then
    TIME=$(curl -s -o /dev/null -w "%{time_total}" ${url} -H "$AUTH_HEADER")
  else
    TIME=$(curl -s -o /dev/null -w "%{time_total}" -X ${method} ${url} \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  TIME_MS=$(echo "$TIME * 1000" | bc)
  
  if (( $(echo "$TIME_MS < $MAX_RESPONSE_TIME" | bc -l) )); then
    echo "✓ $name: ${TIME_MS}ms"
    return 0
  else
    echo "✗ $name: ${TIME_MS}ms (exceeded ${MAX_RESPONSE_TIME}ms)"
    return 1
  fi
}

test_endpoint "Users API" "${BASE_URL}/api/users"
test_endpoint "Workouts API" "${BASE_URL}/api/workouts"
test_endpoint "Challenges API" "${BASE_URL}/api/challenges"
test_endpoint "Achievements API" "${BASE_URL}/api/achievements"
test_endpoint "Community API" "${BASE_URL}/api/community/posts"

echo ""
echo "=== Response Time Tests Complete ==="
```

---

## Database Connectivity Tests

### PostgreSQL Connection Tests

```bash
#!/bin/bash
# scripts/smoke-tests/database-tests.sh

echo "=== Database Connectivity Tests ==="

# Database connection parameters
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_NAME=${POSTGRES_DB:-spartan_hub_production}
DB_USER=${POSTGRES_USER:-spartan_user}
DB_PASS=${POSTGRES_PASSWORD}

# Test 1: Basic Connection
echo "Testing basic database connection..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Basic database connection successful"
else
    echo "✗ Basic database connection failed"
    exit 1
fi

# Test 2: Query Users Table
echo "Testing users table query..."
USER_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;")

if [ -n "$USER_COUNT" ]; then
    echo "✓ Users table query successful (count: $USER_COUNT)"
else
    echo "✗ Users table query failed"
    exit 1
fi

# Test 3: Query Workouts Table
echo "Testing workouts table query..."
WORKOUT_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM workouts;")

if [ -n "$WORKOUT_COUNT" ]; then
    echo "✓ Workouts table query successful (count: $WORKOUT_COUNT)"
else
    echo "✗ Workouts table query failed"
    exit 1
fi

# Test 4: Query Challenges Table
echo "Testing challenges table query..."
CHALLENGE_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM challenges;")

if [ -n "$CHALLENGE_COUNT" ]; then
    echo "✓ Challenges table query successful (count: $CHALLENGE_COUNT)"
else
    echo "✗ Challenges table query failed"
    exit 1
fi

# Test 5: Test Write Operation
echo "Testing write operation..."
TEST_ID=$(date +%s)
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
  "INSERT INTO smoke_test_results (id, timestamp, status) VALUES ($TEST_ID, NOW(), 'success') ON CONFLICT (id) DO UPDATE SET timestamp = NOW();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Write operation successful"
    # Cleanup
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \
      "DELETE FROM smoke_test_results WHERE id = $TEST_ID;" > /dev/null 2>&1
else
    echo "✗ Write operation failed"
    exit 1
fi

# Test 6: Query Response Time
echo "Testing query response time..."
START_TIME=$(date +%s%N)
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 100 ]; then
    echo "✓ Query response time acceptable (${RESPONSE_TIME}ms)"
else
    echo "⚠ Query response time high (${RESPONSE_TIME}ms)"
fi

# Test 7: Connection Pool
echo "Testing connection pool..."
ACTIVE_CONNECTIONS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';")
MAX_CONNECTIONS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
  "SHOW max_connections;")

echo "✓ Active connections: $ACTIVE_CONNECTIONS / $MAX_CONNECTIONS"

echo ""
echo "=== All Database Tests Passed ==="
```

### Database Migration Verification

```bash
#!/bin/bash
# scripts/smoke-tests/migration-verify.sh

echo "=== Database Migration Verification ==="

# Run migration status check
cd backend
npm run db:migrate:status

# Verify expected tables exist
TABLES=("users" "workouts" "challenges" "achievements" "community_posts" "user_achievements" "workout_logs")

for table in "${TABLES[@]}"; do
  EXISTS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');")
  
  if [ "$(echo $EXISTS | tr -d ' ')" = "t" ]; then
    echo "✓ Table '$table' exists"
  else
    echo "✗ Table '$table' missing"
    exit 1
  fi
done

echo ""
echo "=== Migration Verification Complete ==="
```

---

## Redis Connectivity Tests

### Redis Connection Tests

```bash
#!/bin/bash
# scripts/smoke-tests/redis-tests.sh

echo "=== Redis Connectivity Tests ==="

REDIS_HOST=${REDIS_HOST:-localhost}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASS=${REDIS_PASSWORD}

# Test 1: Basic Ping
echo "Testing Redis ping..."
PING_RESPONSE=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS ping 2>/dev/null)

if [ "$PING_RESPONSE" = "PONG" ]; then
    echo "✓ Redis ping successful"
else
    echo "✗ Redis ping failed"
    exit 1
fi

# Test 2: Set/Get Test
echo "Testing Redis set/get..."
TEST_KEY="smoke_test:$(date +%s)"
TEST_VALUE="test_value"

redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS SET $TEST_KEY $TEST_VALUE > /dev/null 2>&1
GET_RESPONSE=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS GET $TEST_KEY 2>/dev/null)

if [ "$GET_RESPONSE" = "$TEST_VALUE" ]; then
    echo "✓ Redis set/get successful"
    redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS DEL $TEST_KEY > /dev/null 2>&1
else
    echo "✗ Redis set/get failed"
    exit 1
fi

# Test 3: Redis Info
echo "Testing Redis info..."
REDIS_INFO=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS INFO server 2>/dev/null)

if [ -n "$REDIS_INFO" ]; then
    echo "✓ Redis info accessible"
    USED_MEMORY=$(echo "$REDIS_INFO" | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    echo "  Memory used: $USED_MEMORY"
else
    echo "✗ Redis info failed"
    exit 1
fi

# Test 4: Redis Keys
echo "Testing Redis keys..."
KEY_COUNT=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS DBSIZE 2>/dev/null | awk '{print $2}')

if [ -n "$KEY_COUNT" ]; then
    echo "✓ Redis keys accessible (count: $KEY_COUNT)"
else
    echo "✗ Redis keys failed"
    exit 1
fi

# Test 5: Redis Connection Stats
echo "Testing Redis connection stats..."
CONNECTED_CLIENTS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS INFO clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | tr -d '\r')

if [ -n "$CONNECTED_CLIENTS" ]; then
    echo "✓ Redis connection stats accessible (connected: $CONNECTED_CLIENTS)"
else
    echo "✗ Redis connection stats failed"
    exit 1
fi

# Test 6: Rate Limiting Keys
echo "Testing rate limiting keys..."
RATE_LIMIT_KEYS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS KEYS "ratelimit:*" 2>/dev/null | wc -l)
echo "  Rate limit keys: $RATE_LIMIT_KEYS"

# Test 7: Session Keys
echo "Testing session keys..."
SESSION_KEYS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS KEYS "session:*" 2>/dev/null | wc -l)
echo "  Session keys: $SESSION_KEYS"

# Test 8: Cache Keys
echo "Testing cache keys..."
CACHE_KEYS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS KEYS "cache:*" 2>/dev/null | wc -l)
echo "  Cache keys: $CACHE_KEYS"

echo ""
echo "=== All Redis Tests Passed ==="
```

---

## Integration Tests

### End-to-End User Flow

```bash
#!/bin/bash
# scripts/smoke-tests/integration-tests.sh

echo "=== Integration Tests ==="

BASE_URL=${BASE_URL:-https://api.spartan-hub.com}
TEST_EMAIL="test@spartan-hub.com"
TEST_PASSWORD="TestPassword123!"

# Full User Flow Test
echo "Running full user flow test..."

# Step 1: Register new user (if needed)
echo "Step 1: User registration..."
REGISTER_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"${TEST_EMAIL}\",
    \"password\":\"${TEST_PASSWORD}\",
    \"name\":\"Test User\",
    \"fitness_level\":\"beginner\"
  }")

REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | jq -r '.status')
if [ "$REGISTER_STATUS" = "success" ] || [ "$REGISTER_STATUS" = "error" ]; then
    echo "✓ Registration endpoint working"
else
    echo "✗ Registration endpoint failed"
fi

# Step 2: Login
echo "Step 2: User login..."
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✓ Login successful"
else
    echo "✗ Login failed"
    exit 1
fi

AUTH_HEADER="Authorization: Bearer ${TOKEN}"

# Step 3: Get user profile
echo "Step 3: Get user profile..."
PROFILE_RESPONSE=$(curl -s ${BASE_URL}/api/users/me \
  -H "$AUTH_HEADER")
PROFILE_STATUS=$(echo "$PROFILE_RESPONSE" | jq -r '.status')

if [ "$PROFILE_STATUS" = "success" ]; then
    echo "✓ Profile retrieval successful"
else
    echo "✗ Profile retrieval failed"
    exit 1
fi

# Step 4: Create workout
echo "Step 4: Create workout..."
WORKOUT_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/workouts \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Smoke Test Workout\",
    \"description\":\"Test workout created by smoke test\",
    \"exercises\":[{\"name\":\"Push-ups\",\"sets\":3,\"reps\":10}]
  }")

WORKOUT_STATUS=$(echo "$WORKOUT_RESPONSE" | jq -r '.status')
WORKOUT_ID=$(echo "$WORKOUT_RESPONSE" | jq -r '.workout.id')

if [ "$WORKOUT_STATUS" = "success" ]; then
    echo "✓ Workout creation successful (ID: $WORKOUT_ID)"
else
    echo "✗ Workout creation failed"
    exit 1
fi

# Step 5: Get workouts list
echo "Step 5: Get workouts list..."
WORKOUTS_RESPONSE=$(curl -s ${BASE_URL}/api/workouts \
  -H "$AUTH_HEADER")
WORKOUTS_STATUS=$(echo "$WORKOUTS_RESPONSE" | jq -r '.status')

if [ "$WORKOUTS_STATUS" = "success" ]; then
    echo "✓ Workouts list retrieval successful"
else
    echo "✗ Workouts list retrieval failed"
    exit 1
fi

# Step 6: Log workout
echo "Step 6: Log workout..."
LOG_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/workouts/${WORKOUT_ID}/log \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{
    \"completed\":true,
    \"duration\":300,
    \"notes\":\"Smoke test workout log\"
  }")

LOG_STATUS=$(echo "$LOG_RESPONSE" | jq -r '.status')

if [ "$LOG_STATUS" = "success" ]; then
    echo "✓ Workout logging successful"
else
    echo "✗ Workout logging failed"
    exit 1
fi

# Step 7: Get achievements
echo "Step 7: Get achievements..."
ACHIEVEMENTS_RESPONSE=$(curl -s ${BASE_URL}/api/achievements \
  -H "$AUTH_HEADER")
ACHIEVEMENTS_STATUS=$(echo "$ACHIEVEMENTS_RESPONSE" | jq -r '.status')

if [ "$ACHIEVEMENTS_STATUS" = "success" ]; then
    echo "✓ Achievements retrieval successful"
else
    echo "✗ Achievements retrieval failed"
    exit 1
fi

# Step 8: Get challenges
echo "Step 8: Get challenges..."
CHALLENGES_RESPONSE=$(curl -s ${BASE_URL}/api/challenges \
  -H "$AUTH_HEADER")
CHALLENGES_STATUS=$(echo "$CHALLENGES_RESPONSE" | jq -r '.status')

if [ "$CHALLENGES_STATUS" = "success" ]; then
    echo "✓ Challenges retrieval successful"
else
    echo "✗ Challenges retrieval failed"
    exit 1
fi

# Step 9: AI suggestion
echo "Step 9: Get AI suggestion..."
AI_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/ai/suggest \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"workout\",\"context\":\"beginner\"}")
AI_STATUS=$(echo "$AI_RESPONSE" | jq -r '.status')

if [ "$AI_STATUS" = "success" ]; then
    echo "✓ AI suggestion successful"
else
    echo "✗ AI suggestion failed"
    exit 1
fi

# Step 10: Logout
echo "Step 10: Logout..."
LOGOUT_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/auth/logout \
  -H "$AUTH_HEADER")
LOGOUT_STATUS=$(echo "$LOGOUT_RESPONSE" | jq -r '.status')

if [ "$LOGOUT_STATUS" = "success" ]; then
    echo "✓ Logout successful"
else
    echo "✗ Logout failed"
    exit 1
fi

echo ""
echo "=== All Integration Tests Passed ==="
```

---

## Automated Smoke Test Suite

### Node.js Test Suite

```javascript
// smoke-tests/smoke-test-suite.js
const axios = require('axios');
const assert = require('assert');

const config = {
  baseUrl: process.env.BASE_URL || 'https://api.spartan-hub.com',
  frontendUrl: process.env.FRONTEND_URL || 'https://spartan-hub.com',
  testEmail: process.env.TEST_EMAIL || 'test@spartan-hub.com',
  testPassword: process.env.TEST_PASSWORD || 'TestPassword123!',
  timeout: 5000
};

class SmokeTestSuite {
  constructor() {
    this.token = null;
    this.results = [];
  }

  async run() {
    console.log('=== Spartan Hub Smoke Test Suite ===\n');
    
    try {
      await this.testHealthCheck();
      await this.testAuthentication();
      await this.testAPIEndpoints();
      await this.testDatabase();
      await this.testRedis();
      await this.testIntegration();
      
      this.printResults();
      process.exit(0);
    } catch (error) {
      console.error(`\n✗ Test suite failed: ${error.message}`);
      this.printResults();
      process.exit(1);
    }
  }

  async test(name, fn) {
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      this.results.push({ name, passed: true, duration });
      console.log(`✓ ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      this.results.push({ name, passed: false, duration, error: error.message });
      console.error(`✗ ${name}: ${error.message}`);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('\n--- Health Check Tests ---');
    
    await this.test('Backend health check', async () => {
      const response = await axios.get(`${config.baseUrl}/api/health`, { timeout: config.timeout });
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.status, 'healthy');
    });

    await this.test('Frontend health check', async () => {
      const response = await axios.get(config.frontendUrl, { timeout: config.timeout });
      assert.strictEqual(response.status, 200);
    });
  }

  async testAuthentication() {
    console.log('\n--- Authentication Tests ---');
    
    await this.test('User login', async () => {
      const response = await axios.post(`${config.baseUrl}/api/auth/login`, {
        email: config.testEmail,
        password: config.testPassword
      }, { timeout: config.timeout });
      
      assert.strictEqual(response.data.status, 'success');
      assert.ok(response.data.token);
      this.token = response.data.token;
    });

    await this.test('Token validation', async () => {
      const response = await axios.get(`${config.baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: config.timeout
      });
      assert.strictEqual(response.data.status, 'success');
    });

    await this.test('Invalid credentials rejection', async () => {
      try {
        await axios.post(`${config.baseUrl}/api/auth/login`, {
          email: config.testEmail,
          password: 'wrongpassword'
        }, { timeout: config.timeout });
        throw new Error('Should have been rejected');
      } catch (error) {
        assert.strictEqual(error.response?.data?.status, 'error');
      }
    });
  }

  async testAPIEndpoints() {
    console.log('\n--- API Endpoint Tests ---');
    
    const endpoints = [
      { name: 'Users API', path: '/api/users' },
      { name: 'Workouts API', path: '/api/workouts' },
      { name: 'Challenges API', path: '/api/challenges' },
      { name: 'Achievements API', path: '/api/achievements' },
      { name: 'Community API', path: '/api/community/posts' }
    ];

    for (const endpoint of endpoints) {
      await this.test(endpoint.name, async () => {
        const response = await axios.get(`${config.baseUrl}${endpoint.path}`, {
          headers: { Authorization: `Bearer ${this.token}` },
          timeout: config.timeout
        });
        assert.strictEqual(response.data.status, 'success');
      });
    }
  }

  async testDatabase() {
    console.log('\n--- Database Tests ---');
    
    await this.test('Database connectivity', async () => {
      const response = await axios.get(`${config.baseUrl}/api/health/database`, {
        timeout: config.timeout
      });
      assert.strictEqual(response.data.status, 'connected');
    });
  }

  async testRedis() {
    console.log('\n--- Redis Tests ---');
    
    await this.test('Redis connectivity', async () => {
      const response = await axios.get(`${config.baseUrl}/api/health/redis`, {
        timeout: config.timeout
      });
      assert.strictEqual(response.data.status, 'connected');
    });
  }

  async testIntegration() {
    console.log('\n--- Integration Tests ---');
    
    await this.test('Create and retrieve workout', async () => {
      // Create workout
      const createResponse = await axios.post(`${config.baseUrl}/api/workouts`, {
        name: 'Smoke Test Workout',
        description: 'Test workout',
        exercises: [{ name: 'Push-ups', sets: 3, reps: 10 }]
      }, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: config.timeout
      });
      
      assert.strictEqual(createResponse.data.status, 'success');
      const workoutId = createResponse.data.workout.id;
      
      // Retrieve workout
      const getResponse = await axios.get(`${config.baseUrl}/api/workouts/${workoutId}`, {
        headers: { Authorization: `Bearer ${this.token}` },
        timeout: config.timeout
      });
      
      assert.strictEqual(getResponse.data.status, 'success');
    });
  }

  printResults() {
    console.log('\n=== Test Results ===');
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`Total: ${this.results.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Duration: ${totalDuration}ms`);
  }
}

// Run tests
const suite = new SmokeTestSuite();
suite.run();
```

### Package.json Scripts

```json
{
  "scripts": {
    "smoke:test": "node smoke-tests/smoke-test-suite.js",
    "smoke:test:ci": "BASE_URL=https://api.staging.spartan-hub.com node smoke-tests/smoke-test-suite.js",
    "smoke:test:prod": "BASE_URL=https://api.spartan-hub.com node smoke-tests/smoke-test-suite.js"
  }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/smoke-tests.yml
name: Smoke Tests

on:
  deployment_status:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to test'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  smoke-tests:
    name: Run Smoke Tests
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success' || github.event_name == 'workflow_dispatch'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd spartan-hub
          npm ci

      - name: Set environment variables
        run: |
          if [ "${{ github.event_name }}" == "deployment_status" ]; then
            echo "BASE_URL=${{ github.event.deployment_status.environment_url }}/api" >> $GITHUB_ENV
          else
            if [ "${{ github.event.inputs.environment }}" == "production" ]; then
              echo "BASE_URL=https://api.spartan-hub.com" >> $GITHUB_ENV
            else
              echo "BASE_URL=https://api.staging.spartan-hub.com" >> $GITHUB_ENV
            fi
          fi
          echo "TEST_EMAIL=${{ secrets.TEST_USER_EMAIL }}" >> $GITHUB_ENV
          echo "TEST_PASSWORD=${{ secrets.TEST_USER_PASSWORD }}" >> $GITHUB_ENV

      - name: Run smoke tests
        run: |
          cd spartan-hub
          npm run smoke:test

      - name: Notify results
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Smoke Tests ${{ job.status }}
            Environment: ${{ github.event.inputs.environment || 'staging' }}
            Run: ${{ github.run_id }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Post-Deployment Hook

```yaml
# .github/workflows/post-deploy-smoke-tests.yml
name: Post-Deployment Smoke Tests

on:
  workflow_run:
    workflows: ["Deploy to Production"]
    types:
      - completed

jobs:
  smoke-tests:
    name: Run Post-Deployment Smoke Tests
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd spartan-hub
          npm ci

      - name: Wait for deployment to stabilize
        run: sleep 60

      - name: Run smoke tests
        env:
          BASE_URL: https://api.spartan-hub.com
          TEST_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: |
          cd spartan-hub
          npm run smoke:test:prod

      - name: Rollback if tests fail
        if: failure()
        run: |
          echo "::error::Smoke tests failed. Manual rollback may be required."
```

---

## Quick Reference

### Run All Smoke Tests

```bash
# Local testing
npm run smoke:test

# Staging environment
npm run smoke:test:ci

# Production environment
npm run smoke:test:prod

# Individual test categories
./scripts/smoke-tests/health-check.sh
./scripts/smoke-tests/auth-tests.sh
./scripts/smoke-tests/api-tests.sh
./scripts/smoke-tests/database-tests.sh
./scripts/smoke-tests/redis-tests.sh
./scripts/smoke-tests/integration-tests.sh
```

### Expected Response Times

| Test | Target | Warning | Critical |
|------|--------|---------|----------|
| Health Check | < 100ms | > 500ms | > 1000ms |
| Login | < 500ms | > 1000ms | > 2000ms |
| API GET | < 200ms | > 500ms | > 1000ms |
| API POST | < 500ms | > 1000ms | > 2000ms |
| Database Query | < 50ms | > 100ms | > 500ms |
| Redis Ping | < 10ms | > 50ms | > 100ms |

---

**Document Created:** March 1, 2026
**Next Review:** After production deployment
**Owner:** QA Team

---

<p align="center">
  <strong>🧪 Spartan Hub 2.0 - Smoke Tests Guide</strong><br>
  <em>Verify Production Health in Minutes</em>
</p>
