# 🏃 SPRINT 1 WEEK 1 - EXECUTION PLAN

**Spartan Hub 2.0 - Production Readiness Sprint**

| **Document Info** | |
|-------------------|---|
| **Sprint** | Sprint 1 - Production Hardening |
| **Week** | Week 1 of 2 |
| **Duration** | 5 Days (40 hours) |
| **Status** | 📋 Planning Complete |
| **Created** | March 1, 2026 |
| **Project Status** | 95% Complete (14/14 Phases) |

---

## 📋 EXECUTIVE SUMMARY

### Week 1 Objectives

This week focuses on three critical production readiness areas:

| Day | Focus Area | Priority | Estimated Hours |
|-----|-----------|----------|-----------------|
| **Days 1-2** | E2E Testing Complete | 🔴 CRITICAL | 16h |
| **Days 3-4** | Mobile Optimization | 🟡 HIGH | 16h |
| **Day 5** | Security Audit | 🟡 HIGH | 8h |

### Current State Overview

Based on comprehensive codebase analysis:

| Area | Current Status | Target Status | Gap |
|------|---------------|---------------|-----|
| **E2E Tests** | 85+ Cypress tests, some failing | 100% passing | Fix ~5-10 failing tests |
| **Mobile Optimization** | Basic responsive, FPS issues | Optimized for low-end devices | Performance tuning needed |
| **Security** | 9.5/10 score, OWASP compliant | Production-hardened | Penetration testing needed |

### Success Criteria for Week 1

- ✅ All E2E tests passing (100% success rate)
- ✅ Mobile FPS stabilized at 30fps on mid-range devices
- ✅ Security penetration test completed with 0 critical findings
- ✅ Production deployment checklist validated

---

## 📊 CURRENT STATE ANALYSIS

### 1. E2E TESTING ASSESSMENT

#### 1.1 Existing Test Infrastructure

**Test Framework Configuration:**

| Component | Status | Location |
|-----------|--------|----------|
| **Cypress** | ✅ v15.10.0 installed | `spartan-hub/cypress/` |
| **Cypress Config** | ✅ Configured | `spartan-hub/cypress.config.ts` |
| **Jest E2E Config** | ✅ Configured | `spartan-hub/backend/jest.e2e.config.js` |
| **Test Commands** | ✅ Available | `npm run test:e2e`, `npm run cy:run`, `npm run cy:open` |

#### 1.2 Existing E2E Test Files

**Cypress E2E Tests (Frontend):**

| Test File | Purpose | Status | Coverage |
|-----------|---------|--------|----------|
| `authentication.cy.ts` | Login/Logout flows | ✅ Passing | Auth module |
| `core_flows.cy.ts` | Core user journeys | ✅ Passing | Main features |
| `dashboard-analytics.cy.ts` | Dashboard functionality | ✅ Passing | Analytics |
| `biometric-sync.cy.ts` | Garmin/Apple Health/Google Fit | 🟡 Partial | Biometric sync |
| `video-form-analysis.cy.ts` | Video analysis feature | 🟡 Partial | Phase A |
| `onboarding.cy.ts` | User onboarding | ✅ Passing | Onboarding |
| `basic.cy.ts` | Basic smoke tests | ✅ Passing | Sanity checks |

**Backend E2E Tests (Jest + Supertest):**

| Test File | Purpose | Status | Coverage |
|-----------|---------|--------|----------|
| `googleFitE2E.test.ts` | Google Fit OAuth flow | 🟡 Needs review | Full OAuth flow |
| `complete-user-flow.e2e.test.ts` | Complete user journey | ✅ Passing | End-to-end |
| `auth.e2e.test.ts` | Authentication flows | ✅ Passing | Auth module |
| `workout.e2e.test.ts` | Workout management | ✅ Passing | Workout module |
| `mlForecasting.e2e.test.ts` | ML predictions | ✅ Passing | ML module |
| `aiServices.e2e.test.ts` | AI service integration | ✅ Passing | AI module |
| `dailyBrainCycle.e2e.test.ts` | Adaptive brain cycles | ✅ Passing | Phase 8 |
| `feedbackLearningLoop.e2e.test.ts` | Feedback learning | ✅ Passing | Phase 8 |
| `criticalSignalFlow.e2e.test.ts` | Critical signals | ✅ Passing | Alert system |
| `terraWebhook.e2e.test.ts` | Terra webhook integration | ✅ Passing | Integrations |
| `websocketRealtimeFlow.e2e.test.ts` | WebSocket real-time | ✅ Passing | Real-time |

#### 1.3 Known Failing Tests

Based on `TEST_STATUS_REPORT_FEB_28_2026.md`:

| Test | Issue | Severity | Root Cause |
|------|-------|----------|------------|
| `security.middleware.test.ts` (3 assertions) | Message mismatch | 🟡 Low | Zod library update changed error messages |
| `googleFitE2E.test.ts` | Environment-dependent | 🟡 Medium | Requires OAuth mocking |
| E2E tests (general) | Timeout issues | 🟡 Medium | Sequential execution needed |

