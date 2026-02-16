import { IAiProvider } from './interfaces';
import { MicroserviceProvider } from './providers/MicroserviceProvider';
import { GroqProvider } from './providers/GroqProvider';
import { logger } from '../../utils/logger';

export class AiProviderFactory {
  private static instance: IAiProvider | null = null;

  static getProvider(): IAiProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerType = process.env.AI_PROVIDER || 'microservice';
    logger.info(`Initializing AI Provider: ${providerType}`);

    switch (providerType.toLowerCase()) {
    case 'groq':
      this.instance = new GroqProvider();
      break;
    case 'microservice':
    case 'local':
    default:
      this.instance = new MicroserviceProvider();
      break;
    }

    return this.instance;
  }

  /**
   * Force reset provider (useful for testing or config changes)
   */
  static resetProvider(): void {
    this.instance = null;
  }
}
