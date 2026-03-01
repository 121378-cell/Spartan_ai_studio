# Spartan Hub 2.0 - Local Multi-User Test Environment Setup

> **Complete local environment for 2 test users with full features, databases, Terra integration, and real-time AI.**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (10 Minutes)](#quick-start-10-minutes)
4. [Test User Credentials](#test-user-credentials)
5. [Service Endpoints](#service-endpoints)
6. [Feature Checklist](#feature-checklist)
7. [Detailed Setup Instructions](#detailed-setup-instructions)
8. [Troubleshooting](#troubleshooting)
9. [Development Workflow](#development-workflow)

---

## 🎯 Overview

This local test environment provides:

| Component | Technology | Port |
|-----------|------------|------|
| PostgreSQL Database | PostgreSQL 15 | 5432 |
| Redis Cache | Redis 7 | 6379 |
| Qdrant Vector DB | Qdrant | 6333 |
| Ollama LLM | Ollama | 11434 |
| AI Microservice | FastAPI (Python) | 8000 |
| Backend API | Node.js/Express | 3001 |
| Frontend | React/Vite | 5173 |
| Mock Terra Service | Node.js/Express | 8080 |
| MediaPipe Service | Python/FastAPI | 8001 |

### Test Data Included

- ✅ 2 complete test user accounts
- ✅ 30 days of workout history per user
- ✅ 30 days of biometric data (HRV, RHR, sleep, steps, stress)
- ✅ 10 AI coaching conversations per user
- ✅ 5 achievements unlocked per user
- ✅ 3 active challenges per user
- ✅ 2 connected wearable devices per user (simulated)

---

## 🛠️ Prerequisites

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| Docker Desktop | 4.20+ | [docker.com](https://www.docker.com/products/docker-desktop) |
| Node.js | 18.x | [nodejs.org](https://nodejs.org) |
| Python | 3.11+ | [python.org](https://www.python.org) |
| Git | Latest | [git-scm.com](https://git-scm.com) |

### Verify Installation

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js
node --version
npm --version

# Check Python
python --version
pip --version
```

### Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 8 GB | 16 GB |
| CPU | 4 cores | 8 cores |
| Disk | 10 GB free | 20 GB free |

---

## 🚀 Quick Start (10 Minutes)

### Step 1: Clone and Navigate (1 minute)

```bash
# Navigate to project directory
cd "C:\Proyectos\Spartan hub 2.0 - codex - copia"
```

### Step 2: Start All Services (5 minutes)

```bash
# Start all Docker services
docker-compose -f docker-compose.local-test.yml up -d --build

# Watch startup logs
docker-compose -f docker-compose.local-test.yml logs -f
```

**Wait for all services to be healthy** (look for "healthy" status):

```bash
# Check service status
docker-compose -f docker-compose.local-test.yml ps
```

### Step 3: Seed Test Data (2 minutes)

```bash
# Install dependencies (if needed)
npm install

# Run seed script to create test users
npx ts-node scripts/seed-test-users.ts
```

### Step 4: Access Application (1 minute)

Open your browser and navigate to:

```
http://localhost:5173
```

### Step 5: Login (1 minute)

Use the test credentials below to login.

---

## 👤 Test User Credentials

### User 1: Alex Tester (Intermediate)

| Field | Value |
|-------|-------|
| **Email** | `test1@local.test` |
| **Password** | `TestUser123!` |
| **Fitness Level** | Intermediate |
| **Primary Goal** | Hypertrophy (Muscle Building) |
| **Age** | 30 |
| **Weight** | 75 kg |
| **Height** | 178 cm |
| **Workout Frequency** | 4 days/week |
| **Preferred Time** | Morning |

### User 2: Jordan Tester (Beginner)

| Field | Value |
|-------|-------|
| **Email** | `test2@local.test` |
| **Password** | `TestUser123!` |
| **Fitness Level** | Beginner |
| **Primary Goal** | Fat Loss |
| **Age** | 25 |
| **Weight** | 68 kg |
| **Height** | 165 cm |
| **Workout Frequency** | 3 days/week |
| **Preferred Time** | Evening |

---

## 🔗 Service Endpoints

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React application |
| **Backend API** | http://localhost:3001 | REST API |
| **API Health** | http://localhost:3001/health | Backend health check |
| **AI Service** | http://localhost:8000 | AI microservice |
| **AI Health** | http://localhost:8000/health | AI health check |
| **Mock Terra** | http://localhost:8080 | Simulated Terra webhooks |
| **Terra Health** | http://localhost:8080/health | Terra service health |
| **Ollama** | http://localhost:11434 | Local LLM |
| **Ollama Models** | http://localhost:11434/api/tags | List models |
| **Qdrant** | http://localhost:6333 | Vector database |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | Web UI |
| **MediaPipe** | http://localhost:8001 | Pose detection |

---

## ✅ Feature Checklist

### Authentication & Users
- [ ] User registration
- [ ] User login/logout
- [ ] JWT token authentication
- [ ] Session management
- [ ] Password reset (simulated)

### Workout Tracking
- [ ] View workout history (30 days)
- [ ] Log new workouts
- [ ] Exercise library
- [ ] Workout templates
- [ ] Workout statistics

### Biometric Data
- [ ] HRV (Heart Rate Variability)
- [ ] Resting Heart Rate
- [ ] Sleep tracking
- [ ] Step count
- [ ] Stress levels
- [ ] Recovery index

### AI Coaching
- [ ] Real-time chat with AI coach
- [ ] Workout recommendations
- [ ] Recovery advice
- [ ] Nutrition guidance
- [ ] Motivation messages

### Wearable Integration (Simulated)
- [ ] Garmin Connect
- [ ] Apple Health
- [ ] Google Fit
- [ ] Real-time data streaming

### Achievements & Challenges
- [ ] View unlocked achievements
- [ ] Active challenges
- [ ] Progress tracking
- [ ] Reward system

### Terra Integration (Mock)
- [ ] Webhook callbacks
- [ ] Data synchronization
- [ ] Provider switching

---

## 📖 Detailed Setup Instructions

### Starting Services Individually

```bash
# Start only database services
docker-compose -f docker-compose.local-test.yml up -d postgres redis qdrant

# Start AI services
docker-compose -f docker-compose.local-test.yml up -d ollama ai-service

# Start backend
docker-compose -f docker-compose.local-test.yml up -d backend

# Start frontend
docker-compose -f docker-compose.local-test.yml up -d frontend

# Start mock Terra service
docker-compose -f docker-compose.local-test.yml up -d mock-terra
```

### Stopping Services

```bash
# Stop all services
docker-compose -f docker-compose.local-test.yml down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.local-test.yml down -v
```

### Viewing Logs

```bash
# All services
docker-compose -f docker-compose.local-test.yml logs -f

# Specific service
docker-compose -f docker-compose.local-test.yml logs -f backend
docker-compose -f docker-compose.local-test.yml logs -f ai-service
docker-compose -f docker-compose.local-test.yml logs -f frontend
```

### Running the Seed Script Manually

```bash
# Navigate to project root
cd "C:\Proyectos\Spartan hub 2.0 - codex - copia"

# Run seed script
npx ts-node scripts/seed-test-users.ts

# Output files created:
# - scripts/test-user-credentials.json
# - scripts/seed-data.json
```

### Testing Mock Terra Service

```bash
# Check service status
curl http://localhost:8080/health

# Start real-time streaming for User 1
curl -X POST http://localhost:8080/stream/start/test-user-001

# Simulate HRV data update
curl -X POST http://localhost:8080/simulate/test-user-001/hrv

# Stop streaming
curl -X DELETE http://localhost:8080/stream/stop/test-user-001

# View status
curl http://localhost:8080/status
```

### Testing AI Service

```bash
# Check AI service health
curl http://localhost:8000/health

# Test embeddings endpoint
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "What is the best workout for hypertrophy?"}'

# Test alert prediction
curl -X POST http://localhost:8000/predict_alert \
  -H "Content-Type: application/json" \
  -d '{
    "recovery_score": 75,
    "habit_adherence": 4,
    "stress_level": 3,
    "sleep_quality": 4,
    "workout_frequency": 4
  }'
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it spartan_local_postgres psql -U postgres -d spartan_db

# Useful queries:
# List all users
SELECT id, email, name FROM users;

# List workouts for User 1
SELECT type, date, duration FROM workouts WHERE user_id = 'test-user-001';

# List biometric data
SELECT date, recovery_index FROM biometric_data WHERE user_id = 'test-user-001';

# Count records
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM workouts) as workouts,
  (SELECT COUNT(*) FROM biometric_data) as biometrics,
  (SELECT COUNT(*) FROM ai_conversations) as conversations;
```

### Redis Access

```bash
# Connect to Redis
docker exec -it spartan_local_redis redis-cli

# Useful commands:
KEYS *
GET spartan:session:*
HGETALL spartan:user:test-user-001
```

### Qdrant Vector DB Access

```bash
# Access Qdrant dashboard
# Open browser: http://localhost:6333/dashboard

# List collections via API
curl http://localhost:6333/collections

# Check collection info
curl http://localhost:6333/collections/spartan_knowledge
```

### Ollama LLM Access

```bash
# List downloaded models
curl http://localhost:11434/api/tags

# Pull a model (if needed)
docker exec spartan_local_ollama ollama pull gemma2:2b

# Test model
docker exec spartan_local_ollama ollama run gemma2:2b "Hello, how are you?"
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use

**Error:** `Bind for 0.0.0.0:5432 failed: port is already allocated`

**Solution:**
```bash
# Find process using the port
netstat -ano | findstr :5432

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Or change the port in docker-compose.local-test.yml
```

#### 2. Docker Services Won't Start

**Error:** `Container exited with code 1`

**Solution:**
```bash
# Check logs
docker-compose -f docker-compose.local-test.yml logs <service-name>

# Rebuild containers
docker-compose -f docker-compose.local-test.yml up -d --build --force-recreate

# Clear Docker cache
docker system prune -a
```

#### 3. Database Connection Failed

**Error:** `ECONNREFUSED` or connection timeout

**Solution:**
```bash
# Check if PostgreSQL is healthy
docker-compose -f docker-compose.local-test.yml ps postgres

# Restart PostgreSQL
docker-compose -f docker-compose.local-test.yml restart postgres

# Verify connection string in backend .env
```

#### 4. Ollama Model Not Found

**Error:** `model 'gemma2:2b' not found`

**Solution:**
```bash
# Pull the model
docker exec spartan_local_ollama ollama pull gemma2:2b

# Wait for download to complete (may take several minutes)
# Check progress:
docker exec spartan_local_ollama ollama list
```

#### 5. Frontend Won't Connect to Backend

**Error:** `Network Error` or CORS issues

**Solution:**
```bash
# Verify backend is running
curl http://localhost:3001/health

# Check CORS configuration in backend
# Ensure CORS_ORIGIN=http://localhost:5173

# Restart both services
docker-compose -f docker-compose.local-test.yml restart backend frontend
```

#### 6. Seed Script Fails

**Error:** `Cannot find module` or TypeScript errors

**Solution:**
```bash
# Install dependencies
npm install

# Install ts-node globally if needed
npm install -g ts-node

# Run with explicit path
npx ts-node --project spartan-hub/tsconfig.json scripts/seed-test-users.ts
```

#### 7. Mock Terra Service Not Receiving Data

**Solution:**
```bash
# Check if service is running
curl http://localhost:8080/health

# Register webhook subscription
curl -X POST http://localhost:8080/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "webhookUrl": "http://localhost:3001/api/terra/webhook",
    "events": ["USER_DATA_UPDATED"]
  }'

# Start streaming
curl -X POST http://localhost:8080/stream/start/test-user-001
```

### Health Check Commands

```bash
# Check all services at once
echo "=== Service Health Check ==="
echo ""
echo "PostgreSQL:"
docker exec spartan_local_postgres pg_isready -U postgres
echo ""
echo "Redis:"
docker exec spartan_local_redis redis-cli ping
echo ""
echo "Backend:"
curl -s http://localhost:3001/health | jq .
echo ""
echo "AI Service:"
curl -s http://localhost:8000/health | jq .
echo ""
echo "Mock Terra:"
curl -s http://localhost:8080/health | jq .
echo ""
echo "Ollama:"
curl -s http://localhost:11434/api/tags | jq .models[].name
```

### Reset Everything

```bash
# Complete reset (WARNING: deletes all data)
docker-compose -f docker-compose.local-test.yml down -v

# Remove all Docker volumes
docker volume rm $(docker volume ls -q | grep spartan)

# Rebuild and start fresh
docker-compose -f docker-compose.local-test.yml up -d --build

# Re-seed data
npx ts-node scripts/seed-test-users.ts
```

---

## 💻 Development Workflow

### Hot Reload Configuration

All services support hot reload for development:

| Service | Watch Path | Auto-Reload |
|---------|------------|-------------|
| Frontend | `./spartan-hub/src` | ✅ Yes |
| Backend | `./spartan-hub/backend/src` | ✅ Yes |
| AI Service | Manual restart | ❌ No |

### Making Code Changes

```bash
# Frontend changes - automatic
# Just save your files, Vite will hot-reload

# Backend changes - may need restart
docker-compose -f docker-compose.local-test.yml restart backend

# AI Service changes - rebuild required
docker-compose -f docker-compose.local-test.yml up -d --build ai-service
```

### Adding New Test Data

```bash
# Modify seed script
# Edit: scripts/seed-test-users.ts

# Re-run seed
npx ts-node scripts/seed-test-users.ts

# Or insert directly via SQL
docker exec -it spartan_local_postgres psql -U postgres -d spartan_db
```

### Debugging

```bash
# Backend debug logs
docker-compose -f docker-compose.local-test.yml logs -f backend | grep -i error

# AI Service debug
docker-compose -f docker-compose.local-test.yml logs -f ai-service

# Frontend console
# Open browser DevTools (F12) -> Console tab
```

### Performance Profiling

```bash
# Check container resource usage
docker stats

# Database query performance
docker exec -it spartan_local_postgres psql -U postgres -d spartan_db -c "EXPLAIN ANALYZE SELECT * FROM workouts WHERE user_id = 'test-user-001';"
```

---

## 📊 Monitoring Dashboard

Access the monitoring dashboard (if enabled):

```
http://localhost:3000  # Grafana (if monitoring stack is deployed)
```

---

## 📝 Additional Resources

### Project Documentation

- [Main README](./README.md)
- [API Documentation](./spartan-hub/docs/API_DOCUMENTATION.md)
- [Architecture Overview](./spartan-hub/ARCHITECTURE_DATA_FLOW.md)

### External Resources

- [Docker Compose Reference](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/docs/)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

## 🆘 Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review service logs: `docker-compose -f docker-compose.local-test.yml logs -f`
3. Check existing documentation in the project
4. Create an issue with detailed error messages

---

## 📄 License

This project is part of Spartan Hub 2.0. See main project license for details.

---

**Last Updated:** March 1, 2026  
**Version:** 1.0.0  
**Environment:** Local Test
