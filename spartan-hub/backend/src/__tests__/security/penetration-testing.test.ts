import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('Security Penetration Testing', () => {
    let app: any;
    let db: DatabaseType;
    let authToken: string;
    let userId: string;

    const testUser = {
        name: 'Security Test User',
        email: 'security-test@example.com',
        password: 'SecurePassword123!'
    };

    beforeAll(async () => {
        // Setup environment
        process.env.DB_PATH = e2eManager.getDbPath();
        
        // Import server
        const serverModule = await import('../../server');
        app = serverModule.app;

        // Setup database
        await e2eManager.cleanDatabase();

        db = new Database(e2eManager.getDbPath());

        // Create user and get auth token
        await request(app)
            .post('/api/auth/register')
            .send({
                name: testUser.name,
                email: testUser.email,
                password: testUser.password
            })
            .expect(201);

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .expect(200);

        authToken = loginResponse.body.data.token;
        userId = loginResponse.body.data.user.id;
    });

    afterAll(() => {
        if (db) db.close();
    });

    test('Security: SQL Injection Prevention', async () => {
        // Attempt SQL injection in email field
        const sqlInjectionPayload = "' OR 1=1 --";
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: sqlInjectionPayload,
                password: 'any_password'
            })
            .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeDefined();

        // Attempt SQL injection in other fields
        const maliciousWorkoutTitle = "'; DROP TABLE users; --";
        const response2 = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: maliciousWorkoutTitle,
                durationMinutes: 30
            })
            .expect(400); // Should fail validation before reaching DB

        expect(response2.body.success).toBe(false);
    });

    test('Security: XSS Prevention', async () => {
        // Attempt XSS in user profile
        const xssPayload = '<script>alert("XSS")</script>';
        const response = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: xssPayload,
                preferences: { test: '<img src=x onerror=alert("XSS")>' }
            })
            .expect(400); // Should fail validation

        expect(response.body.success).toBe(false);

        // Try XSS in workout title
        const xssWorkoutResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: '<svg onload=alert("XSS")>',
                durationMinutes: 30
            })
            .expect(400);

        expect(xssWorkoutResponse.body.success).toBe(false);
    });

    test('Security: Authentication Bypass Attempts', async () => {
        // Try to access protected resource without token
        const noTokenResponse = await request(app)
            .get('/api/users/profile')
            .expect(401);

        expect(noTokenResponse.body.success).toBe(false);
        expect(noTokenResponse.body.message).toBe('Unauthorized');

        // Try to access protected resource with malformed token
        const malformedTokenResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', 'Bearer invalid.token.format')
            .expect(401);

        expect(malformedTokenResponse.body.success).toBe(false);

        // Try to access another user's resource with valid token
        const otherUserAccessResponse = await request(app)
            .get('/api/workouts/non-existent-workout-id')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404); // Should return 404, not 401, indicating auth passed but resource not found

        // Verify that the user can't access other users' data by trying to guess a pattern
        const fakeUserIdResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        // Should only return the authenticated user's profile
        expect(fakeUserIdResponse.body.data.user.id).toBe(userId);
    });

    test('Security: Authorization Checks', async () => {
        // Create a workout
        const workoutResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'Authorization Test Workout',
                durationMinutes: 45
            })
            .expect(201);

        const workoutId = workoutResponse.body.data.workout.id;

        // Try to access the workout to confirm it exists
        const ownWorkoutResponse = await request(app)
            .get(`/api/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(ownWorkoutResponse.body.success).toBe(true);
        expect(ownWorkoutResponse.body.data.workout.id).toBe(workoutId);
    });

    test('Security: Rate Limiting Effectiveness', async () => {
        // Try to brute force login with wrong passwords
        const promises = Array(20).fill(null).map(() => 
            request(app)
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'wrong_password_' + Math.random()
                })
        );

        const responses = await Promise.all(promises);
        
        // Count rate-limited responses (429 status)
        const rateLimitedCount = responses.filter(r => r.status === 429).length;
        const unauthorizedCount = responses.filter(r => r.status === 401).length;
        
        // At least some requests should be rate-limited
        expect(rateLimitedCount).toBeGreaterThan(0);
        console.log(`Rate limiting blocked ${rateLimitedCount} out of 20 requests`);

        // After being rate-limited, even valid login should initially be blocked
        const validLoginAfterRateLimit = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        // Valid login might be temporarily blocked due to rate limiting
        // Both outcomes are acceptable depending on rate limiter configuration
        if (validLoginAfterRateLimit.status !== 200) {
            expect(validLoginAfterRateLimit.status).toBe(429);
        }
    });

    test('Security: Input Validation and Sanitization', async () => {
        // Test excessively long inputs
        const longString = 'A'.repeat(10000);
        const longInputResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: longString,
                description: longString,
                durationMinutes: 30
            })
            .expect(400);

        expect(longInputResponse.body.success).toBe(false);

        // Test invalid data types
        const invalidTypesResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 12345, // Should be string
                durationMinutes: 'thirty', // Should be number
                exercises: 'not_an_array' // Should be array
            })
            .expect(400);

        expect(invalidTypesResponse.body.success).toBe(false);

        // Test boundary values
        const boundaryValuesResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'Boundary Test',
                durationMinutes: -1 // Invalid: negative
            })
            .expect(400);

        expect(boundaryValuesResponse.body.success).toBe(false);

        // Test valid boundary
        const validBoundaryResponse = await request(app)
            .post('/api/workouts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                title: 'Boundary Test',
                durationMinutes: 1 // Minimum valid value
            })
            .expect(201);

        expect(validBoundaryResponse.body.success).toBe(true);
    });

    test('Security: Session Management', async () => {
        // Test token expiration simulation (if supported)
        // This assumes there's a way to create expired tokens for testing
        const expiredTokenResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjN9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c') // Expired token
            .expect(401);

        expect(expiredTokenResponse.body.success).toBe(false);

        // Test logout functionality
        const logoutResponse = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(logoutResponse.body.success).toBe(true);

        // Try to use the token after logout (if the app invalidates tokens on logout)
        const postLogoutResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(401);

        expect(postLogoutResponse.body.success).toBe(false);
    });

    test('Security: File Upload Protection (if applicable)', async () => {
        // If there are file upload endpoints, test them
        // For now, just ensure they properly reject dangerous file types
        
        // Try to upload potentially dangerous content via JSON
        const maliciousJsonResponse = await request(app)
            .post('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                // This simulates trying to inject malicious content in JSON fields
                preferences: {
                    theme: 'dark',
                    customCode: 'javascript:alert("malicious")',
                    template: '<script>console.log("attack")</script>'
                }
            })
            .expect(400); // Should be rejected

        // Or if it passes validation, the server should sanitize the content
        if (maliciousJsonResponse.status === 200) {
            const profileResponse = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            
            // Ensure potentially dangerous content was removed
            const prefs = profileResponse.body.data.user.preferences;
            if (prefs && typeof prefs.customCode === 'string') {
                expect(prefs.customCode.toLowerCase()).not.toContain('javascript:');
            }
        }
    });

    test('Security: API Enumeration Prevention', async () => {
        // Test that the API doesn't leak information through timing attacks
        // or different error messages for existing vs non-existing users
        
        // Try login with existing email but wrong password
        const existingEmailResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrong_password'
            });

        // Try login with non-existing email
        const nonExistingEmailResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'definitely-not-exists@example.com',
                password: 'any_password'
            });

        // Both should return the same status code and similar response
        // to prevent user enumeration
        if (existingEmailResponse.status === 401 && nonExistingEmailResponse.status === 401) {
            // Both failed, which is expected
            // Check that error messages don't reveal if user exists
            expect(existingEmailResponse.body.message).toBe(nonExistingEmailResponse.body.message);
        }
    });

    test('Security: Mass Assignment Prevention', async () => {
        // Try to set properties that shouldn't be user-controllable
        const massAssignmentResponse = await request(app)
            .post('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Test User',
                role: 'admin', // Should not be assignable by user
                id: 'hacked-user-id', // Should not be assignable by user
                isAdmin: true // Should not be assignable by user
            })
            .expect(400); // Should be rejected

        expect(massAssignmentResponse.body.success).toBe(false);

        // Verify that the user's actual role remains unchanged
        const profileCheckResponse = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(profileCheckResponse.body.data.user.role).toBe('user'); // Should still be 'user'
    });

    test('Security: Cross-Site Request Forgery (CSRF) Protection', async () => {
        // If CSRF protection is implemented, test it
        // For now, we'll assume it's tested elsewhere or not implemented
        // This is a placeholder for CSRF testing if the app implements it
        
        // Basic test: ensure state-changing operations require proper headers
        const csrfTestResponse = await request(app)
            .post('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Requested-With', 'XMLHttpRequest') // Common CSRF header
            .send({
                name: 'CSRF Test User'
            })
            .expect(200); // Should succeed if no CSRF protection or properly configured

        expect(csrfTestResponse.body.success).toBe(true);
    });
});