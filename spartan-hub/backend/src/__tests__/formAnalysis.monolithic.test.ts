import request from 'supertest';
import { app } from '../server';
import { initializeDatabase, initializeSchema } from '../config/database';
import { tokenService } from '../services/tokenService';
import { UserModel } from '../models/User';
import { SessionModel } from '../models/Session';
import { up as createFormAnalysisTables } from '../database/migrations/012-create-form-analysis-tables';
import { up as addInjuryRiskColumn } from '../database/migrations/013-add-injury-risk-column';
import { getMLForecastingService } from '../services/mlForecastingService';

describe('Form Analysis Monolithic API', () => {
    let accessToken: string;
    let userId: string;
    let testSessionId = `test-session-form-${Date.now()}`;

    beforeAll(async () => {
        // Initialize database
        const db = initializeDatabase();
        if (!db) throw new Error('Failed to initialize database');

        initializeSchema();

        // Run migrations needed for form analysis
        await createFormAnalysisTables(db);
        await addInjuryRiskColumn(db);

        // Initialize ML service tables
        const mlService = getMLForecastingService();
        await mlService.initialize(db);

        // Setup test user
        const email = `test_form_${Date.now()}@example.com`;
        const userPayload: any = {
            name: 'Test User',
            email,
            password: 'Password123!',
            role: 'user',
            quest: 'Mastering form',
            stats: JSON.stringify({ totalWorkouts: 0, currentStreak: 0, joinDate: new Date().toISOString() }),
            onboardingCompleted: 1,
            keystoneHabits: '[]',
            masterRegulationSettings: JSON.stringify({ targetBedtime: '23:00' }),
            nutritionSettings: JSON.stringify({ priority: 'performance' }),
            isInAutonomyPhase: 0
        };
        const testUser = await UserModel.create(userPayload);
        userId = testUser.id.toString();

        // Generate Token
        accessToken = tokenService.generateAccessToken(userId, 'user', testSessionId);

        // Create session in DB to satisfy middleware
        await SessionModel.create({
            id: testSessionId,
            userId,
            token: accessToken, // MUST match the token being sent
            userAgent: 'test-agent',
            ipAddress: '127.0.0.1',
            isActive: true,
            expiresAt: new Date(Date.now() + 3600000)
        });
    });

    afterAll(async () => {
        const db = initializeDatabase();
        if (db) {
            db.prepare('DELETE FROM rep_analyses WHERE session_id IN (SELECT id FROM form_analysis_sessions WHERE user_id = ?)').run(userId);
            db.prepare('DELETE FROM form_analysis_sessions WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
            db.prepare('DELETE FROM injury_probabilities WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM ml_forecasts WHERE user_id = ?').run(userId);
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        }
    });

    it('should save a monolithic form analysis and update ML', async () => {
        const analysisData = {
            exerciseType: 'squat',
            formScore: 65,
            durationSeconds: 45,
            notes: 'Test session',
            metrics: {
                depth: 0.95,
                kneeTracking: 0.88,
                backStraightness: 0.92
            },
            recommendations: [
                'Mantener el peso en los talones',
                'Buena profundidad'
            ],
            keypoints: [
                { name: 'left_hip', x: 0.5, y: 0.5, score: 0.9 },
                { name: 'left_knee', x: 0.5, y: 0.7, score: 0.9 }
            ]
        };

        const response = await request(app)
            .post('/api/form-analysis/')
            .set('Authorization', `Bearer ${accessToken}`)
            .send(analysisData);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('sessionId');

        // Verify session was created in DB
        const db = initializeDatabase();
        if (!db) throw new Error('DB not initialized');
        const session = db.prepare('SELECT * FROM form_analysis_sessions WHERE id = ?').get(response.body.data.sessionId) as any;
        expect(session).toBeDefined();
        expect(session.exercise_type).toBe('squat');
        expect(session.average_score).toBe(65);
        expect(session.injury_risk_score).toBeCloseTo(0.35, 1);

        // Verify ML update (check if injury probability was created/updated)
        const dateStr = new Date().toISOString().split('T')[0];
        const mlRecord = db.prepare('SELECT * FROM injury_probabilities WHERE user_id = ? AND date = ?').get(userId, dateStr) as any;
        expect(mlRecord).toBeDefined();
    });

    it('should return 401 if unauthorized', async () => {
        const response = await request(app)
            .post('/api/form-analysis/')
            .send({ exerciseType: 'squat' });

        expect(response.status).toBe(401);
    });
});
