# AGENTS.md - Agent Guidelines for Spartan Hub

This document provides guidance for agentic coding agents working in the Spartan Hub codebase.

## Project Overview

Spartan Hub is a fitness coaching application with AI integration, built with React (frontend) and Express (backend), using TypeScript throughout. The application uses SQLite by default with PostgreSQL support, and includes comprehensive security, logging, and error handling.

## Build/Lint/Test Commands

### Root Level (Frontend + Backend)
```bash
# Build all components
npm run build:all

# Build individual components
npm run build:frontend  # Vite build
npm run build:backend   # TypeScript compilation
npm run build:services  # Build services

# Development
npm run dev              # Start frontend + backend in dev mode
npm start                # Start production app

# Testing
npm test                 # Run Jest tests
npm run test:coverage    # Run tests with coverage report

# Type checking
npm run type-check       # TypeScript type checking (no emit)
tsc --noEmit             # Alternative type check

# Security
npm run security-audit   # Run npm audit for high-severity issues
```

### Backend (spartan-hub/backend/)
```bash
# Build and run
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled server
npm run dev              # Run with ts-node (dev mode)
npm run watch            # Auto-reload with nodemon

# Linting
npm run lint             # ESLint check on src/
npm run lint:fix         # Auto-fix linting issues

# Testing
npm test                 # Run Jest tests
npm run test:coverage    # Coverage report
npm run test:security    # Security-focused tests (auth, token)
npm run test:i18n        # i18n/internationalization tests

# Single test file
jest path/to/test.spec.ts           # Run specific test file
jest --testNamePattern="test name"  # Run tests matching pattern
npm test -- --testPathPattern=auth  # Run tests matching pattern
```

## Code Style Guidelines

### TypeScript & Types
- **Strict mode enabled**: All files must pass strict TypeScript checking
- **No explicit `any`**: Use proper types; `any` is only allowed in test files
- **Explicit return types**: Functions should have explicit return types (warned but not blocked)
- **Interfaces for objects**: Use interfaces over type aliases for object shapes when extending
- **Enums**: Use enums for fixed sets of values (e.g., LogLevel, UserRole)
- **Null vs undefined**: Use undefined by default; null only for database values

### Imports & Organization
- Import statements at top of file, grouped in this order:
  1. External dependencies (npm packages)
  2. Internal modules (relative imports)
  3. Types/interfaces
- Use named exports by default, default exports only for components
- No unused imports (enforced by ESLint)
- No circular dependencies (enforced by ESLint)
- Path aliases: `@/*` maps to project root

### Formatting
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes by default, double quotes if string contains single quote
- **Semicolons**: Always required
- **Max line length**: 120 characters
- **Trailing commas**: Not required in objects/arrays
- **Complexity**: Max cyclomatic complexity of 15 per function
- **Max params**: 4 parameters per function

