/// <reference types="vite/client" />
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';

// Get base API URL from environment variables
const BASE_API_URL = process.env.VITE_BASE_API_URL || process.env.BASE_API_URL || 'http://localhost:3001';

// Create axios instance with aggressive timeout for XXII century UX
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_API_URL,
  timeout: 3000, // 3 second timeout for aggressive UX
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log request for debugging
    logger.info('HTTP Request', {
      context: 'http-service',
      metadata: {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL
      }
    });
    return config;
  },
  (error) => {
    logger.error('HTTP Request Error', {
      context: 'http-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful response
    logger.info('HTTP Response', {
      context: 'http-service',
      metadata: {
        status: response.status,
        url: response.config.url,
        method: response.config.method
      }
    });
    return response;
  },
  (error) => {
    // Log error response
    logger.error('HTTP Response Error', {
      context: 'http-service',
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    return Promise.reject(error);
  }
);

/**
 * HTTP Service with aggressive timeout for XXII century UX
 */
export class HttpService {
  /**
   * Make a GET request
   * @param url - Endpoint URL
   * @param config - Axios request config
   */
  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return apiClient.get<T>(url, config);
  }

  /**
   * Make a POST request
   * @param url - Endpoint URL
   * @param data - Request data
   * @param config - Axios request config
   */
  static async post<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return apiClient.post<T>(url, data, config);
  }

  /**
   * Make a PUT request
   * @param url - Endpoint URL
   * @param data - Request data
   * @param config - Axios request config
   */
  static async put<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return apiClient.put<T>(url, data, config);
  }

  /**
   * Make a DELETE request
   * @param url - Endpoint URL
   * @param config - Axios request config
   */
  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return apiClient.delete<T>(url, config);
  }

  /**
   * Make a PATCH request
   * @param url - Endpoint URL
   * @param data - Request data
   * @param config - Axios request config
   */
  static async patch<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return apiClient.patch<T>(url, data, config);
  }
}

export default apiClient;

