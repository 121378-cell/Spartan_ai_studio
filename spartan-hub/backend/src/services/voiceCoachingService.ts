/**
 * Voice Coaching Service
 * 
 * Provides real-time voice coaching during workouts using TTS (Text-to-Speech)
 * and STT (Speech-to-Text) for voice commands. Creates an AI workout partner
 * that provides encouragement, form corrections, and pacing guidance.
 */

import { logger } from '../utils/logger';
import { ValidationError } from '../utils/errorHandler';

// Use Web Speech API for browser-based TTS as fallback
// In production, integrate with Google Cloud TTS or ElevenLabs

export interface CoachingMessage {
  id: string;
  type: 'encouragement' | 'form_correction' | 'pacing' | 'rest_timer' | 'instruction' | 'celebration';
  text: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  metadata?: {
    exerciseName?: string;
    setNumber?: number;
    repCount?: number;
    formIssue?: string;
    targetPace?: string;
  };
}

export interface VoiceCoachingSession {
  id: string;
  userId: string;
  workoutId: string;
  status: 'active' | 'paused' | 'completed';
  startTime: Date;
  endTime?: Date;
  messages: CoachingMessage[];
  voiceSettings: VoiceSettings;
  stats: {
    totalMessages: number;
    encouragementCount: number;
    correctionCount: number;
    userResponses: number;
  };
}

export interface VoiceSettings {
  voice: 'male-energetic' | 'female-energetic' | 'male-calm' | 'female-calm' | 'spartan';
  speed: number; // 0.5 to 2.0
  volume: number; // 0.0 to 1.0
  language: string;
  enableFormFeedback: boolean;
  enablePacing: boolean;
  enableCelebrations: boolean;
}

export interface WorkoutContext {
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  currentSet: number;
  currentRep: number;
  restTimeRemaining?: number;
  formScore?: number;
  pace?: 'too_fast' | 'good' | 'too_slow';
}

export class VoiceCoachingService {
  private sessions: Map<string, VoiceCoachingSession> = new Map();
  private ttsEnabled: boolean = true;
  private readonly defaultVoiceSettings: VoiceSettings = {
    voice: 'spartan',
    speed: 1.0,
    volume: 0.8,
    language: 'es-ES',
    enableFormFeedback: true,
    enablePacing: true,
    enableCelebrations: true
  };

  /**
   * Start a new voice coaching session
   */
  async startSession(
    userId: string,
    workoutId: string,
    voiceSettings?: Partial<VoiceSettings>
  ): Promise<VoiceCoachingSession> {
    try {
      const session: VoiceCoachingSession = {
        id: this.generateSessionId(),
        userId,
        workoutId,
        status: 'active',
        startTime: new Date(),
        messages: [],
        voiceSettings: { ...this.defaultVoiceSettings, ...voiceSettings },
        stats: {
          totalMessages: 0,
          encouragementCount: 0,
          correctionCount: 0,
          userResponses: 0
        }
      };

      this.sessions.set(session.id, session);

      logger.info('Voice coaching session started', {
        context: 'voice-coaching',
        metadata: { sessionId: session.id, userId, workoutId }
      });

      // Send welcome message
      await this.sendCoachingMessage(session.id, {
        type: 'encouragement',
        text: this.getWelcomeMessage(),
        priority: 'medium'
      });

      return session;
    } catch (error) {
      logger.error('Failed to start voice coaching session', {
        context: 'voice-coaching',
        metadata: { userId, workoutId, error }
      });
      throw error;
    }
  }

