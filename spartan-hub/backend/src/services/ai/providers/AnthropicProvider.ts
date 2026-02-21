import axios from 'axios';
import { BaseProvider } from './BaseProvider';
import { AiRequestType, FallbackResponse, AiInputData } from '../types';
import { DecisionContext, DecisionOutput, structuredDecisionPrompt } from '../../decisionPromptTemplate';
import { UserProfile } from '../../../models/User';
import { logger } from '../../../utils/logger';
import { alertService, AlertType, AlertSeverity } from '../../alertService';

const ANTHROPIC_API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
const ANTHROPIC_VERSION = process.env.ANTHROPIC_VERSION || '2023-06-01';

export class AnthropicProvider extends BaseProvider {
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('ANTHROPIC_API_KEY is not set. AnthropicProvider will fail requests.', {
        context: 'AnthropicProvider'
      });
    }
  }

  getProviderName(): string {
    return 'AnthropicProvider';
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

    const prompt = `
      Analyze the following user fitness data and determine if a RED ALERT (critical intervention) is needed.
      Data: ${JSON.stringify(aiInput, null, 2)}
      
      A red alert should be triggered if recovery is very low (<30), stress is high (>8), or sleep is poor (<2) combined with high workout frequency.
      
      Respond EXCLUSIVELY in valid JSON format with this structure:
      {
        "alerta_roja": boolean,
        "explanation": "Brief explanation of the decision"
      }
    `;

    try {
      const startTime = Date.now();
      const response = await this.callAnthropicApi(prompt);
      const processingTime = Date.now() - startTime;

      if (!response) {
        throw new Error('No response from Anthropic API');
      }

      const parsedResponse = JSON.parse(response);

      return {
        alerta_roja: parsedResponse.alerta_roja,
        processing_time_ms: processingTime,
        fallback_used: false,
        error: undefined
      };
    } catch (error) {
      this.handleError('predictAlert', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      alertService.createAlert(
        AlertType.AI_SERVICE_FAILURE,
        AlertSeverity.HIGH,
        `Anthropic API failure: ${errorMessage}`,
        'AnthropicProvider',
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

  async generateDecision(context: DecisionContext): Promise<DecisionOutput | null> {
    const prompt = structuredDecisionPrompt
      .replace('{PartituraSemanal}', JSON.stringify(context.PartituraSemanal))
      .replace('{Causa}', context.Causa)
      .replace('{PuntajeSinergico}', context.PuntajeSinergico.toString())
      .replace('{KnowledgeContext}', context.KnowledgeContext || 'No hay contexto adicional.');

    try {
      const response = await this.callAnthropicApi(prompt);

      if (!response) {
        throw new Error('No response from Anthropic API');
      }

      const parsedResponse = JSON.parse(response);
      return parsedResponse as DecisionOutput;
    } catch (error) {
      this.handleError('generateDecision', error);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      await axios.post(
        ANTHROPIC_API_URL,
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 1,
          messages: [
            {
              role: 'user',
              content: 'Health check'
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'content-type': 'application/json'
          },
          timeout: 5000
        }
      );
      return true;
    } catch (error) {
      this.handleError('checkHealth', error);
      return false;
    }
  }

  private async callAnthropicApi(prompt: string): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    try {
      const response = await axios.post<any>(
        ANTHROPIC_API_URL,
        {
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          temperature: 0.1,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${prompt}\n\nRespond exclusively with valid JSON.`
                }
              ]
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'content-type': 'application/json'
          },
          timeout: 30000
        }
      );

      const content = response.data?.content?.[0]?.text;
      return content || null;
    } catch (error: any) {
      if (error.response) {
        logger.error(`Anthropic API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
