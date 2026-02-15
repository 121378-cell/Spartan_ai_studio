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
cd spartan-hub/backend && npm test -- --testNamePattern="filename"
cd spartan-hub/backend && jest auth.test.ts
cd spartan-hub/backend && jest security.test.ts

# Run tests matching pattern from root
cd spartan-hub && npm test -- --testPathPattern=auth
cd spartan-hub && npm test -- --testPathPattern=security
cd spartan-hub/backend && npm test -- --testNamePattern="validate"

# Run single test in a file
cd spartan-hub/backend && npm test -- --testNamePattern="should validate input"
cd spartan-hub/backend && npm test -- --testPathPattern="__tests__/specific.test.ts" --testNamePattern="specific test name"

# Run tests with coverage for specific files
cd spartan-hub/backend && npm test -- --collectCoverageFrom="src/services/tokenService.ts" --testPathPattern="token"

## Testing Commands

# Frontend (from spartan-hub/)
npm test                    # Run all Jest tests
npm run test:coverage       # Coverage report
npm run test:node          # Node.js tests only
npm run test:components    # Component tests only
npm run test:all           # All tests

# Backend (from spartan-hub/backend/)
npm test                    # Run all Jest tests
npm run test:coverage       # Coverage report
npm run test:security       # Security tests (auth, token)
npm run test:i18n           # i18n tests
npm run test:database      # Database-specific tests
npm run test:e2e          # End-to-end tests

# Advanced testing
npm run test:backend-suite # Run backend test suite
npm run test:coverage:security # Security coverage reports

## Linting & Type Checking

# Frontend (from spartan-hub/)
npm run type-check          # TypeScript strict check
npm run lint               # ESLint check
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
- Use `strict: true` in tsconfig where possible
- Enable strictNullChecks, strictFunctionTypes, strictBindCallApply

### Security Requirements (BLOCKING)
- All user inputs MUST use `sanitizeInput()` or `sanitizeHtml()`
- No `eval()`, `innerHTML`, or dynamic code execution
- Rate limiting required on ALL API routes
- JWT tokens for protected routes
- Secrets via environment variables or `utils/secrets.ts`
- SQL injection prevention: parameterized queries only
- XSS prevention: DOMPurify (frontend), helmet (backend)
- CSRF protection with csurf middleware
- Input validation using Zod schemas where applicable

### Error Handling
- Custom error classes: `ValidationError`, `NotFoundError`, `ServiceUnavailableError`, `UnauthorizedError`, `ForbiddenError`
- NEVER swallow errors - always re-throw or handle
- Use structured logger: `utils/logger.ts`
- Global error handler in `utils/errorHandler.ts`
- Throw early: validate inputs before processing
- Log errors with appropriate context and metadata
- Don't expose sensitive information in error messages to clients

### Naming & Formatting
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase` (e.g., `GovernancePanel`)
- Functions/variables: `camelCase` (e.g., `fetchData`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_KEY`)
- 2-space indentation, single quotes, 120 char max line
- Private members: prefix with `_`
- Event handlers: `handle` prefix (e.g., `handleClick`)
- Boolean variables: use `is`, `has`, `can` prefixes (e.g., `isLoading`, `hasPermission`)

### Import Organization
1. External dependencies (npm packages)
2. Internal modules (relative imports)
3. Types/interfaces
4. Constants
- No circular dependencies (enforced by ESLint)
- No unused imports (enforced by ESLint)
- Path alias: `@/*` maps to project root
- Sort imports alphabetically within each group
- Use destructuring imports when importing multiple items from a module

### Code Structure & Best Practices
- Prefer arrow functions for anonymous functions
- Use async/await instead of callbacks/promises chains
- Prefer const over let, avoid var entirely
- Destructure objects when accessing multiple properties
- Use template literals instead of string concatenation
- Use early returns to avoid deep nesting
- Extract complex logic into pure functions
- Keep functions small (< 50 lines recommended)
- Maintain reasonable complexity levels (< 10 cyclomatic complexity)
- Use meaningful variable names, avoid abbreviations (except standard ones like `req`, `res`, `err`)

## Common Patterns

### Database Query
```typescript
const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
logger.info('User fetched', { context: 'database', metadata: { userId } });

// With error handling
try {
  const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  logger.info('User fetched', { context: 'database', metadata: { userId } });
  return result;
} catch (error) {
  logger.error('Failed to fetch user', { context: 'database', error: error.message });
  throw new ServiceUnavailableError('Database unavailable');
}
```

### API Controller
```typescript
export const handler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Validate inputs
    if (!userId) {
      throw new ValidationError('User ID is required');
    }
    
    // Sanitize inputs
    const sanitizedUserId = sanitizeInput(userId);
    
    // Business logic
    const data = await service.getData(sanitizedUserId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, message: error.message });
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

// Zod schema validation example
const UserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(150),
});

try {
  const validatedUser = UserSchema.parse(userData);
} catch (error) {
  if (error instanceof z.ZodError) {
    throw new ValidationError(`Invalid user data: ${error.errors.map(e => e.message).join(', ')}`);
  }
  throw error;
}
```

### Logging Pattern
```typescript
import logger from '../utils/logger';

// Info level for successful operations
logger.info('User login successful', { 
  context: 'authentication', 
  metadata: { userId: user.id, ipAddress: req.ip } 
});

// Warning level for recoverable issues
logger.warn('Rate limit exceeded', { 
  context: 'security', 
  metadata: { userId: user?.id, ipAddress: req.ip } 
});

// Error level for failures
logger.error('Database connection failed', { 
  context: 'database', 
  error: error.message,
  stack: error.stack 
});
```

## Pre-commit & Workflow

- Husky + lint-staged configured for auto-fix linting
- Failed lint blocks commit (check console output)
- Tests run: Jest with ts-jest preset
- Target coverage: >80% on critical paths
- ESLint configured with security plugin
- TypeScript compiler checks enabled
- Pre-commit hooks run automatically

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
- Database: SQLite with better-sqlite3 driver
- Redis: For rate limiting and caching
- OpenTelemetry: For observability and tracing

## Environment Setup

1. Ensure Node.js 18.x is installed
2. Install dependencies with `npm install` in both root and backend directories
3. Set up environment variables using `.env.example` as template
4. Initialize database with `npm run db:init` in backend directory
5. Run tests to verify setup: `npm test` in backend directory
