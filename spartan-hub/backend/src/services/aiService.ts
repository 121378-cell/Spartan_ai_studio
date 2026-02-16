import axios from 'axios';
import { executeAiOperationWithReconnection, isAiServiceReady, initializeAiServiceMonitoring } from '../utils/aiReconnectionHandler';
import { executeAxiosWithRetry } from '../utils/retryHandler';
import { UserProfile } from '../models/User';
import { structuredDecisionPrompt, DecisionContext, DecisionOutput } from './decisionPromptTemplate';
import { alertService, AlertType, AlertSeverity } from '../services/alertService';
import { logger } from '../utils/logger';

// Initialize AI service monitoring
initializeAiServiceMonitoring();

// Interface for the AI input data
interface AiInputData {
  recovery_score: number;    // 0-100 scale
  habit_adherence: number;   // 1-5 scale
  stress_level: number;      // 1-10 scale
  sleep_quality: number;     // 1-5 scale
  workout_frequency: number; // 0-7 times per week
}

// Interface for the AI response
interface AiAlertResponse {
  alerta_roja: boolean;
  processing_time_ms: number;
  fallback_used?: boolean;
  error?: string | null;
}

// Interface for the health check response
interface HealthCheckResponse {
  status: string;
  ollama_available: boolean;
  model?: string;
  [key: string]: unknown; // Allow additional properties
}

// Interface for the fallback response
interface FallbackResponse {
  alerta_roja: boolean;
  processing_time_ms: number;
  fallback_used: boolean;
  error?: string;
}

// AI microservice URL - using environment variable or default
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const OLLAMA_MODEL = 'gemma2:2b';

// Retry options for AI service calls
const AI_SERVICE_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  factor: 2,
  jitter: true,
  timeout: 30000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH']
};

/**
 * @param payload Request data
 * @returns Promise with the AI response
 */
export async function processAiRequest(
  type: 'alert_prediction' | 'decision_generation',
  payload: Record<string, unknown>
): Promise<unknown> {
  switch (type) {
  case 'alert_prediction':
    return await CheckInferenciaIA(payload as any);
  case 'decision_generation':
    return await GenerateStructuredDecision(payload as any);
  default:
    throw new Error(`Unsupported AI request type: ${type}`);
  }
}

/**
 * CheckInferenciaIA function - Calls the AI microservice to get an alert prediction
 * 
 * @param data - User profile data to analyze
 * @returns Alert prediction
 */
