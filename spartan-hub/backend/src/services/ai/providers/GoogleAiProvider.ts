import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider } from './BaseProvider';
import { AiRequestType, FallbackResponse, AiInputData } from '../types';
import { DecisionContext, DecisionOutput, structuredDecisionPrompt } from '../../decisionPromptTemplate';
import { UserProfile } from '../../../models/User';
import { logger } from '../../../utils/logger';
import { alertService, AlertType, AlertSeverity } from '../../alertService';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

export class GoogleAiProvider extends BaseProvider {
  private client: GoogleGenerativeAI | null;

  constructor() {
    super();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.warn('GEMINI_API_KEY is not set. GoogleAiProvider will fail requests.', {
        context: 'GoogleAiProvider'
      });
      this.client = null;
    } else {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  getProviderName(): string {
    return 'GoogleAiProvider';
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
      const response = await this.callGemini(prompt);
      const processingTime = Date.now() - startTime;

      if (!response) {
        throw new Error('No response from Google Gemini API');
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
        `Google Gemini API failure: ${errorMessage}`,
        'GoogleAiProvider',
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
      const response = await this.callGemini(prompt);

      if (!response) {
        throw new Error('No response from Google Gemini API');
      }

      const parsedResponse = JSON.parse(response);
      return parsedResponse as DecisionOutput;
    } catch (error) {
      this.handleError('generateDecision', error);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const model = this.client.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Health check' }]
          }
        ]
      });
      const text = result.response.text();
      return typeof text === 'string' && text.length > 0;
    } catch (error) {
      this.handleError('checkHealth', error);
      return false;
    }
  }

  private async callGemini(prompt: string): Promise<string | null> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const model = this.client.getGenerativeModel({ model: GEMINI_MODEL });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${prompt}\n\nRespond exclusively with valid JSON.` }]
        }
      ]
    });

    const text = result.response.text();
    return text || null;
  }
}

