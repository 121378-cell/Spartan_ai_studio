import { DecisionContext, DecisionOutput } from '../decisionPromptTemplate';
import { UserProfile } from '../../models/User';

export type AiRequestType = 'alert_prediction' | 'decision_generation';

export interface AiInputData {
  recovery_score: number;    // 0-100 scale
  habit_adherence: number;   // 1-5 scale
  stress_level: number;      // 1-10 scale
  sleep_quality: number;     // 1-5 scale
  workout_frequency: number; // 0-7 times per week
}

export interface AiAlertResponse {
  alerta_roja: boolean;
  processing_time_ms: number;
  fallback_used?: boolean;
  error?: string | null;
}

export interface FallbackResponse {
  alerta_roja: boolean;
  processing_time_ms: number;
  fallback_used: boolean;
  error?: string;
}

// Groq specific types
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export interface GroqChoice {
  index: number;
  message: GroqMessage;
  finish_reason: string;
}

export interface GroqCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
