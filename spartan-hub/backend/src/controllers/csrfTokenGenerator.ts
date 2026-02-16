/**
 * CSRF Token Generator
 * Generates simple CSRF tokens for session-based protection
 */

import { Request } from 'express';
import { randomBytes } from 'crypto';

/**
 * Generate a new CSRF token
 * Simple implementation using crypto.randomBytes
 */
export const getCsrfToken = async (req: Request): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const token = randomBytes(32).toString('base64');
      resolve(token);
    } catch (error) {
      reject(error);
    }
  });
};

export default getCsrfToken;
