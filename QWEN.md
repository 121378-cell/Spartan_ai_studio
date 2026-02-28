# QWEN.md - Spartan Hub 2.0 Project Context

**Project:** Spartan Hub 2.0 - AI-Powered Fitness Coaching Platform  
**Version:** 2.0  
**Last Updated:** February 2026  
**Status:** 🟢 Production-Ready (95% Complete)

---

## 📋 Project Overview

Spartan Hub 2.0 is a production-grade fitness coaching application combining AI-powered coaching with personalized training plans. Key features include:

- **🤖 AI Coaching** - Coach Vitalis with RAG (Retrieval-Augmented Generation) for intelligent recommendations
- **📹 Video Form Analysis** - Real-time exercise form analysis using MediaPipe (squats, deadlifts)
- **⌚ Wearable Integration** - Garmin, Apple Health, Google Fit, HealthConnect synchronization
- **🎮 Gamification** - Achievement system, challenges, and user engagement features
- **📊 ML Analytics** - Injury prediction, performance forecasting, readiness scoring
- **🔒 Enterprise Security** - JWT auth, CSRF protection, rate limiting, database encryption

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7.1, MUI, Framer Motion |
| **Backend** | Node.js 18, Express 4.18, TypeScript 5.9 |
| **Database** | SQLite (default via better-sqlite3), PostgreSQL support |
| **AI/ML** | ONNX runtime, Qdrant vector DB, Ollama (local LLM), TensorFlow.js |
| **Caching** | Redis (rate limiting, session caching) |
| **Testing** | Jest 30.2, ts-jest, Cypress (E2E), Testing Library |
| **DevOps** | Docker, Docker Compose, GitHub Actions CI/CD |

### Architecture

**Monorepo Structure:**
```
spartan-hub/                    # Frontend (React app)
spartan-hub/backend/            # Backend (Express API)
spartan-hub/backend/ai-microservice/  # Python FastAPI AI service
sandbox/                        # Docker sandbox environment
```

---

## 🚀 Building and Running

### Quick Start (Development Mode)

```bash
# From project root (spartan-hub/)
npm install                     # Install dependencies
cp .env.example .env            # Configure environment
npm run dev                     # Start frontend + backend concurrently
```

### Build Commands

```bash
# Build all components
npm run build:all               # Frontend + Backend + Services

# Individual builds
npm run build:frontend          # Vite build (frontend only)
npm run build:backend           # TypeScript compilation (backend only)

# Production build
npm start                       # Run in production mode
```

### Backend Commands (from `spartan-hub/backend/`)

```bash
npm run dev                     # ts-node dev mode with auto-reload
npm run build                   # Compile TypeScript to dist/
npm run start                   # Run compiled server from dist/
npm run watch                   # Auto-reload with nodemon
npm run lint                    # ESLint check
npm run lint:fix                # Auto-fix linting issues
```

### Testing Commands

```bash
# All tests
npm run test:all                # Frontend + Backend tests

# Backend tests (from spartan-hub/backend/)
npm test                        # All Jest tests
npm run test:fast               # Exclude slow e2e/performance tests
npm run test:coverage           # Coverage report
npm run test:security           # Security tests (auth, token)
npm run test:database           # Database-specific tests
npm run test:e2e                # End-to-end tests

# Specific test file
npm test -- --testPathPattern="auth.test"

# Specific test by name
npm test -- --testNamePattern="should validate input"

# Frontend tests (from spartan-hub/)
npm test                        # All Jest tests
npm run test:node               # Node.js environment tests
npm run test:components         # Component tests (jsdom)
npm run test:coverage           # Coverage report
```

### Cypress E2E Tests

```bash
npm run cy:open                 # Open Cypress UI
npm run cy:run                  # Run headless
npm run test:e2e                # Full E2E test suite
```

### Database Commands (from `spartan-hub/backend/`)

```bash
npm run db:init                 # Initialize database
npm run db:backup               # Create backup
npm run db:restore              # Restore from backup
npm run db:verify               # Verify database integrity
npm run migrate                 # Run migrations
```

### Docker Commands

```bash
# From project root
npm run docker:up               # Start Docker environment
npm run docker:down             # Stop Docker environment
npm run docker:status           # Check container status
npm run docker:logs             # View logs

# Docker Compose (full stack)
docker-compose up --build       # Build and start all services
docker-compose down             # Stop all services
```

