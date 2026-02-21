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
import { alertService, AlertType, AlertSeverity } from '../../alertService';

type ProviderEntry = {
  id: AiProviderId;
  instance: IAiProvider;
  limiter: RateLimiter;
};

type CircuitState = 'closed' | 'open' | 'half_open';

type CircuitBreaker = {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  halfOpenTrialCount: number;
};

const CIRCUIT_BREAKER_FAILURE_THRESHOLD = parseInt(process.env.AI_CB_FAILURE_THRESHOLD || '3', 10);
const CIRCUIT_BREAKER_RESET_TIMEOUT_MS = parseInt(process.env.AI_CB_RESET_TIMEOUT_MS || '60000', 10);
const CIRCUIT_BREAKER_HALF_OPEN_MAX_TRIALS = parseInt(process.env.AI_CB_HALF_OPEN_MAX_TRIALS || '1', 10);

export class MultiAiProvider implements IAiProvider {
  private providers: ProviderEntry[];
  private circuitBreakers: Map<AiProviderId, CircuitBreaker>;

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

    this.circuitBreakers = new Map();
    for (const entry of this.providers) {
      this.circuitBreakers.set(entry.id, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        halfOpenTrialCount: 0
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
    let lastProviderId: AiProviderId | null = null;

    for (const entry of this.providers) {
      if (!this.canUseProvider(entry.id)) {
        errors.push(`Circuit open for ${entry.id}`);
        logger.warn('AI provider skipped due to open circuit breaker', {
          context: 'MultiAiProvider',
          metadata: { provider: entry.id }
        });
        continue;
      }

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
        if (lastProviderId && lastProviderId !== entry.id) {
          logger.info('AI provider failover activated for alert prediction', {
            context: 'MultiAiProvider',
            metadata: {
              from: lastProviderId,
              to: entry.id
            }
          });
        }

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
          this.handleSuccess(entry.id);
          return response;
        }

        this.handleFailure(entry.id);
        errors.push(`Invalid response from ${entry.id}`);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordMetrics(entry.id, duration, 'error');
        this.handleFailure(entry.id);
        const message = error instanceof Error ? error.message : String(error);
        logger.error('AI provider error during alert prediction', {
          context: 'MultiAiProvider',
          metadata: { provider: entry.id, error: message }
        });
        errors.push(`${entry.id}: ${message}`);
      }

      lastProviderId = entry.id;
    }

    const errorMessage = errors.join(' | ') || 'No AI providers available';

    alertService.createAlert(
      AlertType.AI_SERVICE_FAILURE,
      AlertSeverity.HIGH,
      'All AI providers failed for alert prediction',
      'MultiAiProvider',
      {
        error: errorMessage,
        providers: this.providers.map(p => p.id)
      }
    );

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
    let lastProviderId: AiProviderId | null = null;

    for (const entry of this.providers) {
      if (!this.canUseProvider(entry.id)) {
        errors.push(`Circuit open for ${entry.id}`);
        logger.warn('AI provider skipped due to open circuit breaker', {
          context: 'MultiAiProvider',
          metadata: { provider: entry.id }
        });
        continue;
      }

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
        if (lastProviderId && lastProviderId !== entry.id) {
          logger.info('AI provider failover activated for decision generation', {
            context: 'MultiAiProvider',
            metadata: {
              from: lastProviderId,
              to: entry.id
            }
          });
        }

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
          this.handleSuccess(entry.id);
          return result;
        }

        this.handleFailure(entry.id);
        errors.push(`Null decision from ${entry.id}`);
      } catch (error) {
        const duration = Date.now() - startTime;
        this.recordMetrics(entry.id, duration, 'error');
        this.handleFailure(entry.id);
        const message = error instanceof Error ? error.message : String(error);
        logger.error('AI provider error during decision generation', {
          context: 'MultiAiProvider',
          metadata: { provider: entry.id, error: message }
        });
        errors.push(`${entry.id}: ${message}`);
      }

      lastProviderId = entry.id;
    }

    logger.error('All AI providers failed for decision generation', {
      context: 'MultiAiProvider',
      metadata: { errors }
    });

    return null;
  }

  async checkHealth(): Promise<boolean> {
    let anyHealthy = false;

    for (const entry of this.providers) {
      try {
        const healthy = await entry.instance.checkHealth();
        if (healthy) {
          anyHealthy = true;
          this.resetCircuit(entry.id);
        } else {
          this.handleFailure(entry.id);
        }
      } catch {
        this.handleFailure(entry.id);
      }
    }

    return anyHealthy;
  }

  private canUseProvider(id: AiProviderId): boolean {
    const circuit = this.circuitBreakers.get(id);
    if (!circuit) {
      return true;
    }

    const now = Date.now();

    if (circuit.state === 'open') {
      if (now >= circuit.nextAttemptTime) {
        circuit.state = 'half_open';
        circuit.halfOpenTrialCount = 0;
        this.circuitBreakers.set(id, circuit);
        return true;
      }
      return false;
    }

    if (circuit.state === 'half_open' && circuit.halfOpenTrialCount >= CIRCUIT_BREAKER_HALF_OPEN_MAX_TRIALS) {
      return false;
    }

    return true;
  }

  private handleSuccess(id: AiProviderId): void {
    const circuit = this.circuitBreakers.get(id);
    if (!circuit) {
      return;
    }

    circuit.state = 'closed';
    circuit.failureCount = 0;
    circuit.lastFailureTime = 0;
    circuit.nextAttemptTime = 0;
    circuit.halfOpenTrialCount = 0;
    this.circuitBreakers.set(id, circuit);
  }

  private handleFailure(id: AiProviderId): void {
    const now = Date.now();
    const existing = this.circuitBreakers.get(id);
    const circuit: CircuitBreaker = existing || {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenTrialCount: 0
    };

    circuit.failureCount += 1;
    circuit.lastFailureTime = now;

    if (circuit.state === 'half_open') {
      circuit.halfOpenTrialCount += 1;
    }

    if (circuit.failureCount >= CIRCUIT_BREAKER_FAILURE_THRESHOLD) {
      circuit.state = 'open';
      circuit.nextAttemptTime = now + CIRCUIT_BREAKER_RESET_TIMEOUT_MS;
      logger.warn('AI provider circuit opened', {
        context: 'MultiAiProvider',
        metadata: { provider: id, failureCount: circuit.failureCount }
      });
    }

    this.circuitBreakers.set(id, circuit);
  }

  private resetCircuit(id: AiProviderId): void {
    const circuit = this.circuitBreakers.get(id);
    if (!circuit) {
      return;
    }

    if (circuit.state !== 'closed') {
      logger.info('AI provider circuit reset after successful health check', {
        context: 'MultiAiProvider',
        metadata: { provider: id }
      });
    }

    circuit.state = 'closed';
    circuit.failureCount = 0;
    circuit.lastFailureTime = 0;
    circuit.nextAttemptTime = 0;
    circuit.halfOpenTrialCount = 0;
    this.circuitBreakers.set(id, circuit);
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