#### 1.4 Test Environment Setup

**Current Configuration:**

```typescript
// cypress.config.ts
{
  e2e: {
    baseUrl: 'http://localhost:3002',
    setupNodeEvents(on, config) {
      // Fake media stream for camera testing
      launchOptions.args.push('--use-fake-ui-for-media-stream')
      launchOptions.args.push('--use-fake-device-for-media-stream')
    }
  }
}
```

**Required Environment Variables:**

```bash
# Frontend (spartan-hub/.env.test)
VITE_API_URL=http://localhost:3001
VITE_NODE_ENV=test

# Backend (spartan-hub/backend/.env.test)
NODE_ENV=test
DATABASE_TYPE=sqlite
DB_PATH=data/test_e2e.db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3002
JWT_SECRET=test-secret-key-for-e2e-testing
```

#### 1.5 Integration Test Gaps

| Module Pair | Gap | Priority |
|-------------|-----|----------|
| Video Analysis → Database | No E2E test for saving analysis results | 🟡 Medium |
| Biometric Sync → ML Forecasting | Missing integration test | 🟡 Medium |
| Notification → User Preferences | Partial coverage | 🟢 Low |
| Coach Vitalis → RAG | No E2E test | 🟢 Low |

---

### 2. MOBILE OPTIMIZATION ASSESSMENT

#### 2.1 Current Mobile Implementation

**VideoCapture Component Analysis:**

| Feature | Current Implementation | Status |
|---------|----------------------|--------|
| **Device Detection** | `DeviceContext` with `isMobile`, `isTablet` | ✅ Implemented |
| **Performance Levels** | high/medium/low based on `navigator.hardwareConcurrency` | ✅ Implemented |
| **Frame Skipping** | `processingInterval` state (1-3 frames) | ✅ Implemented |
| **Resolution Scaling** | 640x480 (low), 960x540 (medium), 1280x720 (high) | ✅ Implemented |
| **FPS Cap** | 30fps max, 15fps min on mobile | ✅ Implemented |
| **Touch Targets** | Standard button sizes | 🟡 Needs improvement |

**File Locations:**

```
spartan-hub/src/
├── components/
│   ├── VideoAnalysis/
│   │   └── VideoCapture.tsx (1000+ lines) ✅
│   └── FormAnalysis/
│       └── VideoCapture.tsx (duplicate) ⚠️
├── context/
│   └── DeviceContext.tsx ✅
└── utils/
    └── deviceContext.ts ✅
```

#### 2.2 MediaPipe Performance

**Current Configuration:**

```typescript
// poseDetection.ts
{
  baseOptions: {
    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/...',
  },
  runningMode: 'VIDEO',
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
}
```

**Performance Issues Identified:**

| Issue | Impact | Current Value | Target |
|-------|--------|---------------|--------|
| Model load time | High TTI on mobile | ~3-5 seconds | <2 seconds |
| Inference time per frame | FPS drops | ~50-100ms | <33ms (30fps) |
| Memory usage | App crashes on low-end | ~200MB | <100MB |
| Camera initialization | Permission delays | ~2-3 seconds | <1 second |

#### 2.3 Responsive Design Status

**Current CSS (`src/index.css`):**

```css
/* Responsive improvements */
@media (max-width: 768px) {
  h1 { font-size: 2rem; }
  h2 { font-size: 1.75rem; }
  .spartan-card-content { padding: 1rem; }
  .spartan-alert { flex-direction: column; }
}
```

**Missing Responsive Features:**

| Feature | Status | Priority |
|---------|--------|----------|
| Video container aspect ratio | ✅ `aspect-portrait` class | - |
| Touch-friendly button sizes | 🟡 Partial | 🟡 High |
| Mobile navigation | 🟡 Needs review | 🟡 High |
| Landscape mode handling | ❌ Not implemented | 🟢 Medium |
| Safe area insets (iOS) | ❌ Not implemented | 🟢 Medium |

#### 2.4 Camera Permission Management

**Current Implementation:**

```typescript
// VideoCapture.tsx - Error handling
if (error instanceof DOMException) {
  if (error.name === 'NotAllowedError') {
    setCaptureState((prev) => ({
      ...prev,
      error: 'Camera access denied. Please check your browser permissions.',
    }));
  } else if (error.name === 'NotFoundError') {
    setCaptureState((prev) => ({
      ...prev,
      error: 'No camera found on this device.',
    }));
  }
  // ... more error types
}
```

**Issues:**

| Issue | Impact | Fix Priority |
|-------|--------|--------------|
| No permission pre-check | Poor UX on first load | 🟡 High |
| No retry mechanism | User must refresh page | 🟡 High |
| No fallback to upload | Feature blocked if camera fails | 🟢 Medium |

---

### 3. SECURITY AUDIT ASSESSMENT

