import { routineDb } from '../services/databaseServiceFactory';

export interface RoutineExercise {
  name: string;
  sets: number;
  reps: string;
  rir?: number;
  restSeconds?: number;
  coachTip?: string;
  tempo?: string;
}

export interface RoutineBlock {
  name: string;
  exercises: RoutineExercise[];
}

export interface BaseRoutine {
  id: string;
  name: string;
  focus: string;
  duration: number;
  objective?: string;
  blocks: RoutineBlock[];
}

export interface Routine extends BaseRoutine {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RoutineModel {
  static async findById(id: string): Promise<Routine | null> {
    return routineDb.findById(id) as unknown as Routine | null;
  }

  static async findByUserId(userId: string): Promise<Routine[]> {
    return routineDb.findByUserId(userId) as unknown as Routine[];
  }

  static async create(routineData: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Routine> {
    return routineDb.create(routineData) as unknown as Routine;
  }

  static async update(id: string, routineData: Partial<Routine>): Promise<Routine | null> {
    return routineDb.update(id, routineData) as unknown as Routine | null;
  }

  static async delete(id: string): Promise<boolean> {
    return routineDb.delete(id);
  }

  static async findAll(): Promise<Routine[]> {
    return routineDb.findAll() as unknown as Routine[];
  }
}