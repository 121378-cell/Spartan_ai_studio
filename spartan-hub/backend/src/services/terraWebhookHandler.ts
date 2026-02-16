/**
 * Terra Webhook Handler Service - Dummy Implementation
 */

import { logger } from '../utils/logger';

export class TerraWebhookHandler {
  private static instance: TerraWebhookHandler;

  public constructor() {}

  static getInstance(): TerraWebhookHandler {
    if (!TerraWebhookHandler.instance) {
      TerraWebhookHandler.instance = new TerraWebhookHandler();
    }
    return TerraWebhookHandler.instance;
  }

  async handleWebhook(payload: any, signature: string): Promise<any> {
    logger.info('Dummy terra webhook handler called');
    return { success: true };
  }
}

export const terraWebhookHandler = TerraWebhookHandler.getInstance();
export default TerraWebhookHandler;
