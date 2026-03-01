/**
 * useFormAnalysisApi Hook
 * Phase A: Video Form Analysis MVP
 * 
 * Connects Form Analysis components to backend API
 */

import { useState, useCallback } from 'react';
import { formAnalysisApi, FormAnalysis, CreateFormAnalysisDTO, FormAnalysisStats } from '../services/formAnalysisApi';
import { logger } from '../utils/logger';

interface UseFormAnalysisApiResult {
  // State
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSaved: FormAnalysis | null;
  stats: FormAnalysisStats | null;
  
  // Actions
  saveAnalysis: (data: CreateFormAnalysisDTO) => Promise<FormAnalysis>;
  getUserAnalyses: (userId: string, limit?: number) => Promise<FormAnalysis[]>;
  getUserStats: (userId: string) => Promise<FormAnalysisStats>;
  deleteAnalysis: (id: string) => Promise<void>;
  clearError: () => void;
}

export function useFormAnalysisApi(): UseFormAnalysisApiResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<FormAnalysis | null>(null);
  const [stats, setStats] = useState<FormAnalysisStats | null>(null);

  /**
   * Save form analysis to backend
   */
  const saveAnalysis = useCallback(async (
    data: CreateFormAnalysisDTO
  ): Promise<FormAnalysis> => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await formAnalysisApi.saveAnalysis(data);
      setLastSaved(result);
      logger.info('Form analysis saved', {
        context: 'form-analysis-hook',
        metadata: {
          id: result.id,
          formScore: result.formScore,
          exerciseType: result.exerciseType
        }
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save analysis';
      setError(errorMessage);
      logger.error('Failed to save form analysis', {
        context: 'form-analysis-hook',
        metadata: { error: errorMessage }
      });
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  /**
   * Get user's form analyses
   */
  const getUserAnalyses = useCallback(async (
    userId: string,
    limit: number = 50
  ): Promise<FormAnalysis[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const analyses = await formAnalysisApi.getUserAnalyses(userId, limit);
      logger.debug('Retrieved user analyses', {
        context: 'form-analysis-hook',
        metadata: { count: analyses.length }
      });
      return analyses;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analyses';
      setError(errorMessage);
      logger.error('Failed to load analyses', {
        context: 'form-analysis-hook',
        metadata: { error: errorMessage }
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get user's statistics
   */
  const getUserStats = useCallback(async (
    userId: string
  ): Promise<FormAnalysisStats> => {
    setIsLoading(true);
    setError(null);

    try {
      const userStats = await formAnalysisApi.getUserStats(userId);
      setStats(userStats);
      logger.debug('Retrieved user stats', {
        context: 'form-analysis-hook',
        metadata: {
          totalAnalyses: userStats.totalAnalyses,
          averageScore: userStats.averageScore
        }
      });
      return userStats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stats';
      setError(errorMessage);
      logger.error('Failed to load stats', {
        context: 'form-analysis-hook',
        metadata: { error: errorMessage }
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Delete form analysis
   */
  const deleteAnalysis = useCallback(async (
    id: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await formAnalysisApi.deleteAnalysis(id);
      logger.info('Deleted form analysis', {
        context: 'form-analysis-hook',
        metadata: { id }
      });
      
      // Clear last saved if it matches deleted ID
      if (lastSaved?.id === id) {
        setLastSaved(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete analysis';
      setError(errorMessage);
      logger.error('Failed to delete analysis', {
        context: 'form-analysis-hook',
        metadata: { error: errorMessage }
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [lastSaved]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    isSaving,
    error,
    lastSaved,
    stats,
    saveAnalysis,
    getUserAnalyses,
    getUserStats,
    deleteAnalysis,
    clearError
  };
}

export default useFormAnalysisApi;
