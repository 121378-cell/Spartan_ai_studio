import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../utils/secrets';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('E2E ML Forecasting', () => {
    let app: any;

    const testUser = {
        id: 'e2e-ml-user-1',
        name: 'ML Forecast User',
        email: 'ml-user@example.com',
        password: 'password123',
        role: 'user'
    };

    const testSession = {
        id: 'e2e-ml-session-1',
        userId: testUser.id,
        token: '' // Will be generated in beforeAll
    };

    let db: DatabaseType;

    beforeAll(async () => {
        // 1. Setup Environment - MUST point to E2E DB before server loads
        process.env.DB_PATH = e2eManager.getDbPath();

        // Dynamic import to ensure env var is respected
        const serverModule = await import('../../server');
        app = serverModule.app;

        // 2. Setup DB and User
        await e2eManager.cleanDatabase();

        // Generate valid JWT
        const secret = getJwtSecret();
        testSession.token = jwt.sign(
            {
                userId: testUser.id,
                role: testUser.role,
                sessionId: testSession.id,
                tokenType: 'access'
            },
            secret || 'test-secret',
            { expiresIn: '1h' }
        );

        await e2eManager.seedUser(testUser);
        await e2eManager.seedSession(testSession);

        // 2. Open Direct Connection for Specific Seeding
        const dbPath = e2eManager.getDbPath();
        db = new Database(dbPath);

        // 3. Create Source Data Table (Source of Truth for Forecasting)
        // DROP first to ensure clean state and correct schema
        db.exec('DROP TABLE IF EXISTS daily_biometric_summaries');

        db.exec(`
            CREATE TABLE daily_biometric_summaries (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                date TEXT NOT NULL,
                recoveryScore REAL,
                readinessScore REAL,
                injuryRisk REAL,
                fatigueLevel REAL,
                sleepDuration REAL,
                stressLevel REAL,
                activityLoad REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, date)
            )
        `);

        // Ensure pending writes are flushed before seeding forecasting data
        db.pragma('wal_checkpoint(FULL)');

        // 4. Seed 30 days of historical data
        // 4. Seed 30 days of historical data
        // Clean table first
        db.prepare('DELETE FROM daily_biometric_summaries').run();

        // Pattern: Improving trend
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO daily_biometric_summaries (
                id, userId, date, 
                recoveryScore, readinessScore, injuryRisk, 
                fatigueLevel, sleepDuration, stressLevel, activityLoad
            ) VALUES (
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?
            )
        `);

        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            // Generate synthetic data (improving over time)
            // Readiness goes from ~40 to ~80
            const progress = (30 - i) / 30;
            const readiness = 40 + (40 * progress) + (Math.random() * 10 - 5);

            stmt.run(
                `seed-${testUser.id}-${dateStr}`,
                testUser.id,
                dateStr,
                readiness * 0.9, // Recovery slightly lower
                readiness,
                20 - (10 * progress), // Injury risk decreases
                60 - (20 * progress), // Fatigue decreases
                6.5 + (1.5 * progress), // Sleep increases
                60 - (20 * progress), // Stress decreases
                100 + (50 * progress) // Activity load increases (healthy adaptation)
            );
        }
        // 5. Initialize ML Service
        const { getMLForecastingService } = await import('../../services/mlForecastingService');
        const mlService = getMLForecastingService();
        await mlService.initialize(db);
    });

    afterAll(() => {
        if (db) db.close();
    });

    // ============ ENDPOINT TESTS ============

    test('GET /readiness-forecast/:userId requires authentication', async () => {
        const res = await request(app)
            .get(`/api/ml-forecasting/readiness-forecast/${testUser.id}`);

        expect(res.status).toBe(401);
    });

    test('GET /readiness-forecast/:userId returns forecast', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .get(`/api/ml-forecasting/readiness-forecast/${testUser.id}?startDate=${today}`)
            .set('Authorization', `Bearer ${testSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data).toHaveLength(7);
        expect(res.body.data[0].predictedScore).toBeDefined();
        expect(res.body.data[0].confidence).toBeDefined();
    });

    test('GET /injury-probability/:userId returns probability', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .get(`/api/ml-forecasting/injury-probability/${testUser.id}?date=${today}`)
            .set('Authorization', `Bearer ${testSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.probabilityPercent).toBe('number');
        expect(res.body.data.riskFactors).toBeDefined();
    });

    test('GET /fatigue-estimate/:userId returns estimate', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .get(`/api/ml-forecasting/fatigue-estimate/${testUser.id}?date=${today}`)
            .set('Authorization', `Bearer ${testSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.fatigueLevel).toBe('number');
        expect(res.body.data.estimatedRecoveryDays).toBeGreaterThanOrEqual(0);
    });

    test('GET /training-load/:userId returns suggestion', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .get(`/api/ml-forecasting/training-load/${testUser.id}?date=${today}`)
            .set('Authorization', `Bearer ${testSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.suggestedLoad).toBeDefined();
        expect(Array.isArray(res.body.data.recommendedExercises)).toBe(true);
    });

    test('GET /comprehensive/:userId returns all data', async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await request(app)
            .get(`/api/ml-forecasting/comprehensive/${testUser.id}?date=${today}`)
            .set('Authorization', `Bearer ${testSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.weeklyForecast).toBeDefined();
        expect(res.body.data.injuryProbability).toBeDefined();
        expect(res.body.data.fatigueEstimate).toBeDefined();
        expect(res.body.data.trainingLoadSuggestion).toBeDefined();

        // Verify consistency
        expect(res.body.data.injuryProbability.userId).toBe(testUser.id);
    });

    test('GET /model-info returns metadata', async () => {
        const res = await request(app)
            .get(`/api/ml-forecasting/model-info`)
            .set('Authorization', `Bearer ${testSession.token}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.metadata.version).toBeDefined();
        expect(typeof res.body.data.metadata.accuracyScore).toBe('number');
    });
});
