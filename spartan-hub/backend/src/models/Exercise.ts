import { exerciseDb } from '../services/databaseServiceFactory';

export interface BaseExercise {
  name: string;
  sets: number;
  reps: string;
  rir: number | null;
  restSeconds: number | null;
  coachTip: string | null;
  tempo: string | null;
}

export interface Exercise extends BaseExercise {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ExerciseModel {
  static async findById(id: string): Promise<Exercise | null> {
    return exerciseDb.findById(id);
  }

  static async findByUserId(userId: string): Promise<Exercise[]> {
    return exerciseDb.findByUserId(userId);
  }

  static async create(exerciseData: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>): Promise<Exercise> {
    return exerciseDb.create(exerciseData);
  }

  static async update(id: string, exerciseData: Partial<Exercise>): Promise<Exercise | null> {
    return exerciseDb.update(id, exerciseData);
  }

  static async delete(id: string): Promise<boolean> {
    return exerciseDb.delete(id);
  }

  static async findAll(): Promise<Exercise[]> {
    return exerciseDb.findAll();
  }
}