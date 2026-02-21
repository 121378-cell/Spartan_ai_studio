import { IAiProvider } from './interfaces';
import { MicroserviceProvider } from './providers/MicroserviceProvider';
import { GroqProvider } from './providers/GroqProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { GoogleAiProvider } from './providers/GoogleAiProvider';
import { MultiAiProvider } from './providers/MultiAiProvider';
import { logger } from '../../utils/logger';

export class AiProviderFactory {
  private static instance: IAiProvider | null = null;

  static getProvider(): IAiProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = (process.env.AI_PROVIDER || 'microservice').toLowerCase();
    logger.info(`Initializing AI Provider: ${providerType}`);

    switch (providerType) {
    case 'groq':
      this.instance = new GroqProvider();
      break;
    case 'openai':
      this.instance = new OpenAIProvider();
      break;
    case 'anthropic':
      this.instance = new AnthropicProvider();
      break;
    case 'google':
    case 'googleai':
    case 'gemini':
      this.instance = new GoogleAiProvider();
      break;
    case 'multi':
      this.instance = new MultiAiProvider();
      break;
    case 'microservice':
    case 'local':
    default:
      this.instance = new MicroserviceProvider();
      break;
    }

    return this.instance;
  }

  static resetProvider(): void {
    this.instance = null;
  }
}