#### 3.1 Current Security Posture

**Security Score:** 9.5/10 (from `COMPREHENSIVE_SECURITY_COMPLETION_REPORT.md`)

| Security Area | Status | Last Audit |
|--------------|--------|------------|
| **NPM Vulnerabilities** | ✅ 0 vulnerabilities | Feb 2026 |
| **CSRF Protection** | ✅ Implemented (csurf) | Jan 2026 |
| **Database Encryption** | ✅ AES-256-GCM | Jan 2026 |
| **AWS Secrets Manager** | ✅ Integrated | Jan 2026 |
| **Docker Hardening** | ✅ Multi-stage, non-root | Jan 2026 |
| **Rate Limiting** | ✅ 3-tier limits | Dec 2025 |
| **Security Headers** | ✅ Helmet.js | Dec 2025 |
| **Input Validation** | ✅ Zod schemas | Dec 2025 |

#### 3.2 Security Test Files

| Test File | Coverage | Status |
|-----------|----------|--------|
| `security.middleware.test.ts` | Input validation, auth | 🟡 3 minor failures |
| `security.unit.test.ts` | Security utilities | ✅ Passing |
| `security.test.ts` | General security | ✅ Passing |
| `security.simple.test.ts` | Basic checks | ✅ Passing |
| `corsSecurity.test.ts` | CORS configuration | ✅ Passing |
| `auth.security.test.ts` | Auth security | ✅ Passing |
| `rateLimiting.security.test.ts` | Rate limiting | ✅ Passing |
| `jwtAuthentication.security.test.ts` | JWT validation | ✅ Passing |
| `dataEncryption.security.test.ts` | Encryption | ✅ Passing |
| `hmacSignatureVerification.security.test.ts` | HMAC | ✅ Passing |

#### 3.3 Security Middleware Implementation

**File:** `backend/src/middleware/securityHeadersMiddleware.ts`

```typescript
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Feature-Policy': 'geolocation \'none\'; microphone \'none\'; camera \'none\'',
};

const CSP_POLICY = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  // ... more policies
`;
```

**Security Gaps Identified:**

| Gap | Risk Level | OWASP Category |
|-----|------------|----------------|
| CSP allows `'unsafe-inline'` and `'unsafe-eval'` | 🟡 Medium | A05:2021-Security Misconfiguration |
| No Content Security Policy reporting | 🟢 Low | A05:2021-Security Misconfiguration |
| Rate limiting not tested under load | 🟡 Medium | A04:2021-Insecure Design |
| No automated penetration testing | 🟡 Medium | A07:2021-Identification and Authentication Failures |

#### 3.4 OWASP Compliance Status

**OWASP Top 10 2021 Assessment:**

| OWASP Risk | Status | Evidence |
|------------|--------|----------|
| **A01: Broken Access Control** | ✅ Compliant | Role-based auth middleware |
| **A02: Cryptographic Failures** | ✅ Compliant | AES-256-GCM encryption |
| **A03: Injection** | ✅ Compliant | Zod validation, parameterized queries |
| **A04: Insecure Design** | 🟡 Partial | Rate limiting needs load testing |
| **A05: Security Misconfiguration** | 🟡 Partial | CSP needs hardening |
| **A06: Vulnerable Components** | ✅ Compliant | 0 npm vulnerabilities |
| **A07: Auth Failures** | ✅ Compliant | JWT + session management |
| **A08: Data Integrity** | ✅ Compliant | Encryption + HMAC |
| **A09: Logging Failures** | ✅ Compliant | Structured logging with sanitization |
| **A10: SSRF** | ✅ Compliant | Allowlist for external calls |

---

## 📅 DAY-BY-DAY BREAKDOWN

### DAYS 1-2: E2E TESTING COMPLETE (16 hours)

#### Day 1: Fix Failing Tests (8 hours)

**Morning Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 09:00-09:30 | Setup test environment | `npm install` in both frontend and backend | Dependencies installed |
| 09:30-10:00 | Create test database | `npm run test:e2e:setup` | Test DB initialized |
| 10:00-11:00 | Run baseline test suite | `npm run test:e2e` | Identify all failing tests |
| 11:00-11:15 | ☕ Break | - | - |
| 11:15-12:30 | Fix security.middleware.test.ts | Update assertions for Zod error messages | 3 tests passing |

**Afternoon Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 13:30-15:00 | Fix googleFitE2E.test.ts | Mock OAuth flow properly | OAuth tests passing |
| 15:00-15:15 | ☕ Break | - | - |
| 15:15-16:30 | Fix timeout issues | Adjust jest.e2e.config.js `testTimeout` | No timeout failures |
| 16:30-17:30 | Run full E2E suite | `npm run test:e2e` | All backend E2E passing |

**Day 1 Deliverables:**
- ✅ All backend E2E tests passing
- ✅ Test environment documented
- ✅ Failing test fixes committed

**Commands for Day 1:**

```bash
# 1. Install dependencies
cd spartan-hub && npm install
cd backend && npm install

