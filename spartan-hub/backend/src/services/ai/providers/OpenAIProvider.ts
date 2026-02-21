import axios from 'axios';
import { BaseProvider } from './BaseProvider';
import { AiRequestType, FallbackResponse, AiInputData } from '../types';
import { DecisionContext, DecisionOutput, structuredDecisionPrompt } from '../../decisionPromptTemplate';
import { UserProfile } from '../../../models/User';
import { logger } from '../../../utils/logger';
import { alertService, AlertType, AlertSeverity } from '../../alertService';

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export class OpenAIProvider extends BaseProvider {
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('OPENAI_API_KEY is not set. OpenAIProvider will fail requests.', {
        context: 'OpenAIProvider'
      });
    }
  }

  getProviderName(): string {
    return 'OpenAIProvider';
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
      const response = await this.callOpenAiApi(prompt, true);
      const processingTime = Date.now() - startTime;

      if (!response) {
        throw new Error('No response from OpenAI API');
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
        `OpenAI API failure: ${errorMessage}`,
        'OpenAIProvider',
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
      const response = await this.callOpenAiApi(prompt, true);

      if (!response) {
        throw new Error('No response from OpenAI API');
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
      await axios.get('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });
      return true;
    } catch (error) {
      this.handleError('checkHealth', error);
      return false;
    }
  }

  private async callOpenAiApi(prompt: string, jsonMode: boolean = false): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const requestBody: Record<string, unknown> = {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful fitness coaching assistant. Always output valid JSON when requested.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };

    if (jsonMode) {
      requestBody.response_format = { type: 'json_object' };
    }

    try {
      const response = await axios.post<any>(OPENAI_API_URL, requestBody, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices?.[0]?.message?.content;
      return content || null;
    } catch (error: any) {
      if (error.response) {
        logger.error(`OpenAI API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
