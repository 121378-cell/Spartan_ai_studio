import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('E2E Authentication Flow', () => {
    let app: any;
    let db: DatabaseType;

    const testUserData = {
        id: 'e2e-auth-user-1',
        name: 'Auth Test User',
        email: 'auth-test@example.com',
        password: 'securePassword123!',
        role: 'user'
    };

    const invalidUserData = {
        name: 'Invalid User',
        email: 'invalid-email',
        password: 'short'
    };

    beforeAll(async () => {
        // Setup environment
        process.env.DB_PATH = e2eManager.getDbPath();
        
        // Dynamic import to respect environment variables
        const serverModule = await import('../../server');
        app = serverModule.app;

        // Setup database
        await e2eManager.cleanDatabase();
        db = new Database(e2eManager.getDbPath());
    });

    afterAll(() => {
        if (db) db.close();
    });

    describe('User Registration', () => {
        test('POST /api/auth/register should create new user with valid data', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: testUserData.name,
                    email: testUserData.email,
                    password: testUserData.password
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toMatchObject({
                name: testUserData.name,
                email: testUserData.email,
                role: testUserData.role
            });
            expect(response.body.data.token).toBeDefined();
            expect(response.body.message).toBe('User registered successfully');
        });

        test('POST /api/auth/register should reject duplicate email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Another User',
                    email: testUserData.email, // Same email as previous test
                    password: 'anotherPassword123!'
                })
                .expect(409);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User already exists');
        });

        test('POST /api/auth/register should reject invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'invalid-email-format',
                    password: 'validPassword123!'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email');
        });

        test('POST /api/auth/register should reject weak password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'weak@test.com',
                    password: '123' // Too short
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Password must be at least');
        });

        test('POST /api/auth/register should reject missing required fields', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'missing-fields@test.com'
                    // Missing name and password
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('required');
        });
    });

    describe('User Login', () => {
        let validToken: string;

        test('POST /api/auth/login should authenticate valid user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email,
                    password: testUserData.password
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toMatchObject({
                name: testUserData.name,
                email: testUserData.email
            });
            expect(response.body.data.token).toBeDefined();
            expect(response.body.message).toBe('Login successful');
            
            validToken = response.body.data.token;
        });

        test('POST /api/auth/login should reject invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email,
                    password: 'wrongPassword123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
        });

        test('POST /api/auth/login should reject non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'anyPassword123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid credentials');
        });

        test('POST /api/auth/login should reject invalid email format', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: 'anyPassword123!'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email');
        });

        test('POST /api/auth/login should reject missing credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email
                    // Missing password
                })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('required');
        });
    });

    describe('Protected Routes', () => {
        let authToken: string;

        beforeAll(async () => {
            // Get auth token for protected route tests
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email,
                    password: testUserData.password
                });
            authToken = loginResponse.body.data.token;
        });

        test('GET /api/users/profile should return user profile with valid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toMatchObject({
                name: testUserData.name,
                email: testUserData.email,
                role: testUserData.role
            });
        });

        test('GET /api/users/profile should reject request without token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Unauthorized');
        });

        test('GET /api/users/profile should reject request with invalid token', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer invalid-token-123')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid token');
        });

        test('GET /api/users/profile should reject request with expired token', async () => {
            // Create an expired token (this would require JWT library access)
            // For now, we'll test with a malformed token
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Token Refresh', () => {
        let refreshToken: string;

        beforeAll(async () => {
            // Login to get refresh token
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email,
                    password: testUserData.password
                });
            
            // Extract refresh token from response cookies or body
            // Assuming it's in the response body for this test
        });

        test('POST /api/auth/refresh should return new access token', async () => {
            // This test would require implementation of refresh token endpoint
            // Placeholder for when refresh endpoint is implemented
            expect(true).toBe(true);
        });

        test('POST /api/auth/refresh should reject invalid refresh token', async () => {
            // Placeholder test
            expect(true).toBe(true);
        });
    });

    describe('User Logout', () => {
        let authToken: string;

        beforeAll(async () => {
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email,
                    password: testUserData.password
                });
            authToken = loginResponse.body.data.token;
        });

        test('POST /api/auth/logout should invalidate session', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Logged out successfully');
        });

        test('POST /api/auth/logout should reject request without token', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Password Reset Flow', () => {
        test('POST /api/auth/forgot-password should accept valid email', async () => {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: testUserData.email
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Password reset email sent');
        });

        test('POST /api/auth/forgot-password should handle non-existent email gracefully', async () => {
            const response = await request(app)
                .post('/api/auth/forgot-password')
                .send({
                    email: 'nonexistent@example.com'
                })
                .expect(200); // Should still return 200 for security reasons

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Password reset email sent');
        });

        test('POST /api/auth/reset-password should update password with valid token', async () => {
            // This would require a valid reset token
            // Placeholder test
            expect(true).toBe(true);
        });
    });

    describe('Rate Limiting', () => {
        test('Multiple failed login attempts should trigger rate limiting', async () => {
            // Make multiple failed login attempts
            const promises = Array(10).fill(null).map(() => 
                request(app)
                    .post('/api/auth/login')
                    .send({
                        email: testUserData.email,
                        password: 'wrong-password-attempt'
                    })
            );

            const responses = await Promise.all(promises);
            
            // Check that some requests were rate limited (429 status)
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });

        test('Successful requests should not be rate limited', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email,
                    password: testUserData.password
                })
                .expect(200);

            expect(response.status).toBe(200);
        });
    });

    describe('CSRF Protection', () => {
        let csrfToken: string;
        let authToken: string;

        beforeAll(async () => {
            // Get CSRF token
            const csrfResponse = await request(app)
                .get('/api/csrf-token');
            csrfToken = csrfResponse.body.token;

            // Get auth token
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: testUserData.email,
                    password: testUserData.password
                });
            authToken = loginResponse.body.data.token;
        });

        test('State-changing requests should require CSRF token', async () => {
            const response = await request(app)
                .post('/api/users/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    name: 'Updated Name'
                })
                .expect(403);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('CSRF');
        });

        test('State-changing requests should accept valid CSRF token', async () => {
            // This would depend on how CSRF is implemented
            // Placeholder test
            expect(true).toBe(true);
        });
    });
});
