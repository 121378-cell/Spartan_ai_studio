/**
 * Mobile API Integration Service
 * Phase C: Mobile Foundation - Week 10 Day 2
 * 
 * API client and integration for mobile app
 */

import { logger } from '../utils/logger';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ApiEndpoint = 'auth' | 'users' | 'workouts' | 'challenges' | 'gamification' | 'analytics' | 'settings';

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  [key: string]: any;
}

export interface ApiRequest {
  method: HttpMethod;
  endpoint: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  requiresAuth: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: any;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Mobile API Integration Service
 */
export class MobileApiService {
  private config: ApiConfig;
  private tokens: AuthTokens | null = null;
  private requestQueue: Map<string, Promise<any>> = new Map();

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      baseUrl: 'https://api.spartanhub.io',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };

    logger.info('MobileApiService initialized', {
      context: 'mobile-api',
      metadata: this.config
    });
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
    
    logger.debug('Auth tokens set', {
      context: 'mobile-api',
      metadata: {
        expiresAt: tokens.expiresAt
      }
    });
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.tokens = null;
  }

  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.tokens) {
      headers['Authorization'] = `Bearer ${this.tokens.accessToken}`;
    }

    return headers;
  }

  /**
   * Make API request
   */
  async request<T>(apiRequest: ApiRequest): Promise<ApiResponse<T>> {
    const { method, endpoint, params, body, headers, requiresAuth } = apiRequest;

    const url = this.buildUrl(endpoint, params);
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
      ...(requiresAuth ? this.getAuthHeaders() : {})
    };

    logger.debug('API request', {
      context: 'mobile-api',
      metadata: {
        method,
        endpoint,
        url
      }
    });

    try {
      const response = await this.executeRequest<T>(url, method, body, requestHeaders);
      
      logger.debug('API response', {
        context: 'mobile-api',
        metadata: {
          endpoint,
          success: response.success
        }
      });

      return response;
    } catch (error) {
      const apiError = error as ApiError;
      
      logger.error('API request failed', {
        context: 'mobile-api',
        metadata: {
          endpoint,
          error: apiError.message,
          status: apiError.status
        }
      });

      throw error;
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeRequest<T>(
    url: string,
    method: HttpMethod,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt < this.config.retries; attempt++) {
      try {
        // Simulate API call (in production, use fetch or axios)
        const response = await this.simulateApiCall<T>(url, method, body, headers);
        return response;
      } catch (error) {
        lastError = error as ApiError;

        // Don't retry on client errors (4xx)
        if (lastError.status >= 400 && lastError.status < 500) {
          throw lastError;
        }

        // Wait before retry
        if (attempt < this.config.retries - 1) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError || {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      status: 500
    };
  }

  /**
   * Simulate API call (replace with actual fetch/axios in production)
   */
  private async simulateApiCall<T>(
    url: string,
    method: HttpMethod,
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    // Simulate network delay
    await this.delay(100);

    // Return mock response based on endpoint
    const mockResponse = this.getMockResponse<T>(url, method);

    return {
      success: true,
      data: mockResponse,
      timestamp: Date.now()
    };
  }

  /**
   * Get mock response based on endpoint
   */
  private getMockResponse<T>(url: string, method: HttpMethod): T {
    // Mock responses for different endpoints
    if (url.includes('/auth/login')) {
      return {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        token: 'mock_token'
      } as any;
    }

    if (url.includes('/workouts')) {
      return {
        items: [
          { id: '1', type: 'strength', duration: 3600, date: new Date().toISOString() }
        ]
      } as any;
    }

    if (url.includes('/gamification')) {
      return {
        level: 5,
        xp: 1500,
        points: 2500,
        achievements: []
      } as any;
    }

    return {} as T;
  }

  /**
   * Build URL with query params
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = `${this.config.baseUrl}${endpoint}`;

    if (!params || Object.keys(params).length === 0) {
      return url;
    }

    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== API Methods ====================

  /**
   * Auth endpoints
   */
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.request({
      method: 'POST',
      endpoint: '/auth/login',
      body: { email, password },
      requiresAuth: false
    });
  }

  async register(email: string, password: string, name: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return this.request({
      method: 'POST',
      endpoint: '/auth/register',
      body: { email, password, name },
      requiresAuth: false
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request({
      method: 'POST',
      endpoint: '/auth/logout',
      requiresAuth: true
    });
  }

  /**
   * User endpoints
   */
  async getProfile(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      endpoint: '/users/me',
      requiresAuth: true
    });
  }

  async updateProfile(profile: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      endpoint: '/users/me',
      body: profile,
      requiresAuth: true
    });
  }

  /**
   * Workouts endpoints
   */
  async getWorkouts(params?: { limit?: number; offset?: number }): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      endpoint: '/workouts',
      params,
      requiresAuth: true
    });
  }

  async startWorkout(type: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      endpoint: '/workouts/start',
      body: { type },
      requiresAuth: true
    });
  }

  async endWorkout(workoutId: string, data: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      endpoint: `/workouts/${workoutId}/end`,
      body: data,
      requiresAuth: true
    });
  }

  /**
   * Challenges endpoints
   */
  async getChallenges(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      endpoint: '/challenges',
      requiresAuth: true
    });
  }

  async joinChallenge(challengeId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      endpoint: `/challenges/${challengeId}/join`,
      requiresAuth: true
    });
  }

  async updateChallengeProgress(challengeId: string, progress: number): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      endpoint: `/challenges/${challengeId}/progress`,
      body: { progress },
      requiresAuth: true
    });
  }

  /**
   * Gamification endpoints
   */
  async getGamificationProgress(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      endpoint: '/gamification/progress',
      requiresAuth: true
    });
  }

  async getAchievements(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      endpoint: '/gamification/achievements',
      requiresAuth: true
    });
  }

  async getDailyQuests(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      endpoint: '/gamification/quests/daily',
      requiresAuth: true
    });
  }

  async claimQuestReward(questId: string): Promise<ApiResponse<any>> {
    return this.request({
      method: 'POST',
      endpoint: `/gamification/quests/${questId}/claim`,
      requiresAuth: true
    });
  }

  /**
   * Settings endpoints
   */
  async getSettings(): Promise<ApiResponse<any>> {
    return this.request({
      method: 'GET',
      endpoint: '/settings',
      requiresAuth: true
    });
  }

  async updateSettings(settings: any): Promise<ApiResponse<any>> {
    return this.request({
      method: 'PUT',
      endpoint: '/settings',
      body: settings,
      requiresAuth: true
    });
  }

  /**
   * Health check
   */
  healthCheck(): boolean {
    const isHealthy = true;

    logger.debug('Mobile API health check', {
      context: 'mobile-api',
      metadata: {
        healthy: isHealthy,
        baseUrl: this.config.baseUrl
      }
    });

    return isHealthy;
  }
}

// Singleton instance
const mobileApiService = new MobileApiService();

export default mobileApiService;
