// Shared types for Spartan Hub platform

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'coach' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Workout {
  id: string;
  userId: string;
  title: string;
  description?: string;
  exercises: Exercise[];
  durationMinutes: number;
  createdAt: Date;
  scheduledDate?: Date;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  restTimeSeconds?: number;
  notes?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

// Common error types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;