export async function CheckInferenciaIA(data: UserProfile): Promise<FallbackResponse> {
  // Prepare the input data for the AI model
  const aiInput: AiInputData = prepareAiInput(data);
  
  try {
    // Record start time for processing time calculation
    const startTime = Date.now();

    // Execute with reconnection and retry
    const response = await executeAiOperationWithReconnection(async () => {
      return await executeAxiosWithRetry<any>(
        axios,
        {
          method: 'POST',
          url: `${AI_SERVICE_URL}/predict_alert`,
          data: aiInput,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        },
        AI_SERVICE_RETRY_OPTIONS
      );
    });

    if (!response) {
      throw new Error('Failed to get response from AI service');
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Parse the response to extract the JSON output
    // The response is the actual data, not wrapped in a data property
    const aiResponse: AiAlertResponse = response;
    
    // Validate that the response has the required fields
    if (typeof aiResponse.alerta_roja === 'boolean' && 
        typeof aiResponse.processing_time_ms === 'number') {
      return {
        alerta_roja: aiResponse.alerta_roja,
        processing_time_ms: aiResponse.processing_time_ms,
        fallback_used: aiResponse.fallback_used || false
      };
    } else {
      // Log invalid response structure
      logger.warn('Invalid response structure from AI service', {
        context: 'aiService',
        metadata: { aiResponse }
      });
    }

    // If we get here, there was an issue with the response format
    // Apply fallback mechanism
    logger.warn('Applying fallback due to invalid response from AI service', {
      context: 'aiService'
    });
    return applyFallback('Invalid response format from AI service');
  } catch (error) {
    // Log the error for debugging purposes
    logger.error('AI service error in CheckInferenciaIA', {
      context: 'aiService',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    
    // Apply fallback mechanism
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return applyFallback(`AI service error: ${errorMessage}`);
  }
}

/**
 * Apply fallback mechanism for AI service failures
 * 
 * @param errorMessage - Error message to log
 * @returns Fallback response with alerta_roja set to false
 */
function applyFallback(errorMessage: string): FallbackResponse {
  logger.warn('AI service fallback activated', {
    context: 'aiService',
    metadata: { errorMessage }
  });
  
  // Create alert for AI service failure
  alertService.createAlert(
    AlertType.AI_SERVICE_FAILURE,
    AlertSeverity.HIGH,
    `AI service fallback activated: ${errorMessage}`,
    'aiService',
    {
      error: errorMessage
    }
  );
  
  return {
    alerta_roja: false, // Assume no alert to maintain functionality
    processing_time_ms: 0,
    fallback_used: true,
    error: errorMessage
  };
}

/**
 * GenerateStructuredDecision function - Calls the AI microservice to generate a structured decision
 * based on the synergistic score and weekly data
 * 
 * @param context - Decision context including weekly score, cause, and synergistic score
 * @returns Structured decision with updated weekly score, tactical justification, and red alert flag
 */
export async function GenerateStructuredDecision(context: DecisionContext): Promise<DecisionOutput | null> {
  try {
    // Execute with reconnection and retry
    const response = await executeAiOperationWithReconnection(async () => {
      return await executeAxiosWithRetry<any>(
        axios,
        {
          method: 'POST',
          url: `${AI_SERVICE_URL}/generate_decision`,
          data: context,
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json'
          }
        },
        AI_SERVICE_RETRY_OPTIONS
      );
    });

    if (!response) {
      throw new Error('Failed to get response from AI service');
    }

    // The response is the actual data, not wrapped in a data property
    const decisionOutput: DecisionOutput = response;
    return decisionOutput;
  } catch (error) {
    // Log the error for debugging purposes
    logger.error('AI service error in GenerateStructuredDecision', {
      context: 'aiService',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return null;
  }
}

/**
 * Prepare the input data for the AI model based on user profile
 * 
 * @param data - User profile data
 * @returns Formatted input data for the AI model
 */
function prepareAiInput(data: UserProfile): AiInputData {
  // Extract relevant data from user profile
  // These are placeholder values - in a real implementation, you would
  // calculate these values based on the user's actual data
  
  // Recovery score: 0-100 scale (higher is better)
  const recoveryScore = data.stats ? 
    Math.min(100, Math.max(0, (data.stats.currentStreak / 7) * 100)) : 50;
  
  // Habit adherence: 1-5 scale (higher is better)
  const habitAdherence = data.keystoneHabits && data.keystoneHabits.length > 0 ?
    Math.min(5, Math.max(1, data.keystoneHabits[0].currentStreak / 2)) : 3;
  
  // Stress level: 1-10 scale (higher is worse)
  // This would typically come from user input or calculated from other metrics
  const stressLevel = 5;
  
  // Sleep quality: 1-5 scale (higher is better)
  // This would typically come from user input or calculated from other metrics
  const sleepQuality = 3;
  
  // Workout frequency: 0-7 times per week
  const workoutFrequency = data.stats ? 
    Math.min(7, data.stats.totalWorkouts / 4) : 3;
  
  return {
    recovery_score: recoveryScore,
    habit_adherence: habitAdherence,
    stress_level: stressLevel,
    sleep_quality: sleepQuality,
    workout_frequency: workoutFrequency
  };
}

/**
 * Health check for the AI service
 * 
 * @returns Boolean indicating if the AI service is available
 */
export async function checkAiServiceHealth(): Promise<boolean> {
  try {
    // Execute with reconnection and retry
    const response = await executeAiOperationWithReconnection(async () => {
      return await executeAxiosWithRetry<any>(
        axios,
        {
          method: 'GET',
          url: `${AI_SERVICE_URL}/health`,
          timeout: 3000
        },
        {
          maxRetries: 2,
          initialDelay: 500,
          maxDelay: 2000,
          factor: 2,
          jitter: true,
          timeout: 3000,
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND']
        }
      );
    });

    if (!response) {
      return false;
    }

    // The response is the actual data, not wrapped in a data property
    return response.status === 'healthy';
  } catch (error) {
    logger.error('AI service health check failed', {
      context: 'aiService',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    return false;
  }
}

/**
 * Health check for the Ollama service (deprecated - now handled by AI microservice)
 * 
 * @returns Boolean indicating if the Ollama service is available
 */
export async function checkOllamaServiceHealth(): Promise<boolean> {
  // This function is deprecated as the AI microservice now handles Ollama connectivity
  // We'll delegate to the main AI service health check
  return checkAiServiceHealth();
}