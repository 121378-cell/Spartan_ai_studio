# AGENTS.md - Agent Guidelines for Spartan Hub

Quick reference for agentic coding agents. See `spartan-hub/AGENTS.md` for detailed guidelines.

## Project Overview

Spartan Hub: Fitness coaching app with AI integration
- Frontend: React 19 + TypeScript + Vite
- Backend: Express + TypeScript
- Database: SQLite (default) with PostgreSQL support
- Testing: Jest with coverage reports

## Working Directory Context

- **Root**: `C:\Users\sergi\Spartan hub 2.0` (this document)
- **Frontend commands**: Run from `spartan-hub/` directory
- **Backend commands**: Run from `spartan-hub/backend/` directory

Note: All commands below assume you're in the appropriate directory unless a full path is shown.

## Build Commands

# Frontend + Backend (from spartan-hub/)
npm run build:all           # Build all components
npm run build:frontend      # Vite build only
npm run build:backend       # TypeScript compilation
npm run dev                # Start frontend + backend dev mode
npm start                  # Start production app

# Backend (from spartan-hub/backend/)
npm run build              # Compile TypeScript to dist/
npm run start              # Run compiled server
npm run dev                # ts-node dev mode
npm run watch              # Auto-reload with nodemon

## Single Test Commands (Full Paths)

# Run specific test file from root
cd spartan-hub/backend && jest auth.test.ts
cd spartan-hub/backend && jest security.test.ts

# Run tests matching pattern from root
cd spartan-hub && npm test -- --testPathPattern=auth
cd spartan-hub && npm test -- --testPathPattern=security
cd spartan-hub/backend && npm test -- --testNamePattern="validate"

# Run single test in a file
cd spartan-hub/backend && jest --testNamePattern="should validate input"

## Testing Commands

# Frontend (from spartan-hub/)
npm test                    # Run all Jest tests
npm run test:coverage       # Coverage report

# Backend (from spartan-hub/backend/)
npm test                    # Run all Jest tests
npm run test:coverage       # Coverage report
npm run test:security       # Security tests (auth, token)
npm run test:i18n           # i18n tests

## Linting & Type Checking

# Frontend (from spartan-hub/)
npm run type-check          # TypeScript strict check
tsc --noEmit              # Alternative type check

# Backend (from spartan-hub/backend/)
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix linting issues
tsc --noEmit              # TypeScript check

## Critical Code Style Rules

### TypeScript Strict Mode (BLOCKING)
- No `any` type (except in test files)
- Explicit return types preferred
- Use interfaces for objects, types for unions
- Null vs undefined: prefer undefined, null only for database

### Security Requirements (BLOCKING)
- All user inputs MUST use `sanitizeInput()` or `sanitizeHtml()`
- No `eval()`, `innerHTML`, or dynamic code execution
- Rate limiting required on ALL API routes
- JWT tokens for protected routes
- Secrets via environment variables or `utils/secrets.ts`
- SQL injection prevention: parameterized queries only
- XSS prevention: DOMPurify (frontend), helmet (backend)

### Error Handling
- Custom error classes: `ValidationError`, `NotFoundError`, `ServiceUnavailableError`
- NEVER swallow errors - always re-throw or handle
- Use structured logger: `utils/logger.ts`
- Global error handler in `utils/errorHandler.ts`
- Throw early: validate inputs before processing

### Naming & Formatting
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase` (e.g., `GovernancePanel`)
- Functions/variables: `camelCase` (e.g., `fetchData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_KEY`)
- 2-space indentation, single quotes, 120 char max line
- Private members: prefix with `_`

### Import Organization
1. External dependencies (npm packages)
2. Internal modules (relative imports)
3. Types/interfaces
- No circular dependencies (enforced by ESLint)
- No unused imports (enforced by ESLint)
- Path alias: `@/*` maps to project root

## Common Patterns

### Database Query
```typescript
const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
logger.info('User fetched', { context: 'database', metadata: { userId } });
```

### API Controller
```typescript
export const handler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const data = await service.getData(userId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    throw error; // Global error handler
  }
};
```

### Input Sanitization
```typescript
import { sanitizeInput, validateAndSanitizeString } from '../utils/sanitization';

const sanitized = sanitizeInput(userInput);
const validated = validateAndSanitizeString(input, 1, 100);
if (!validated.isValid) {
  throw new ValidationError(validated.error);
}
```

## Pre-commit & Workflow

- Husky + lint-staged configured for auto-fix linting
- Failed lint blocks commit (check console output)
- Tests run: Jest with ts-jest preset
- Target coverage: >80% on critical paths

## Additional Guidelines

For detailed information on:
- React patterns and hooks
- Testing best practices
- Performance optimization
- i18n/internationalization
- Docker deployment
- Database transactions and pooling

See: `spartan-hub/AGENTS.md`

## Tools & Config

- TypeScript: 5.9.3 (strict mode)
- ESLint: TypeScript + security + import plugins
- Jest: 30.2.0 with ts-jest
- Vite: 7.1.12 (frontend build)
- Node: 18.x (backend target)
- React: 19.2.0
- Express: 4.18.x
