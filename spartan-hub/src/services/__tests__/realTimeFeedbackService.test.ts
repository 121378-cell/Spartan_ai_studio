/**
 * Real-time Feedback Service Tests
 * Phase A: Video Form Analysis MVP
 */

import { realTimeFeedbackService, RealTimeFeedback } from '../realTimeFeedbackService';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  
  constructor(public url: string) {}
  
  send = jest.fn();
  close = jest.fn();
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('RealTimeFeedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to WebSocket successfully', async () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      const sessionId = 'test-session-123';

      const connectPromise = service.connect(sessionId);

      // Simulate WebSocket open
      setTimeout(() => {
        (service.ws as any).onopen?.();
      }, 10);

      await connectPromise;

      expect(service.isConnected).toBe(true);
      expect(service.sessionId).toBe(sessionId);
    });

    it('should handle connection errors', async () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      const sessionId = 'test-session-123';

      const connectPromise = service.connect(sessionId);

      // Simulate WebSocket error
      setTimeout(() => {
        (service.ws as any).onerror?.(new Error('Connection failed'));
      }, 10);

      await expect(connectPromise).rejects.toThrow();
    });
  });

  describe('sendLandmarks', () => {
    it('should send landmarks when connected', () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      service.isConnected = true;
      service.sessionId = 'test-session';
      service.ws = new MockWebSocket('ws://test');

      const landmarks = Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });

      service.sendLandmarks('squat', landmarks, { currentRep: 1 });

      expect(service.ws.send).toHaveBeenCalled();
    });

    it('should skip sending when not connected', () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      service.isConnected = false;

      const landmarks = Array(33).fill({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 });

      service.sendLandmarks('squat', landmarks);

      expect(service.ws?.send).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should subscribe to feedback updates', () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      const handler = jest.fn();

      const unsubscribe = service.subscribe(handler);

      // Simulate feedback
      const feedback: RealTimeFeedback = {
        timestamp: Date.now(),
        exerciseType: 'squat',
        currentRep: 1,
        formScore: 85,
        feedback: ['Good form'],
        warnings: [],
        injuryRiskLevel: 'low',
        shouldStop: false
      };

      service.handleFeedback(feedback);

      expect(handler).toHaveBeenCalledWith(feedback);

      // Unsubscribe
      unsubscribe();
      service.handleFeedback(feedback);

      // Should not be called again
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from WebSocket', () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      service.ws = new MockWebSocket('ws://test');
      service.isConnected = true;
      service.sessionId = 'test-session';

      service.disconnect();

      expect(service.ws.close).toHaveBeenCalled();
      expect(service.isConnected).toBe(false);
      expect(service.sessionId).toBeNull();
    });
  });

  describe('reconnection', () => {
    it('should attempt reconnection with exponential backoff', () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      service.reconnectAttempts = 2;
      service.maxReconnectAttempts = 5;
      service.reconnectDelay = 100;

      jest.useFakeTimers();

      const sessionId = 'test-session';
      service.attemptReconnect(sessionId);

      // Fast-forward time
      jest.advanceTimersByTime(400); // 100 * 2^2 = 400ms

      expect(service.reconnectAttempts).toBe(2);
    });

    it('should stop after max attempts', () => {
      const service = new (realTimeFeedbackService.constructor as any)();
      service.reconnectAttempts = 5;
      service.maxReconnectAttempts = 5;

      const sessionId = 'test-session';
      service.attemptReconnect(sessionId);

      expect(service.reconnectAttempts).toBe(5);
    });
  });

  describe('configuration', () => {
    it('should get current config', () => {
      const service = new (realTimeFeedbackService.constructor as any)({
        maxFeedbackPerSecond: 2,
        warningThreshold: 60
      });

      const config = service.getConfig();

      expect(config.maxFeedbackPerSecond).toBe(2);
      expect(config.warningThreshold).toBe(60);
    });

    it('should update config', () => {
      const service = new (realTimeFeedbackService.constructor as any)();

      service.updateConfig({
        maxFeedbackPerSecond: 3,
        enableRealTime: false
      });

      const config = service.getConfig();
      expect(config.maxFeedbackPerSecond).toBe(3);
      expect(config.enableRealTime).toBe(false);
    });
  });
});