# 2. Setup test database
cd spartan-hub/backend
npm run test:e2e:setup

# 3. Run baseline tests
npm run test:e2e

# 4. Run specific failing test
npx jest src/__tests__/security.middleware.test.ts --verbose

# 5. Run Google Fit E2E
npx jest src/__tests__/googleFitE2E.test.ts --verbose

# 6. Verify all backend E2E passing
npm run test:e2e -- --passWithNoTests
```

---

#### Day 2: Integration Test Gaps (8 hours)

**Morning Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 09:00-10:30 | Create Video Analysis → DB test | New file: `videoAnalysisIntegration.e2e.test.ts` | Test created |
| 10:30-10:45 | ☕ Break | - | - |
| 10:45-12:00 | Create Biometric → ML test | New file: `biometricToMlFlow.e2e.test.ts` | Test created |

**Afternoon Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 13:30-14:30 | Run Cypress frontend tests | `npm run cy:run` | Frontend E2E status |
| 14:30-15:30 | Fix failing Cypress tests | Update selectors/mocks as needed | Cypress tests passing |
| 15:30-15:45 | ☕ Break | - | - |
| 15:45-17:00 | Run complete E2E suite | `npm run test:e2e && npm run cy:run` | 100% pass rate |
| 17:00-17:30 | Generate coverage report | `npm run test:coverage` | Coverage report |

**Day 2 Deliverables:**
- ✅ 2 new integration tests created
- ✅ All Cypress tests passing
- ✅ E2E coverage report generated
- ✅ Test documentation updated

**Commands for Day 2:**

```bash
# 1. Run Cypress tests
cd spartan-hub
npm run cy:open  # Interactive
npm run cy:run   # Headless

# 2. Run specific Cypress test
npx cypress run --spec "cypress/e2e/video-form-analysis.cy.ts"

# 3. Generate coverage
cd backend
npm run test:coverage

# 4. Run complete E2E suite
npm run test:e2e

# 5. Verify test count
npx jest --listTests | wc -l
```

---

### DAYS 3-4: MOBILE OPTIMIZATION (16 hours)

#### Day 3: MediaPipe Performance (8 hours)

**Morning Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 09:00-10:00 | Profile current performance | Chrome DevTools Performance tab | Baseline metrics |
| 10:00-11:00 | Implement model preloading | Add `preloadPoseModel()` function | Faster model load |
| 11:00-11:15 | ☕ Break | - | - |
| 11:15-12:30 | Optimize inference settings | Adjust confidence thresholds | Faster inference |

**Afternoon Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 13:30-14:30 | Implement Web Workers | Move pose detection to worker thread | Non-blocking UI |
| 14:30-15:30 | Add memory management | Implement frame buffer cleanup | Reduced memory |
| 15:30-15:45 | ☕ Break | - | - |
| 15:45-17:00 | Test on low-end devices | Chrome DevTools throttling | Performance validated |
| 17:00-17:30 | Document optimizations | Update VideoCapture.tsx comments | Documentation |

**Day 3 Deliverables:**
- ✅ Model preloading implemented
- ✅ Inference optimized (target: <33ms/frame)
- ✅ Web Worker integration
- ✅ Memory management improved

**Code Changes Required:**

```typescript
// 1. Add model preloading (VideoCapture.tsx)
const preloadPoseModel = async () => {
  const poseService = getPoseDetectionService();
  if (!poseService.getState().isInitialized) {
    await poseService.initialize();
  }
};

// Call on component mount
useEffect(() => {
  preloadPoseModel();
}, []);

// 2. Optimize inference settings (poseDetection.ts)
{
  minPoseDetectionConfidence: 0.6, // Increased from 0.5
  minPosePresenceConfidence: 0.6,  // Increased from 0.5
  minTrackingConfidence: 0.5,      // Keep same
}

// 3. Add frame buffer cleanup
const MAX_FRAMES = 180; // 6 seconds at 30fps (reduced from 300)
const kept = updated.slice(-MAX_FRAMES);
```

**Commands for Day 3:**

```bash
# 1. Start development server
npm run dev

# 2. Open Chrome DevTools
# - Performance tab: Record during video analysis
# - Memory tab: Take heap snapshot
# - Lighthouse: Run mobile audit

# 3. Test with CPU throttling
# DevTools → Performance → CPU: 4x slowdown

# 4. Test with network throttling
# DevTools → Network → Slow 3G

