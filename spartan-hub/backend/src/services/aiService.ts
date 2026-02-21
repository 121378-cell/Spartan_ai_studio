import { UserProfile } from '../models/User';
import { DecisionContext, DecisionOutput } from './decisionPromptTemplate';
import { AiProviderFactory } from './ai/AiProviderFactory';
import { AiRequestType, FallbackResponse } from './ai/types';

/**
 * @param payload Request data
 * @returns Promise with the AI response
 */
export async function processAiRequest(
  type: 'alert_prediction' | 'decision_generation',
  payload: Record<string, unknown>
): Promise<unknown> {
  const provider = AiProviderFactory.getProvider();
  return provider.processRequest(type as AiRequestType, payload);
}

/**
 * CheckInferenciaIA function - Calls the AI microservice to get an alert prediction
 * 
 * @param data - User profile data to analyze
 * @returns Alert prediction
 */
export async function CheckInferenciaIA(data: UserProfile): Promise<FallbackResponse> {
  const provider = AiProviderFactory.getProvider();
  return provider.predictAlert(data);
}

/**
 * GenerateStructuredDecision function - Calls the AI microservice to generate a structured decision
 * based on the synergistic score and weekly data
 * 
 * @param context - Decision context including weekly score, cause, and synergistic score
 * @returns Structured decision with updated weekly score, tactical justification, and red alert flag
 */
export async function GenerateStructuredDecision(context: DecisionContext): Promise<DecisionOutput | null> {
  const provider = AiProviderFactory.getProvider();
  return provider.generateDecision(context);
}

/**
 * Health check for the AI service
 * 
 * @returns Boolean indicating if the AI service is available
 */
export async function checkAiServiceHealth(): Promise<boolean> {
  const provider = AiProviderFactory.getProvider();
  return provider.checkHealth();
}

/**
 * Health check for the Ollama service (deprecated - now handled by AI microservice)
 * 
 * @returns Boolean indicating if the Ollama service is available
 */
export async function checkOllamaServiceHealth(): Promise<boolean> {
  return checkAiServiceHealth();
}
