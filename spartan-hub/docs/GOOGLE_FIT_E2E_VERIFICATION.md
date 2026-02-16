# Google Fit End-to-End Verification Plan
**Date**: January 23, 2026  
**Status**: Implementation & Testing

---

## 🎯 Objective
Verify the complete OAuth2 flow for Google Fit integration and validate real-time data synchronization in the DailyStatsCard component.

### Flow: Dashboard → Google Consent → Callback → Token Storage → Data Display

---

## 📋 Pre-requisites

### Environment Setup
```bash
# Backend environment variables (.env)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret  
GOOGLE_REDIRECT_URI=http://localhost:4000/api/fitness/google/callback
CORS_ORIGIN=http://localhost:5173

# Node versions
Node.js: 18.x (minimum)
```

### Developer Credentials
1. Create a Google Cloud Project at https://console.cloud.google.com
2. Enable **Google Fit API**
3. Create OAuth 2.0 Client ID (Web Application)
4. Add Authorized redirect URIs:
   - `http://localhost:4000/api/fitness/google/callback` (Development)
   - `https://yourdomain.com/api/fitness/google/callback` (Production)

---

## 🔄 Complete OAuth2 Flow

### Phase 1: Initiation (Frontend → Backend)
```
User clicks "Connect" button in ConnectGoogleFit component
  ↓
Frontend calls: GET /api/fitness/google/auth (authenticated)
  ↓
Backend returns: { url: "https://accounts.google.com/o/oauth2/v2/auth?..." }
  ↓
Frontend redirects to Google Consent Screen
```

**Component**: [ConnectGoogleFit.tsx](../src/components/fitness/ConnectGoogleFit.tsx)

### Phase 2: User Consent (Google)
```
Google displays consent screen
  ↓
User authorizes "Spartan Hub" to access fitness data
  ↓
Google generates authorization code
  ↓
Google redirects: http://localhost:4000/api/fitness/google/callback?code=xxx&state=userId
```

### Phase 3: Token Exchange (Backend)
```
Backend receives callback: GET /api/fitness/google/callback?code=xxx&state=userId
  ↓
Exchange code for tokens using googleFitService.handleCallback()
  ↓
Save to UserModel.googleFit:
  {
    accessToken: "xxx",
    refreshToken: "xxx",
    expiryDate: 1704067200000
  }
  ↓
Redirect to: http://localhost:5173/dashboard?googleFit=connected
```

**Service**: [googleFitService.ts](../backend/src/services/googleFitService.ts)  
**Route**: [googleFitRoutes.ts](../backend/src/routes/googleFitRoutes.ts)

### Phase 4: Dashboard Redirect (Frontend)
```
Dashboard detects ?googleFit=connected param
  ↓
ConnectGoogleFit shows "Connected" badge
  ↓
DailyStatsCard becomes visible (previously hidden)
  ↓
DailyStatsCard auto-fetches daily steps
```

### Phase 5: Data Sync (Real-time Display)
```
DailyStatsCard calls: GET /api/fitness/google/stats (authenticated)
  ↓
Backend calls googleFitService.getDailySteps()
  ↓
Gets user auth credentials (access + refresh token)
  ↓
Calls Google Fit API: /users/me/dataset:aggregate
  ↓
Returns: { steps: 8234, timestamp: 1704067200000 }
  ↓
DailyStatsCard displays:
  - Step count with animated progress bar
  - Refresh button for manual sync
```

---

## 🧪 Test Scenarios

### ✅ Scenario 1: Happy Path - Successful Connection
**Expected Result**: Full OAuth flow completes, tokens saved, steps displayed

1. User navigates to `/dashboard`
2. Click "Connect" in ConnectGoogleFit card
3. Authenticate with Google account
4. Grant permissions
5. Redirected back to dashboard with "Connected" badge
6. DailyStatsCard shows today's steps with progress bar
7. User can refresh stats with button

**Verification Points**:
- [ ] Auth URL generated correctly
- [ ] Authorization code received
- [ ] Tokens stored in UserModel.googleFit
- [ ] Redirect parameter parsed correctly
- [ ] UI state updated to "Connected"
- [ ] Steps data fetched and displayed
- [ ] Progress bar animates correctly

