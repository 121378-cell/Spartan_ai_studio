import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { userDb, routineDb, exerciseDb, planAssignmentDb, commitmentDb } from '../services/sqliteDatabaseService';
import { v4 as uuidv4 } from 'uuid';

describe('Database Service Comprehensive Tests', () => {
  const createTestUser = (overrides = {}) => {
    return userDb.create({
      name: 'Test User',
      email: `test-${uuidv4()}@example.com`,
      password: 'password',
      role: 'user',
      ...overrides
    });
  };

  const createTestRoutine = (userId: string, overrides = {}) => {
    return routineDb.create({
      userId,
      name: 'Test Routine',
      focus: 'strength',
      duration: 60,
      objective: 'Test Objective',
      blocks: [],
      ...overrides
    });
  };

  beforeEach(() => {
    // Clear all data before each test
    userDb.clear();
    routineDb.clear();
    exerciseDb.clear();
    planAssignmentDb.clear();
    commitmentDb.clear();
  });

  afterEach(() => {
    // Clean up after each test
    userDb.clear();
    routineDb.clear();
    exerciseDb.clear();
    planAssignmentDb.clear();
    commitmentDb.clear();
  });

  describe('User Database Operations', () => {
    it('should create a user with all fields', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'user',
        quest: 'Test Quest',
        stats: { level: 1, xp: 100 },
        onboardingCompleted: true,
        keystoneHabits: ['exercise', 'reading'],
        masterRegulationSettings: { focus: 'strength' },
        nutritionSettings: { calories: 2000 },
        isInAutonomyPhase: false,
        weightKg: 75.5,
        trainingCycle: { week: 1, phase: 'base' },
        lastWeeklyPlanDate: '2023-01-01',
        detailedProfile: { age: 30, height: 180 },
        preferences: { language: 'en' }
      };

      const user = userDb.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBe(userData.password);
      expect(user.role).toBe(userData.role);
      expect(user.stats).toEqual(userData.stats);
      expect(user.onboardingCompleted).toBe(true);
      expect(user.keystoneHabits).toEqual(userData.keystoneHabits);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should find user by ID', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        stats: { level: 1 }
      };

      const createdUser = userDb.create(userData);
      const foundUser = userDb.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.name).toBe(userData.name);
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should find user by email', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password'
      };

      userDb.create(userData);
      const foundUser = userDb.findByEmail('test@example.com');

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe('test@example.com');
      expect(foundUser?.name).toBe('Test User');
    });

    it('should return null for non-existent user', () => {
      const foundUser = userDb.findById('non-existent-id');
      expect(foundUser).toBeNull();
    });

    it('should update user', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password',
        stats: { level: 1 }
      };

      const createdUser = userDb.create(userData);
      const updates = {
        name: 'Updated User',
        stats: { level: 2, xp: 200 }
      };

      const updatedUser = userDb.update(createdUser.id, updates);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.name).toBe('Updated User');
      expect(updatedUser?.stats).toEqual(updates.stats);
      expect(updatedUser?.email).toBe(userData.email); // Should remain unchanged
    });

    it('should return null when updating non-existent user', () => {
      const updates = { name: 'Updated User' };
      const updatedUser = userDb.update('non-existent-id', updates);

      expect(updatedUser).toBeNull();
    });

    it('should find all users', () => {
      const user1 = userDb.create({
        name: 'User 1',
        email: 'user1@example.com',
        password: 'password1'
      });

      const user2 = userDb.create({
        name: 'User 2',
        email: 'user2@example.com',
        password: 'password2'
      });

      const allUsers = userDb.findAll();

      expect(allUsers).toHaveLength(2);
      expect(allUsers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'User 1', email: 'user1@example.com' }),
          expect.objectContaining({ name: 'User 2', email: 'user2@example.com' })
        ])
      );
    });

    it('should delete user', () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed_password'
      };

      const createdUser = userDb.create(userData);
      const deleted = userDb.delete(createdUser.id);

      expect(deleted).toBe(true);
      expect(userDb.findById(createdUser.id)).toBeNull();
    });

    it('should clear all users', () => {
      userDb.create({ name: 'User 1', email: 'user1@example.com', password: 'password1' });
      userDb.create({ name: 'User 2', email: 'user2@example.com', password: 'password2' });

      const cleared = userDb.clear();

      expect(cleared).toBe(true);
      expect(userDb.findAll()).toHaveLength(0);
    });
  });

  describe('Routine Database Operations', () => {
    it('should create a routine', () => {
      const user = createTestUser();
      const userId = user.id;
      const routineData = {
        userId,
        name: 'Morning Workout',
        focus: 'strength',
        duration: 60,
        objective: 'build muscle',
        blocks: [
          { exercise: 'Squats', sets: 3, reps: '8-10' },
          { exercise: 'Deadlifts', sets: 3, reps: '5' }
        ]
      };

      const routine = routineDb.create(routineData);

      expect(routine).toBeDefined();
      expect(routine.id).toBeDefined();
      expect(routine.name).toBe(routineData.name);
      expect(routine.focus).toBe(routineData.focus);
      expect(routine.blocks).toEqual(routineData.blocks);
    });

    it('should find routine by ID', () => {
      const user = createTestUser();
      const userId = user.id;
      const routineData = {
        userId,
        name: 'Morning Workout',
        focus: 'strength',
        duration: 60,
        objective: 'Build muscle',
        blocks: []
      };

      const createdRoutine = routineDb.create(routineData);
      const foundRoutine = routineDb.findById(createdRoutine.id);

      expect(foundRoutine).toBeDefined();
      expect(foundRoutine?.id).toBe(createdRoutine.id);
      expect(foundRoutine?.name).toBe(routineData.name);
    });

    it('should find routines by user ID', () => {
      const user = createTestUser();
      const userId = user.id;
      
      routineDb.create({
        userId,
        name: 'Routine 1',
        focus: 'strength',
        duration: 60,
        objective: 'Build strength',
        blocks: []
      });

      routineDb.create({
        userId,
        name: 'Routine 2',
        focus: 'cardio',
        duration: 30,
        objective: 'Increase endurance',
        blocks: []
      });

      const userRoutines = routineDb.findByUserId(userId);

      expect(userRoutines).toHaveLength(2);
      expect(userRoutines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Routine 1' }),
          expect.objectContaining({ name: 'Routine 2' })
        ])
      );
    });

    it('should update routine', () => {
      const user = createTestUser();
      const userId = user.id;
      const routineData = {
        userId,
        name: 'Original Routine',
        focus: 'strength',
        duration: 60,
        objective: 'Test objective',
        blocks: []
      };

      const createdRoutine = routineDb.create(routineData);
      const updates = {
        name: 'Updated Routine',
        duration: 90
      };

      const updatedRoutine = routineDb.update(createdRoutine.id, updates);

      expect(updatedRoutine).toBeDefined();
      expect(updatedRoutine?.name).toBe('Updated Routine');
      expect(updatedRoutine?.duration).toBe(90);
    });

    it('should delete routine', () => {
      const user = createTestUser();
      const userId = user.id;
      const routineData = {
        userId,
        name: 'Test Routine',
        focus: 'strength',
        duration: 60,
        objective: 'Build muscle',
        blocks: []
      };

      const createdRoutine = routineDb.create(routineData);
      const deleted = routineDb.delete(createdRoutine.id);

      expect(deleted).toBe(true);
      expect(routineDb.findById(createdRoutine.id)).toBeNull();
    });

    it('should clear all routines', () => {
      const user = createTestUser();
      const userId = user.id;
      
      routineDb.create({ userId, name: 'Routine 1', focus: 'strength', duration: 60, objective: 'Strength', blocks: [] });
      routineDb.create({ userId, name: 'Routine 2', focus: 'cardio', duration: 30, objective: 'Cardio', blocks: [] });

      const cleared = routineDb.clear();

      expect(cleared).toBe(true);
      expect(routineDb.findByUserId(userId)).toHaveLength(0);
    });
  });

  describe('Exercise Database Operations', () => {
    it('should create an exercise', () => {
      const user = createTestUser();
      const userId = user.id;
      const exerciseData = {
        userId,
        name: 'Squats',
        sets: 3,
        reps: '8-10',
        rir: 2,
        restSeconds: 90,
        coachTip: 'Keep your back straight',
        tempo: '3-1-3'
      };

      const exercise = exerciseDb.create(exerciseData);

      expect(exercise).toBeDefined();
      expect(exercise.id).toBeDefined();
      expect(exercise.name).toBe(exerciseData.name);
      expect(exercise.sets).toBe(exerciseData.sets);
      expect(exercise.reps).toBe(exerciseData.reps);
    });

    it('should find exercise by ID', () => {
      const user = createTestUser();
      const userId = user.id;
      const exerciseData = {
        userId,
        name: 'Squats',
        sets: 3,
        reps: '8-10'
      };

      const createdExercise = exerciseDb.create(exerciseData);
      const foundExercise = exerciseDb.findById(createdExercise.id) as any;

      expect(foundExercise).toBeDefined();
      expect(foundExercise.id).toBe(createdExercise.id);
      expect(foundExercise.name).toBe(exerciseData.name);
    });

    it('should find exercises by user ID', () => {
      const user = createTestUser();
      const userId = user.id;
      
      exerciseDb.create({
        userId,
        name: 'Squats',
        sets: 3,
        reps: '8-10'
      });

      exerciseDb.create({
        userId,
        name: 'Deadlifts',
        sets: 3,
        reps: '5'
      });

      const userExercises = exerciseDb.findByUserId(userId);

      expect(userExercises).toHaveLength(2);
      expect(userExercises).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Squats' }),
          expect.objectContaining({ name: 'Deadlifts' })
        ])
      );
    });

    it('should update exercise', () => {
      const user = createTestUser();
      const userId = user.id;
      const exerciseData = {
        userId,
        name: 'Squats',
        sets: 3,
        reps: '8-10'
      };

      const createdExercise = exerciseDb.create(exerciseData);
      const updates = {
        sets: 4,
        reps: '10-12'
      };

      const updatedExercise = exerciseDb.update(createdExercise.id, updates);

      expect(updatedExercise).toBeDefined();
      expect(updatedExercise?.sets).toBe(4);
      expect(updatedExercise?.reps).toBe('10-12');
    });

    it('should delete exercise', () => {
      const user = createTestUser();
      const userId = user.id;
      const exerciseData = {
        userId,
        name: 'Squats',
        sets: 3,
        reps: '8-10'
      };

      const createdExercise = exerciseDb.create(exerciseData);
      const deleted = exerciseDb.delete(createdExercise.id);

      expect(deleted).toBe(true);
      expect(exerciseDb.findById(createdExercise.id)).toBeNull();
    });
  });

  describe('Plan Assignment Database Operations', () => {
    it('should create a plan assignment', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine = createTestRoutine(userId);
      const routineId = routine.id;
      const assignmentData = {
        userId,
        routineId,
        startDate: '2023-01-01'
      };

      const assignment = planAssignmentDb.create(assignmentData);

      expect(assignment).toBeDefined();
      expect(assignment.id).toBeDefined();
      expect(assignment.userId).toBe(userId);
      expect(assignment.routineId).toBe(routineId);
      expect(assignment.startDate).toBe(assignmentData.startDate);
    });

    it('should find plan assignment by ID', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine = createTestRoutine(userId);
      const routineId = routine.id;
      const assignmentData = {
        userId,
        routineId,
        startDate: '2023-01-01'
      };

      const createdAssignment = planAssignmentDb.create(assignmentData);
      const foundAssignment = planAssignmentDb.findById(createdAssignment.id) as any;

      expect(foundAssignment).toBeDefined();
      expect(foundAssignment.id).toBe(createdAssignment.id);
      expect(foundAssignment.userId).toBe(userId);
    });

    it('should find plan assignments by user ID', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine1 = createTestRoutine(userId, { name: 'Routine 1' });
      const routineId1 = routine1.id;
      const routine2 = createTestRoutine(userId, { name: 'Routine 2' });
      const routineId2 = routine2.id;
      
      planAssignmentDb.create({
        userId,
        routineId: routineId1,
        startDate: '2023-01-01'
      });

      planAssignmentDb.create({
        userId,
        routineId: routineId2,
        startDate: '2023-02-01'
      });

      const userAssignments = planAssignmentDb.findByUserId(userId);

      expect(userAssignments).toHaveLength(2);
    });

    it('should delete plan assignment', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine = createTestRoutine(userId);
      const routineId = routine.id;
      const assignmentData = {
        userId,
        routineId,
        startDate: '2023-01-01'
      };

      const createdAssignment = planAssignmentDb.create(assignmentData);
      const deleted = planAssignmentDb.delete(createdAssignment.id);

      expect(deleted).toBe(true);
      expect(planAssignmentDb.findById(createdAssignment.id)).toBeNull();
    });
  });

  describe('Commitment Database Operations', () => {
    it('should create a commitment', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine = createTestRoutine(userId);
      const routineId = routine.id;
      const commitmentData = {
        userId,
        routineId,
        commitmentLevel: 8,
        notes: 'Very motivated'
      };

      const commitment = commitmentDb.create(commitmentData);

      expect(commitment).toBeDefined();
      expect(commitment.id).toBeDefined();
      expect(commitment.userId).toBe(userId);
      expect(commitment.routineId).toBe(routineId);
      expect(commitment.commitmentLevel).toBe(8);
      expect(commitment.notes).toBe('Very motivated');
    });

    it('should find commitment by ID', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine = createTestRoutine(userId);
      const routineId = routine.id;
      const commitmentData = {
        userId,
        routineId,
        commitmentLevel: 7,
        notes: 'Feeling good'
      };

      const createdCommitment = commitmentDb.create(commitmentData);
      const foundCommitment = commitmentDb.findById(createdCommitment.id) as any;

      expect(foundCommitment).toBeDefined();
      expect(foundCommitment.id).toBe(createdCommitment.id);
      expect(foundCommitment.commitmentLevel).toBe(7);
    });

    it('should find commitments by user ID', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine1 = createTestRoutine(userId, { name: 'Routine 1' });
      const routineId1 = routine1.id;
      const routine2 = createTestRoutine(userId, { name: 'Routine 2' });
      const routineId2 = routine2.id;
      
      commitmentDb.create({
        userId,
        routineId: routineId1,
        commitmentLevel: 8,
        notes: 'High motivation'
      });

      commitmentDb.create({
        userId,
        routineId: routineId2,
        commitmentLevel: 6,
        notes: 'Moderate motivation'
      });

      const userCommitments = commitmentDb.findByUserId(userId);

      expect(userCommitments).toHaveLength(2);
      expect(userCommitments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ commitmentLevel: 8 }),
          expect.objectContaining({ commitmentLevel: 6 })
        ])
      );
    });

    it('should delete commitment', () => {
      const user = createTestUser();
      const userId = user.id;
      const routine = createTestRoutine(userId);
      const routineId = routine.id;
      const commitmentData = {
        userId,
        routineId,
        commitmentLevel: 5,
        notes: 'Test commitment'
      };

      const createdCommitment = commitmentDb.create(commitmentData);
      const deleted = commitmentDb.delete(createdCommitment.id);

      expect(deleted).toBe(true);
      expect(commitmentDb.findById(createdCommitment.id)).toBeNull();
    });
  });

  describe('Data Integrity and Relationships', () => {
    it('should handle JSON field serialization and deserialization', () => {
      const complexData = {
        name: 'Complex User',
        email: 'complex@example.com',
        password: 'password',
        stats: { level: 5, xp: 1500, achievements: ['first_workout', 'week_streak'] },
        keystoneHabits: ['morning_exercise', 'evening_stretch'],
        trainingCycle: { 
          week: 3, 
          phase: 'build', 
          focus: 'strength',
          modifications: { intensity: 'high', volume: 'moderate' }
        }
      };

      const user = userDb.create(complexData);
      const foundUser = userDb.findById(user.id);

      expect(foundUser?.stats).toEqual(complexData.stats);
      expect(foundUser?.keystoneHabits).toEqual(complexData.keystoneHabits);
      expect(foundUser?.trainingCycle).toEqual(complexData.trainingCycle);
    });

    it('should handle empty and null JSON fields', () => {
      const userData = {
        name: 'Minimal User',
        email: 'minimal@example.com',
        password: 'password'
        // No optional fields
      };

      const user = userDb.create(userData);
      const foundUser = userDb.findById(user.id);

      expect(foundUser?.stats).toEqual({});
      expect(foundUser?.keystoneHabits).toEqual([]);
      expect(foundUser?.trainingCycle).toEqual({});
      expect(foundUser?.detailedProfile).toEqual({});
      expect(foundUser?.preferences).toEqual({});
    });

    it('should handle boolean field conversions', () => {
      const userData = {
        name: 'Boolean Test User',
        email: 'boolean@example.com',
        password: 'password',
        onboardingCompleted: true,
        isInAutonomyPhase: false
      };

      const user = userDb.create(userData);
      const foundUser = userDb.findById(user.id);

      expect(foundUser?.onboardingCompleted).toBe(true);
      expect(foundUser?.isInAutonomyPhase).toBe(false);
    });
  });
});