# 5. Run Lighthouse
npx lighthouse http://localhost:3002 --view --preset=performance
```

---

#### Day 4: Responsive Design & UX (8 hours)

**Morning Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 09:00-10:00 | Audit touch targets | Measure all interactive elements | List of issues |
| 10:00-11:00 | Increase button sizes | Update CSS for mobile (min 44x44px) | Touch-friendly UI |
| 11:00-11:15 | ☕ Break | - | - |
| 11:15-12:30 | Add safe area insets | iOS notch support | Proper layout on iPhone |

**Afternoon Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 13:30-14:30 | Implement landscape mode | CSS media query for orientation | Landscape support |
| 14:30-15:30 | Add camera permission pre-check | `navigator.permissions.query()` | Better UX |
| 15:30-15:45 | ☕ Break | - | - |
| 15:45-16:30 | Add retry mechanism | Retry button on camera failure | Recoverable errors |
| 16:30-17:00 | Test on multiple devices | BrowserStack or real devices | Cross-device validation |
| 17:00-17:30 | Run mobile Lighthouse | `lighthouse --preset=performance --form-factor=mobile` | Score >85 |

**Day 4 Deliverables:**
- ✅ Touch targets ≥44x44px
- ✅ Safe area insets implemented
- ✅ Landscape mode supported
- ✅ Camera permission pre-check
- ✅ Retry mechanism added
- ✅ Lighthouse mobile score >85

**Code Changes Required:**

```css
/* 1. Touch-friendly buttons (index.css) */
@media (max-width: 768px) {
  .spartan-button {
    min-height: 44px;
    min-width: 44px;
    padding: 0.875rem 1.5rem;
  }
  
  /* Safe area insets for iOS */
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
  
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  /* Landscape mode */
  @media (orientation: landscape) {
    .video-container {
      aspect-ratio: 16/9;
      max-height: 80vh;
    }
  }
}
```

```typescript
// 2. Camera permission pre-check (VideoCapture.tsx)
const checkCameraPermission = async () => {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (result.state === 'denied') {
      setCaptureState(prev => ({
        ...prev,
        error: 'Camera permission denied. Please enable in browser settings.'
      }));
      return false;
    }
    return true;
  } catch {
    return true; // Assume granted if can't check
  }
};

// 3. Retry mechanism
const handleRetryCamera = async () => {
  setCaptureState(prev => ({ ...prev, error: null }));
  const hasPermission = await checkCameraPermission();
  if (hasPermission) {
    initializeCamera();
  }
};
```

**Commands for Day 4:**

```bash
# 1. Run Lighthouse mobile audit
npx lighthouse http://localhost:3002 --view --preset=performance --form-factor=mobile

# 2. Test responsive design
# Chrome DevTools → Toggle Device Toolbar
# Test: iPhone 12, iPhone SE, iPad, Galaxy S20

# 3. Test landscape mode
# Rotate device in DevTools

# 4. Validate touch targets
# Chrome DevTools → Rendering → Show paint regions

# 5. Generate mobile report
npx lighthouse http://localhost:3002 \
  --output=html \
  --output-path=./mobile-report.html \
  --preset=performance \
  --form-factor=mobile
```

---

### DAY 5: SECURITY AUDIT (8 hours)

#### Day 5: Security Hardening & Penetration Testing

**Morning Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 09:00-09:30 | Run npm audit | `npm audit --audit-level=high` | 0 vulnerabilities |
| 09:30-10:30 | Review CSP policy | Analyze `securityHeadersMiddleware.ts` | CSP hardening plan |
| 10:30-10:45 | ☕ Break | - | - |
| 10:45-12:00 | Implement CSP improvements | Remove unsafe-inline where possible | Hardened CSP |

**Afternoon Session (4 hours)**

| Time | Task | Command/Action | Expected Outcome |
|------|------|----------------|------------------|
| 13:30-14:30 | Run security tests | `npm run test:security` | All security tests passing |
| 14:30-15:30 | Manual penetration testing | OWASP ZAP or Burp Suite | Penetration test report |
| 15:30-15:45 | ☕ Break | - | - |
| 15:45-16:30 | Fix identified issues | Address findings from pen test | 0 critical findings |
| 16:30-17:00 | Generate security report | Document findings and fixes | Security report |
| 17:00-17:30 | Week 1 retrospective | Review accomplishments | Lessons learned |

**Day 5 Deliverables:**
- ✅ npm audit: 0 vulnerabilities
- ✅ CSP policy hardened
- ✅ All security tests passing
- ✅ Penetration test completed
- ✅ Security report generated

**Commands for Day 5:**

```bash
# 1. Run npm audit
cd spartan-hub && npm audit --audit-level=high
cd backend && npm audit --audit-level=high

# 2. Run security tests
cd backend
npm run test:security

# 3. Run OWASP ZAP (if installed)
# Download: https://www.zaproxy.org/download/
# Run baseline scan against http://localhost:3002

# 4. Check security headers
curl -I http://localhost:3002/api/health | grep -E "^(X-|Strict|Content-Security)"

# 5. Test rate limiting
# Install: npm install -g autocannon
autocannon -c 100 -d 30 http://localhost:3002/auth/login