### ✅ Scenario 2: Token Refresh
**Expected Result**: Expired tokens automatically refreshed

1. Access token expires (15-60 minutes)
2. User refreshes DailyStatsCard
3. Backend detects expired token
4. Uses refresh token to get new access token
5. Fetches latest steps
6. No error shown to user

**Verification Points**:
- [ ] Token expiry detected
- [ ] Refresh token applied automatically
- [ ] New access token stored
- [ ] API call succeeds after refresh

### ✅ Scenario 3: Disconnection & Reconnection
**Expected Result**: User can disconnect and reconnect

1. User disconnects (revoke tokens)
2. ConnectGoogleFit shows "Connect" button again
3. DailyStatsCard hidden
4. User reconnects with different account
5. New tokens saved
6. Steps display updated

**Verification Points**:
- [ ] Tokens cleared from database
- [ ] UI reverts to "Connect" state
- [ ] New OAuth flow triggers
- [ ] New tokens stored correctly

### ✅ Scenario 4: Error Handling - Invalid Credentials
**Expected Result**: Graceful error handling

1. Invalid/expired token stored
2. Google Fit API call fails (401/403)
3. User sees error state
4. Prompt to reconnect

**Verification Points**:
- [ ] API error caught
- [ ] Error message displayed
- [ ] Reconnection option provided
- [ ] No crashes or unhandled exceptions

### ✅ Scenario 5: Network Timeout
**Expected Result**: Timeout handled gracefully

1. Simulate network latency
2. API call times out after 10 seconds
3. Loading state cleared
4. Retry button shown
5. User can manually refresh

**Verification Points**:
- [ ] Timeout detected and handled
- [ ] Loading state clears
- [ ] Error message shown
- [ ] Retry mechanism works

---

## 📊 Data Validation

### Token Structure (UserModel.googleFit)
```typescript
interface GoogleFitAuth {
  accessToken: string;      // Short-lived (1 hour)
  refreshToken: string;     // Long-lived (6 months+)
  expiryDate: number;       // Milliseconds since epoch
}
```

### Steps Response Format
```typescript
interface DailyStats {
  steps: number;            // Total steps for the day
  timestamp: number;        // When the data was fetched
}
```

### Expected Values
- **Daily Steps**: 0 - 50,000 (typical range: 3,000 - 15,000)
- **Step Goal**: 10,000 (hardcoded in DailyStatsCard)
- **Progress Bar**: 0% - 100% (capped)
- **Update Frequency**: On-demand (manual refresh via button)

---

## 🔧 Testing Commands

### Unit Tests - TokenService & GoogleFitService
```bash
cd spartan-hub/backend

# Run GoogleFit service tests
npm test -- googleFitService

# Run with coverage
npm run test:coverage -- googleFitService

# Watch mode for development
npm test -- --watch googleFitService
```

### E2E Tests - OAuth Flow
```bash
cd spartan-hub

# Run E2E tests
npm run test:e2e

# Test specific scenario
npm run test:e2e -- --testNamePattern="OAuth"
```

### Manual Testing - Local Server
```bash
# Terminal 1: Start Backend
cd spartan-hub/backend
npm run dev
# Expected: Server running on http://localhost:4000

# Terminal 2: Start Frontend  
cd spartan-hub
npm run dev
# Expected: Frontend running on http://localhost:5173

# Terminal 3: Debug Logs (Optional)
npm run logs:backend
```

### Test Google Fit Auth URL Generation
```bash
cd spartan-hub/backend
npx ts-node src/scripts/testGoogleFitAuth.ts
# Expected output:
# ✅ Auth URL Generated Successfully:
# https://accounts.google.com/o/oauth2/v2/auth?client_id=...
```

---

## 📱 UI/UX Verification

### ConnectGoogleFit Component
**Initial State**:
- [ ] Green Activity icon displayed
- [ ] Text: "Google Fit - Sync steps & activity"
- [ ] Blue "Connect" button visible
- [ ] Loading state: Button shows "Connecting..."

**Connected State**:
- [ ] Blue "Connected" badge with checkmark
- [ ] "Connected" text displayed
- [ ] Button replaced with badge

**Error State**:
- [ ] Alert message: "Failed to connect to Google Fit"
- [ ] Button re-enabled for retry
- [ ] No data shown

