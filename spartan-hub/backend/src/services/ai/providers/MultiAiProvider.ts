import { IAiProvider } from '../interfaces';
import { AiRequestType, FallbackResponse } from '../types';
import { DecisionContext, DecisionOutput } from '../../decisionPromptTemplate';
import { UserProfile } from '../../../models/User';
import { logger } from '../../../utils/logger';
import { RateLimiter } from '../../../utils/rateLimiter';
import { apmService } from '../../../utils/apmService';
import { AiProviderId, getAiConfig, getProviderOrder } from '../../../config/aiConfig';
import { MicroserviceProvider } from './MicroserviceProvider';
import { GroqProvider } from './GroqProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { GoogleAiProvider } from './GoogleAiProvider';
import { executeWithRetry } from '../../../utils/retryHandler';

type ProviderEntry = {
  id: AiProviderId;
  instance: IAiProvider;
  limiter: RateLimiter;
};

export class MultiAiProvider implements IAiProvider {
  private providers: ProviderEntry[];

  constructor() {
    const config = getAiConfig();
    const order = getProviderOrder();

    this.providers = order
      .filter(id => config.providers[id].enabled)
      .map(id => ({
        id,
        instance: this.createProviderInstance(id),
        limiter: this.createRateLimiter(id, config.providers[id].rateLimitPerMinute)
      }));

    if (this.providers.length === 0) {
      this.providers.push({
        id: 'microservice',
        instance: new MicroserviceProvider(),
        limiter: this.createRateLimiter('microservice', config.providers.microservice.rateLimitPerMinute)
      });
    }
  }

  getProviderName(): string {
    return 'MultiAiProvider';
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
    const errors: string[] = [];
    const config = getAiConfig();

    for (const entry of this.providers) {
      const limiterResult = entry.limiter.checkRateLimit('global');
      if (!limiterResult.isAllowed) {
        logger.warn('AI provider rate limit exceeded', {
          context: 'MultiAiProvider',
          metadata: {
            provider: entry.id,
            retryAfter: limiterResult.retryAfter
          }
        });
        errors.push(`Rate limit exceeded for ${entry.id}`);
        continue;
      }

      const startTime = Date.now();
      try {
        const response = await executeWithRetry(
          async () => entry.instance.predictAlert(data),
          {
            maxRetries: 2,
            initialDelay: 500,
            maxDelay: 4000,
            factor: 2,
            jitter: true,
            timeout: config.providers[entry.id].timeoutMs,
            retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH']
          }
        );

        const duration = Date.now() - startTime;
        this.recordMetrics(entry.id, duration, 'success');

        if (typeof response.alerta_roja === 'boolean' && typeof response.processing_time_ms === 'number') {
          return response;
        }

        errors.push(`Invalid response from ${entry.id}`);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordMetrics(entry.id, duration, 'error');
        const message = error instanceof Error ? error.message : String(error);
        logger.error('AI provider error during alert prediction', {
          context: 'MultiAiProvider',
          metadata: { provider: entry.id, error: message }
        });
        errors.push(`${entry.id}: ${message}`);
      }
    }

    const errorMessage = errors.join(' | ') || 'No AI providers available';

    return {
      alerta_roja: false,
      processing_time_ms: 0,
      fallback_used: true,
      error: errorMessage
    };
  }

  async generateDecision(context: DecisionContext): Promise<DecisionOutput | null> {
    const errors: string[] = [];
    const config = getAiConfig();

    for (const entry of this.providers) {
      const limiterResult = entry.limiter.checkRateLimit('global');
      if (!limiterResult.isAllowed) {
        logger.warn('AI provider rate limit exceeded', {
          context: 'MultiAiProvider',
          metadata: {
            provider: entry.id,
            retryAfter: limiterResult.retryAfter
          }
        });
        errors.push(`Rate limit exceeded for ${entry.id}`);
        continue;
      }

      const startTime = Date.now();
      try {
        const result = await executeWithRetry(
          async () => entry.instance.generateDecision(context),
          {
            maxRetries: 2,
            initialDelay: 500,
            maxDelay: 4000,
            factor: 2,
            jitter: true,
            timeout: config.providers[entry.id].timeoutMs,
            retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH']
          }
        );

        const duration = Date.now() - startTime;
        this.recordMetrics(entry.id, duration, result ? 'success' : 'error');

        if (result) {
          return result;
        }

        errors.push(`Null decision from ${entry.id}`);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordMetrics(entry.id, duration, 'error');
        const message = error instanceof Error ? error.message : String(error);
        logger.error('AI provider error during decision generation', {
          context: 'MultiAiProvider',
          metadata: { provider: entry.id, error: message }
        });
        errors.push(`${entry.id}: ${message}`);
      }
    }

    logger.error('All AI providers failed for decision generation', {
      context: 'MultiAiProvider',
      metadata: { errors }
    });

    return null;
  }

  async checkHealth(): Promise<boolean> {
    for (const entry of this.providers) {
      try {
        const healthy = await entry.instance.checkHealth();
        if (healthy) {
          return true;
        }
      } catch {
      }
    }
    return false;
  }

  private createProviderInstance(id: AiProviderId): IAiProvider {
    switch (id) {
    case 'groq':
      return new GroqProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'google':
      return new GoogleAiProvider();
    case 'microservice':
    default:
      return new MicroserviceProvider();
    }
  }

  private createRateLimiter(id: AiProviderId, rateLimitPerMinute: number): RateLimiter {
    const maxRequests = Math.max(1, rateLimitPerMinute);
    const windowMs = 60000;
    return new RateLimiter(maxRequests, windowMs, `ai_${id}`);
  }

  private recordMetrics(id: AiProviderId, durationMs: number, status: string): void {
    const model = this.getModelName(id);
    apmService.recordAiApiCall(id, model, status, durationMs);
    logger.info('AI provider call completed', {
      context: 'MultiAiProvider',
      metadata: { provider: id, model, status, durationMs }
    });
  }

  private getModelName(id: AiProviderId): string {
    switch (id) {
    case 'groq':
      return process.env.GROQ_MODEL || 'default';
    case 'openai':
      return process.env.OPENAI_MODEL || 'default';
    case 'anthropic':
      return process.env.ANTHROPIC_MODEL || 'default';
    case 'google':
      return process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    case 'microservice':
    default:
      return 'ai-microservice';
    }
  }
}