### Naming Conventions
- **Files**: kebab-case (e.g., `governance-panel.tsx`, `error-handler.ts`)
- **Components**: PascalCase (e.g., `GovernancePanel`, `AiErrorScreen`)
- **Functions/variables**: camelCase (e.g., `fetchData`, `userId`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_KEY`, `MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix avoided (e.g., `LogEntry`, not `ILogEntry`)
- **Types**: PascalCase (e.g., `QueryType`, `AuthRequest`)
- **Private members**: Prefix with underscore `_privateVar`

### Error Handling
- **Always handle errors**: Never ignore promise rejections or caught errors
- **Use custom error classes**: `ValidationError`, `NotFoundError`, `ServiceUnavailableError`
- **Global error handler**: Backend has global error handler in `utils/errorHandler.ts`
- **Structured logging**: Use logger utility for all error logging
- **Client errors**: Return 4xx status codes with descriptive messages
- **Server errors**: Return 5xx status codes, log with full stack trace
- **Throw early**: Validate inputs and throw errors before processing
- **Never swallow errors**: Always re-throw or handle appropriately

### Security Requirements (BLOCKING)
- **No eval() or similar**: Blocks dynamic code execution
- **Input sanitization**: All user inputs must be sanitized using `sanitizeInput()` or `sanitizeHtml()`
- **No innerHTML**: Use DOMPurify for HTML sanitization
- **SQL injection prevention**: Use parameterized queries only
- **XSS prevention**: DOMPurify for frontend, helmet for backend
- **Rate limiting**: All API routes must have rate limiting
- **Authentication**: JWT tokens required for protected routes
- **No secrets in code**: All secrets must use environment variables or secrets utility
- **Sensitive data redaction**: Logger automatically redacts passwords, tokens, keys

### Database & Data Handling
- **Transaction support**: Use database transactions for multi-step operations
- **Prepared statements**: Always use prepared statements for SQL queries
- **Error logging**: All database errors must be logged with metadata
- **Connection pooling**: Backend uses connection pooling (PostgreSQL)
- **Fallback strategy**: Database service implements SQLite fallback

### API & Controller Patterns
- **RESTful conventions**: Use proper HTTP methods (GET, POST, PUT, DELETE)
- **Consistent response format**: `{ success: boolean, message: string, data?: any }`
- **Status codes**: Use appropriate HTTP status codes (200, 201, 400, 401, 404, 500, etc.)
- **Request validation**: Validate all request inputs before processing
- **Try-catch blocks**: All async controller methods wrapped in try-catch
- **Authentication middleware**: Protected routes use `authMiddleware` or role-based checks

### Logging Guidelines
- **Use structured logger**: Import from `utils/logger.ts`
- **Log levels**: ERROR, WARN, INFO, DEBUG, TRACE
- **Context always**: Include context parameter for log categorization
- **Metadata for details**: Use metadata object for structured data
- **Error with stack**: Use `errorWithStack()` for exceptions
- **Performance metrics**: Use `metric()` or `logApiPerformance()` for timing
- **Sanitize metadata**: Logger auto-redacts sensitive fields

### Testing Guidelines
- **Jest framework**: Use Jest for all testing
- **Test location**: Place tests in `__tests__/` directory or `*.test.ts` files
- **Mock appropriately**: Mock external dependencies (databases, APIs)
- **Coverage goal**: Aim for >80% coverage on critical paths
- **Test names**: Describe what the test does and expects
- **Arrange-Act-Assert**: Structure tests clearly with this pattern
- **No console.log in tests**: Use Jest assertions

### React Specific (Frontend)
- **Functional components**: Use functional components with hooks
- **TypeScript props**: Define interfaces for component props
- **State management**: Use React hooks (useState, useEffect, useReducer)
- **Custom hooks**: Extract reusable logic into custom hooks (e.g., `useAuth`)
- **Material-UI**: Use MUI components from `@mui/material`
- **Emotion**: Use `@emotion/styled` for custom styled components
- **Error boundaries**: Implement error boundaries for component trees

### Internationalization (i18n)
- **i18next**: Backend uses i18next for translations
- **Language detection**: Detect language from Accept-Language header or user preference
- **Translation keys**: Use consistent naming (e.g., `auth.invalidCredentials`)
- **Spanish language**: Primary language is Spanish; English secondary

### Performance Guidelines
- **Async/await**: Use async/await for async operations (no callbacks)
- **No blocking operations**: Keep database queries fast, add indexes as needed
- **Caching**: Implement caching for frequently accessed data (Redis/local cache)
- **Debouncing/throttling**: Use for user input (search, typing)
- **Bundle size**: Keep frontend bundle size minimal (code splitting, lazy loading)
- **Monitoring**: Use metrics collector for performance tracking

### Pre-commit Hooks
- **Husky**: Git hooks configured via Husky
- **Lint-staged**: Runs linting on staged files before commit
- **Auto-fix**: ESLint auto-fixes issues before commit
- **Blocked commits**: Failed lint blocks commit (check console output)

### Docker & Deployment
- **Docker Compose**: Multi-service setup (frontend, backend, PostgreSQL, Redis)
- **Environment variables**: Use `.env.example` for template
- **Health checks**: `/api/health` endpoint for service health
- **Graceful shutdown**: Handle SIGTERM for proper cleanup

## Common Patterns

### Database Query
```typescript
const result = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
logger.info('User fetched', { context: 'database', metadata: { userId } });
```

### API Controller
```typescript
export const handleRequest = async (req: AuthenticatedRequest, res: Response) => {
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

### Logging
```typescript
import { logger } from '../utils/logger';

logger.error('Error occurred', { context: 'api', metadata: { userId, error } });
logger.metric('api_call_duration', duration, { context: 'performance' });
```

## Tools & Config

- **TypeScript**: 5.9.3 (strict mode)
- **ESLint**: With TypeScript, security, and import plugins
- **Jest**: 30.2.0 with ts-jest preset
- **Vite**: 7.1.12 for frontend build
- **Node**: Target 18.x for backend
- **React**: 19.2.0
- **Express**: 4.18.x
