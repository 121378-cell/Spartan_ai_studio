// Custom Express Request type extending the default Express Request
import { Request } from 'express';

// Define the user type that will be attached to requests
export interface User {
  userId?: string;
  id?: string;
  role?: string;
  email?: string;
  name?: string;
  [key: string]: unknown; // Allow additional properties
}

// AuthenticatedRequest is now defined in auth middleware
// Import from there: import { AuthenticatedRequest } from '../middleware/auth';

// Extended request interface with user property
export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
  requestId?: string;
}

// Database result types
export interface DatabaseResult<T = unknown> {
  rows: T[];
  rowCount: number;
  oid?: number;
  fields?: unknown[];
}

// Cache entry type
export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Alert configuration types
export interface AlertCondition {
  [key: string]: unknown;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Queue item type
export interface QueueItem {
  type: string;
  payload: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

// Generic function type
export type GenericFunction<T = unknown> = (...args: unknown[]) => T;

// Generic error type for better error handling
export type ServiceError = {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
};

// Database row type for generic database operations
export interface QueryResultRow {
  [column: string]: unknown;
}

// Axios response type
export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, unknown>;
  config: Record<string, unknown>;
}

// Metric types
export interface Metrics {
  counters: CounterMetric[];
  gauges: GaugeMetric[];
  histograms: HistogramMetric[];
}

export interface CounterMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface GaugeMetric {
  name: string;
  value: number;
  labels?: Record<string, string>;
}

export interface HistogramMetric {
  name: string;
  values: number[];
  labels?: Record<string, string>;
}

// Configuration interface
export interface AppConfig {
  [key: string]: unknown;
}

// Token types
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// JWT payload type
export interface JWTPayload {
  userId: string;
  role: string;
  email?: string;
  iat: number;
  exp: number;
}

// Refresh Token type
export interface RefreshToken {
  id: string;
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Request parameters, query, and body types
export interface RequestParams {
  [key: string]: string | undefined;
}

export interface RequestQuery {
  [key: string]: string | string[] | undefined;
}

export interface RequestBody {
  [key: string]: unknown;
}

// Mock request/response types for testing
export interface MockRequest {
  body?: unknown;
  query?: unknown;
  params?: unknown;
  user?: User;
  [key: string]: unknown;
}

export interface MockResponse {
  status?: (code: number) => MockResponse;
  json?: (data: unknown) => MockResponse;
  send?: (data: unknown) => MockResponse;
  end?: (chunk?: unknown, encoding?: unknown, callback?: unknown) => void;
  [key: string]: unknown;
}