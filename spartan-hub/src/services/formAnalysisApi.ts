/**
 * Form Analysis API Service
 * Phase A: Video Form Analysis MVP
 * 
 * Connects frontend to backend Form Analysis API
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface FormAnalysis {
  id: string;
  userId: string;
  exerciseType: 'squat' | 'deadlift' | 'bench_press' | 'overhead_press';
  formScore: number;
  metrics: {
    repsCompleted: number;
    durationSeconds: number;
    kneeValgusAngle?: number;
    squatDepth?: 'parallel' | 'above_parallel' | 'below_parallel';
    torsoAngle?: number;
    backRounding?: 'neutral' | 'slight' | 'excessive';
    barPathDeviation?: number;
    hipHeight?: 'optimal' | 'too_high' | 'too_low';
    injuryRiskScore?: number;
  };
  warnings: string[];
  recommendations: string[];
  createdAt: number;
}

export interface CreateFormAnalysisDTO {
  userId: string;
  exerciseType: string;
  formScore: number;
  metrics: any;
  warnings: string[];
  recommendations: string[];
}

export interface FormAnalysisStats {
  totalAnalyses: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  byExerciseType: Record<string, { count: number; averageScore: number }>;
}

class FormAnalysisApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token to requests
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('API Error:', {
          context: 'form-analysis-api',
          metadata: {
            url: (error.config as any)?.url,
            status: error.response?.status,
            message: error.message
          }
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Save form analysis to backend
   */
  async saveAnalysis(data: CreateFormAnalysisDTO): Promise<FormAnalysis> {
    try {
      const response = await this.api.post<FormAnalysisResponse>('/form-analysis', data);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to save form analysis', {
        context: 'form-analysis-api',
        metadata: { error }
      });
      throw error;
    }
  }

  /**
   * Get form analysis by ID
   */
  async getAnalysisById(id: string): Promise<FormAnalysis> {
    const response = await this.api.get<FormAnalysisResponse>(`/form-analysis/${id}`);
    return response.data.data;
  }

  /**
   * Get user's form analyses
   */
  async getUserAnalyses(userId: string, limit: number = 50): Promise<FormAnalysis[]> {
    const response = await this.api.get<FormAnalysesListResponse>(
      `/form-analysis/user/${userId}`,
      { params: { limit } }
    );
    return response.data.data;
  }

  /**
   * Get user's form analysis statistics
   */
  async getUserStats(userId: string): Promise<FormAnalysisStats> {
    const response = await this.api.get<FormAnalysisStatsResponse>(
      `/form-analysis/user/${userId}/stats`
    );
    return response.data.data;
  }

  /**
   * Search form analyses with filters
   */
  async searchAnalyses(filters: {
    userId?: string;
    exerciseType?: string;
    minScore?: number;
    maxScore?: number;
    limit?: number;
  }): Promise<FormAnalysis[]> {
    const response = await this.api.get<FormAnalysesListResponse>('/form-analysis', {
      params: filters
    });
    return response.data.data;
  }

  /**
   * Update form analysis
   */
  async updateAnalysis(
    id: string,
    updates: Partial<CreateFormAnalysisDTO>
  ): Promise<FormAnalysis> {
    const response = await this.api.put<FormAnalysisResponse>(
      `/form-analysis/${id}`,
      updates
    );
    return response.data.data;
  }

  /**
   * Delete form analysis
   */
  async deleteAnalysis(id: string): Promise<void> {
    await this.api.delete(`/form-analysis/${id}`);
  }
}

// Response types
interface FormAnalysisResponse {
  success: boolean;
  data: FormAnalysis;
}

interface FormAnalysesListResponse {
  success: boolean;
  data: FormAnalysis[];
  count: number;
}

interface FormAnalysisStatsResponse {
  success: boolean;
  data: FormAnalysisStats;
}

// Singleton instance
const instance = new FormAnalysisApiService();

export const formAnalysisApi = instance;
export default formAnalysisApi;