  /**
   * Send a coaching message with TTS
   */
  async sendCoachingMessage(
    sessionId: string,
    message: Omit<CoachingMessage, 'id' | 'timestamp'>
  ): Promise<CoachingMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ValidationError('Session not found');
    }

    if (session.status !== 'active') {
      logger.warn('Cannot send message to inactive session', {
        context: 'voice-coaching',
        metadata: { sessionId, status: session.status }
      });
      return null as any;
    }

    const fullMessage: CoachingMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date()
    };

    session.messages.push(fullMessage);
    session.stats.totalMessages++;

    if (message.type === 'encouragement') {
      session.stats.encouragementCount++;
    } else if (message.type === 'form_correction') {
      session.stats.correctionCount++;
    }

    // In production, this would call TTS service
    // For now, we return the message for frontend TTS
    logger.info('Coaching message prepared', {
      context: 'voice-coaching',
      metadata: {
        sessionId,
        messageType: message.type,
        priority: message.priority
      }
    });

    return fullMessage;
  }

  /**
   * Generate contextual coaching based on workout state
   */
  async generateContextualCoaching(
    sessionId: string,
    context: WorkoutContext
  ): Promise<CoachingMessage | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    let message: Omit<CoachingMessage, 'id' | 'timestamp'> | null = null;

    // Form correction (high priority)
    if (session.voiceSettings.enableFormFeedback && context.formScore !== undefined && context.formScore < 70) {
      message = {
        type: 'form_correction',
        text: this.getFormCorrectionMessage(context),
        priority: 'high',
        metadata: {
          exerciseName: context.exerciseName,
          formIssue: this.getFormIssue(context.formScore)
        }
      };
    }
    // Pacing guidance
    else if (session.voiceSettings.enablePacing && context.pace && context.pace !== 'good') {
      message = {
        type: 'pacing',
        text: this.getPacingMessage(context),
        priority: 'medium',
        metadata: {
          exerciseName: context.exerciseName,
          targetPace: context.pace
        }
      };
    }
    // Set completion celebration
    else if (context.currentRep >= context.targetReps && session.voiceSettings.enableCelebrations) {
      message = {
        type: 'celebration',
        text: this.getCelebrationMessage(context),
        priority: 'medium',
        metadata: {
          exerciseName: context.exerciseName,
          setNumber: context.currentSet
        }
      };
    }
    // Encouragement during exercise
    else if (context.currentRep > 0 && context.currentRep % 3 === 0) {
      message = {
        type: 'encouragement',
        text: this.getEncouragementMessage(context),
        priority: 'low',
        metadata: {
          exerciseName: context.exerciseName,
          repCount: context.currentRep
        }
      };
    }

    if (message) {
      return this.sendCoachingMessage(sessionId, message);
    }

    return null;
  }

  /**
   * Handle voice command from user
   */
  async handleVoiceCommand(
    sessionId: string,
    command: string
  ): Promise<{ success: boolean; response?: string; action?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ValidationError('Session not found');
    }

    session.stats.userResponses++;

    const normalizedCommand = command.toLowerCase().trim();

    // Parse command
    if (normalizedCommand.includes('pausa') || normalizedCommand.includes('stop')) {
      await this.pauseSession(sessionId);
      return { success: true, response: 'Entrenamiento pausado. Tómate tu tiempo.', action: 'pause' };
    }

    if (normalizedCommand.includes('continuar') || normalizedCommand.includes('reanudar')) {
      await this.resumeSession(sessionId);
      return { success: true, response: '¡Continuemos! Dale con todo.', action: 'resume' };
    }

    if (normalizedCommand.includes('siguiente') || normalizedCommand.includes('next')) {
      return { success: true, response: 'Pasando al siguiente ejercicio.', action: 'next_exercise' };
    }

    if (normalizedCommand.includes('descanso') || normalizedCommand.includes('rest')) {
      return { success: true, response: `Quedan ${this.getRestTimeMessage()}`, action: 'rest_status' };
    }

    if (normalizedCommand.includes('formulario') || normalizedCommand.includes('forma')) {
      return { success: true, response: this.getFormTipMessage(), action: 'form_tip' };
    }

    if (normalizedCommand.includes('motivación') || normalizedCommand.includes('ánimo')) {
      return { 
        success: true, 
        response: this.getMotivationalMessage(), 
        action: 'motivation' 
      };
    }

    // Unknown command
    return { 
      success: false, 
      response: 'No entendí ese comando. Intenta decir: pausa, siguiente, motivación, o ¿cuánto descanso?' 
    };
  }

  /**
   * Pause coaching session
   */
  async pauseSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'paused';
      logger.info('Voice coaching session paused', {
        context: 'voice-coaching',
        metadata: { sessionId }
      });
    }
  }

  /**
   * Resume coaching session
   */
  async resumeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'active';
      logger.info('Voice coaching session resumed', {
        context: 'voice-coaching',
        metadata: { sessionId }
      });
    }
  }

  /**
   * End coaching session
   */
  async endSession(sessionId: string): Promise<VoiceCoachingSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new ValidationError('Session not found');
    }

    session.status = 'completed';
    session.endTime = new Date();

    // Send workout complete message
    await this.sendCoachingMessage(sessionId, {
      type: 'celebration',
      text: this.getWorkoutCompleteMessage(session),
      priority: 'high'
    });

    logger.info('Voice coaching session ended', {
      context: 'voice-coaching',
      metadata: {
        sessionId,
        duration: session.endTime.getTime() - session.startTime.getTime(),
        stats: session.stats
      }
    });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): VoiceCoachingSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  getUserActiveSessions(userId: string): VoiceCoachingSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.userId === userId && session.status === 'active'
    );
  }

  // Private helper methods

  private generateSessionId(): string {
    return `voice_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getWelcomeMessage(): string {
    const messages = [
      '¡Bienvenido, guerrero! Soy tu compañero de entrenamiento. Juntos conquistaremos este entrenamiento.',
      'Spartan Hub activado. Listo para llevar tu rendimiento al siguiente nivel.',
      'Modo guerrero activado. Te guiaré, motivaré y corregiré durante todo el entrenamiento.',
      '¡Excelente día para entrenar! Estoy aquí para asegurarme de que saques el máximo provecho.',
      'Bienvenido al campo de batalla. Vamos a hacer que cada repetición cuente.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getEncouragementMessage(context: WorkoutContext): string {
    const messages = [
      `¡Eso es! ${context.currentRep} repeticiones completadas. ¡Sigue así!`,
      '¡Perfecto! Mantén ese ritmo.',
      '¡Vas muy bien! Controla la respiración.',
      '¡Excelente técnica! Eso es control.',
      '¡No pares! Cada repetición te acerca a tu objetivo.',
      `¡${context.currentRep} de ${context.targetReps}! Tú puedes con esto.`,
      '¡Esa es la energía! Mantén la concentración.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getFormCorrectionMessage(context: WorkoutContext): string {
    const corrections = [
      `Cuidado con la forma en ${context.exerciseName}. Mantén el core activado.`,
      'Recuerda: calidad sobre cantidad. Ajusta la técnica.',
      'Controla el movimiento. No uses impulso.',
      'Mantén la espalda recta y los hombros abajo.',
      'Respira: exhala en el esfuerzo, inhala al volver.',
      'Fíjate en el rango completo de movimiento.'
    ];
    return corrections[Math.floor(Math.random() * corrections.length)];
  }

  private getFormIssue(formScore: number): string {
    if (formScore < 50) return 'poor';
    if (formScore < 70) return 'fair';
    return 'good';
  }

  private getPacingMessage(context: WorkoutContext): string {
    if (context.pace === 'too_fast') {
      return 'Baja un poco el ritmo. Controla el movimiento para mejor activación muscular.';
    }
    return 'Puedes aumentar un poco la velocidad. Mantén la técnica.';
  }

  private getCelebrationMessage(context: WorkoutContext): string {
    const messages = [
      `¡Set ${context.currentSet} completado! Descansa y prepárate para el siguiente.`,
      '¡Excelente trabajo! Toma tu descanso, te lo has ganado.',
      `¡${context.targetReps} repeticiones perfectas! Recupera energía.`,
      '¡Set dominado! Mantén ese nivel.',
      '¡Increíble! Descansa y vamos por el siguiente.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getWorkoutCompleteMessage(session: VoiceCoachingSession): string {
    const messages = [
      '¡Entrenamiento completado! Has demostrado disciplina y fuerza. Descansa y recupera.',
      '¡Misión cumplida! Cada gota de sudor cuenta. Gran trabajo hoy.',
      '¡Workout terminado! Estás un paso más cerca de tu mejor versión.',
      '¡Excelente sesión! Tu constancia está dando resultados.',
      `¡Entrenamiento finalizado! ${session.stats.encouragementCount} momentos de victoria hoy.`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getRestTimeMessage(): string {
    return '30 segundos de descanso. Respira profundo y prepárate.';
  }

  private getFormTipMessage(): string {
    const tips = [
      'Recuerda: espalda neutra, core activado, respiración controlada.',
      'Mantén los hombros lejos de las orejas y el core firme.',
      'Controla el movimiento en ambas fases: concéntrica y excéntrica.',
      'El rango completo de movimiento es más importante que el peso.'
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  private getMotivationalMessage(): string {
    const messages = [
      'El dolor es temporal, el orgullo es para siempre. ¡Vamos!',
      'Tu único competidor es el que viste en el espejo ayer.',
      'Disciplina sobre motivación. ¡Hazlo por tu futuro yo!',
      'Cada repetición es un voto por la persona que quieres ser.',
      'El éxito no es casualidad, es constancia. ¡Sigue empujando!',
      'Tu cuerpo puede todo. Es tu mente la que necesitas convencer.',
      'Recuerda por qué empezaste. No te rindas ahora.'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

// Singleton instance
export const voiceCoachingService = new VoiceCoachingService();