# 6. Generate security report
npm audit --json > security-audit.json
```

**CSP Hardening Checklist:**

| Directive | Current | Target | Action |
|-----------|---------|--------|--------|
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | `'self'` | Remove unsafe where possible |
| `style-src` | `'self' 'unsafe-inline'` | `'self'` | Inline critical CSS |
| `img-src` | `'self' data: https:` | `'self' data: https:` | ✅ OK |
| `connect-src` | `'self' https://api.ninjas.com...` | `'self' + specific APIs` | Review API allowlist |
| `frame-ancestors` | `'none'` | `'none'` | ✅ OK |
| Report URI | Not set | `/api/csp-report` | Add reporting |

---

## 🛠️ REQUIRED RESOURCES

### Development Environment

| Resource | Requirement | Purpose |
|----------|-------------|---------|
| **Node.js** | v18.x | Runtime |
| **npm** | v9.x+ | Package manager |
| **Chrome** | Latest | E2E testing (Cypress) |
| **Chrome DevTools** | Built-in | Performance profiling |
| **Git** | v2.x+ | Version control |

### Testing Tools

| Tool | Installation | Purpose |
|------|--------------|---------|
| **Cypress** | `npm install cypress` | E2E testing |
| **Jest** | Already installed | Unit/E2E testing |
| **Supertest** | Already installed | API testing |
| **Lighthouse** | `npm install -g lighthouse` | Performance audit |
| **OWASP ZAP** | Download from zaproxy.org | Penetration testing |
| **autocannon** | `npm install -g autocannon` | Load testing |

### Test Data

| Data Type | Source | Location |
|-----------|--------|----------|
| **Test Users** | Created by setup script | `backend/src/scripts/setupE2eDb.ts` |
| **Test Database** | SQLite in-memory | `data/test_e2e.db` |
| **Mock OAuth** | Jest mocks | Test files |
| **Fake Media Stream** | Cypress flags | `cypress.config.ts` |

### Hardware for Testing

| Device Type | Minimum | Recommended |
|-------------|---------|-------------|
| **Desktop** | 4GB RAM, Dual-core | 8GB RAM, Quad-core |
| **Mobile (Low-end)** | 2GB RAM, Quad-core | 4GB RAM, Octa-core |
| **Mobile (Mid-range)** | 4GB RAM, Octa-core | 6GB RAM, Octa-core |
| **Tablet** | 3GB RAM | 4GB RAM |

---

## ✅ SUCCESS CRITERIA

### E2E Testing (Days 1-2)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Pass Rate** | 100% | `npm run test:e2e` output |
| **Backend E2E Tests** | All passing | Jest output |
| **Frontend E2E Tests** | All passing | Cypress output |
| **Test Execution Time** | <30 minutes | CI/CD pipeline time |
| **Flaky Tests** | 0 | Re-run consistency |
| **Coverage** | >80% critical paths | Coverage report |

### Mobile Optimization (Days 3-4)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Lighthouse Mobile Score** | >85 | Lighthouse report |
| **FPS on Mid-range Device** | ≥30 | DevTools Performance |
| **FPS on Low-end Device** | ≥15 | DevTools Performance |
| **Model Load Time** | <2 seconds | Performance tab |
| **Memory Usage** | <100MB | Memory tab |
| **Touch Target Size** | ≥44x44px | DevTools inspection |
| **TTI (Time to Interactive)** | <3 seconds | Lighthouse |

### Security Audit (Day 5)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **NPM Vulnerabilities** | 0 | `npm audit` |
| **Security Tests** | 100% passing | `npm run test:security` |
| **Critical Pen Test Findings** | 0 | OWASP ZAP report |
| **High Pen Test Findings** | 0 | OWASP ZAP report |
| **CSP Hardening** | unsafe-inline removed | Header inspection |
| **Rate Limiting** | Working under load | autocannon test |

---

## ⚠️ RISK ASSESSMENT

### High Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **E2E tests fail due to environment issues** | Medium | High | Use Docker for consistent environment |
| **Mobile performance can't meet targets** | Medium | High | Implement progressive enhancement |
| **Security fixes break existing functionality** | Low | High | Run full test suite after each fix |

### Medium Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Cypress tests flaky on CI** | Medium | Medium | Add retry logic, increase timeouts |
| **MediaPipe model loading slow** | High | Medium | Implement preloading and caching |
| **Camera permissions inconsistent across browsers** | Medium | Medium | Add fallback to file upload |

### Low Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Documentation incomplete** | Low | Low | Assign documentation tasks |
| **Minor CSS regressions** | Medium | Low | Visual regression testing |

---

## 🔄 ROLLBACK PLANS

### E2E Testing Rollback

If test fixes introduce regressions:

```bash
# 1. Identify the problematic commit
git log --oneline -10

# 2. Revert to last known good state
git checkout <last-good-commit>

# 3. Run tests to verify
npm run test:e2e

# 4. Create hotfix branch
git checkout -b hotfix/e2e-regression
```

### Mobile Optimization Rollback

If performance optimizations break functionality:

