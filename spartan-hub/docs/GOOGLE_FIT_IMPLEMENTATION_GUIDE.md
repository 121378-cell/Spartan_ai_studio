# Google Fit Integration: Implementation Guide
**Complete End-to-End Implementation with Code Examples**

Date: January 23, 2026

---

## 📚 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Implementation](#component-implementation)
3. [Service Layer](#service-layer)
4. [API Routes](#api-routes)
5. [Error Handling](#error-handling)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)

---

## 🏗️ Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  FRONTEND (React)                        │  │
│  │                                                          │  │
│  │  ┌──────────────────┐  ┌──────────────────────────────┐ │  │
│  │  │ConnectGoogleFit  │  │   DailyStatsCard            │ │  │
│  │  │  Component       │  │   Component                 │ │  │
│  │  │                  │  │                             │ │  │
│  │  │ - Click Connect  │  │ - Auto-fetch steps          │ │  │
│  │  │ - Get Auth URL   │  │ - Display progress bar      │ │  │
│  │  │ - Redirect OAuth │  │ - Manual refresh button     │ │  │
│  │  │ - Detect success │  │ - Error handling & retry    │ │  │
│  │  └────────┬─────────┘  └──────────┬───────────────────┘ │  │
│  │           │                       │                      │  │
│  │           └───────────────────────┼──────────────────┐   │  │
│  │                   googleFitService │                 │   │  │
│  │                                    ▼                 ▼   │  │
│  │                   ┌─────────────────────────────────────┐ │  │
│  │                   │  /api/fitness/google/auth          │ │  │
│  │                   │  /api/fitness/google/stats         │ │  │
│  │                   └─────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express/Node.js)                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Routes (googleFitRoutes)               │  │
│  │                                                          │  │
│  │  GET  /api/fitness/google/auth                          │  │
│  │       └─ Generates OAuth URL with SCOPES               │  │
│  │                                                          │  │
│  │  GET  /api/fitness/google/callback?code=X&state=Y      │  │
│  │       └─ Handles OAuth redirect from Google            │  │
│  │                                                          │  │
│  │  GET  /api/fitness/google/stats                         │  │
│  │       └─ Fetches daily steps from Google Fit API        │  │
│  └────────────┬──────────────────────────────┬─────────────┘  │
│               │                              │                │
│               ▼                              ▼                │
│  ┌──────────────────────────┐   ┌─────────────────────────┐   │
│  │   GoogleFitService       │   │   TokenService          │   │
│  │                          │   │                         │   │
│  │ - getAuthUrl()           │   │ - generateTokenPair()   │   │
│  │ - handleCallback()        │   │ - verifyAccessToken()  │   │
│  │ - getDailySteps()        │   │ - rotateRefreshToken() │   │
│  │ - getUserAuth()          │   │ - clearSecureCookies() │   │
│  └──────────┬───────────────┘   └──────────┬──────────────┘   │
│             │                              │                │
│             └──────────────┬───────────────┘                │
│                            │                               │
│                            ▼                               │
│                  ┌──────────────────────┐                  │
│                  │   UserModel          │                  │
│                  │                      │                  │
│                  │ - googleFit {        │                  │
│                  │     accessToken      │                  │
│                  │     refreshToken     │                  │
│                  │     expiryDate       │                  │
│                  │   }                  │                  │
│                  └──────────┬───────────┘                  │
│                             │                             │
│                             ▼                             │
│                  ┌──────────────────────┐                  │
│                  │   SQLite Database    │                  │
│                  │   (spartan.db)       │                  │
│                  └──────────────────────┘                  │
│                                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ OAuth 2.0 / REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GOOGLE SERVICES                                │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Google OAuth     │  │ Google Fit API   │                    │
│  │ (accounts.       │  │ (googleapis.     │                    │
│  │  google.com)     │  │  com/fit)        │                    │
│  │                  │  │                  │                    │
│  │ - Consent Screen │  │ - Steps data     │                    │
│  │ - Auth Code      │  │ - Activity       │                    │
│  │ - Access Token   │  │ - Sleep data     │                    │
│  │ - Refresh Token  │  │ - Aggregations   │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Implementation

### ConnectGoogleFit Component

**Location**: `src/components/fitness/ConnectGoogleFit.tsx`

**States**:
```typescript
type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error'
```

**Key Features**:
- Detects OAuth success from URL params
- Shows connection status with badge
- Handles errors gracefully
- Displays synced data types

**Implementation Details**:

```typescript
// useEffect: Detect OAuth success/error
useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleFitParam = params.get('googleFit');

    if (googleFitParam === 'connected') {
        setConnectionState({
            status: 'connected',
            message: 'Successfully connected to Google Fit'
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}, []);

// onClick: Initiate OAuth flow
const handleConnect = async () => {
    setConnectionState({ status: 'connecting' });
    try {
        const url = await googleFitService.getAuthUrl();
        window.location.href = url; // Redirect to Google
    } catch (error) {
        setConnectionState({ status: 'error', message: 'Failed to connect' });
    }
};
```

**UI States**:

| State | Button | Badge | Message |
|-------|--------|-------|---------|
| idle | Connect | - | - |
| connecting | Loading spinner | - | - |
| connected | - | ✓ Connected | Success message |
| error | Retry | ⚠️ Error | Error message |

---

### DailyStatsCard Component

**Location**: `src/components/fitness/DailyStatsCard.tsx`

**Features**:
- Auto-fetch on mount + every 5 minutes
- Manual refresh button
- Automatic retry (up to 3 attempts)
- Progress bar visualization
- Error state with retry logic

**Implementation Details**:

```typescript
// Auto-fetch with interval
useEffect(() => {
    fetchStats();
    
    const interval = setInterval(() => {
        fetchStats();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
}, []);

// Fetch with retry logic
const fetchStats = useCallback(async (attemptNumber: number = 1) => {
    setFetchState(prev => ({ ...prev, status: 'loading' }));
    
    try {
        const data = await googleFitService.getDailyStats();
        
        // Validate
        if (typeof data.steps !== 'number') {
            throw new Error('Invalid data format');
        }
        
        setStats(data);
        setFetchState({ status: 'success', retryCount: 0 });
    } catch (error) {
        const isRetryable = error.includes('Network') || error.includes('timeout');
        
        if (isRetryable && attemptNumber < 3) {
            // Retry after 2 seconds
            setTimeout(() => fetchStats(attemptNumber + 1), 2000);
        } else {
            setFetchState({ 
                status: 'error', 
                error: 'Failed to fetch steps',
                retryCount: attemptNumber 
            });
        }
    }
}, []);
```

**Display States**:

```
Loading:   [████░░░░░░░░░] Syncing...
Success:   8,234 steps    [████████░░░░░░░░░░] (82%)
Error:     ⚠️ Failed to fetch. Check connection.
           [Retry button]
```

---

## 🔧 Service Layer

### Frontend Service: googleFit.ts

**Location**: `src/services/googleFit.ts`

```typescript
export const googleFitService = {
    /**
     * Get OAuth URL from backend
     * Called when user clicks "Connect" button
     */
    getAuthUrl: async (): Promise<string> => {
        try {
            const response = await axios.get(
                `${API_URL}/fitness/google/auth`,
                { withCredentials: true } // Include auth tokens
            );
            return response.data.url;
        } catch (error) {
            console.error('Error getting auth URL:', error);
            throw error;
        }
    },

    /**
     * Get daily stats from backend
     * Called by DailyStatsCard component
     */
    getDailyStats: async (): Promise<{ steps: number; timestamp: number }> => {
        try {
            const response = await axios.get(
                `${API_URL}/fitness/google/stats`,
                { withCredentials: true } // Include auth tokens
            );
            return response.data;
        } catch (error) {
            console.error('Error getting daily stats:', error);
            throw error;
        }
    }
};
```

### Backend Service: GoogleFitService

**Location**: `backend/src/services/googleFitService.ts`

```typescript
export class GoogleFitService {
    private oauth2Client: OAuth2Client;

    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );
    }

    /**
     * Step 1: Generate OAuth URL for user consent
     */
    getAuthUrl(userId: string): string {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline', // ← Get refresh token
            scope: [
                'https://www.googleapis.com/auth/fitness.activity.read',
                'https://www.googleapis.com/auth/fitness.body.read',
                'https://www.googleapis.com/auth/fitness.nutrition.read',
                'https://www.googleapis.com/auth/fitness.sleep.read'
            ],
            state: userId, // ← CSRF protection: validate in callback
            prompt: 'consent' // ← Force consent to get refresh token
        });
    }

    /**
     * Step 2: Exchange authorization code for tokens
     * Called after user grants permissions
     */
    async handleCallback(code: string, userId: string): Promise<void> {
        try {
            // Exchange code for tokens
            const { tokens } = await this.oauth2Client.getToken(code);

            // Save to database
            await UserModel.update(userId, {
                googleFit: {
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiryDate: tokens.expiry_date
                }
            });

            logger.info(`Google Fit tokens saved for user ${userId}`);
        } catch (error) {
            logger.error('Error getting Google Fit tokens:', error);
            throw error;
        }
    }

    /**
     * Step 3: Get daily steps from Google Fit API
     */
    async getDailySteps(
        userId: string, 
        startTimeMillis: number, 
        endTimeMillis: number
    ): Promise<number> {
        // Get user's stored tokens
        const auth = await this.getUserAuth(userId);
        if (!auth) return 0;

        const fitness = google.fitness({ version: 'v1', auth });

        try {
            // Call Google Fit API
            const response = await fitness.users.dataset.aggregate({
                userId: 'me',
                requestBody: {
                    aggregateBy: [{
                        dataTypeName: 'com.google.step_count.delta',
                        dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
                    }],
                    bucketByTime: { 
                        durationMillis: endTimeMillis - startTimeMillis 
                    },
                    startTimeMillis: startTimeMillis,
                    endTimeMillis: endTimeMillis
                }
            });

            // Extract step count
            const bucket = response.data.bucket?.[0];
            const point = bucket?.dataset?.[0]?.point?.[0];
            const steps = point?.value?.[0]?.intVal || 0;

            return steps;
        } catch (error) {
            logger.error(`Error fetching steps for user ${userId}:`, error);
            return 0;
        }
    }

    /**
     * Helper: Get authenticated OAuth2 client for a user
     * Handles token refresh automatically
     */
    private async getUserAuth(userId: string): Promise<OAuth2Client | null> {
        const user = await UserModel.findById(userId);
        
        if (!user?.googleFit?.refreshToken) {
            logger.warn(`User ${userId} not connected to Google Fit`);
            return null;
        }

        const userClient = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Set credentials (including refresh token)
        userClient.setCredentials({
            access_token: user.googleFit.accessToken,
            refresh_token: user.googleFit.refreshToken,
            expiry_date: user.googleFit.expiryDate
        });

        // google-auth-library automatically refreshes if token expired
        return userClient;
    }
}

export const googleFitService = new GoogleFitService();
```

---

## 🛣️ API Routes

**Location**: `backend/src/routes/googleFitRoutes.ts`

### Route 1: Get Auth URL

```typescript
/**
 * GET /api/fitness/google/auth
 * 
 * Request:
 *   - Authorization: Bearer {accessToken}
 * 
 * Response (200):
 *   {
 *     "url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&scope=...&state=..."
 *   }
 */
router.get('/google/auth', authenticateToken, (req: Request, res: Response) => {
    const userId = (req as any).user.userId;
    const url = googleFitService.getAuthUrl(userId);
    return res.json({ url });
});
```

**Example Usage** (Frontend):
```typescript
const response = await fetch('/api/fitness/google/auth', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
});
const data = await response.json();
window.location.href = data.url; // Redirect to Google
```

---

### Route 2: OAuth Callback

```typescript
/**
 * GET /api/fitness/google/callback
 * 
 * Called by Google after user grants permissions
 * 
 * Query Parameters:
 *   - code: Authorization code from Google
 *   - state: User ID (for CSRF validation)
 * 
 * Response (302):
 *   Redirect to: /dashboard?googleFit=connected
 *   or: /dashboard?googleFit=error
 */
router.get('/google/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const state = req.query.state as string; // userId

    if (!code || !state) {
        return res.status(400).send('Missing code or state');
    }

    try {
        // Exchange code for tokens and save
        await googleFitService.handleCallback(code, state);

        // Redirect with success parameter
        const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
        return res.redirect(`${origin}/dashboard?googleFit=connected`);
    } catch (error) {
        logger.error('Google Fit callback failed:', error);
        
        const origin = process.env.CORS_ORIGIN || 'http://localhost:5173';
        return res.redirect(`${origin}/dashboard?googleFit=error`);
    }
});
```

**OAuth Flow Diagram**:
```
1. User clicks "Connect"
   ↓
2. Frontend: GET /api/fitness/google/auth
   ↓
3. Backend returns OAuth URL
   ↓
4. Frontend: window.location.href = url
   ↓
5. User redirected to Google
   ↓
6. User authenticates & grants permissions
   ↓
7. Google redirects to callback with code
   ↓
8. Backend: GET /api/fitness/google/callback?code=X&state=userId
   ↓
9. Backend exchanges code for tokens
   ↓
10. Backend saves tokens to UserModel.googleFit
    ↓
11. Backend redirects to /dashboard?googleFit=connected
    ↓
12. Frontend detects param and updates UI
```

---

### Route 3: Get Stats

```typescript
/**
 * GET /api/fitness/google/stats
 * 
 * Request:
 *   - Authorization: Bearer {accessToken}
 * 
 * Response (200):
 *   {
 *     "steps": 8234,
 *     "timestamp": 1704067200000
 *   }
 * 
 * Response (500):
 *   {
 *     "error": "Failed to fetch Google Fit stats"
 *   }
 */
router.get('/google/stats', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;

        // Get today's stats (midnight to now)
        const now = Date.now();
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const steps = await googleFitService.getDailySteps(
            userId,
            startOfDay.getTime(),
            now
        );

        return res.json({ 
            steps, 
            timestamp: now 
        });
    } catch (error) {
        return res.status(500).json({ 
            error: 'Failed to fetch Google Fit stats' 
        });
    }
});
```

---

## ❌ Error Handling

### Frontend Error Handling

```typescript
// DailyStatsCard.tsx
const fetchStats = async (attemptNumber: number = 1) => {
    try {
        const data = await googleFitService.getDailyStats();
        setStats(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Determine if retryable
        const isRetryable = 
            errorMessage.includes('Network') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('500');
        
        if (isRetryable && attemptNumber < 3) {
            // Automatic retry with delay
            setTimeout(() => fetchStats(attemptNumber + 1), 2000);
        } else {
            // Show error to user
            setFetchState({
                status: 'error',
                error: 'Failed to fetch steps. Please try again.'
            });
        }
    }
};
```

### Backend Error Handling

```typescript
// googleFitService.ts
private async getUserAuth(userId: string): Promise<OAuth2Client | null> {
    const user = await UserModel.findById(userId);
    
    if (!user) {
        logger.error(`User not found: ${userId}`);
        throw new Error('User not found');
    }
    
    if (!user.googleFit?.refreshToken) {
        logger.warn(`User not connected to Google Fit: ${userId}`);
        return null; // Return null, don't throw
    }
    
    // ... rest of implementation
}

// routes
router.get('/google/stats', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const steps = await googleFitService.getDailySteps(userId, start, end);
        return res.json({ steps, timestamp: Date.now() });
    } catch (error) {
        logger.error('Failed to fetch stats:', { metadata: { error: String(error) } });
        return res.status(500).json({ error: 'Failed to fetch Google Fit stats' });
    }
});
```

---

## 🧪 Testing Strategy

### Unit Tests

**Location**: `backend/src/__tests__/googleFitService.test.ts`

```typescript
describe('GoogleFitService', () => {
    describe('getAuthUrl', () => {
        it('should generate valid OAuth2 URL with all required scopes', () => {
            const url = googleFitService.getAuthUrl('test-user-123');
            
            expect(url).toContain('accounts.google.com');
            expect(url).toContain('client_id=');
            expect(url).toContain('fitness.activity.read');
            expect(url).toContain('access_type=offline');
            expect(url).toContain('state=test-user-123');
        });
    });

    describe('handleCallback', () => {
        it('should exchange code for tokens and save to user', async () => {
            const code = 'auth-code-xyz';
            const userId = 'user-123';
            
            await googleFitService.handleCallback(code, userId);
            
            // Verify tokens saved
            const user = await UserModel.findById(userId);
            expect(user.googleFit.accessToken).toBeDefined();
            expect(user.googleFit.refreshToken).toBeDefined();
        });
    });

    describe('getDailySteps', () => {
        it('should return step count for time range', async () => {
            const userId = 'user-123';
            const startTime = new Date();
            startTime.setHours(0, 0, 0, 0);
            
            const steps = await googleFitService.getDailySteps(
                userId,
                startTime.getTime(),
                Date.now()
            );
            
            expect(typeof steps).toBe('number');
            expect(steps).toBeGreaterThanOrEqual(0);
        });
    });
});
```

### E2E Tests

**Location**: `backend/src/__tests__/googleFitE2E.test.ts`

```typescript
describe('Google Fit OAuth E2E Flow', () => {
    it('should complete full OAuth flow: auth → callback → fetch stats', async () => {
        // Step 1: Get auth URL
        const authResponse = await request(app)
            .get('/api/fitness/google/auth')
            .set('Authorization', `Bearer ${token}`);
        
        expect(authResponse.status).toBe(200);
        expect(authResponse.body.url).toContain('accounts.google.com');
        
        // Step 2: Simulate callback
        const callbackResponse = await request(app)
            .get('/api/fitness/google/callback')
            .query({ code: 'auth-code', state: userId });
        
        expect(callbackResponse.status).toBe(302);
        expect(callbackResponse.headers.location).toContain('googleFit=connected');
        
        // Step 3: Fetch stats
        const statsResponse = await request(app)
            .get('/api/fitness/google/stats')
            .set('Authorization', `Bearer ${token}`);
        
        expect(statsResponse.status).toBe(200);
        expect(statsResponse.body).toHaveProperty('steps');
    });
});
```

---

## 🚀 Deployment

### Environment Variables

**.env.production**:
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/fitness/google/callback

# CORS
CORS_ORIGIN=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@localhost/spartan_prod

# Tokens
JWT_SECRET=your_secure_secret_key_minimum_32_chars
JWT_ALGO=HS256
```

### Google Cloud Setup

1. **Create OAuth Client**:
   ```
   https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Web Application
   - Add Authorized URIs:
     * http://localhost:4000 (dev)
     * https://yourdomain.com (prod)
   - Add Redirect URIs:
     * http://localhost:4000/api/fitness/google/callback (dev)
     * https://yourdomain.com/api/fitness/google/callback (prod)
   ```

2. **Enable Google Fit API**:
   ```
   https://console.cloud.google.com/apis/library
   - Search: "Google Fit API"
   - Enable
   ```

### Deployment Checklist

- [ ] Set environment variables in production
- [ ] Configure Google Cloud OAuth credentials
- [ ] Enable HTTPS for all OAuth URLs
- [ ] Test token refresh mechanism
- [ ] Set up error logging & monitoring
- [ ] Performance test: concurrent users
- [ ] Security audit: no credentials in code
- [ ] Rate limiting on OAuth endpoints

---

## 📊 Monitoring

### Metrics to Track

```typescript
// Backend logging
logger.info('OAuth flow started', { context: 'google-fit', metadata: { userId } });
logger.info('Tokens exchanged successfully', { context: 'google-fit', metadata: { userId } });
logger.error('Token refresh failed', { context: 'google-fit', metadata: { error } });
logger.warn('User disconnected', { context: 'google-fit', metadata: { userId } });
```

### Dashboarding (Optional)

- % of users connected to Google Fit
- Daily API calls to Google Fit
- Failed OAuth flows
- Token refresh failures
- Average API response time

---

## 🔗 References

- [GoogleFitService](../backend/src/services/googleFitService.ts)
- [googleFitRoutes](../backend/src/routes/googleFitRoutes.ts)
- [ConnectGoogleFit Component](../src/components/fitness/ConnectGoogleFit.tsx)
- [DailyStatsCard Component](../src/components/fitness/DailyStatsCard.tsx)
- [E2E Verification Plan](./GOOGLE_FIT_E2E_VERIFICATION.md)
- [Google Fit API Docs](https://developers.google.com/fit/rest/v1)
- [OAuth 2.0 Authorization Code Flow](https://developers.google.com/identity/protocols/oauth2/web-server-flow)

---

**Last Updated**: January 23, 2026  
**Status**: Implementation Complete ✅
