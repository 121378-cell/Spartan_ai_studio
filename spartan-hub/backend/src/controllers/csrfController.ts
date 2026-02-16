import { Response, Request } from 'express';
import { randomBytes, createHash } from 'crypto';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../utils/sanitization';
import { ValidationError, NotFoundError } from '../utils/errorHandler';
import { HealthConnectHubService } from '../services/healthConnectHubService';
import AppleHealthService from '../services/appleHealthService';
import { BiometricDataType } from '../types/biometric';

/**
 * PKCE (Proof Key for Code Exchange) Helper Functions
 * Implements OAuth 2.0 PKCE extension for enhanced security
 */

interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

/**
 * Generate a PKCE code verifier and code challenge
 * Uses SHA-256 for code challenge generation as per RFC 7636
 */
const generatePKCEData = (): PKCEData => {
  // Generate code verifier (43-128 characters)
  const codeVerifier = randomBytes(32).toString('base64url');
  
  // Generate code challenge (SHA-256 hash of verifier, base64url encoded)
  const codeChallenge = createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Generate state for CSRF protection
  const state = randomBytes(16).toString('base64url');
  
  return {
    codeVerifier,
    codeChallenge,
    state
  };
};

/**
 * Validate state parameter
 */
const validateState = (providedState: string, storedState: string): boolean => {
  return providedState === storedState;
};

/**
 * In-memory PKCE data storage (in production, use Redis or database)
 */
const pkceStore = new Map<string, PKCEData>();

/**
 * Store PKCE data for a user session
 */
const storePKCEData = (userId: string, data: PKCEData): void => {
  pkceStore.set(userId, data);
  
  // Auto-expire after 15 minutes
  setTimeout(() => {
    pkceStore.delete(userId);
  }, 15 * 60 * 1000);
};

/**
 * Retrieve and validate PKCE data
 */
const retrievePKCEData = (userId: string, state: string): PKCEData | null => {
  const data = pkceStore.get(userId);
  if (!data) {
    return null;
  }
  
  // Validate state
  if (!validateState(state, data.state)) {
    pkceStore.delete(userId);
    return null;
  }
  
  return data;
};

/**
 * Biometric & Wearable Integration Controllers
 */

// Initialize services (these would be injected in production)
let healthHub: HealthConnectHubService | null = null;
let appleHealthService: AppleHealthService | null = null;

export const setHealthHub = (service: HealthConnectHubService) => {
  healthHub = service;
};

export const setAppleHealthService = (service: AppleHealthService) => {
  appleHealthService = service;
};

/**
 * GET /api/csrf-token
 * Returns a new valid CSRF token for the client
 */
export const getCsrfToken = async (req: Request, res: Response) => {
  try {
    const token = randomBytes(32).toString('base64');
    
    return res.status(200).json({
      success: true,
      token,
      message: 'CSRF token retrieved successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
