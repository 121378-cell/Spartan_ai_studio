import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('E2E Authentication Flow', () => {
  let app: any;
  let db: DatabaseType;

  const testUser = {
    name: 'Auth Test User',
    email: 'auth-test@example.com',
    password: 'securePassword123!'
  };

  beforeAll(async () => {
    process.env.DB_PATH = e2eManager.getDbPath();

    const serverModule = await import('../../server');
    app = serverModule.app;

    await e2eManager.cleanDatabase();
    db = new Database(e2eManager.getDbPath());
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  test('POST /auth/register should create a user', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.user?.email).toBe(testUser.email);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('POST /auth/register should reject duplicate email', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        ...testUser,
        name: 'Another Name'
      })
      .expect(409);

    expect(response.body.success).toBe(false);
  });

  test('POST /auth/register should reject invalid email', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        ...testUser,
        email: 'invalid-email'
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation error');
  });

  test('POST /auth/login should authenticate valid user', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user?.email).toBe(testUser.email);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('POST /auth/login should reject invalid password', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongPassword123!'
      })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  test('GET /auth/me should return 401 without auth cookie', async () => {
    const response = await request(app)
      .get('/auth/me')
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  test('POST /auth/logout should invalidate authenticated session', async () => {
    const agent = request.agent(app);

    await agent
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(200);

    const logoutResponse = await agent
      .post('/auth/logout')
      .expect(200);

    expect(logoutResponse.body.success).toBe(true);

    await agent
      .get('/auth/me')
      .expect(401);
  });

  test('GET /api/csrf-token should return token payload', async () => {
    const response = await request(app)
      .get('/api/csrf-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(0);
  });
});