### Linting and Type Checking

```bash
# Frontend (from spartan-hub/)
npm run lint                    # ESLint check
npm run type-check              # TypeScript check

# Backend (from spartan-hub/backend/)
npm run lint                    # ESLint check
npm run lint:fix                # Auto-fix issues
```

---

## 🏗️ Project Structure

```
C:\Proyectos\Spartan hub 2.0 - codex - copia\
├── spartan-hub/                    # Frontend (React 19 + TypeScript)
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── dashboard/          # Dashboard components
│   │   │   ├── coach/              # Coach Vitalis widget
│   │   │   ├── video/              # Video analysis components
│   │   │   ├── workout/            # Workout session components
│   │   │   └── common/             # Shared UI components
│   │   ├── services/               # API client services
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── context/                # React context providers
│   │   ├── types/                  # TypeScript type definitions
│   │   └── __tests__/              # Frontend tests
│   ├── backend/                    # Backend (Express + TypeScript)
│   │   └── src/
│   │       ├── controllers/        # Request handlers (15+ controllers)
│   │       ├── routes/             # Express routes (50+ endpoints)
│   │       ├── services/           # Business logic (80+ services)
│   │       ├── middleware/         # Auth, CSRF, rate limiting, validation
│   │       ├── database/           # SQLite/PostgreSQL managers
│   │       ├── models/             # Data models and schemas
│   │       ├── ml/                 # ML forecasting services
│   │       ├── ai/                 # AI/RAG components
│   │       └── __tests__/          # Backend tests
│   ├── docs/                       # Technical documentation
│   ├── scripts/                    # Build and utility scripts
│   └── plans/                      # Implementation plans
├── sandbox/                        # Docker sandbox environment
├── backend/                        # Standalone backend (legacy)
└── [50+ .md documentation files]   # Project documentation
```

### Key Backend Services

| Service | Description |
|---------|-------------|
| `coachVitalisService.ts` | AI coaching with RAG, handles user queries with context retrieval |
| `brainOrchestrator.ts` | Real-time adaptive brain for personalized recommendations |
| `mlForecastingService.ts` | ML-based performance and injury prediction |
| `ragIntegrationService.ts` | RAG pipeline for knowledge retrieval |
| `healthConnectHubService.ts` | Wearable integration (Garmin, Google Fit, Apple Health) |
| `videoAnalysisService.ts` | Exercise form analysis using MediaPipe |

---

## 🔒 Security Requirements (BLOCKING)

All code **MUST** follow these security requirements:

1. **Input Sanitization**: All user inputs MUST use `sanitizeInput()` or `sanitizeHtml()` from `utils/sanitization`
2. **SQL Injection Prevention**: Parameterized queries ONLY - never string concatenation
3. **Rate Limiting**: Required on ALL API routes via `rateLimitMiddleware.ts`
4. **Authentication**: JWT tokens for protected routes, OAuth 2.0 for third-party sync
5. **CSRF Protection**: csurf middleware enabled for state-changing operations
6. **XSS Prevention**: DOMPurify (frontend), helmet (backend)
7. **Secrets Management**: Environment variables or `utils/secretsManagerService.ts` - never hardcoded

---

## 📝 Development Conventions

### TypeScript Conventions

- **No `any` type** except in test mocks
- Explicit return types preferred for functions
- Interfaces for objects, Types for unions
- **Filenames**: `kebab-case.ts` / `kebab-case.tsx`
- **Components**: `PascalCase` (e.g., `CoachDashboard`)
- **Functions/variables**: `camelCase` (e.g., `fetchUserData`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `JWT_SECRET`)
- **Event handlers**: `handle` prefix (e.g., `handleClick`)
- **Booleans**: `is/has/can` prefix (e.g., `isLoading`, `hasPermission`)
- 2-space indentation, single quotes, 120 char max line

### Import Organization

1. External dependencies (npm packages)
2. Internal modules (relative imports)
3. Types/interfaces
4. Constants

Path alias `@/*` maps to `src/*` in both frontend and backend.

### Error Handling

