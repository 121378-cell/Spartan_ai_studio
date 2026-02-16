import request from 'supertest';
import { e2eManager } from '../e2eTestManager';
const Database = require('better-sqlite3');
type DatabaseType = any;

describe('E2E Workout Management', () => {
    let app: any;
    let db: DatabaseType;
    let authToken: string;
    let testUserId: string;

    const testUser = {
        id: 'e2e-workout-user-1',
        name: 'Workout Test User',
        email: 'workout-test@example.com',
        password: 'workoutPassword123!'
    };

    const testWorkout = {
        title: 'Morning Strength Training',
        description: 'Full body strength workout focusing on compound movements',
        durationMinutes: 60,
        exercises: [
            {
                name: 'Squats',
                sets: 4,
                reps: 8,
                weight: 135,
                restTimeSeconds: 180,
                notes: 'Focus on form and depth'
            },
            {
                name: 'Deadlifts',
                sets: 3,
                reps: 5,
                weight: 185,
                restTimeSeconds: 240,
                notes: 'Maintain neutral spine'
            },
            {
                name: 'Bench Press',
                sets: 4,
                reps: 6,
                weight: 155,
                restTimeSeconds: 180,
                notes: 'Control the descent'
            }
        ]
    };

    beforeAll(async () => {
        // Setup environment
        process.env.DB_PATH = e2eManager.getDbPath();
        
        // Import server
        const serverModule = await import('../../server');
        app = serverModule.app;

        // Setup database
        await e2eManager.cleanDatabase();
        await e2eManager.seedUser({
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            password: testUser.password
        });
        
        // Create session for the user
        await e2eManager.seedSession({
            id: 'e2e-workout-session-1',
            userId: testUser.id,
            token: 'workout-test-token-123'
        });

        db = new Database(e2eManager.getDbPath());
        authToken = 'workout-test-token-123';
        testUserId = testUser.id;

        // Create necessary tables
        db.exec(`
            CREATE TABLE IF NOT EXISTS workouts (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                durationMinutes INTEGER,
                scheduledDate TEXT,
                completed BOOLEAN DEFAULT FALSE,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
            )
        `);

        db.exec(`
            CREATE TABLE IF NOT EXISTS exercises (
                id TEXT PRIMARY KEY,
                workoutId TEXT NOT NULL,
                name TEXT NOT NULL,
                sets INTEGER NOT NULL,
                reps INTEGER NOT NULL,
                weight REAL,
                restTimeSeconds INTEGER,
                notes TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workoutId) REFERENCES workouts (id) ON DELETE CASCADE
            )
        `);
    });

    afterAll(() => {
        if (db) db.close();
    });

    describe('Workout Creation', () => {
        test('POST /api/workouts should create new workout with valid data', async () => {
            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testWorkout)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.workout).toMatchObject({
                title: testWorkout.title,
                description: testWorkout.description,
                durationMinutes: testWorkout.durationMinutes,
                userId: testUserId
            });
            expect(response.body.data.workout.exercises).toHaveLength(3);
            expect(response.body.message).toBe('Workout created successfully');
        });

        test('POST /api/workouts should reject workout without title', async () => {
            const invalidWorkout = { ...testWorkout } as Partial<typeof testWorkout>;
            delete invalidWorkout.title;

            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidWorkout)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('required');
        });

        test('POST /api/workouts should reject workout with negative duration', async () => {
            const invalidWorkout = {
                ...testWorkout,
                durationMinutes: -30
            };

            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidWorkout)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('positive');
        });

        test('POST /api/workouts should reject workout with invalid exercise data', async () => {
            const invalidWorkout = {
                ...testWorkout,
                exercises: [
                    {
                        name: 'Invalid Exercise',
                        sets: 0, // Invalid: must be positive
                        reps: -5 // Invalid: must be positive
                    }
                ]
            };

            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidWorkout)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('POST /api/workouts should reject unauthorized requests', async () => {
            const response = await request(app)
                .post('/api/workouts')
                .send(testWorkout)
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Workout Retrieval', () => {
        let createdWorkoutId: string;

        beforeAll(async () => {
            // Create a workout for retrieval tests
            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testWorkout);
            createdWorkoutId = response.body.data.workout.id;
        });

        test('GET /api/workouts should return user\'s workouts', async () => {
            const response = await request(app)
                .get('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.workouts)).toBe(true);
            expect(response.body.data.workouts.length).toBeGreaterThan(0);
            expect(response.body.pagination).toBeDefined();
        });

        test('GET /api/workouts/:id should return specific workout', async () => {
            const response = await request(app)
                .get(`/api/workouts/${createdWorkoutId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.workout.id).toBe(createdWorkoutId);
            expect(response.body.data.workout.title).toBe(testWorkout.title);
            expect(response.body.data.workout.exercises).toHaveLength(3);
        });

        test('GET /api/workouts/:id should reject request for non-existent workout', async () => {
            const response = await request(app)
                .get('/api/workouts/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Workout not found');
        });

        test('GET /api/workouts/:id should reject request for other user\'s workout', async () => {
            // Try to access workout with different token
            const response = await request(app)
                .get(`/api/workouts/${createdWorkoutId}`)
                .set('Authorization', 'Bearer different-user-token')
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        test('GET /api/workouts should support pagination', async () => {
            const response = await request(app)
                .get('/api/workouts?page=1&limit=5')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(5);
            expect(response.body.pagination.total).toBeDefined();
        });

        test('GET /api/workouts should support filtering by date range', async () => {
            const startDate = '2026-01-01';
            const endDate = '2026-12-31';
            
            const response = await request(app)
                .get(`/api/workouts?startDate=${startDate}&endDate=${endDate}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('Workout Updates', () => {
        let workoutId: string;

        beforeAll(async () => {
            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testWorkout);
            workoutId = response.body.data.workout.id;
        });

        test('PUT /api/workouts/:id should update workout details', async () => {
            const updatedData = {
                title: 'Updated Morning Workout',
                description: 'Modified workout description',
                durationMinutes: 75
            };

            const response = await request(app)
                .put(`/api/workouts/${workoutId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updatedData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.workout.title).toBe(updatedData.title);
            expect(response.body.data.workout.description).toBe(updatedData.description);
            expect(response.body.data.workout.durationMinutes).toBe(updatedData.durationMinutes);
            expect(response.body.message).toBe('Workout updated successfully');
        });

        test('PUT /api/workouts/:id should update exercises', async () => {
            const updatedExercises = [
                {
                    name: 'Updated Squats',
                    sets: 5,
                    reps: 10,
                    weight: 155,
                    restTimeSeconds: 200
                }
            ];

            const response = await request(app)
                .put(`/api/workouts/${workoutId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ exercises: updatedExercises })
                .expect(200);

            expect(response.body.data.workout.exercises).toHaveLength(1);
            expect(response.body.data.workout.exercises[0].name).toBe('Updated Squats');
        });

        test('PUT /api/workouts/:id should reject invalid workout ID', async () => {
            const response = await request(app)
                .put('/api/workouts/invalid-id')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Updated Title' })
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        test('PUT /api/workouts/:id should reject updates to other user\'s workout', async () => {
            const response = await request(app)
                .put(`/api/workouts/${workoutId}`)
                .set('Authorization', 'Bearer different-user-token')
                .send({ title: 'Hacker Attempt' })
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Workout Deletion', () => {
        let workoutIdToDelete: string;

        beforeAll(async () => {
            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Workout to Delete',
                    durationMinutes: 30
                });
            workoutIdToDelete = response.body.data.workout.id;
        });

        test('DELETE /api/workouts/:id should remove workout', async () => {
            const response = await request(app)
                .delete(`/api/workouts/${workoutIdToDelete}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Workout deleted successfully');
        });

        test('DELETE /api/workouts/:id should reject deletion of non-existent workout', async () => {
            const response = await request(app)
                .delete('/api/workouts/non-existent-id')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });

        test('GET /api/workouts/:id should return 404 for deleted workout', async () => {
            const response = await request(app)
                .get(`/api/workouts/${workoutIdToDelete}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Workout Completion Tracking', () => {
        let workoutId: string;

        beforeAll(async () => {
            const response = await request(app)
                .post('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .send(testWorkout);
            workoutId = response.body.data.workout.id;
        });

        test('POST /api/workouts/:id/complete should mark workout as completed', async () => {
            const completionData = {
                completedAt: new Date().toISOString(),
                notes: 'Great workout session!',
                rating: 5
            };

            const response = await request(app)
                .post(`/api/workouts/${workoutId}/complete`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(completionData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.workout.completed).toBe(true);
        });

        test('GET /api/workouts should show completed status', async () => {
            const response = await request(app)
                .get('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const completedWorkout = response.body.data.workouts.find(
                (w: any) => w.id === workoutId
            );
            expect(completedWorkout.completed).toBe(true);
        });
    });

    describe('Workout Statistics and Analytics', () => {
        test('GET /api/workouts/stats should return workout statistics', async () => {
            const response = await request(app)
                .get('/api/workouts/stats')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.totalWorkouts).toBeDefined();
            expect(response.body.data.completedWorkouts).toBeDefined();
            expect(response.body.data.averageDuration).toBeDefined();
        });

        test('GET /api/workouts/stats should support date filtering', async () => {
            const response = await request(app)
                .get('/api/workouts/stats?period=month')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.period).toBe('month');
        });
    });

    describe('Concurrent Operations', () => {
        test('Multiple simultaneous workout creations should succeed', async () => {
            const workoutPromises = Array(3).fill(null).map((_, index) =>
                request(app)
                    .post('/api/workouts')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        title: `Concurrent Workout ${index + 1}`,
                        durationMinutes: 45
                    })
            );

            const responses = await Promise.all(workoutPromises);
            
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
            });
        });

        test('Database should maintain consistency under load', async () => {
            // Create multiple workouts rapidly
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/workouts')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        title: `Load Test Workout ${i + 1}`,
                        durationMinutes: 30
                    });
            }

            // Verify all workouts exist
            const response = await request(app)
                .get('/api/workouts')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            const loadTestWorkouts = response.body.data.workouts.filter(
                (w: any) => w.title.startsWith('Load Test Workout')
            );
            expect(loadTestWorkouts.length).toBe(5);
        });
    });
});
