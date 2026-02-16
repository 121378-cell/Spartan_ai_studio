import { useState, useCallback } from 'react';
import { BackendApiService, type TrainingRecommendationResult, type TrainingRecommendationRequest, type TrainingReadinessStatus, type TrainingPlanFeedback } from '../services/api';
import { logger } from '../utils/logger';

export function useTrainingRecommendations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<TrainingRecommendationResult | null>(null);
  const [readinessStatus, setReadinessStatus] = useState<TrainingReadinessStatus | null>(null);

  const generateRecommendations = useCallback(async (
    userId: string,
    request: TrainingRecommendationRequest = {}
  ): Promise<TrainingRecommendationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Generating training recommendations', {
        context: 'useTrainingRecommendations',
        metadata: {
          hasTrainingHistory: Boolean(request.trainingHistory),
          hasPreferences: Boolean(request.preferences),
        },
      });

      const result = await BackendApiService.generateTrainingRecommendations(userId, request);
      setRecommendations(result);

      logger.info('Training recommendations generated', {
        context: 'useTrainingRecommendations',
        metadata: {
          days: result.weekPlan.length,
          focusAreas: result.focusAreas.length,
          confidence: result.confidence,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate recommendations';
      setError(errorMessage);
      logger.error('Error generating training recommendations', {
        context: 'useTrainingRecommendations',
        metadata: { error: errorMessage },
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const explainRecommendations = useCallback(async (
    userId: string,
    request: TrainingRecommendationRequest = {}
  ): Promise<TrainingRecommendationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Getting training recommendations explanation', {
        context: 'useTrainingRecommendations',
      });

      const result = await BackendApiService.explainTrainingRecommendations(userId, request);
      setRecommendations(result);

      logger.info('Training recommendations explanation received', {
        context: 'useTrainingRecommendations',
        metadata: {
          explanationsCount: result.focusAreas.length,
        },
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get explanation';
      setError(errorMessage);
      logger.error('Error getting training recommendations explanation', {
        context: 'useTrainingRecommendations',
        metadata: { error: errorMessage },
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getReadinessStatus = useCallback(async (
    userId: string
  ): Promise<TrainingReadinessStatus> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Getting training readiness status', {
        context: 'useTrainingRecommendations',
      });

      const status = await BackendApiService.getTrainingReadinessStatus(userId);
      setReadinessStatus(status);

      logger.info('Training readiness status received', {
        context: 'useTrainingRecommendations',
        metadata: {
          readinessScore: status.readinessScore,
          status: status.status,
        },
      });

      return status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get readiness status';
      setError(errorMessage);
      logger.error('Error getting training readiness status', {
        context: 'useTrainingRecommendations',
        metadata: { error: errorMessage },
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitFeedback = useCallback(async (
    userId: string,
    feedback: TrainingPlanFeedback
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info('Submitting training plan feedback', {
        context: 'useTrainingRecommendations',
        metadata: {
          planId: feedback.planId,
          completed: feedback.completed,
          difficulty: feedback.difficulty,
        },
      });

      await BackendApiService.submitTrainingPlanFeedback(userId, feedback);

      logger.info('Training plan feedback submitted successfully', {
        context: 'useTrainingRecommendations',
        metadata: { planId: feedback.planId },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback';
      setError(errorMessage);
      logger.error('Error submitting training plan feedback', {
        context: 'useTrainingRecommendations',
        metadata: { error: errorMessage },
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    recommendations,
    readinessStatus,
    generateRecommendations,
    explainRecommendations,
    getReadinessStatus,
    submitFeedback,
  };
}
