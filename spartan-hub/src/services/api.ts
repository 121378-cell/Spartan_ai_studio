import { HttpService } from './httpService';
import type {
  UserProfile,
  Routine,
  KeystoneHabit
} from '../types';
import { logger } from '../utils/logger';

// Interface for training session
export interface TrainingSession {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  type: 'strength' | 'cardio' | 'endurance' | 'recovery' | 'flexibility' | 'hiit' | 'rest';
  duration: number; // minutes
  intensity: number; // 1-10 scale
  focus: string[]; // muscle groups or energy systems
  specificExercises?: string[];
  notes?: string;
}

// Interface for training recommendation result
export interface TrainingRecommendationResult {
  weekPlan: TrainingSession[];
  reasoning: string[];
  focusAreas: string[];
  expectedOutcomes: {
    performanceImprovement: number; // 0-100 percentage
    fatigueLevel: number; // 0-100 (higher = more fatigue)
    injuryRisk: number; // 0-100
  };
  adjustments: {
    recommended: boolean;
    reason?: string;
    suggestion?: string;
  };
  confidence: number; // 0-1
  mlSource: boolean; // true if from ML model
  personalizedTips: string[];
}

// Interface for training recommendation request
export interface TrainingRecommendationRequest {
  trainingHistory?: Array<{
    dayOfWeek: string;
    type: string;
    duration: number;
    intensity: number;
    focus: string[];
  }>;
  preferences?: {
    preferredTypes: string[];
    daysPerWeek: number;
    targetIntensity: number;
  };
}

// Interface for training plan feedback
export interface TrainingPlanFeedback {
  planId: string;
  completed: boolean;
  difficulty?: number; // 1-10
  effectiveness?: number; // 1-10
  feedback?: string;
}

// Interface for training readiness status
export interface TrainingReadinessStatus {
  readinessScore: number;
  status: 'low' | 'moderate' | 'high';
  factors: {
    hrv: number;
    sleep: number;
    recovery: number;
    trainingLoad: number;
  };
  recommendation: string;
  timestamp: string;
}

// Interface for plan assignment
interface PlanAssignment {
  id: string;
  userId: string;
  routineId: string;
  startDate: string;
  assignedAt: string;
}

// Interface for commitment tracking
interface Commitment {
  id: string;
  userId: string;
  routineId: string;
  commitmentLevel: number;
  notes?: string;
  createdAt: string;
}

// Interface for Bio-Physiological state
export interface BioState {
  nervousSystemLoad: number;
  readinessScore: number;
  recoveryQuality: number;
  stressLevel: number;
  sleepScore: number;
  hrvStatus: 'optimal' | 'low' | 'high';
  recommendations: string[];
  lastUpdate: string;
}

// Interface for Coach Vitalis Alert
export interface VitalisAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  isViewed: boolean;
  createdAt: string;
}

// Interface for Evidence-based Recommendation
export interface Recommendation {
  id: string;
  actionType: string;
  title: string;
  description: string;
  evidence: Array<{
    source: string;
    excerpt: string;
  }>;
  confidence: number;
}

// Interface for AI alert response
interface AiAlertResponse {
  alerta_roja: boolean;
  processing_time_ms: number;
  fallback_used?: boolean;
  error?: string;
}

/**
 * Backend API Service
 * Handles all communication with the local backend server
 */
