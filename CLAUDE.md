# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spartan Hub 2.0 is a production-grade fitness coaching application with AI integration for injury prediction, readiness forecasting, and intelligent coaching via RAG (Retrieval-Augmented Generation).

**Technology Stack:**
- **Frontend**: React 19, TypeScript 5.9, Vite 7.1, MUI
- **Backend**: Express 4.18, TypeScript 5.9, Node.js 18+
- **Database**: SQLite (default via better-sqlite3) with PostgreSQL support
- **AI/ML**: ONNX runtime, Qdrant vector storage, Ollama for local LLM inference
- **Caching**: Redis for rate limiting and caching
- **Testing**: Jest 30.2, ts-jest, supertest

**Architecture:** Monorepo with frontend root at `spartan-hub/` and backend at `spartan-hub/backend/`. A Docker sandbox environment is in `sandbox/`.

## Commands

### Development (run from `spartan-hub/`)
```bash
npm run dev                    # Start frontend + backend concurrently
npm run build:all              # Build all components
npm run build:frontend         # Vite build only
npm run build:backend          # TypeScript compilation (cd backend && npx tsc)
npm start                      # Production mode
```

### Backend Commands (run from `spartan-hub/backend/`)
```bash
npm run dev                    # ts-node dev mode
npm run watch                  # Auto-reload with nodemon
npm run build                  # Compile TypeScript to dist/
npm run start                  # Run compiled server from dist/
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix linting issues
```

### Testing
```bash
# Backend (from spartan-hub/backend/)
npm test                       # All Jest tests
npm run test:coverage          # Coverage report
npm run test:security          # Security tests (auth, token)
npm run test:e2e               # End-to-end tests
npm test -- --testPathPattern="filename"   # Specific test file
npm test -- --testNamePattern="test name"  # Specific test

# Frontend (from spartan-hub/)
npm test                       # All Jest tests
npm run test:coverage          # Coverage report
npm run test:node              # Node.js tests only
npm run test:components        # Component tests only
```

### Docker Sandbox (from root)
```bash
./start-sandbox.ps1            # Start sandbox environment (PowerShell)
./stop-sandbox.ps1             # Stop sandbox
cd sandbox && docker-compose logs -f  # View logs
```

### Database (from `spartan-hub/backend/`)
```bash
npm run db:init                # Initialize database
npm run db:backup              # Create backup
npm run db:restore             # Restore from backup
npm run migrate                # Run migrations
```

## Architecture

### Backend Structure (`spartan-hub/backend/src/`)
- **controllers/** - Request handlers for API endpoints
- **routes/** - Express route definitions (50+ routes for features like auth, AI, biometrics, ML forecasting)
- **services/** - Business logic layer (80+ services including `coachVitalisService.ts`, `mlForecastingService.ts`, `brainOrchestrator.ts`)
- **middleware/** - Auth, CSRF, rate limiting, validation, logging, security headers
- **database/** - SQLite/PostgreSQL managers, migrations, backup
- **models/** - Data models and schemas
- **utils/** - Logger, error handlers, sanitization utilities
- **ai/** - AI-related services including RAG components

### Frontend Structure (`spartan-hub/src/`)
- **components/** - React components (Dashboard, CoachWidget, WorkoutSession, VideoAnalysis, etc.)
- **services/** - API client services
- **hooks/** - Custom React hooks
- **context/** - React context providers
- **types/** - TypeScript type definitions

### AI Microservice (`spartan-hub/backend/ai-microservice/`)
Python FastAPI service for AI inference with Ollama integration. Provides `/embeddings`, `/predict_alert`, `/generate_decision` endpoints.

### Key Services
- **coachVitalisService.ts** - AI coaching with RAG, handles user queries with context retrieval
- **brainOrchestrator.ts** - Real-time adaptive brain for personalized recommendations
- **mlForecastingService.ts** - ML-based performance and injury prediction
- **ragIntegrationService.ts** - RAG pipeline for knowledge retrieval
- **healthConnectHubService.ts** - Wearable integration (Garmin, Google Fit, Apple Health)

## Security Requirements (BLOCKING)

All code MUST follow these security requirements:

1. **Input Sanitization**: All user inputs MUST use `sanitizeInput()` or `sanitizeHtml()` from `utils/sanitization`
2. **SQL Injection Prevention**: Parameterized queries ONLY - never string concatenation
3. **Rate Limiting**: Required on ALL API routes via `rateLimitMiddleware.ts`
4. **Authentication**: JWT tokens for protected routes, OAuth 2.0 for third-party sync
5. **CSRF Protection**: csurf middleware enabled for state-changing operations
6. **XSS Prevention**: DOMPurify (frontend), helmet (backend)
7. **Secrets**: Environment variables or `utils/secretsManagerService.ts` - never hardcoded

## TypeScript Conventions

- **No `any` type** except in test mocks
- Explicit return types preferred for functions
- Interfaces for objects, Types for unions
- Kebab-case for filenames (`component-name.tsx`)
- PascalCase for components (`GovernancePanel`)
- camelCase for functions/variables (`fetchData`)
- UPPER_SNAKE_CASE for constants (`API_KEY`)
- 2-space indentation, single quotes, 120 char max line

## Import Organization

1. External dependencies (npm packages)
2. Internal modules (relative imports)
3. Types/interfaces
4. Constants

Path alias `@/*` maps to project root in both frontend and backend.

## Error Handling

Use custom error classes from the codebase:
- `ValidationError` - Invalid input
- `NotFoundError` - Resource not found
- `ServiceUnavailableError` - External service failures
- `UnauthorizedError` - Auth failures
- `ForbiddenError` - Permission denied

Never swallow errors - always re-throw or handle via global error handler.

## Logging Pattern

Use structured logger from `utils/logger.ts`:
```typescript
logger.info('Operation successful', { context: 'serviceName', metadata: { key: value } });
logger.error('Operation failed', { context: 'serviceName', error: error.message, stack: error.stack });
```

## Environment Variables

Key environment variables (see `.env.example`):
- `DATABASE_TYPE` - sqlite or postgres
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session encryption
- `AI_SERVICE_URL` - AI microservice URL
- `OLLAMA_HOST` - Ollama service URL
- `REDIS_HOST` / `REDIS_PORT` - Redis configuration

## Testing Standards

- Target coverage: >80% on critical paths
- Test files: `__tests__/` directories, `*.test.ts` suffix
- Use Jest with ts-jest preset
- Mock external services in unit tests
- Security tests must cover auth and token routes