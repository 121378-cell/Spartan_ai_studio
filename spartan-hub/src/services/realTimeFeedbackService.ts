/**
 * Real-time Feedback Service
 * Phase A: Video Form Analysis MVP
 * 
 * Connects to backend WebSocket for real-time form feedback
 */

import { logger } from '../utils/logger';

export interface RealTimeFeedback {
  timestamp: number;
  exerciseType: 'squat' | 'deadlift';
  currentRep: number;
  formScore: number;
  feedback: string[];
  warnings: string[];
  injuryRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  shouldStop: boolean;
}

export interface FeedbackConfig {
  enableRealTime: boolean;
  maxFeedbackPerSecond: number;
  warningThreshold: number;
  stopThreshold: number;
}

class RealTimeFeedbackService {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private sessionId: string | null = null;
  private feedbackHandlers: Set<(feedback: RealTimeFeedback) => void> = new Set();
  private config: FeedbackConfig;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(config?: Partial<FeedbackConfig>) {
    this.config = {
      enableRealTime: true,
      maxFeedbackPerSecond: 1,
      warningThreshold: 50,
      stopThreshold: 75,
      ...config
    };
  }

  /**
   * Connect to WebSocket server
   */
  connect(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
        this.ws = new WebSocket(`${wsUrl}/form-analysis`);
        this.sessionId = sessionId;

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('WebSocket connected', {
            context: 'realtime-feedback',
            metadata: { sessionId }
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const feedback: RealTimeFeedback = JSON.parse(event.data);
            this.handleFeedback(feedback);
          } catch (error) {
            logger.error('Failed to parse feedback', {
              context: 'realtime-feedback',
              metadata: { error }
            });
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket error', {
            context: 'realtime-feedback',
            metadata: { error }
          });
          reject(error);
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          logger.warn('WebSocket disconnected', {
            context: 'realtime-feedback',
            metadata: { sessionId }
          });
          
          // Attempt reconnect
          this.attemptReconnect(sessionId);
        };
      } catch (error) {
        logger.error('Failed to connect WebSocket', {
          context: 'realtime-feedback',
          metadata: { error }
        });
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.sessionId = null;
      logger.info('WebSocket disconnected', {
        context: 'realtime-feedback'
      });
    }
  }

  /**
   * Send pose landmarks for analysis
   */
  sendLandmarks(
    exerciseType: 'squat' | 'deadlift',
    landmarks: any[],
    repData?: any
  ): void {
    if (!this.isConnected || !this.ws) {
      logger.warn('WebSocket not connected, skipping feedback', {
        context: 'realtime-feedback'
      });
      return;
    }

    const message = JSON.stringify({
      type: 'pose_landmarks',
      sessionId: this.sessionId,
      exerciseType,
      landmarks,
      repData,
      timestamp: Date.now()
    });

    try {
      this.ws.send(message);
    } catch (error) {
      logger.error('Failed to send landmarks', {
        context: 'realtime-feedback',
        metadata: { error }
      });
    }
  }

  /**
   * Subscribe to feedback updates
   */
  subscribe(handler: (feedback: RealTimeFeedback) => void): () => void {
    this.feedbackHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.feedbackHandlers.delete(handler);
    };
  }

  /**
   * Handle incoming feedback
   */
  private handleFeedback(feedback: RealTimeFeedback): void {
    logger.debug('Received real-time feedback', {
      context: 'realtime-feedback',
      metadata: {
        formScore: feedback.formScore,
        injuryRiskLevel: feedback.injuryRiskLevel,
        shouldStop: feedback.shouldStop
      }
    });

    // Notify all subscribers
    this.feedbackHandlers.forEach(handler => {
      try {
        handler(feedback);
      } catch (error) {
        logger.error('Feedback handler error', {
          context: 'realtime-feedback',
          metadata: { error }
        });
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(sessionId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', {
        context: 'realtime-feedback',
        metadata: { attempts: this.reconnectAttempts }
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`, {
      context: 'realtime-feedback'
    });

    setTimeout(() => {
      this.connect(sessionId).catch((error) => {
        logger.error('Reconnection failed', {
          context: 'realtime-feedback',
          metadata: { error }
        });
      });
    }, delay);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isConnected: boolean; sessionId: string | null } {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId
    };
  }

  /**
   * Get configuration
   */
  getConfig(): FeedbackConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<FeedbackConfig>): void {
    this.config = {
      ...this.config,
      ...updates
    };
    logger.info('Feedback config updated', {
      context: 'realtime-feedback',
      metadata: this.config
    });
  }
}

// Singleton instance
const instance = new RealTimeFeedbackService();

export const realTimeFeedbackService = instance;
export default realTimeFeedbackService;
