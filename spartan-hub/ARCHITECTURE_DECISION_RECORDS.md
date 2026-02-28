# 🏗️ ARCHITECTURE DECISION RECORDS (ADRs)

**Project:** Spartan Hub 2.0  
**Date:** March 1, 2026  
**Status:** Active

---

## 📋 TABLE OF CONTENTS

1. [ADR-001: Monorepo Architecture](#adr-001-monorepo-architecture)
2. [ADR-002: SQLite as Default Database](#adr-002-sqlite-as-default-database)
3. [ADR-003: TypeScript for All Code](#adr-003-typescript-for-all-code)
4. [ADR-004: OpenTelemetry for Monitoring](#adr-004-opentelemetry-for-monitoring)
5. [ADR-005: JWT for Authentication](#adr-005-jwt-for-authentication)

---

## ADR-001: Monorepo Architecture

**Date:** January 15, 2026  
**Status:** ✅ Accepted  
**Impact:** High

### Context

Spartan Hub 2.0 needed a project structure that:
- Allows code sharing between frontend and backend
- Simplifies dependency management
- Enables atomic commits across components
- Supports independent deployment

### Decision

**Use monorepo architecture** with the following structure:

```
spartan-hub/
├── src/              # Frontend React app
├── backend/          # Backend Express API
├── shared/           # Shared types and utilities
└── scripts/          # Build and deployment scripts
```

### Rationale

**Pros:**
- ✅ Code sharing (types, utilities, constants)
- ✅ Single source of truth
- ✅ Easier refactoring across layers
- ✅ Simplified testing (integration tests easier)
- ✅ Atomic commits for full-stack changes

**Cons:**
- ❌ Larger repository size
- ❌ More complex CI/CD setup
- ❌ Potential for tight coupling

**Why we chose this:**
The benefits of code sharing and simplified cross-component refactoring outweigh the complexity costs for our team size (8 developers).

### Implementation

- Use npm workspaces for dependency management
- Shared types in `shared/types/`
- Shared utilities in `shared/utils/`
- Independent build pipelines for frontend and backend

### Consequences

- All developers need to understand monorepo tooling
- CI/CD must handle partial builds (only changed packages)
- Clear boundaries needed between packages

---

## ADR-002: SQLite as Default Database

**Date:** January 20, 2026  
**Status:** ✅ Accepted  
**Impact:** High

### Context

We needed a database solution that:
- Works out of the box for development
- Scales to production workloads
- Supports both local and cloud deployment
- Has minimal operational overhead

### Decision

**Use SQLite as default database** with PostgreSQL as an option for enterprise deployments.

### Rationale

**SQLite Benefits:**
- ✅ Zero configuration required
- ✅ Single file database (easy backup/restore)
- ✅ Excellent read performance
- ✅ Built-in to Node.js via `better-sqlite3`
- ✅ Perfect for development and small deployments

**PostgreSQL Option:**
- ✅ For high-write workloads
- ✅ Better concurrency
- ✅ Advanced features (JSONB, full-text search)
- ✅ Enterprise-grade reliability

**Why we chose this:**
80% of our users will have <10GB of data and <100 concurrent users. SQLite is perfect for this use case and dramatically simplifies deployment.

### Implementation

```typescript
// Database manager with abstraction
import { DatabaseManager } from './database/databaseManager';

const db = new DatabaseManager({
  type: process.env.DATABASE_TYPE || 'sqlite',
  path: './data/spartan_hub.db',
  postgresUrl: process.env.POSTGRES_URL // Optional
});
```

### Consequences

- Need to handle SQLite-specific quirks (foreign keys, migrations)
- PostgreSQL requires separate deployment (Docker/cloud)
- Migration scripts must work for both databases

---

## ADR-003: TypeScript for All Code

**Date:** January 10, 2026  
**Status:** ✅ Accepted  
**Impact:** High

### Context

The project needed:
- Type safety across the codebase
- Better IDE support and autocomplete
- Fewer runtime errors
- Self-documenting code

### Decision

**Use TypeScript for 100% of the codebase** (frontend, backend, scripts).

### Rationale

**Benefits:**
- ✅ Catch errors at compile time
- ✅ Better IDE support (autocomplete, refactoring)
- ✅ Self-documenting code (types as documentation)
- ✅ Easier onboarding for new developers
- ✅ Reduced bugs in production

**Costs:**
- ❌ Slower initial development
- ❌ Build step required
- ❌ Learning curve for some developers

**Why we chose this:**
The reduction in production bugs and improved developer experience outweigh the initial development speed cost.

### Implementation

**Strict mode enabled:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**No `any` type allowed** except in test mocks.

### Consequences

- All new code must be TypeScript
- Existing JavaScript code must be migrated
- CI/CD must include type checking

---

## ADR-004: OpenTelemetry for Monitoring

**Date:** February 28, 2026  
**Status:** ✅ Accepted  
**Impact:** Medium

### Context

We needed a monitoring solution that:
- Provides unified observability (traces, metrics, logs)
- Works across frontend and backend
- Is vendor-neutral (avoid lock-in)
- Scales with our growth

### Decision

**Use OpenTelemetry** as the standard for all telemetry data.

### Rationale

**Benefits:**
- ✅ Single standard for all telemetry
- ✅ Vendor-neutral (can switch providers easily)
- ✅ Works with any backend (Prometheus, Jaeger, etc.)
- ✅ Auto-instrumentation for many libraries
- ✅ Active community and development

**Alternatives Considered:**
- **DataDog:** Too expensive, vendor lock-in
- **New Relic:** Expensive, complex pricing
- **Custom solution:** Too much maintenance

**Why we chose this:**
OpenTelemetry gives us the flexibility to change monitoring backends without code changes and is becoming the industry standard.

### Implementation

**Backend (Node.js):**
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'spartan-hub-backend',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});
```

**Frontend (React):**
```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';

const provider = new WebTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'spartan-hub-frontend',
  }),
});
```

### Consequences

- Need to run OpenTelemetry Collector
- Learning curve for team
- Additional infrastructure (Collector, Prometheus, Grafana)

---

## ADR-005: JWT for Authentication

**Date:** January 25, 2026  
**Status:** ✅ Accepted  
**Impact:** High

### Context

We needed an authentication system that:
- Works across web and mobile
- Supports stateless authentication
- Scales horizontally
- Is secure and industry-standard

### Decision

**Use JWT (JSON Web Tokens)** with refresh token rotation.

### Rationale

**Benefits:**
- ✅ Stateless (no server-side session storage)
- ✅ Works across domains
- ✅ Built-in expiration
- ✅ Can include user claims
- ✅ Industry standard

**Security Measures:**
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (7 days)
- Refresh token rotation (new refresh token on each use)
- Secure HTTP-only cookies for refresh tokens
- CSRF protection

**Alternatives Considered:**
- **Session-based:** Doesn't scale well, requires sticky sessions
- **OAuth only:** Too complex for simple email/password login

**Why we chose this:**
JWT provides the best balance of security, scalability, and developer experience for our use case.

### Implementation

```typescript
// Token generation
const accessToken = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.REFRESH_TOKEN_SECRET,
  { expiresIn: '7d' }
);

// Token verification middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Consequences

- Need to handle token expiration gracefully
- Refresh token rotation adds complexity
- Can't revoke access tokens before expiration (need to wait for expiry)

---

## 📝 TEMPLATE FOR NEW ADRs

```markdown
## ADR-XXX: [Title]

**Date:** YYYY-MM-DD  
**Status:** [Proposed | Accepted | Deprecated | Superseded]  
**Impact:** [Low | Medium | High]

### Context

[Describe the problem or decision that needs to be made]

### Decision

[Describe the decision and what was chosen]

### Rationale

[Explain why this decision was made, including alternatives considered]

**Benefits:**
- ✅ ...

**Costs:**
- ❌ ...

### Implementation

[Describe how to implement this decision, with code examples if applicable]

### Consequences

[Describe the consequences of this decision, both positive and negative]
```

---

**Last Updated:** March 1, 2026  
**Version:** 1.0  
**Maintainer:** Architecture Team