Use custom error classes from `utils/errorHandler.ts`:
- `ValidationError` (400) - Invalid input
- `AuthenticationError` (401) - Auth failures
- `AuthorizationError` (403) - Permission denied
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Resource conflicts
- `ServiceUnavailableError` (503) - External service failures

**Never swallow errors** - always re-throw or handle via global error handler.

### Logging Pattern

```typescript
import { logger } from '../utils/logger';

logger.info('Operation successful', { 
  context: 'serviceName', 
  metadata: { userId: '123' } 
});

logger.error('Operation failed', { 
  context: 'serviceName', 
  error: error.message, 
  stack: error.stack 
});
```

### Testing Standards

- **Target coverage**: >80% on critical paths
- **Test files**: `__tests__/` directories, `*.test.ts` suffix
- **Framework**: Jest with ts-jest preset
- **Mocking**: External services must be mocked in unit tests
- **Security tests**: Must cover auth and token routes

---

## 🌍 Environment Variables

Key environment variables (see `.env.example`):

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_TYPE=sqlite
DB_PATH=data/spartan_hub.db

# PostgreSQL (optional)
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_DB=spartan_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# Security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret
ALLOWED_ORIGINS=http://localhost:5173

# AI Services
AI_SERVICE_URL=http://localhost:8000
OLLAMA_HOST=http://localhost:11434

# External APIs (wearables)
GARMIN_CLIENT_ID=xxx
GARMIN_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
APPLE_HEALTH_KIT_ID=xxx
```

---

## 📚 Key Documentation Files

| File | Description |
|------|-------------|
| **[MASTER_PROJECT_STATUS_REPORT.md](./MASTER_PROJECT_STATUS_REPORT.md)** | 📊 **Single Source of Truth** - Complete project status |
| **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** | Master index of all documentation |
| **[AGENTS.md](./AGENTS.md)** | Guidelines for AI agents |
| **[CLAUDE.md](./CLAUDE.md)** | Claude Code integration guide |
| **[README.md](./spartan-hub/README.md)** | Quick start guide |
| **[AUDITORIA_PROGRESO.md](./AUDITORIA_PROGRESO.md)** | Security audit progress |

---

## 🧪 Current Project Metrics

| Metric | Value |
|--------|-------|
| **Completeness** | 95% (14+ phases completed) |
| **Tests** | 987 total, 709 passing (72%) |
| **TypeScript** | 0 errors in production code |
| **Coverage** | >95% on critical paths |
| **Security Audit** | 93% vulnerabilities fixed |

---

## 🛠️ Tools and Versions

| Tool | Version |
|------|---------|
| TypeScript | 5.9.3 |
| ESLint | 9.x |
| Jest | 30.2.0 |
| Vite | 7.1.12 |
| React | 19.2.0 |
| Express | 4.18.x |
| Node.js | 18.x |

---

## 📋 Common Tasks

### Adding a New API Endpoint

1. Create controller in `backend/src/controllers/`
2. Define route in `backend/src/routes/`
3. Implement service logic in `backend/src/services/`
4. Add input validation/sanitization
5. Write tests in `backend/src/__tests__/`
6. Update API documentation

### Adding a New React Component

1. Create component in `src/components/` with proper naming
2. Add TypeScript types in `src/types/`
3. Write component tests in `src/__tests__/`
4. Export from component index

### Running Database Migrations

```bash
cd spartan-hub/backend
npm run migrate
```

### Debugging Tests

```bash
# Run single test file with verbose output
npm test -- --verbose --testPathPattern="filename"

# Run specific test by name
npm test -- --testNamePattern="should do something"

# Watch mode for development
npm test -- --watch
```

---

## 🚨 Known Issues / Gotchas

1. **Windows Path Issues**: Use WSL2 for best compatibility on Windows
2. **Node Version**: Must use Node 18.x - other versions may have compatibility issues
3. **Database Lock**: If SQLite is locked, run `npm run db:verify`
4. **Port Conflicts**: Frontend uses 5173, Backend uses 3001, Redis uses 6380, Postgres uses 5434

---

## 📞 Support

- **Documentation**: See [DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)
- **Project Status**: [MASTER_PROJECT_STATUS_REPORT.md](./MASTER_PROJECT_STATUS_REPORT.md)
- **Issues**: Create GitHub issue
