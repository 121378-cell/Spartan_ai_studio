# AGENTS.md - Agent Guidelines for Spartan Hub

<<<<<<< HEAD
Quick reference for agentic coding agents operating in this repository.
=======
Quick reference for agentic coding agents. See `spartan-hub/AGENTS.md` for detailed guidelines.
>>>>>>> 5ef74c1fd13261899915e69b6c3f84338d45e5ea

## Project Overview

Spartan Hub: Fitness coaching app with AI integration
- Frontend: React 19 + TypeScript + Vite
- Backend: Express + TypeScript
- Database: SQLite (default) with PostgreSQL support
<<<<<<< HEAD
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
=======
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
>>>>>>> 5ef74c1fd13261899915e69b6c3f84338d45e5ea

# Backend (from spartan-hub/backend/)
npm run lint               # ESLint check
npm run lint:fix           # Auto-fix linting issues
<<<<<<< HEAD
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
=======
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
>>>>>>> 5ef74c1fd13261899915e69b6c3f84338d45e5ea

### Import Organization
1. External dependencies (npm packages)
2. Internal modules (relative imports)
3. Types/interfaces
4. Constants
<<<<<<< HEAD
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

=======
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

>>>>>>> 5ef74c1fd13261899915e69b6c3f84338d45e5ea
### Database Query
```typescript
const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
logger.info('User fetched', { context: 'database', metadata: { userId } });
<<<<<<< HEAD
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
=======

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
>>>>>>> 5ef74c1fd13261899915e69b6c3f84338d45e5ea
