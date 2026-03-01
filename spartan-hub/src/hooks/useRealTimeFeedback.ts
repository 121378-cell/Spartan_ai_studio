/**
 * useRealTimeFeedback Hook
 * Phase A: Video Form Analysis MVP
 * 
 * Connects components to real-time feedback WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimeFeedbackService, RealTimeFeedback } from '../services/realTimeFeedbackService';
import { logger } from '../utils/logger';

interface UseRealTimeFeedbackResult {
  // State
  isConnected: boolean;
  isReady: boolean;
  lastFeedback: RealTimeFeedback | null;
  feedbackHistory: RealTimeFeedback[];
  error: string | null;
  
  // Actions
  connect: (sessionId: string) => Promise<void>;
  disconnect: () => void;
  sendLandmarks: (exerciseType: 'squat' | 'deadlift', landmarks: any[], repData?: any) => void;
  clearHistory: () => void;
}

interface UseRealTimeFeedbackOptions {
  enableRealTime?: boolean;
  maxHistorySize?: number;
  onFeedback?: (feedback: RealTimeFeedback) => void;
  onWarning?: (warning: string) => void;
  onCriticalAlert?: (feedback: RealTimeFeedback) => void;
}

export function useRealTimeFeedback(
  options: UseRealTimeFeedbackOptions = {}
): UseRealTimeFeedbackResult {
  const {
    enableRealTime = true,
    maxHistorySize = 100,
    onFeedback,
    onWarning,
    onCriticalAlert
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<RealTimeFeedback | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<RealTimeFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const sessionIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async (sessionId: string): Promise<void> => {
    if (!enableRealTime) {
      logger.info('Real-time feedback disabled', {
        context: 'realtime-feedback-hook'
      });
      return;
    }

    try {
      setIsReady(false);
      await realTimeFeedbackService.connect(sessionId);
      sessionIdRef.current = sessionId;
      
      // Subscribe to feedback
      const unsubscribe = realTimeFeedbackService.subscribe((feedback) => {
        setLastFeedback(feedback);
        setFeedbackHistory(prev => {
          const newHistory = [...prev, feedback];
          // Keep only last N items
          if (newHistory.length > maxHistorySize) {
            return newHistory.slice(newHistory.length - maxHistorySize);
          }
          return newHistory;
        });

        // Call callbacks
        if (onFeedback) {
          onFeedback(feedback);
        }

        // Handle warnings
        if (feedback.warnings.length > 0 && onWarning) {
          feedback.warnings.forEach(warning => onWarning(warning));
        }

        // Handle critical alerts
        if (feedback.injuryRiskLevel === 'critical' && feedback.shouldStop && onCriticalAlert) {
          onCriticalAlert(feedback);
        }
      });

      unsubscribeRef.current = unsubscribe;
      setIsConnected(true);
      setIsReady(true);
      setError(null);

      logger.info('Real-time feedback connected', {
        context: 'realtime-feedback-hook',
        metadata: { sessionId }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      setIsConnected(false);
      setIsReady(false);
      
      logger.error('Failed to connect real-time feedback', {
        context: 'realtime-feedback-hook',
        metadata: { error: errorMessage }
      });
      throw err;
    }
  }, [enableRealTime, maxHistorySize, onFeedback, onWarning, onCriticalAlert]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    realTimeFeedbackService.disconnect();
    sessionIdRef.current = null;
    setIsConnected(false);
    setIsReady(false);
    setLastFeedback(null);
    
    logger.info('Real-time feedback disconnected', {
      context: 'realtime-feedback-hook'
    });
  }, []);

  /**
   * Send pose landmarks for analysis
   */
  const sendLandmarks = useCallback((
    exerciseType: 'squat' | 'deadlift',
    landmarks: any[],
    repData?: any
  ): void => {
    if (!isConnected || !enableRealTime) {
      return;
    }

    if (!sessionIdRef.current) {
      logger.warn('No session ID, cannot send landmarks', {
        context: 'realtime-feedback-hook'
      });
      return;
    }

    realTimeFeedbackService.sendLandmarks(exerciseType, landmarks, repData);
  }, [isConnected, enableRealTime]);

  /**
   * Clear feedback history
   */
  const clearHistory = useCallback(() => {
    setFeedbackHistory([]);
    logger.debug('Feedback history cleared', {
      context: 'realtime-feedback-hook'
    });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      realTimeFeedbackService.disconnect();
    };
  }, []);

  return {
    isConnected,
    isReady,
    lastFeedback,
    feedbackHistory,
    error,
    connect,
    disconnect,
    sendLandmarks,
    clearHistory
  };
}

export default useRealTimeFeedback;
