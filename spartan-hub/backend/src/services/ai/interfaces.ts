import { UserProfile } from '../../models/User';
import { DecisionContext, DecisionOutput } from '../decisionPromptTemplate';
import { AiRequestType, FallbackResponse } from './types';

export interface IAiProvider {
  /**
   * Process a generic AI request based on type
   */
  processRequest(type: AiRequestType, payload: Record<string, unknown>): Promise<unknown>;

  /**
   * Specific method for alert prediction
   */
  predictAlert(data: UserProfile): Promise<FallbackResponse>;

  /**
   * Specific method for decision generation
   */
  generateDecision(context: DecisionContext): Promise<DecisionOutput | null>;

  /**
   * Check health of the provider
   */
  checkHealth(): Promise<boolean>;
  
  /**
   * Get provider name
   */
  getProviderName(): string;
}
