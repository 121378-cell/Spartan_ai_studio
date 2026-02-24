import request from 'supertest';
import { e2eManager } from '../e2eTestManager';

describe('Complete User Flow E2E Test', () => {
  let app: any;
  const testUser = {
    name: 'Complete Flow Test User',
    email: 'complete-flow-test@example.com',
    password: 'SecurePassword123!'
  };

  beforeAll(async () => {
    process.env.DB_PATH = e2eManager.getDbPath();

    const serverModule = await import('../../server');
    app = serverModule.app;

    await e2eManager.cleanDatabase();
  });

  test('Complete flow: register -> login -> me -> logout -> unauthorized -> login again', async () => {
    const agent = request.agent(app);

    const registerResponse = await agent
      .post('/auth/register')
      .send({
        name: testUser.name,
        email: testUser.email,
        password: testUser.password
      })
      .expect(201);

    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.user?.email).toBe(testUser.email);
    expect(registerResponse.headers['set-cookie']).toBeDefined();

    const loginResponse = await agent
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.user?.email).toBe(testUser.email);
    expect(loginResponse.headers['set-cookie']).toBeDefined();

    const csrfResponse = await agent
      .get('/api/csrf-token')
      .expect(200);

    expect(csrfResponse.body.success).toBe(true);
    expect(typeof csrfResponse.body.token).toBe('string');
    expect(csrfResponse.body.token.length).toBeGreaterThan(0);

    const logoutResponse = await agent
      .post('/auth/logout')
      .expect(200);

    expect(logoutResponse.body.success).toBe(true);

    await agent
      .get('/auth/me')
      .expect(401);

    const reloginResponse = await agent
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(reloginResponse.body.success).toBe(true);
    expect(reloginResponse.body.user?.email).toBe(testUser.email);
    expect(reloginResponse.headers['set-cookie']).toBeDefined();
  });

  test('User should not access /auth/me without authentication cookie', async () => {
    const response = await request(app)
      .get('/auth/me')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
