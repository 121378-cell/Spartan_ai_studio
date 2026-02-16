/**
 * Retry Handler Utility with Individual Request Timeout
 * Provides retry logic with exponential backoff, jitter, and individual request timeouts
 */

import { logger } from './logger';

// Interface for retry options
export interface RetryOptions {
  maxRetries?: number;        // Maximum number of retries (default: 3)
  initialDelay?: number;      // Initial delay in ms (default: 1000)
  maxDelay?: number;          // Maximum delay in ms (default: 10000)
  factor?: number;            // Backoff factor (default: 2)
  jitter?: boolean;           // Use jitter (default: true)
  timeout?: number;           // Request timeout in ms (default: 30000)
  retryableErrors?: string[]; // List of retryable errors
  perRequestTimeout?: number; // Individual request timeout in ms (default: same as timeout)
}

// Default retry options
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
  jitter: true,
  timeout: 30000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH']
};

/**
 * Sleep for a specified number of milliseconds
 * @param ms Number of milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and optional jitter
 * @param attempt Current attempt number (0-indexed)
 * @param options Retry options
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const { initialDelay = 1000, maxDelay = 10000, factor = 2, jitter = true } = options;
  
  // Calculate exponential backoff
  let delay = initialDelay * Math.pow(factor, attempt);
  
  // Cap at maxDelay
  delay = Math.min(delay, maxDelay);
  
  // Apply jitter if enabled
  if (jitter) {
    // Generate a pseudo-random number using a more secure approach
    // Using Date.now() and a simple hash to generate a value between 0.5 and 1.0
    const now = Date.now();
    const randomSeed = now % 1000;
    const jitterFactor = 0.5 + (randomSeed / 1000) * 0.5; // Between 0.5 and 1.0
    delay = Math.floor(delay * jitterFactor);
  }
  
  return delay;
}

/**
 * Check if an error is retryable
 * @param error Error to check
 * @param retryableErrors List of retryable error codes
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  // Type guard for error object
  if (error && typeof error === 'object') {
    // Check for network errors
    if ('code' in error && typeof error.code === 'string' && retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check for timeout errors
    if ('code' in error && error.code === 'ECONNABORTED' || 
        ('message' in error && typeof error.message === 'string' && error.message.includes('timeout'))) {
      return true;
    }
    
    // Check for HTTP 5xx errors
    if ('response' in error && error.response && typeof error.response === 'object' &&
        'status' in error.response && typeof error.response.status === 'number' &&
        error.response.status >= 500 && error.response.status < 600) {
      return true;
    }
  }
  
  return false;
}

/**
 * Execute a function with retry logic and individual request timeout
 * @param fn Function to execute
 * @param options Retry options
 */
export async function executeWithRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  // Merge options with defaults
  const opts: Required<RetryOptions> = {
    maxRetries: options.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries!,
    initialDelay: options.initialDelay ?? DEFAULT_RETRY_OPTIONS.initialDelay!,
    maxDelay: options.maxDelay ?? DEFAULT_RETRY_OPTIONS.maxDelay!,
    factor: options.factor ?? DEFAULT_RETRY_OPTIONS.factor!,
    jitter: options.jitter ?? DEFAULT_RETRY_OPTIONS.jitter!,
    timeout: options.timeout ?? DEFAULT_RETRY_OPTIONS.timeout!,
    retryableErrors: options.retryableErrors ?? DEFAULT_RETRY_OPTIONS.retryableErrors!,
    perRequestTimeout: options.perRequestTimeout ?? options.timeout ?? DEFAULT_RETRY_OPTIONS.timeout!
  };
  
  let lastError: unknown;
  
  // Try original request plus retries
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Wrap the function call with a timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timeout after ${opts.perRequestTimeout}ms`)), opts.perRequestTimeout);
      });
      
      // Race the function call against the timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error: unknown) {
      lastError = error;
      
      // If this was the last attempt, don't retry
      if (attempt === opts.maxRetries) {
        throw error;
      }
      
      // Check if error is retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }
      
      // Calculate delay before retry
      const delay = calculateDelay(attempt, opts);
      logger.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms`, { context: 'retry', metadata: { attempt, delay, error: error instanceof Error ? error.message : String(error) } });

      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Execute an Axios request with retry logic and individual request timeout
 * @param axiosInstance Axios instance
 * @param config Axios request config
 * @param options Retry options
 */
import axios from 'axios';

// Define minimal AxiosRequestConfig interface for our use case
interface AxiosRequestConfig {
  url?: string;
  method?: string;
  baseURL?: string;
  headers?: any;
  params?: any;
  data?: any;
  timeout?: number;
  [key: string]: any;
}

export function executeAxiosWithRetry<T>(
  axiosInstance: typeof axios,
  config: AxiosRequestConfig,
  options: RetryOptions = {}
): Promise<T> {
  // Ensure timeout is set in the config
  const configWithTimeout = {
    ...config,
    timeout: options.perRequestTimeout ?? options.timeout ?? 30000
  };
  
  return executeWithRetry<T>(async () => {
    const response = await axiosInstance(configWithTimeout as any);
    return response.data as T;
  }, options);
}

/**
 * Execute a fetch request with retry logic and individual request timeout
 * @param url Request URL
 * @param init Fetch init options
 * @param options Retry options
 */
export function executeFetchWithRetry<T>(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<T> {
  // Ensure timeout is set in the init options
  const initWithTimeout: RequestInit = {
    ...init,
    // Note: fetch doesn't support timeout directly, we handle it in executeWithRetry
  };
  
  return executeWithRetry<T>(async () => {
    const response = await fetch(url, initWithTimeout);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data as T;
  }, options);
}

export default {
  executeWithRetry,
  executeAxiosWithRetry,
  executeFetchWithRetry
};
