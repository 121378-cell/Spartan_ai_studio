/**
 * Type declarations for database services
 */

import type {
  DatabaseService,
  UserDbOperations,
  RoutineDbOperations,
  ExerciseDbOperations,
  PlanAssignmentDbOperations,
  CommitmentDbOperations
} from '../types/database';

declare module '../services/postgresDatabaseService' {
  const postgresDatabaseService: DatabaseService;
  export = postgresDatabaseService;
}

declare module '../services/sqliteDatabaseService' {
  const sqliteDatabaseService: DatabaseService;
  export = sqliteDatabaseService;
}

// Type declarations for the database service factory exports
export const userDb: UserDbOperations;
export const routineDb: RoutineDbOperations;
export const exerciseDb: ExerciseDbOperations;
export const planAssignmentDb: PlanAssignmentDbOperations;
export const commitmentDb: CommitmentDbOperations;
