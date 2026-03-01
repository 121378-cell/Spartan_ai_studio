# Spartan Hub 2.0 - Local Multi-User Test Environment

## 📦 Files Created

This document lists all files created for the complete local multi-user test environment.

---

## ✅ Created Files

### 1. Docker Compose Configuration

**File:** `docker-compose.local-test.yml`

Complete Docker Compose configuration for local testing including:
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- Qdrant vector database (port 6333)
- Ollama LLM (port 11434)
- AI microservice (port 8000)
- Backend API (port 3001)
- Frontend (port 5173)
- Mock Terra service (port 8080)
- MediaPipe service (port 8001)

---

### 2. Database Seed Script

**File:** `scripts/seed-test-users.ts`

TypeScript script that generates:
- 2 complete test user accounts
- 30 days of workout history per user
- 30 days of biometric data per user
- 10 AI conversations per user
- 5 achievements per user
- 3 active challenges per user
- 2 wearable device connections per user

**Usage:**
```bash
npx ts-node scripts/seed-test-users.ts
```

---

### 3. Mock Terra Service

**File:** `scripts/mock-terra-service.ts`

Node.js/Express service that simulates:
- Terra webhook callbacks
- Real-time biometric data streaming
- Multiple provider formats (Garmin, Apple Health, Google Fit)
- Data types: HRV, heart rate, steps, sleep, stress

**Endpoints:**
- `POST /stream/start/:userId` - Start real-time streaming
- `POST /simulate/:userId/:dataType` - Simulate single data update
- `GET /status` - View streaming status

---

### 4. AI Service Configuration

**File:** `ai-service/local-config.yaml`

Complete YAML configuration for local AI service:
- Ollama LLM settings
- Qdrant vector database configuration
- RAG knowledge base setup
- Real-time coaching configuration
- Conversation management
- Caching and rate limiting

---

### 5. Database Initialization Script

**File:** `scripts/db-init-local.sql`

PostgreSQL initialization script that:
- Creates all required tables
- Sets up indexes for performance
- Inserts test user data
- Configures relationships

---

### 6. Setup Documentation

**File:** `LOCAL_TEST_SETUP.md`

Comprehensive setup guide including:
- Prerequisites checklist
- 10-minute quick start
- Test user credentials
- Service endpoints
- Feature checklist
- Detailed setup instructions
- Troubleshooting guide
- Development workflow

---

### 7. Test User Credentials

**File:** `scripts/test-user-credentials.json`

JSON file with complete test user information:
- Login credentials
- Profile details
- Service endpoints
- Database credentials
- Quick start commands

---

### 8. Environment Configuration

**File:** `.env.local`

Environment variables for local testing:
- Database connection strings
- AI service configuration
- Security settings (local test values)
- Feature flags
- Mock service URLs

---

### 9. Quick Start Scripts (Windows)

**File:** `start-local-test.bat`

One-click script to start all services:
- Checks Docker status
- Starts all containers
- Waits for healthy status
- Displays access information

**File:** `stop-local-test.bat`

One-click script to stop all services:
- Gracefully stops containers
- Preserves data volumes

---

### 10. AI Service README

**File:** `ai-service/README.md`

Documentation for AI service configuration:
- Quick start guide
- Configuration options
- API endpoint examples
- Troubleshooting tips

---

## 📋 Summary Table

| File | Purpose | Location |
|------|---------|----------|
| `docker-compose.local-test.yml` | Docker orchestration | Project root |
| `scripts/seed-test-users.ts` | Test data generation | scripts/ |
| `scripts/mock-terra-service.ts` | Terra webhook simulation | scripts/ |
| `ai-service/local-config.yaml` | AI service config | ai-service/ |
| `scripts/db-init-local.sql` | Database initialization | scripts/ |
| `LOCAL_TEST_SETUP.md` | Setup documentation | Project root |
| `scripts/test-user-credentials.json` | Credentials reference | scripts/ |
| `.env.local` | Environment variables | Project root |
| `start-local-test.bat` | Quick start (Windows) | Project root |
| `stop-local-test.bat` | Quick stop (Windows) | Project root |
| `ai-service/README.md` | AI service docs | ai-service/ |

---

## 🚀 Quick Start

### Option 1: Using Batch Script (Windows)

```bash
# Start all services
.\start-local-test.bat

# Seed test data
npx ts-node scripts\seed-test-users.ts

# Open browser
http://localhost:5173
```

### Option 2: Manual Commands

```bash
# Start Docker services
docker-compose -f docker-compose.local-test.yml up -d --build

# Wait for services (check status)
docker-compose -f docker-compose.local-test.yml ps

# Seed test data
npx ts-node scripts/seed-test-users.ts

# Access application
# Open http://localhost:5173 in browser
```

---

## 👤 Test Users

| User | Email | Password | Profile |
|------|-------|----------|---------|
| User 1 | test1@local.test | TestUser123! | Alex Tester, 30, Intermediate |
| User 2 | test2@local.test | TestUser123! | Jordan Tester, 25, Beginner |

---

## 🔗 Service Endpoints

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| AI Service | http://localhost:8000 |
| Mock Terra | http://localhost:8080 |
| Ollama | http://localhost:11434 |
| Qdrant | http://localhost:6333 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## ✅ Feature Checklist

- [x] Docker Compose multi-user setup
- [x] 2 complete test user accounts
- [x] Local Terra integration (mock)
- [x] Real-time AI configuration
- [x] Database seed scripts
- [x] Quick start guide
- [x] Test user credentials document
- [x] Windows batch scripts
- [x] Environment configuration

---

## 📊 Test Data Summary

| Data Type | Per User | Total |
|-----------|----------|-------|
| Workout History | 30 days | 60 days |
| Biometric Data | 30 days | 60 days |
| AI Conversations | 10 | 20 |
| Achievements | 5 | 10 |
| Active Challenges | 3 | 6 |
| Wearable Devices | 2 | 4 |

---

## 🛠️ Support

For issues or questions:
1. Check `LOCAL_TEST_SETUP.md` for detailed documentation
2. Review troubleshooting section
3. Check service logs: `docker-compose -f docker-compose.local-test.yml logs -f`

---

**Created:** March 1, 2026  
**Version:** 1.0.0  
**Environment:** Local Test
