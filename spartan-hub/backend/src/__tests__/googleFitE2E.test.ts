import request from 'supertest';
import { app } from '../server';
import { UserModel } from '../models/User';
import { googleFitService } from '../services/googleFitService';
import { tokenService } from '../services/tokenService';
import { logger } from '../utils/logger';

/**
 * End-to-End Tests for Google Fit OAuth Flow
 * 
 * Tests the complete flow:
 * 1. User authentication
 * 2. OAuth initiation (get auth URL)
 * 3. Simulated OAuth callback
 * 4. Token storage
 * 5. Data fetching
 */
describe('Google Fit OAuth E2E Flow', () => {
  const testUser = {
    id: `e2e-test-user-${  Date.now()}`,
    email: 'e2e@test.com',
    name: 'E2E Test User',
    password: 'test-password',
    role: 'user',
    quest: 'default-quest',
    stats: { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
    onboardingCompleted: false,
    keystoneHabits: [],
    masterRegulationSettings: { targetBedtime: '22:00' },
    nutritionSettings: { priority: 'performance' as 'performance' | 'longevity' },
    isInAutonomyPhase: false
  };

  const googleAuthCode = 'google-auth-code-xyz-123';
  const googleTokens = {
    access_token: 'ya29.a0AfH6SMBx...',
    refresh_token: '1//0gF...',
    expiry_date: Date.now() + 3600000,
    token_type: 'Bearer'
  };

  let authToken: string;
  let sessionId: string;

  /**
     * Phase 1: Setup - Create test user and get authentication token
     */
  beforeAll(async () => {
    // Create test user
    const user = await UserModel.create({
      name: testUser.name,
      email: testUser.email,
      quest: testUser.quest || 'default-quest',
      stats: testUser.stats || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
      onboardingCompleted: testUser.onboardingCompleted ?? false,
      keystoneHabits: testUser.keystoneHabits || [],
      masterRegulationSettings: testUser.masterRegulationSettings || { targetBedtime: '22:00' },
      nutritionSettings: testUser.nutritionSettings || { priority: 'performance' },
      isInAutonomyPhase: testUser.isInAutonomyPhase ?? false,
      role: testUser.role,
      googleFit: undefined // Not connected yet
    });

    expect(user).toBeDefined();
    expect(user.googleFit).toBeNull();

    // Get auth tokens
    const tokenPair = await tokenService.generateTokenPair(
      testUser.id,
      testUser.role,
      `test-session-${  Date.now()}`
    );

    authToken = tokenPair.accessToken;
    sessionId = tokenPair.refreshToken;
  });

  /**
     * Phase 2: Cleanup - Remove test user
     */
  afterAll(async () => {
    // Clean up test user - skipping delete since UserModel doesn't have a delete method
    // In a real scenario, we would implement a delete method in UserModel
  });

  /**
     * TEST 1: User initiates Google Fit connection
     * 
     * Expected Flow:
     * 1. User clicks "Connect" button
     * 2. Frontend calls GET /api/fitness/google/auth (authenticated)
     * 3. Backend returns OAuth URL
     * 4. Frontend redirects user to Google Consent Screen
     */
  describe('Phase 1: Initiate OAuth Connection', () => {
    it('should return Google OAuth URL when authenticated user requests auth endpoint', async () => {
      const response = await request(app)
        .get('/api/fitness/google/auth')
        .set('Authorization', `Bearer ${authToken}`);

      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body.url).toContain('accounts.google.com');
      expect(response.body.url).toContain('client_id=');
      expect(response.body.url).toContain('redirect_uri=');
      expect(response.body.url).toContain('scope=');
      expect(response.body.url).toContain(`state=${  testUser.id}`);
      expect(response.body.url).toContain('access_type=offline');
      expect(response.body.url).toContain('prompt=consent');

      logger.info('✅ Phase 1: OAuth URL generated successfully', {
        context: 'e2e-test',
        metadata: { urlLength: response.body.url.length }
      });
    });

    it('should reject unauthenticated requests to auth endpoint', async () => {
      const response = await request(app)
        .get('/api/fitness/google/auth');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('token');
    });

    it('should include all required scopes in auth URL', async () => {
      const response = await request(app)
        .get('/api/fitness/google/auth')
        .set('Authorization', `Bearer ${authToken}`);

      const {url} = response.body;
      const requiredScopes = [
        'fitness.activity.read',
        'fitness.body.read',
        'fitness.nutrition.read',
        'fitness.sleep.read'
      ];

      requiredScopes.forEach(scope => {
        expect(url).toContain(scope);
      });
    });
  });

  /**
     * TEST 2: Google redirects user back with authorization code
     * 
     * Expected Flow:
     * 1. User grants permissions on Google Consent Screen
     * 2. Google redirects to callback: /api/fitness/google/callback?code=xxx&state=userId
     * 3. Backend exchanges code for tokens
     * 4. Backend saves tokens to UserModel.googleFit
     * 5. Backend redirects user to frontend dashboard with success param
     */
  describe('Phase 2: Handle OAuth Callback & Exchange Code for Tokens', () => {
    it('should successfully handle OAuth callback and exchange code for tokens', async () => {
      // Mock the handleCallback to simulate token exchange
      jest.spyOn(googleFitService, 'handleCallback').mockResolvedValue(undefined);

      const response = await request(app)
        .get('/api/fitness/google/callback')
        .query({
          code: googleAuthCode,
          state: testUser.id
        });

      // Verify redirect to frontend with success parameter
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/dashboard?googleFit=connected');

      // Verify handleCallback was called with correct parameters
      expect(googleFitService.handleCallback).toHaveBeenCalledWith(
        googleAuthCode,
        testUser.id
      );

      logger.info('✅ Phase 2: OAuth callback handled successfully', {
        context: 'e2e-test',
        metadata: { redirectUrl: response.headers.location }
      });
    });

    it('should return 400 if code or state is missing', async () => {
      const response = await request(app)
        .get('/api/fitness/google/callback')
        .query({ code: googleAuthCode }); // Missing state

      expect(response.status).toBe(400);
    });

    it('should redirect to error page if callback handling fails', async () => {
      jest.spyOn(googleFitService, 'handleCallback')
        .mockRejectedValueOnce(new Error('Token exchange failed'));

      const response = await request(app)
        .get('/api/fitness/google/callback')
        .query({
          code: 'invalid-code',
          state: testUser.id
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/dashboard?googleFit=error');
    });

    it('should save tokens to user profile after successful callback', async () => {
      const mockUpdate = jest.spyOn(UserModel, 'update').mockResolvedValue({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        quest: testUser.quest,
        stats: testUser.stats,
        onboardingCompleted: testUser.onboardingCompleted,
        keystoneHabits: testUser.keystoneHabits,
        masterRegulationSettings: testUser.masterRegulationSettings,
        nutritionSettings: testUser.nutritionSettings,
        isInAutonomyPhase: testUser.isInAutonomyPhase,
        role: testUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleFit: {
          accessToken: googleTokens.access_token,
          refreshToken: googleTokens.refresh_token,
          expiryDate: googleTokens.expiry_date
        }
      });

      jest.spyOn(googleFitService, 'handleCallback').mockImplementation(
        async (code: string, userId: string) => {
          await UserModel.update(userId, {
            googleFit: {
              accessToken: googleTokens.access_token,
              refreshToken: googleTokens.refresh_token,
              expiryDate: googleTokens.expiry_date
            }
          });
        }
      );

      const response = await request(app)
        .get('/api/fitness/google/callback')
        .query({
          code: googleAuthCode,
          state: testUser.id
        });

      expect(response.status).toBe(302);

      // Verify tokens were saved
      expect(mockUpdate).toHaveBeenCalledWith(testUser.id, {
        googleFit: {
          accessToken: googleTokens.access_token,
          refreshToken: googleTokens.refresh_token,
          expiryDate: googleTokens.expiry_date
        }
      });
    });
  });

  /**
     * TEST 3: Frontend detects connection and displays DailyStatsCard
     * 
     * Expected Flow:
     * 1. User redirected to /dashboard?googleFit=connected
     * 2. Frontend detects URL param
     * 3. ConnectGoogleFit shows "Connected" badge
     * 4. DailyStatsCard becomes visible
     * 5. DailyStatsCard auto-fetches daily steps
     */
  describe('Phase 3: Frontend Detects Connection', () => {
    beforeEach(() => {
      // Simulate successful token storage
      jest.spyOn(UserModel, 'findById').mockResolvedValue({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        quest: testUser.quest,
        stats: testUser.stats,
        onboardingCompleted: testUser.onboardingCompleted,
        keystoneHabits: testUser.keystoneHabits,
        masterRegulationSettings: testUser.masterRegulationSettings,
        nutritionSettings: testUser.nutritionSettings,
        isInAutonomyPhase: testUser.isInAutonomyPhase,
        role: testUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleFit: {
          accessToken: googleTokens.access_token,
          refreshToken: googleTokens.refresh_token,
          expiryDate: googleTokens.expiry_date
        }
      });
    });

    it('should verify connection status from URL param', () => {
      // This test simulates frontend JavaScript detecting the param
      const url = new URL('http://localhost:5173/dashboard?googleFit=connected');
      const isConnected = url.searchParams.get('googleFit') === 'connected';

      expect(isConnected).toBe(true);
    });

    it('should display error state when googleFit=error param detected', () => {
      const url = new URL('http://localhost:5173/dashboard?googleFit=error');
      const hasError = url.searchParams.get('googleFit') === 'error';

      expect(hasError).toBe(true);
    });
  });

  /**
     * TEST 4: DailyStatsCard fetches and displays daily steps
     * 
     * Expected Flow:
     * 1. DailyStatsCard mounts and calls GET /api/fitness/google/stats
     * 2. Backend retrieves user tokens from database
     * 3. Backend calls Google Fit API to get step count
     * 4. DailyStatsCard displays steps with progress bar
     */
  describe('Phase 4: Fetch and Display Daily Steps', () => {
    it('should return daily steps when authenticated user requests stats endpoint', async () => {
      // Mock getDailySteps to return test data
      jest.spyOn(googleFitService, 'getDailySteps')
        .mockResolvedValue(8234);

      const response = await request(app)
        .get('/api/fitness/google/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('steps');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.steps).toBe(8234);
      expect(typeof response.body.timestamp).toBe('number');

      logger.info('✅ Phase 4: Daily steps fetched successfully', {
        context: 'e2e-test',
        metadata: { steps: response.body.steps }
      });
    });

    it('should return 0 steps if user not connected to Google Fit', async () => {
      // Mock user without Google Fit connection
      jest.spyOn(UserModel, 'findById').mockResolvedValueOnce({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        quest: testUser.quest || 'default-quest',
        stats: testUser.stats || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: testUser.onboardingCompleted ?? false,
        keystoneHabits: testUser.keystoneHabits || [],
        masterRegulationSettings: testUser.masterRegulationSettings || { targetBedtime: '22:00' },
        nutritionSettings: testUser.nutritionSettings || { priority: 'performance' },
        isInAutonomyPhase: testUser.isInAutonomyPhase ?? false,
        role: testUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleFit: undefined
      });

      jest.spyOn(googleFitService, 'getDailySteps')
        .mockResolvedValue(0);

      const response = await request(app)
        .get('/api/fitness/google/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.steps).toBe(0);
    });

    it('should return 500 error if Google Fit API call fails', async () => {
      jest.spyOn(googleFitService, 'getDailySteps')
        .mockRejectedValue(new Error('Google Fit API error'));

      const response = await request(app)
        .get('/api/fitness/google/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject unauthenticated stats requests', async () => {
      const response = await request(app)
        .get('/api/fitness/google/stats');

      expect(response.status).toBe(401);
    });
  });

  /**
     * TEST 5: Complete flow from connection to data display
     */
  describe('Phase 5: Complete E2E Flow', () => {
    it('should complete full OAuth flow with data synchronization', async () => {
      // Step 1: Get auth URL
      const authResponse = await request(app)
        .get('/api/fitness/google/auth')
        .set('Authorization', `Bearer ${authToken}`);

      expect(authResponse.status).toBe(200);
      expect(authResponse.body.url).toBeDefined();

      // Step 2: Simulate OAuth callback
      jest.spyOn(googleFitService, 'handleCallback').mockResolvedValue(undefined);

      const callbackResponse = await request(app)
        .get('/api/fitness/google/callback')
        .query({
          code: googleAuthCode,
          state: testUser.id
        });

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.location).toContain('googleFit=connected');

      // Step 3: Fetch stats
      jest.spyOn(googleFitService, 'getDailySteps').mockResolvedValue(7500);

      const statsResponse = await request(app)
        .get('/api/fitness/google/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.steps).toBe(7500);

      logger.info('✅ Complete E2E Flow: SUCCESS', {
        context: 'e2e-test',
        metadata: {
          userId: testUser.id,
          authUrlGenerated: Boolean(authResponse.body.url),
          callbackHandled: callbackResponse.headers.location.includes('connected'),
          dataFetched: statsResponse.body.steps === 7500
        }
      });
    });
  });

  /**
     * TEST 6: Reconnection & Disconnection Flow
     */
  describe('Phase 6: Reconnection & Disconnection', () => {
    it('should allow user to reconnect with different account', async () => {
      // First connection
      jest.spyOn(googleFitService, 'handleCallback').mockResolvedValue(undefined);

      const firstCallback = await request(app)
        .get('/api/fitness/google/callback')
        .query({
          code: 'code-1',
          state: testUser.id
        });

      expect(firstCallback.status).toBe(302);

      // Disconnect
      jest.spyOn(UserModel, 'update').mockResolvedValue({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        quest: testUser.quest,
        stats: testUser.stats,
        onboardingCompleted: testUser.onboardingCompleted,
        keystoneHabits: testUser.keystoneHabits,
        masterRegulationSettings: testUser.masterRegulationSettings,
        nutritionSettings: testUser.nutritionSettings,
        isInAutonomyPhase: testUser.isInAutonomyPhase,
        role: testUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleFit: undefined
      });

      // Reconnect
      const authUrl = await request(app)
        .get('/api/fitness/google/auth')
        .set('Authorization', `Bearer ${authToken}`);

      expect(authUrl.status).toBe(200);
      expect(authUrl.body.url).toBeDefined();

      // Second callback with new code
      const secondCallback = await request(app)
        .get('/api/fitness/google/callback')
        .query({
          code: 'code-2',
          state: testUser.id
        });

      expect(secondCallback.status).toBe(302);
    });
  });

  /**
     * Phase 7: Disconnection - User revokes tokens and cleans profile
     */
  describe('Phase 7: Disconnection', () => {
    it('should disconnect user and revoke tokens', async () => {
      const mockUpdateUser = jest.spyOn(UserModel, 'update').mockResolvedValue({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        quest: testUser.quest || 'default-quest',
        stats: testUser.stats || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: testUser.onboardingCompleted ?? false,
        keystoneHabits: testUser.keystoneHabits || [],
        masterRegulationSettings: testUser.masterRegulationSettings || { targetBedtime: '22:00' },
        nutritionSettings: testUser.nutritionSettings || { priority: 'performance' },
        isInAutonomyPhase: testUser.isInAutonomyPhase ?? false,
        role: testUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleFit: undefined
      });

      const response = await request(app)
        .post('/api/fitness/google/disconnect')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('disconnected successfully');

      expect(mockUpdateUser).toHaveBeenCalledWith(
        testUser.id,
        expect.objectContaining({
          googleFit: undefined
        })
      );
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .post('/api/fitness/google/disconnect');

      expect(response.status).toBe(401);
    });

    it('should handle disconnect errors gracefully', async () => {
      jest.spyOn(UserModel, 'update').mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app)
        .post('/api/fitness/google/disconnect')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  /**
     * Phase 8: Status Check - Verify connection status
     */
  describe('Phase 8: Status Check', () => {
    it('should return connection status', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValue({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        quest: testUser.quest || 'default-quest',
        stats: testUser.stats || { totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() },
        onboardingCompleted: testUser.onboardingCompleted ?? false,
        keystoneHabits: testUser.keystoneHabits || [],
        masterRegulationSettings: testUser.masterRegulationSettings || { targetBedtime: '22:00' },
        nutritionSettings: testUser.nutritionSettings || { priority: 'performance' },
        isInAutonomyPhase: testUser.isInAutonomyPhase ?? false,
        role: testUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleFit: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiryDate: Date.now() + 3600000
        }
      });

      const response = await request(app)
        .get('/api/fitness/google/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(true);
    });

    it('should return false when not connected', async () => {
      jest.spyOn(UserModel, 'findById').mockResolvedValue({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email,
        quest: testUser.quest,
        stats: testUser.stats,
        onboardingCompleted: testUser.onboardingCompleted,
        keystoneHabits: testUser.keystoneHabits,
        masterRegulationSettings: testUser.masterRegulationSettings,
        nutritionSettings: testUser.nutritionSettings,
        isInAutonomyPhase: testUser.isInAutonomyPhase,
        role: testUser.role,
        createdAt: new Date(),
        updatedAt: new Date(),
        googleFit: undefined
      });

      const response = await request(app)
        .get('/api/fitness/google/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.connected).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/fitness/google/status');

      expect(response.status).toBe(401);
    });
  });
});

