import axios from 'axios';
import { BaseProvider } from './BaseProvider';
import { AiRequestType, FallbackResponse, AiAlertResponse, AiInputData } from '../types';
import { DecisionContext, DecisionOutput } from '../../decisionPromptTemplate';
import { UserProfile } from '../../../models/User';
import { executeAiOperationWithReconnection, initializeAiServiceMonitoring } from '../../../utils/aiReconnectionHandler';
import { executeAxiosWithRetry } from '../../../utils/retryHandler';
import { logger } from '../../../utils/logger';
import { alertService, AlertType, AlertSeverity } from '../../alertService';
import { withConditionalCache } from '../../../utils/cacheService';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';

const AI_SERVICE_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  factor: 2,
  jitter: true,
  timeout: 30000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH']
};

export class MicroserviceProvider extends BaseProvider {
  constructor() {
    super();
    // Initialize monitoring only if this provider is active
    initializeAiServiceMonitoring();
  }

  getProviderName(): string {
    return 'MicroserviceProvider';
  }

  async processRequest(type: AiRequestType, payload: Record<string, unknown>): Promise<unknown> {
    switch (type) {
    case 'alert_prediction':
      return this.predictAlert(payload as any);
    case 'decision_generation':
      return this.generateDecision(payload as any);
    default:
      throw new Error(`Unsupported AI request type: ${type}`);
    }
  }

  async predictAlert(data: UserProfile): Promise<FallbackResponse> {
    const aiInput: AiInputData = this.prepareAiInput(data);
    
    try {
      const startTime = Date.now();

      const aiResponse = await withConditionalCache<AiAlertResponse>(
        '/ai/alert',
        {
          name: data.name,
          email: data.email,
          stats: data.stats,
          keystoneHabits: data.keystoneHabits
        },
        async () => {
          const response = await executeAiOperationWithReconnection(() => {
            return executeAxiosWithRetry<any>(
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

          return response as AiAlertResponse;
        },
        'ai/alert',
        ['ai/alert', 'ai/alert/microservice'],
        undefined,
        result => !result.fallback_used && !result.error
      );

      const processingTime = Date.now() - startTime;
      logger.debug('AI prediction processed', { 
        context: 'MicroserviceProvider', 
        metadata: { processingTime } 
      });

      if (typeof aiResponse.alerta_roja === 'boolean' && 
          typeof aiResponse.processing_time_ms === 'number') {
        return {
          alerta_roja: aiResponse.alerta_roja,
          processing_time_ms: aiResponse.processing_time_ms,
          fallback_used: aiResponse.fallback_used || false
        };
      } else {
        logger.warn('Invalid response structure from AI service', {
          context: 'MicroserviceProvider',
          metadata: { aiResponse }
        });
      }

      return this.applyFallback('Invalid response format from AI service');
    } catch (error) {
      this.handleError('predictAlert', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.applyFallback(`AI service error: ${errorMessage}`);
    }
  }

  async generateDecision(context: DecisionContext): Promise<DecisionOutput | null> {
    try {
      const response = await executeAiOperationWithReconnection(() => {
        return executeAxiosWithRetry<any>(
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

      return response as DecisionOutput;
    } catch (error) {
      this.handleError('generateDecision', error);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await executeAiOperationWithReconnection(() => {
        return executeAxiosWithRetry<any>(
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

      return response.status === 'healthy';
    } catch (error) {
      this.handleError('checkHealth', error);
      return false;
    }
  }

  private applyFallback(errorMessage: string): FallbackResponse {
    logger.warn('AI service fallback activated', {
      context: 'MicroserviceProvider',
      metadata: { errorMessage }
    });
    
    alertService.createAlert(
      AlertType.AI_SERVICE_FAILURE,
      AlertSeverity.HIGH,
      `AI service fallback activated: ${errorMessage}`,
      'aiService',
      { error: errorMessage }
    );
    
    return {
      alerta_roja: false,
      processing_time_ms: 0,
      fallback_used: true,
      error: errorMessage
    };
  }
}