```bash
# 1. Revert VideoCapture changes
git checkout HEAD~1 -- src/components/VideoAnalysis/VideoCapture.tsx

# 2. Revert pose detection changes
git checkout HEAD~1 -- src/services/poseDetection.ts

# 3. Test to verify functionality restored
npm run dev

# 4. Create issue for investigation
# Document what broke and why
```

### Security Rollback

If security hardening breaks functionality:

```bash
# 1. Revert CSP changes
git checkout HEAD~1 -- backend/src/middleware/securityHeadersMiddleware.ts

# 2. Restart server
# Kill process and restart

# 3. Test affected functionality
curl -I http://localhost:3001/api/health

# 4. Document the issue and create fix plan
```

---

## 📊 ESTIMATED TIMELINE

### Hour-by-Hour Breakdown

```
Day 1: E2E Testing - Fix Failing Tests
├── 09:00-10:00 (1h)  │ Setup & baseline
├── 10:00-11:00 (1h)  │ Identify failures
├── 11:00-12:30 (1.5h)│ Fix security tests
├── 12:30-13:30       │ Lunch
├── 13:30-15:00 (1.5h)│ Fix Google Fit tests
├── 15:00-16:30 (1.5h)│ Fix timeout issues
└── 16:30-17:30 (1h)  │ Verify & document

Day 2: E2E Testing - Integration Gaps
├── 09:00-10:30 (1.5h)│ Create Video→DB test
├── 10:30-12:00 (1.5h)│ Create Biometric→ML test
├── 12:00-13:30       │ Lunch
├── 13:30-14:30 (1h)  │ Run Cypress tests
├── 14:30-15:30 (1h)  │ Fix Cypress issues
├── 15:30-17:00 (1.5h)│ Full E2E suite
└── 17:00-17:30 (0.5h)│ Coverage report

Day 3: Mobile - MediaPipe Performance
├── 09:00-10:00 (1h)  │ Profile performance
├── 10:00-11:00 (1h)  │ Implement preloading
├── 11:00-12:30 (1.5h)│ Optimize inference
├── 12:30-13:30       │ Lunch
├── 13:30-14:30 (1h)  │ Web Workers
├── 14:30-15:30 (1h)  │ Memory management
├── 15:30-17:00 (1.5h)│ Test on low-end
└── 17:00-17:30 (0.5h)│ Document

Day 4: Mobile - Responsive & UX
├── 09:00-10:00 (1h)  │ Audit touch targets
├── 10:00-11:00 (1h)  │ Increase button sizes
├── 11:00-12:30 (1.5h)│ Safe area insets
├── 12:30-13:30       │ Lunch
├── 13:30-14:30 (1h)  │ Landscape mode
├── 14:30-15:30 (1h)  │ Permission pre-check
├── 15:30-16:30 (1h)  │ Retry mechanism
├── 16:30-17:00 (0.5h)│ Cross-device test
└── 17:00-17:30 (0.5h)│ Lighthouse

Day 5: Security Audit
├── 09:00-09:30 (0.5h)│ npm audit
├── 09:30-10:30 (1h)  │ CSP review
├── 10:30-12:00 (1.5h)│ CSP hardening
├── 12:00-13:30       │ Lunch
├── 13:30-14:30 (1h)  │ Security tests
├── 14:30-15:30 (1h)  │ Penetration testing
├── 15:30-16:30 (1h)  │ Fix findings
├── 16:30-17:00 (0.5h)│ Security report
└── 17:00-17:30 (0.5h)│ Retrospective
```

### Gantt Chart

```
Week 1 Sprint 1
═══════════════════════════════════════════════════════════════
Task                    │ Day 1 │ Day 2 │ Day 3 │ Day 4 │ Day 5
═══════════════════════════════════════════════════════════════
E2E: Fix Failing Tests  │ ███████│       │       │       │
E2E: Integration Gaps   │       │ ███████│       │       │
Mobile: MediaPipe Perf  │       │       │ ███████│       │
Mobile: Responsive/UX   │       │       │       │ ███████│
Security: Audit         │       │       │       │       │ ███████
═══════════════════════════════════════════════════════════════
```

---

## 📈 EXPECTED OUTCOMES

### End of Week 1 State

| Area | Before | After | Improvement |
|------|--------|-------|-------------|
| **E2E Test Pass Rate** | ~85% | 100% | +15% |
| **Mobile Lighthouse** | ~75 | >85 | +10 points |
| **Mobile FPS (mid-range)** | ~20 | ≥30 | +50% |
| **Security Score** | 9.5/10 | 9.8/10 | +0.3 |
| **Critical Security Issues** | 0 | 0 | Maintained |
| **Production Readiness** | 95% | 98% | +3% |

### Deliverables Summary

