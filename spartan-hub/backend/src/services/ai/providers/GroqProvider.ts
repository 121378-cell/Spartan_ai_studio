import axios from 'axios';
import { BaseProvider } from './BaseProvider';
import { AiRequestType, FallbackResponse, GroqCompletionRequest, GroqCompletionResponse, AiInputData } from '../types';
import { DecisionContext, DecisionOutput, structuredDecisionPrompt } from '../../decisionPromptTemplate';
import { UserProfile } from '../../../models/User';
import { logger } from '../../../utils/logger';
import { alertService, AlertType, AlertSeverity } from '../../alertService';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

export class GroqProvider extends BaseProvider {
  private apiKey: string;

  constructor() {
    super();
    this.apiKey = process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('GROQ_API_KEY is not set. GroqProvider will fail requests.');
    }
  }

  getProviderName(): string {
    return 'GroqProvider';
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

    // Construct prompt for alert prediction
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
      const response = await this.callGroqApi(prompt, true);
      const processingTime = Date.now() - startTime;

      if (!response) {
        throw new Error('No response from Groq API');
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

      // Fallback logic
      alertService.createAlert(
        AlertType.AI_SERVICE_FAILURE,
        AlertSeverity.HIGH,
        `Groq API failure: ${errorMessage}`,
        'GroqProvider',
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
    // Replace placeholders in the structured prompt
    const prompt = structuredDecisionPrompt
      .replace('{PartituraSemanal}', JSON.stringify(context.PartituraSemanal))
      .replace('{Causa}', context.Causa)
      .replace('{PuntajeSinergico}', context.PuntajeSinergico.toString())
      .replace('{KnowledgeContext}', context.KnowledgeContext || 'No hay contexto adicional.');

    try {
      const response = await this.callGroqApi(prompt, true);

      if (!response) {
        throw new Error('No response from Groq API');
      }

      const parsedResponse = JSON.parse(response);
      return parsedResponse as DecisionOutput;
    } catch (error) {
      this.handleError('generateDecision', error);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await axios.get('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });
      return true;
    } catch (error) {
      this.handleError('checkHealth', error);
      return false;
    }
  }

  private async callGroqApi(prompt: string, jsonMode: boolean = false): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }

    const request: GroqCompletionRequest = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful fitness coaching assistant. Always output valid JSON when requested.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: jsonMode ? { type: 'json_object' } : undefined
    };

    try {
      const response = await axios.post<GroqCompletionResponse>(GROQ_API_URL, request, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data.choices[0]?.message?.content;
      return content || null;
    } catch (error: any) {
      if (error.response) {
        logger.error(`Groq API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
