# AGENTS.md - Agent Guidelines for Spartan Hub

Quick reference for agentic coding agents operating in this repository.

## Project Overview

Spartan Hub: Fitness coaching app with AI integration
- Frontend: React 19 + TypeScript + Vite
- Backend: Express + TypeScript
- Database: SQLite (default) with PostgreSQL support
- Testing: Jest with ts-jest
- Security: Helmet, csurf, rate limiting, input sanitization

## Working Directories

```
Root: C:\Proyectos\Spartan hub 2.0 - codex - ollama
Frontend: spartan-hub/
Backend: spartan-hub/backend/
AI Service: spartan-hub/backend/ai-microservice/
Documentation: docs/, spartan-hub/docs/, spartan-hub/backend/docs/
```
Root: C:\Proyectos\Spartan hub 2.0 - codex - ollama
Frontend: spartan-hub/
Backend: spartan-hub/backend/
```

## Build Commands

```bash
# From spartan-hub/
npm run build:all           # Build all components
npm run build:frontend      # Vite build
npm run build:backend       # TypeScript compilation
npm run build:services      # Build fitness nutrition service
npm run dev                 # Start frontend + backend dev mode
npm start                   # Start production app
npm run build:exe           # Build executable for distribution
npm run build:full          # Full build including distribution package

# From spartan-hub/backend/
npm run build               # Compile TypeScript to dist/
npm run start               # Run compiled server
npm run dev                 # ts-node dev mode
npm run watch               # Watch mode for development
```

## Test Commands

```bash
# Backend (from spartan-hub/backend/)
npm test                                    # Run all tests
npm run test:fast                          # Run tests excluding slow e2e/performance tests
npm run test:coverage                      # Coverage report
npm run test:security                      # Run security-related tests only
npm test -- --testPathPattern=auth        # Run tests matching pattern
npm test -- auth.test.ts                  # Run specific test file
npm test -- --testNamePattern="should validate"  # Run specific test by name
npm run test:e2e                          # Run end-to-end tests
npm run test:database                     # Run database-related tests only

# Frontend (from spartan-hub/)
npm test                                  # All Jest tests (node + components)
npm run test:node                         # Node environment tests only
npm run test:components                   # Component tests only (jsdom environment)
npm run test:frontend                     # Frontend tests (node + components)
npm run test:backend                      # Run backend tests from frontend directory
npm run test:all                          # Run all frontend and backend tests
npm run test:coverage                     # Coverage report for frontend tests
npm run test:env                          # Test environment configuration
npm run test:fitness                      # Test fitness nutrition service
```

## Linting & Type Checking

```bash
# Frontend (from spartan-hub/)
npm run lint               # ESLint check
npm run type-check         # TypeScript check

# Backend (from spartan-hub/backend/)
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix linting issues
tsc --noEmit               # TypeScript check
```

## Code Style (Enforced by ESLint)

### Formatting
- 2-space indentation
- Single quotes
- 120 char max line length
- Semicolons required
- Unix linebreaks

### Complexity Limits
- Max 50 lines per function
- Max 10 cyclomatic complexity
- Max 4 levels of nesting
- Max 5 function parameters

### TypeScript Rules
- Prefer explicit return types
- Use `const` over `let`, avoid `var`
- Prefer arrow functions for callbacks
- Use template literals over concatenation
- Prefer async/await over raw promises
- Strict TypeScript rules enforced (noImplicitAny, strictNullChecks)
- Floating promises must be handled

### Naming Conventions
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase` (e.g., `CoachDashboard`)
- Functions/variables: `camelCase` (e.g., `fetchUserData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `JWT_SECRET`)
- Private members: `_prefix` (e.g., `_internalState`)
- Event handlers: `handle` prefix (e.g., `handleClick`)
- Booleans: `is/has/can` prefix (e.g., `isLoading`, `hasPermission`)

### Import Organization
1. External dependencies (npm packages)
2. Internal modules (relative imports)
3. Types/interfaces
4. Constants
- Path alias: `@/*` maps to `./src/*`
- No circular dependencies
- No unused imports
- No duplicate imports
- Prefer destructuring for imports when possible

## Security Requirements (BLOCKING)

- All user inputs MUST be sanitized via `utils/sanitization.ts`
- No `eval()`, `innerHTML`, or dynamic code execution
- Rate limiting on ALL API routes
- JWT tokens for protected routes
- Secrets via environment variables only
- SQL injection prevention: parameterized queries only
- XSS prevention: DOMPurify (frontend), helmet (backend)
- CSRF protection with csurf middleware
- Input validation using Zod schemas where applicable
- Secure headers with Helmet middleware
- CORS configuration restricted to trusted origins only
- Password hashing with bcrypt (minimum 12 rounds)
- Session management with secure cookies
- API rate limiting with exponential backoff for abuse detection

## Error Handling

Use custom error classes from `utils/errorHandler.ts`:
- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `ServiceUnavailableError` (503)

Never swallow errors - always re-throw or handle appropriately.

## Logging Pattern

Use structured logger from `utils/logger.ts`:
```typescript
import { logger } from '../utils/logger';

logger.info('Operation completed', { context: 'serviceName', metadata: { userId } });
logger.error('Operation failed', { context: 'serviceName', error: error.message });
```

## Common Patterns

### API Controller
```typescript
export const handler = async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  if (!userId) throw new ValidationError('User ID required');
  
  const data = await service.getData(sanitizeInput(userId));
  return res.json({ success: true, data });
};
```

### Database Query
```typescript
const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
logger.info('User fetched', { context: 'database', metadata: { userId } });
```

### Input Sanitization
```typescript
import { sanitizeInput, validateAndSanitizeString } from '../utils/sanitization';
const sanitized = sanitizeInput(userInput);
const { isValid, value, error } = validateAndSanitizeString(input, 1, 100);
```

## Logging Pattern

Use structured logger from `utils/logger.ts`:
```typescript
import { logger } from '../utils/logger';

logger.info('Operation completed', { context: 'serviceName', metadata: { userId } });
logger.error('Operation failed', { context: 'serviceName', error: error.message });
```

## Common Patterns

### API Controller
```typescript
export const handler = async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  if (!userId) throw new ValidationError('User ID required');
  
  const data = await service.getData(sanitizeInput(userId));
  return res.json({ success: true, data });
};
```

### Database Query
```typescript
const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
logger.info('User fetched', { context: 'database', metadata: { userId } });
```

### Input Sanitization
```typescript
import { sanitizeInput, validateAndSanitizeString } from '../utils/sanitization';
const sanitized = sanitizeInput(userInput);
const { isValid, value, error } = validateAndSanitizeString(input, 1, 100);
```

## Pre-commit Hooks

- Husky + lint-staged auto-fix linting
- Failed lint blocks commit
- Target coverage: >80% on critical paths

## Tools & Versions

- TypeScript: 5.9.3
- ESLint: 9.x with TypeScript + security plugins
- Jest: 30.2.0 with ts-jest
- Vite: 7.1.12
- Node: 18.x
- React: 19.2.0
- Express: 4.18.x

## Environment Setup

1. Install Node.js 18.x
2. `npm install` in root and `spartan-hub/backend/`
3. Copy `.env.example` to `.env`
4. `npm run db:init` in backend directory
5. `npm test` to verify setup
