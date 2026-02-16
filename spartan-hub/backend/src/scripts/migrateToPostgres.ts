#!/usr/bin/env ts-node

/**
 * Data Migration Script from SQLite to PostgreSQL
 * 
 * This script migrates existing data from SQLite to PostgreSQL.
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { executeQuery as pgExecuteQuery } from '../config/postgresConfig';
import sqlite3Db from '../config/database';

// Helper function to serialize complex objects to JSON strings
const serialize = (obj: any): string | null => {
  if (obj === null || obj === undefined) return null;
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.error('Error serializing JSON:', e);
    return null;
  }
};

// Migration function
const migrateDataToPostgres = async () => {
  try {
    console.log('🚀 Starting data migration from SQLite to PostgreSQL...');

    // Ensure we have a valid SQLite database instance
    if (!sqlite3Db || typeof sqlite3Db === 'object' && 'type' in sqlite3Db) {
      throw new Error('SQLite database not available for migration');
    }

    // Migrate users
    console.log('Migrating users...');
    const usersResult = (sqlite3Db as DatabaseType).prepare('SELECT * FROM users').all() as any[];
    for (const user of usersResult) {
      await pgExecuteQuery(
        `INSERT INTO users (
          id, name, email, quest, stats, onboarding_completed, keystone_habits,
          master_regulation_settings, nutrition_settings, is_in_autonomy_phase, weight_kg,
          training_cycle, last_weekly_plan_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          quest = EXCLUDED.quest,
          stats = EXCLUDED.stats,
          onboarding_completed = EXCLUDED.onboarding_completed,
          keystone_habits = EXCLUDED.keystone_habits,
          master_regulation_settings = EXCLUDED.master_regulation_settings,
          nutrition_settings = EXCLUDED.nutrition_settings,
          is_in_autonomy_phase = EXCLUDED.is_in_autonomy_phase,
          weight_kg = EXCLUDED.weight_kg,
          training_cycle = EXCLUDED.training_cycle,
          last_weekly_plan_date = EXCLUDED.last_weekly_plan_date,
          updated_at = EXCLUDED.updated_at`,
        [
          user.id,
          user.name,
          user.email,
          user.quest,
          user.stats,
          user.onboardingCompleted,
          user.keystoneHabits,
          user.masterRegulationSettings,
          user.nutritionSettings,
          user.isInAutonomyPhase,
          user.weightKg,
          user.trainingCycle,
          user.lastWeeklyPlanDate,
          user.createdAt,
          user.updatedAt
        ]
      );
    }
    console.log(`Migrated ${usersResult.length} users`);
    
    // Migrate routines
    console.log('Migrating routines...');
    const routinesResult = (sqlite3Db as DatabaseType).prepare('SELECT * FROM routines').all() as any[];
    for (const routine of routinesResult) {
      await pgExecuteQuery(
        `INSERT INTO routines (
          id, user_id, name, focus, duration, objective, blocks, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          focus = EXCLUDED.focus,
          duration = EXCLUDED.duration,
          objective = EXCLUDED.objective,
          blocks = EXCLUDED.blocks,
          updated_at = EXCLUDED.updated_at`,
        [
          routine.id,
          routine.userId,
          routine.name,
          routine.focus,
          routine.duration,
          routine.objective,
          routine.blocks,
          routine.createdAt,
          routine.updatedAt
        ]
      );
    }
    console.log(`Migrated ${routinesResult.length} routines`);
    
    // Migrate exercises
    console.log('Migrating exercises...');
    const exercisesResult = (sqlite3Db as DatabaseType).prepare('SELECT * FROM exercises').all() as any[];
    for (const exercise of exercisesResult) {
      await pgExecuteQuery(
        `INSERT INTO exercises (
          id, user_id, name, sets, reps, rir, rest_seconds, coach_tip, tempo, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          name = EXCLUDED.name,
          sets = EXCLUDED.sets,
          reps = EXCLUDED.reps,
          rir = EXCLUDED.rir,
          rest_seconds = EXCLUDED.rest_seconds,
          coach_tip = EXCLUDED.coach_tip,
          tempo = EXCLUDED.tempo,
          updated_at = EXCLUDED.updated_at`,
        [
          exercise.id,
          exercise.userId,
          exercise.name,
          exercise.sets,
          exercise.reps,
          exercise.rir,
          exercise.restSeconds,
          exercise.coachTip,
          exercise.tempo,
          exercise.createdAt,
          exercise.updatedAt
        ]
      );
    }
    console.log(`Migrated ${exercisesResult.length} exercises`);
    
    // Migrate plan assignments
    console.log('Migrating plan assignments...');
    const planAssignmentsResult = (sqlite3Db as DatabaseType).prepare('SELECT * FROM plan_assignments').all() as any[];
    for (const assignment of planAssignmentsResult) {
      await pgExecuteQuery(
        `INSERT INTO plan_assignments (
          id, user_id, routine_id, start_date, assigned_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          routine_id = EXCLUDED.routine_id,
          start_date = EXCLUDED.start_date,
          assigned_at = EXCLUDED.assigned_at`,
        [
          assignment.id,
          assignment.userId,
          assignment.routineId,
          assignment.startDate,
          assignment.assignedAt
        ]
      );
    }
    console.log(`Migrated ${planAssignmentsResult.length} plan assignments`);
    
    // Migrate commitments
    console.log('Migrating commitments...');
    const commitmentsResult = (sqlite3Db as DatabaseType).prepare('SELECT * FROM commitments').all() as any[];
    for (const commitment of commitmentsResult) {
      await pgExecuteQuery(
        `INSERT INTO commitments (
          id, user_id, routine_id, commitment_level, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          routine_id = EXCLUDED.routine_id,
          commitment_level = EXCLUDED.commitment_level,
          notes = EXCLUDED.notes,
          created_at = EXCLUDED.created_at`,
        [
          commitment.id,
          commitment.userId,
          commitment.routineId,
          commitment.commitmentLevel,
          commitment.notes,
          commitment.createdAt
        ]
      );
    }
    console.log(`Migrated ${commitmentsResult.length} commitments`);
    
    console.log('✅ Data migration completed successfully');
  } catch (error) {
    console.error('❌ Error during data migration:', error);
    throw error;
  }
};

// If run directly, execute data migration
if (require.main === module) {
  migrateDataToPostgres()
    .then(() => {
      console.log('Data migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Data migration failed:', error);
      process.exit(1);
    });
}

export default migrateDataToPostgres;