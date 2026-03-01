/**
 * useRealTimeFeedback Hook Tests
 * Phase A: Video Form Analysis MVP
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealTimeFeedback } from '../useRealTimeFeedback';
import { realTimeFeedbackService } from '../../services/realTimeFeedbackService';

// Mock realTimeFeedbackService
jest.mock('../../services/realTimeFeedbackService', () => ({
  realTimeFeedbackService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    subscribe: jest.fn(),
    sendLandmarks: jest.fn(),
    getConnectionStatus: jest.fn(() => ({ isConnected: false, sessionId: null })),
    getConfig: jest.fn()
  }
}));

describe('useRealTimeFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start disconnected', () => {
      const { result } = renderHook(() => useRealTimeFeedback());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isReady).toBe(false);
      expect(result.current.lastFeedback).toBeNull();
      expect(result.current.feedbackHistory).toEqual([]);
    });
  });

  describe('connect', () => {
    it('should connect to WebSocket', async () => {
      (realTimeFeedbackService.connect as jest.Mock).mockResolvedValueOnce(undefined);
      (realTimeFeedbackService.subscribe as jest.Mock).mockReturnValueOnce(() => {});

      const { result } = renderHook(() => useRealTimeFeedback());

      await act(async () => {
        await result.current.connect('test-session-123');
      });

      expect(realTimeFeedbackService.connect).toHaveBeenCalledWith('test-session-123');
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isReady).toBe(true);
    });

    it('should handle connection errors', async () => {
      (realTimeFeedbackService.connect as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const { result } = renderHook(() => useRealTimeFeedback());

      await expect(result.current.connect('test-session-123')).rejects.toThrow();
      expect(result.current.error).toBe('Connection failed');
    });

    it('should skip connection if enableRealTime is false', async () => {
      const { result } = renderHook(() => useRealTimeFeedback({ enableRealTime: false }));

      await act(async () => {
        await result.current.connect('test-session-123');
      });

      expect(realTimeFeedbackService.connect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect from WebSocket', () => {
      const unsubscribeMock = jest.fn();
      (realTimeFeedbackService.subscribe as jest.Mock).mockReturnValueOnce(unsubscribeMock);

      const { result } = renderHook(() => useRealTimeFeedback());

      act(() => {
        result.current.disconnect();
      });

      expect(realTimeFeedbackService.disconnect).toHaveBeenCalled();
      expect(unsubscribeMock).toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('sendLandmarks', () => {
    it('should send landmarks when connected', () => {
      const { result } = renderHook(() => useRealTimeFeedback());

      // Mock connected state
      result.current.isConnected = true;

      const landmarks = Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });

      act(() => {
        result.current.sendLandmarks('squat', landmarks, { currentRep: 1 });
      });

      expect(realTimeFeedbackService.sendLandmarks).toHaveBeenCalledWith(
        'squat',
        landmarks,
        { currentRep: 1 }
      );
    });

    it('should skip sending when not connected', () => {
      const { result } = renderHook(() => useRealTimeFeedback());

      const landmarks = Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });

      act(() => {
        result.current.sendLandmarks('squat', landmarks);
      });

      expect(realTimeFeedbackService.sendLandmarks).not.toHaveBeenCalled();
    });
  });

  describe('feedback handling', () => {
    it('should update lastFeedback and history on feedback', async () => {
      let feedbackHandler: any;
      (realTimeFeedbackService.subscribe as jest.Mock).mockImplementationOnce((handler) => {
        feedbackHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeFeedback({ maxHistorySize: 10 }));

      await act(async () => {
        await result.current.connect('test-session');
      });

      const mockFeedback = {
        timestamp: Date.now(),
        exerciseType: 'squat' as const,
        currentRep: 1,
        formScore: 85,
        feedback: ['Good form'],
        warnings: [],
        injuryRiskLevel: 'low' as const,
        shouldStop: false
      };

      act(() => {
        feedbackHandler(mockFeedback);
      });

      expect(result.current.lastFeedback).toEqual(mockFeedback);
      expect(result.current.feedbackHistory).toHaveLength(1);
      expect(result.current.feedbackHistory[0]).toEqual(mockFeedback);
    });

    it('should respect maxHistorySize', async () => {
      let feedbackHandler: any;
      (realTimeFeedbackService.subscribe as jest.Mock).mockImplementationOnce((handler) => {
        feedbackHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeFeedback({ maxHistorySize: 5 }));

      await act(async () => {
        await result.current.connect('test-session');
      });

      // Send 10 feedback items
      act(() => {
        for (let i = 0; i < 10; i++) {
          feedbackHandler({
            timestamp: Date.now(),
            exerciseType: 'squat' as const,
            currentRep: i,
            formScore: 85,
            feedback: [],
            warnings: [],
            injuryRiskLevel: 'low' as const,
            shouldStop: false
          });
        }
      });

      expect(result.current.feedbackHistory).toHaveLength(5);
    });
  });

  describe('callbacks', () => {
    it('should call onFeedback callback', async () => {
      const onFeedbackMock = jest.fn();
      let feedbackHandler: any;
      (realTimeFeedbackService.subscribe as jest.Mock).mockImplementationOnce((handler) => {
        feedbackHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeFeedback({ onFeedback: onFeedbackMock }));

      await act(async () => {
        await result.current.connect('test-session');
      });

      const mockFeedback = {
        timestamp: Date.now(),
        exerciseType: 'squat' as const,
        currentRep: 1,
        formScore: 85,
        feedback: ['Good'],
        warnings: [],
        injuryRiskLevel: 'low' as const,
        shouldStop: false
      };

      act(() => {
        feedbackHandler(mockFeedback);
      });

      expect(onFeedbackMock).toHaveBeenCalledWith(mockFeedback);
    });

    it('should call onWarning callback when warnings present', async () => {
      const onWarningMock = jest.fn();
      let feedbackHandler: any;
      (realTimeFeedbackService.subscribe as jest.Mock).mockImplementationOnce((handler) => {
        feedbackHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeFeedback({ onWarning: onWarningMock }));

      await act(async () => {
        await result.current.connect('test-session');
      });

      const mockFeedback = {
        timestamp: Date.now(),
        exerciseType: 'squat' as const,
        currentRep: 1,
        formScore: 60,
        feedback: [],
        warnings: ['Knee valgus detected'],
        injuryRiskLevel: 'medium' as const,
        shouldStop: false
      };

      act(() => {
        feedbackHandler(mockFeedback);
      });

      expect(onWarningMock).toHaveBeenCalledWith('Knee valgus detected');
    });

    it('should call onCriticalAlert on critical risk', async () => {
      const onCriticalAlertMock = jest.fn();
      let feedbackHandler: any;
      (realTimeFeedbackService.subscribe as jest.Mock).mockImplementationOnce((handler) => {
        feedbackHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() =>
        useRealTimeFeedback({ onCriticalAlert: onCriticalAlertMock })
      );

      await act(async () => {
        await result.current.connect('test-session');
      });

      const mockFeedback = {
        timestamp: Date.now(),
        exerciseType: 'squat' as const,
        currentRep: 1,
        formScore: 30,
        feedback: [],
        warnings: ['High injury risk'],
        injuryRiskLevel: 'critical' as const,
        shouldStop: true
      };

      act(() => {
        feedbackHandler(mockFeedback);
      });

      expect(onCriticalAlertMock).toHaveBeenCalledWith(mockFeedback);
    });
  });

  describe('cleanup', () => {
    it('should disconnect on unmount', () => {
      const unsubscribeMock = jest.fn();
      (realTimeFeedbackService.subscribe as jest.Mock).mockReturnValueOnce(unsubscribeMock);

      const { unmount } = renderHook(() => useRealTimeFeedback());

      unmount();

      expect(realTimeFeedbackService.disconnect).toHaveBeenCalled();
    });
  });
});