| Deliverable | Format | Location |
|-------------|--------|----------|
| **E2E Test Report** | Markdown | `SPRINT1_WEEK1_E2E_REPORT.md` |
| **Mobile Optimization Report** | Markdown | `SPRINT1_WEEK1_MOBILE_REPORT.md` |
| **Security Audit Report** | Markdown | `SPRINT1_WEEK1_SECURITY_REPORT.md` |
| **Performance Baseline** | Lighthouse HTML | `reports/lighthouse-week1.html` |
| **Test Coverage Report** | HTML | `coverage/index.html` |
| **Updated Documentation** | Markdown | Various files |

---

## 🎯 WEEK 2 PREVIEW

### Sprint 1 Week 2 Focus

| Day | Focus Area | Description |
|-----|-----------|-------------|
| **Days 6-7** | Production Deployment Setup | CI/CD, environments, monitoring |
| **Days 8-9** | Documentation & User Guides | User manual, API docs, runbooks |
| **Day 10** | Sprint Review & Retrospective | Demo, lessons learned, planning |

### Week 2 Prerequisites (from Week 1)

- ✅ All E2E tests passing
- ✅ Mobile performance optimized
- ✅ Security audit completed
- ✅ Production readiness at 98%

---

## 📝 APPENDIX

### A. File Reference

**Key Files Modified This Week:**

| File | Purpose | Changes Expected |
|------|---------|------------------|
| `spartan-hub/cypress.config.ts` | Cypress config | Timeout adjustments |
| `spartan-hub/backend/jest.e2e.config.js` | Jest E2E config | Timeout, workers |
| `spartan-hub/src/components/VideoAnalysis/VideoCapture.tsx` | Video capture | Performance optimizations |
| `spartan-hub/src/services/poseDetection.ts` | Pose detection | Model preloading |
| `spartan-hub/src/index.css` | Styles | Mobile responsive |
| `spartan-hub/backend/src/middleware/securityHeadersMiddleware.ts` | Security | CSP hardening |

**New Files Created:**

| File | Purpose |
|------|---------|
| `spartan-hub/backend/src/__tests__/e2e/videoAnalysisIntegration.e2e.test.ts` | Video→DB integration |
| `spartan-hub/backend/src/__tests__/e2e/biometricToMlFlow.e2e.test.ts` | Biometric→ML integration |
| `reports/lighthouse-week1.html` | Performance report |
| `reports/security-audit-week1.md` | Security report |

### B. Command Reference

**Quick Reference:**

```bash
# E2E Testing
npm run test:e2e                    # Run all E2E
npm run cy:run                      # Run Cypress headless
npm run cy:open                     # Open Cypress UI

# Mobile Testing
npx lighthouse http://localhost:3002 --preset=performance --form-factor=mobile

# Security
npm run test:security               # Run security tests
npm audit --audit-level=high        # Check vulnerabilities

# Performance
npm run dev                         # Start dev server
# Then open Chrome DevTools → Performance
```

### C. Contact & Escalation

| Role | Contact | Escalation For |
|------|---------|----------------|
| **Tech Lead** | [TBD] | Technical blockers |
| **QA Lead** | [TBD] | Test failures |
| **Security Lead** | [TBD] | Security findings |
| **Product Owner** | [TBD] | Priority changes |

---

## ✅ WEEK 1 CHECKLIST

### Pre-Week Checklist

- [ ] Review this execution plan
- [ ] Ensure development environment is set up
- [ ] Verify all dependencies are installed
- [ ] Confirm test databases are accessible
- [ ] Schedule daily standups

### Daily Checklists

**Day 1:**
- [ ] Baseline E2E tests run
- [ ] Failing tests identified
- [ ] Security middleware tests fixed
- [ ] Google Fit E2E tests fixed
- [ ] All backend E2E passing

**Day 2:**
- [ ] Video→DB integration test created
- [ ] Biometric→ML integration test created
- [ ] Cypress tests run and fixed
- [ ] Full E2E suite passing
- [ ] Coverage report generated

**Day 3:**
- [ ] Performance baseline captured
- [ ] Model preloading implemented
- [ ] Inference optimized
- [ ] Web Workers integrated
- [ ] Memory management improved

**Day 4:**
- [ ] Touch targets audited and fixed
- [ ] Safe area insets added
- [ ] Landscape mode supported
- [ ] Camera permission pre-check added
- [ ] Retry mechanism implemented
- [ ] Lighthouse score >85

**Day 5:**
- [ ] npm audit: 0 vulnerabilities
- [ ] CSP policy hardened
- [ ] Security tests passing
- [ ] Penetration test completed
- [ ] Security report generated
- [ ] Week 1 retrospective held

### Post-Week Checklist

- [ ] All deliverables committed
- [ ] Documentation updated
- [ ] Week 2 planning prepared
- [ ] Stakeholders notified of progress
- [ ] Backup created

---

**Document Version:** 1.0
**Last Updated:** March 1, 2026
**Next Review:** End of Week 1 (March 7, 2026)

---

<p align="center">
  <strong>💪 SPARTAN HUB 2.0 - SPRINT 1 WEEK 1</strong><br>
  <em>E2E Testing | Mobile Optimization | Security Audit</em>
</p>
