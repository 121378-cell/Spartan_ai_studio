/**
 * Test Utilities
 * Provides common interfaces and utilities for testing
 */

import { Request, Response } from 'express';

/**
 * Mock Request interface - compatible with Express Request for testing
 */
export interface MockRequest {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies: Record<string, any>;
  signedCookies: Record<string, any>;
  user?: unknown;
  session?: unknown;
  get: (name: string) => string | string[] | undefined;
  method?: string;
  url?: string;
  path?: string;
  hostname?: string;
  ip?: string;
  ips?: string[];
  // Additional Express Request properties that might be needed
  accepts?: (...types: string[]) => string | false;
  acceptsCharsets?: (...charsets: string[]) => string | false;
  acceptsEncodings?: (...encodings: string[]) => string | false;
  acceptsLanguages?: (...langs: string[]) => string | false;
  is?: (type: string) => boolean;
  range?: (size: number, options?: { combine?: boolean }) => number[][] | number[] | undefined;
}

/**
 * Mock Response interface - allows any properties for test flexibility
 */
export interface MockResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  end: jest.Mock;
  statusCode?: number;
  data?: unknown;
  // Ensure all Response methods are properly mocked
  redirect?: jest.Mock;
  render?: jest.Mock;
  set?: jest.Mock;
  header?: jest.Mock;
  get?: jest.Mock;
  clearCookie?: jest.Mock;
  cookie?: jest.Mock;
  location?: jest.Mock;
  links?: jest.Mock;
  sendStatus?: jest.Mock;
  type?: jest.Mock;
  vary?: jest.Mock;
  append?: jest.Mock;
  attachment?: jest.Mock;
  download?: jest.Mock;
  format?: jest.Mock;
  write?: jest.Mock;
  writeHead?: jest.Mock;
}

/**
 * Create a mock Express request object
 * @param options Configuration options for the mock request
 * @param options.body Request body
 * @param options.params URL parameters
 * @param options.query Query string parameters
 * @param options.headers Request headers
 * @param options.user Authenticated user object
 * @param options.session Session object
 * @param options.cookies Request cookies
 * @returns Mock request object compatible with Express Request
 */
export function createMockRequest(options: {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  user?: unknown;
  session?: unknown;
  cookies?: Record<string, any>;
  [key: string]: any;
} = {}): MockRequest {
  const headers: Record<string, string> = options.headers || {};

  // Extract known properties to avoid spreading them into the request object improperly if needed,
  // or just spread rest.
  const { body, params, query, headers: _headers, user, session, cookies, ...rest } = options;

  return {
    body: body || {},
    params: params || {},
    query: query || {},
    headers,
    cookies: cookies || {},
    signedCookies: {},
    user,
    session,
    get: (name: string): string | string[] | undefined => {
      const value = headers[name.toLowerCase()];
      return value ? [value] : undefined;
    },
    method: 'GET',
    url: '/test',
    path: '/test',
    hostname: 'localhost',
    ip: '127.0.0.1',
    ips: ['127.0.0.1'],
    // Additional Express Request methods
    accepts: jest.fn().mockReturnValue('text/html'),
    acceptsCharsets: jest.fn().mockReturnValue('utf-8'),
    acceptsEncodings: jest.fn().mockReturnValue('gzip'),
    acceptsLanguages: jest.fn().mockReturnValue('en'),
    is: jest.fn().mockReturnValue(false),
    range: jest.fn().mockReturnValue(undefined),
    ...rest
  };
}

/**
 * Mock Express response object
 * @returns Mock response object
 */
export function createMockResponse(): MockResponse {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    statusCode: 200,
    data: undefined as unknown,
    // Additional Response methods
    redirect: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    get: jest.fn(),
    clearCookie: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    location: jest.fn().mockReturnThis(),
    links: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    vary: jest.fn().mockReturnThis(),
    append: jest.fn().mockReturnThis(),
    attachment: jest.fn().mockReturnThis(),
    download: jest.fn().mockReturnThis(),
    format: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
    writeHead: jest.fn().mockReturnThis()
  };
}

/**
 * Mock Request and Response pair
 * @param body Request body
 * @returns Pair of mock request and response
 */
export function createMockReqRes(body?: Record<string, unknown>): { req: MockRequest; res: MockResponse } {
  return {
    req: createMockRequest({ body }),
    res: createMockResponse(),
  };
}

/**
 * Reset all known service singletons to ensure test isolation
 */
export function resetSingletons() {
  try {
    // We use any casting because many of these are modules or have private instances
    const brainOrchestratorModule = require('../services/brainOrchestrator');
    const BrainOrchestrator = brainOrchestratorModule.default || brainOrchestratorModule.BrainOrchestrator;
    if (BrainOrchestrator) (BrainOrchestrator as any).instance = undefined;

    const mlForecastingModule = require('../services/mlForecastingService');
    const MLForecastingService = mlForecastingModule.default || mlForecastingModule.MLForecastingService;
    if (MLForecastingService) (MLForecastingService as any).instance = undefined;

    const planAdjusterModule = require('../services/planAdjusterService');
    const PlanAdjusterService = planAdjusterModule.default || planAdjusterModule.PlanAdjusterService;
    if (PlanAdjusterService) (PlanAdjusterService as any).instance = undefined;

    const biometricModule = require('../services/biometricService');
    const BiometricService = biometricModule.default || biometricModule.BiometricService;
    if (BiometricService) (BiometricService as any).instance = undefined;

    const advancedAnalysisModule = require('../services/advancedAnalysisService');
    const AdvancedAnalysisService = advancedAnalysisModule.default || advancedAnalysisModule.AdvancedAnalysisService;
    if (AdvancedAnalysisService) (AdvancedAnalysisService as any).instance = undefined;

    const coachVitalisModule = require('../services/coachVitalisService');
    const CoachVitalisService = coachVitalisModule.default || coachVitalisModule.CoachVitalisService;
    if (CoachVitalisService) (CoachVitalisService as any).instance = undefined;

    // Clear DatabaseManager singleton
    const databaseManagerModule = require('../database/databaseManager');
    const DatabaseManager = databaseManagerModule.default || databaseManagerModule.DatabaseManager;
    if (DatabaseManager) DatabaseManager.instance = undefined;
  } catch (error) {
    // Some services might not be available or throw during require in certain environments
  }
}

/**
 * Standard shared mocks for common services
 */
export const sharedMocks = {
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
  socketManager: {
    emitToUser: jest.fn(),
    broadcast: jest.fn(),
    on: jest.fn(),
  }
};
