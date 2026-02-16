import { IAiProvider } from '../interfaces';
import { AiRequestType, FallbackResponse } from '../types';
import { DecisionContext, DecisionOutput } from '../../decisionPromptTemplate';
import { UserProfile } from '../../../models/User';
import { logger } from '../../../utils/logger';

import { AiInputData } from '../types';

export abstract class BaseProvider implements IAiProvider {
  abstract processRequest(type: AiRequestType, payload: Record<string, unknown>): Promise<unknown>;
  abstract predictAlert(data: UserProfile): Promise<FallbackResponse>;
  abstract generateDecision(context: DecisionContext): Promise<DecisionOutput | null>;
  abstract checkHealth(): Promise<boolean>;
  abstract getProviderName(): string;

  protected handleError(context: string, error: unknown): void {
    logger.error(`Error in ${this.getProviderName()}: ${context}`, {
      context: 'AiProvider',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
  }

  protected prepareAiInput(data: UserProfile): AiInputData {
    const recoveryScore = data.stats ? 
      Math.min(100, Math.max(0, (data.stats.currentStreak / 7) * 100)) : 50;
    
    const habitAdherence = data.keystoneHabits && data.keystoneHabits.length > 0 ?
      Math.min(5, Math.max(1, data.keystoneHabits[0].currentStreak / 2)) : 3;
    
    const stressLevel = 5; // Placeholder
    const sleepQuality = 3; // Placeholder
    
    const workoutFrequency = data.stats ? 
      Math.min(7, data.stats.totalWorkouts / 4) : 3;
    
    return {
      recovery_score: recoveryScore,
      habit_adherence: habitAdherence,
      stress_level: stressLevel,
      sleep_quality: sleepQuality,
      workout_frequency: workoutFrequency
    };
  }
}