### DailyStatsCard Component
**Connected & Loading**:
- [ ] "Daily Steps" title visible
- [ ] "Google Fit" subtitle visible
- [ ] Loading skeleton (gray placeholder)
- [ ] Refresh button present (bottom-right)

**Connected & Loaded**:
- [ ] Step count displayed (formatted: "8,234")
- [ ] Unit label: "steps"
- [ ] Progress bar visible and filled
- [ ] Progress bar color: Blue (#3B82F6)
- [ ] Goal text: "Goal: 10,000"
- [ ] Refresh button visible on hover

**Disconnected/Error**:
- [ ] Card hidden (not shown)
- [ ] User prompted to connect in ConnectGoogleFit

---

## 🔐 Security Checklist

- [ ] **Tokens**: Stored securely (never in localStorage)
- [ ] **HTTPS**: All OAuth redirects use HTTPS in production
- [ ] **CSRF Protection**: State parameter validates origin
- [ ] **Token Expiry**: Access tokens short-lived (1 hour)
- [ ] **Refresh Token**: Secure rotation implemented
- [ ] **Scope Limitation**: Only read fitness.activity scope
- [ ] **Error Messages**: No sensitive data in error responses
- [ ] **Logging**: Tokens never logged (redacted in logs)

---

## 📊 Monitoring & Logging

### Backend Logs to Monitor
```
✅ INFO: "User ${userId} starting OAuth flow"
✅ INFO: "Google Fit tokens saved for user ${userId}"
⚠️ WARN: "User ${userId} not connected to Google Fit"
❌ ERROR: "Error getting Google Fit tokens: ${error}"
❌ ERROR: "Error fetching steps for user ${userId}: ${error}"
```

### Frontend Console Logs
```javascript
// Success
console.log('Steps fetched:', data.steps);

// Errors
console.error('Failed to fetch stats:', err);
console.error('Failed to start connection:', error);
```

---

## 🚀 Deployment Checklist

### Before Production
- [ ] Update `.env.production` with real Google credentials
- [ ] Update CORS_ORIGIN to production domain
- [ ] Update GOOGLE_REDIRECT_URI to production URL
- [ ] Enable HTTPS for all OAuth URLs
- [ ] Configure Google Cloud Console with production domain
- [ ] Test token refresh mechanism
- [ ] Verify error handling and logging
- [ ] Load test: Concurrent users refreshing stats
- [ ] Security audit: No credentials in code

### Monitoring in Production
- [ ] Track OAuth success/failure rates
- [ ] Monitor token refresh failures
- [ ] Alert on API errors from Google Fit
- [ ] User analytics: % connected users
- [ ] Performance: API response times

---

## 📞 Troubleshooting

### Issue: "Missing code or state"
**Cause**: Redirect missing query parameters  
**Solution**: Verify Google Cloud Console redirect URI matches exactly

### Issue: "Invalid access token"
**Cause**: Token expired or invalid  
**Solution**: Clear tokens, reconnect. Check token expiry logic.

### Issue: "User not connected to Google Fit"
**Cause**: Tokens not found in database  
**Solution**: Complete OAuth flow first, verify tokens saved to UserModel

### Issue: "0 steps displayed"
**Cause**: No step data in Google Fit for that time range  
**Solution**: Log some steps on device, wait for sync, refresh card

### Issue: "Redirect loop"
**Cause**: Frontend constantly redirecting to auth  
**Solution**: Check URL param parsing, clear browser cookies

---

## 📌 References

- [Google Fit API Documentation](https://developers.google.com/fit/rest/v1/overview)
- [OAuth 2.0 Authorization Code Flow](https://developers.google.com/identity/protocols/oauth2/web-server-flow)
- [Google Auth Library Node.js](https://github.com/googleapis/google-auth-library-nodejs)
- Project Files:
  - Frontend: [googleFit.ts](../src/services/googleFit.ts)
  - Backend: [googleFitService.ts](../backend/src/services/googleFitService.ts)
  - Routes: [googleFitRoutes.ts](../backend/src/routes/googleFitRoutes.ts)
  - UI: [ConnectGoogleFit.tsx](../src/components/fitness/ConnectGoogleFit.tsx)
  - UI: [DailyStatsCard.tsx](../src/components/fitness/DailyStatsCard.tsx)