export class BackendApiService {
  /**
   * Assign a plan to a user
   * @param userId - User ID
   * @param routineId - Routine ID
   * @param startDate - Start date for the plan
   */
  static async assignPlan(userId: string, routineId: string, startDate: string): Promise<PlanAssignment> {
    try {
      const response = await HttpService.post<PlanAssignment>('/plan/asignar', {
        userId,
        routineId,
        startDate
      });
      return response.data;
    } catch (error) {
      logger.error('Error assigning plan', {
        context: 'api-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new Error('Failed to assign plan');
    }
  }

  /**
   * Get all plans assigned to a user
   * @param userId - User ID
   */
  static async getUserPlans(userId: string): Promise<PlanAssignment[]> {
    try {
      const response = await HttpService.get<PlanAssignment[]>(`/plan/asignar/${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting user plans', {
        context: 'api-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new Error('Failed to get user plans');
    }
  }

  /**
   * Track user commitment to a plan
   * @param userId - User ID
   * @param routineId - Routine ID
   * @param commitmentLevel - Commitment level (1-10)
   * @param notes - Optional notes
   */
  static async trackCommitment(
    userId: string,
    routineId: string,
    commitmentLevel: number,
    notes?: string
  ): Promise<Commitment> {
    try {
      const response = await HttpService.post<Commitment>('/plan/compromiso', {
        userId,
        routineId,
        commitmentLevel,
        notes
      });
      return response.data;
    } catch (error) {
      logger.error('Error tracking commitment', {
        context: 'api-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new Error('Failed to track commitment');
    }
  }

  /**
   * Get commitment for a specific user and routine
   * @param userId - User ID
   * @param routineId - Routine ID
   */
  static async getCommitment(userId: string, routineId: string): Promise<Commitment> {
    try {
      const response = await HttpService.get<Commitment>(`/plan/compromiso/${userId}/${routineId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting commitment', {
        context: 'api-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new Error('Failed to get commitment');
    }
  }

  /**
   * Get Coach Vitalis bio-physiological state for a user
   * @param userId - User ID
   * @param date - Optional date (YYYY-MM-DD)
   */
  static async getBioState(userId: string, date?: string): Promise<BioState> {
    try {
      const url = `/vitalis/bio-state/${userId}${date ? `?date=${date}` : ''}`;
      const response = await HttpService.get<{ success: boolean; data: BioState }>(url);
      return response.data.data;
    } catch (error) {
      logger.error('Error getting bio state', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw new Error('Failed to get bio state');
    }
  }

  /**
   * Generate personalized 7-day training plan
   * @param userId - User ID
   * @param request - Training recommendation request
   */
  static async generateTrainingRecommendations(
    userId: string,
    request: TrainingRecommendationRequest = {}
  ): Promise<TrainingRecommendationResult> {
    try {
      const response = await HttpService.post<{ success: boolean; data: TrainingRecommendationResult }>(
        '/api/ml/training-recommendations',
        request
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error generating training recommendations', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw new Error('Failed to generate training recommendations');
    }
  }

  /**
   * Get detailed explanation of training plan
   * @param userId - User ID
   * @param request - Training recommendation request
   */
  static async explainTrainingRecommendations(
    userId: string,
    request: TrainingRecommendationRequest = {}
  ): Promise<TrainingRecommendationResult> {
    try {
      const response = await HttpService.post<{ success: boolean; data: TrainingRecommendationResult }>(
        '/api/ml/training-recommendations/explain',
        request
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error explaining training recommendations', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw new Error('Failed to explain training recommendations');
    }
  }

  /**
   * Get current training readiness status
   * @param userId - User ID
   */
  static async getTrainingReadinessStatus(userId: string): Promise<TrainingReadinessStatus> {
    try {
      const response = await HttpService.get<{ success: boolean; data: TrainingReadinessStatus }>(
        '/api/ml/training-recommendations/current-status'
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error getting training readiness status', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw new Error('Failed to get training readiness status');
    }
  }

  /**
   * Submit training plan feedback
   * @param userId - User ID
   * @param feedback - Training plan feedback
   */
  static async submitTrainingPlanFeedback(
    userId: string,
    feedback: TrainingPlanFeedback
  ): Promise<void> {
    try {
      await HttpService.post('/api/ml/training-recommendations/feedback', feedback);
    } catch (error) {
      logger.error('Error submitting training plan feedback', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw new Error('Failed to submit training plan feedback');
    }
  }

  /**
   * Get Coach Vitalis proactive alerts for a user
   * @param userId - User ID
   */
  static async getVitalisAlerts(userId: string): Promise<VitalisAlert[]> {
    try {
      const response = await HttpService.get<{ success: boolean; data: { alerts: VitalisAlert[] } }>(`/vitalis/alerts/${userId}`);
      return response.data.data.alerts;
    } catch (error) {
      logger.error('Error getting Vitalis alerts', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      return [];
    }
  }

  /**
   * Get evidence-based recommendation for a user
   * @param userId - User ID
   * @param decisionType - Type of coaching decision
   * @param context - Biometric context
   */
  static async getVitalisRecommendation(
    userId: string,
    decisionType: string,
    context: Record<string, unknown>
  ): Promise<Recommendation> {
    try {
      const response = await HttpService.post<{ success: boolean; data: Recommendation }>('/vitalis/rag/recommendation', {
        decisionType,
        context
      });
      return response.data.data;
    } catch (error) {
      logger.error('Error getting Vitalis recommendation', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw new Error('Failed to get recommendation');
    }
  }

  /**
   * Acknowledge a Vitalis alert
   * @param userId - User ID
   * @param alertId - Alert ID
   */
  static async acknowledgeAlert(userId: string, alertId: string): Promise<void> {
    try {
      await HttpService.post(`/vitalis/acknowledge-alert/${userId}/${alertId}`, {
        followedAction: true
      });
    } catch (error) {
      logger.error('Error acknowledging alert', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  }

  /**
   * Get AI alert prediction for a user
   * @param userId - User ID
   */
  static async getAiAlert(userId: string): Promise<AiAlertResponse> {
    try {
      const response = await HttpService.post<AiAlertResponse>(`/ai/alert/${userId}`);
      return response.data;
    } catch (error) {
      logger.error('Error getting AI alert', {
        context: 'api-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Fallback response to ensure continuous functionality
      return {
        alerta_roja: false,
        processing_time_ms: 0,
        fallback_used: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if the backend services are healthy
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const response = await HttpService.get<{ status: string }>('/health');
      return response.status === 200 && response.data.status === 'OK';
    } catch (error) {
      logger.error('Backend health check failed', {
        context: 'api-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  }

  /**
   * Check if the AI service is healthy
   */
  static async aiHealthCheck(): Promise<boolean> {
    try {
      const response = await HttpService.get<{ aiServiceHealthy: boolean }>('/ai/health');
      return response.status === 200 && response.data.aiServiceHealthy;
    } catch (error) {
      logger.error('AI health check failed', {
        context: 'api-service',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return false;
    }
  }

  /**
   * Save form analysis result
   * @param data - Form analysis result data
   */
  static async saveFormAnalysis(data: any): Promise<any> {
    try {
      const response = await HttpService.post('/api/form-analysis', data);
      return response.data;
    } catch (error) {
      logger.error('Error saving form analysis', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw new Error('Failed to save form analysis');
    }
  }

  /**
   * Get historical form trends for a user
   * @param userId - User ID
   * @param days - Number of days to look back
   */
  static async getUserFormTrends(userId: string, days: number = 30): Promise<any[]> {
    try {
      const response = await HttpService.get<{ success: boolean; data: any[] }>(
        `/api/form-analysis/sessions/user/${userId}?days=${days}`
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error getting form trends', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      return [];
    }
  }

  /**
   * Get specific form analysis session details
   * @param sessionId - Session ID
   */
  static async getFormSessionDetails(sessionId: number): Promise<any> {
    try {
      const response = await HttpService.get<{ success: boolean; data: any }>(
        `/api/form-analysis/sessions/${sessionId}/details`
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error getting form session details', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get aggregated exercise statistics for a user
   * @param userId - User ID
   */
  static async getUserExerciseStats(userId: string): Promise<any[]> {
    try {
      const response = await HttpService.get<{ success: boolean; data: any[] }>(
        `/api/form-analysis/stats/user/${userId}`
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error getting user exercise stats', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      return [];
    }
  }

  /**
   * Get comprehensive ML predictions for a user
   * @param userId - User ID
   * @param date - Optional date (YYYY-MM-DD)
   */
  static async getComprehensivePredictions(userId: string, date?: string): Promise<any> {
    try {
      const url = `/api/ml-forecasting/comprehensive/${userId}${date ? `?date=${date}` : ''}`;
      const response = await HttpService.get<{ success: boolean; data: any }>(url);
      return response.data.data;
    } catch (error) {
      logger.error('Error getting comprehensive ML predictions', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get injury probability for a user
   * @param userId - User ID
   * @param date - Optional date
   */
  static async getInjuryProbability(userId: string, date?: string): Promise<any> {
    try {
      const url = `/api/ml-forecasting/injury-probability/${userId}${date ? `?date=${date}` : ''}`;
      const response = await HttpService.get<{ success: boolean; data: any }>(url);
      return response.data.data;
    } catch (error) {
      logger.error('Error getting injury probability', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get all athletes assigned to the current coach
   */
  static async getCoachAthletes(): Promise<any[]> {
    try {
      const response = await HttpService.get<{ success: boolean; data: any[] }>('/api/coach/athletes');
      return response.data.data;
    } catch (error) {
      logger.error('Error getting coach athletes', {
        context: 'api-service',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      return [];
    }
  }
}

export default BackendApiService;

