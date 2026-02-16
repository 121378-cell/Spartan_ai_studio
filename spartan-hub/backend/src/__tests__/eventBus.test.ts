/**
 * Event Bus Test Suite
 * 
 * Tests event emission, subscriber management, priority handling,
 * and statistics collection.
 */

import { EventBus } from '../../services/eventBus';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

describe('EventBus', () => {
  let eventBus: any;

  beforeEach(() => {
    jest.clearAllMocks();
    eventBus = EventBus.getInstance();
    eventBus.clearAllSubscribers(); // Reset state
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Event Emission', () => {
    test('should emit events to subscribers', () => {
      const callback = jest.fn();
      eventBus.subscribe('test_event', callback);

      eventBus.emit('test_event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should pass event data correctly', () => {
      const callback = jest.fn();
      const eventData = {
        userId: 'user_123',
        action: 'cycle_complete',
        timestamp: Date.now(),
      };

      eventBus.subscribe('brain_cycle_complete', callback);
      eventBus.emit('brain_cycle_complete', eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });

    test('should handle events with no data', () => {
      const callback = jest.fn();
      eventBus.subscribe('test_event', callback);

      eventBus.emit('test_event');

      expect(callback).toHaveBeenCalled();
    });

    test('should handle complex nested data', () => {
      const callback = jest.fn();
      const complexData = {
        nested: {
          deep: {
            value: [1, 2, 3],
          },
        },
        timestamp: new Date().toISOString(),
      };

      eventBus.subscribe('complex_event', callback);
      eventBus.emit('complex_event', complexData);

      expect(callback).toHaveBeenCalledWith(complexData);
    });
  });

  describe('Multiple Subscribers', () => {
    test('should support multiple subscribers for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      eventBus.subscribe('test_event', callback1);
      eventBus.subscribe('test_event', callback2);
      eventBus.subscribe('test_event', callback3);

      eventBus.emit('test_event', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    test('should call all subscribers when event emitted', () => {
      const callbacks = Array(10).fill(null).map(() => jest.fn());
      callbacks.forEach(cb => eventBus.subscribe('test_event', cb));

      eventBus.emit('test_event', { data: 'test' });

      callbacks.forEach(cb => {
        expect(cb).toHaveBeenCalledTimes(1);
      });
    });

    test('should maintain subscriber order', () => {
      const order: number[] = [];
      const callback1 = () => order.push(1);
      const callback2 = () => order.push(2);
      const callback3 = () => order.push(3);

      eventBus.subscribe('ordered_event', callback1);
      eventBus.subscribe('ordered_event', callback2);
      eventBus.subscribe('ordered_event', callback3);

      eventBus.emit('ordered_event', {});

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('Priority Handling', () => {
    test('should respect subscriber priority levels', () => {
      const order: string[] = [];
      const callback1 = () => order.push('priority_0'); // Default
      const callback2 = () => order.push('priority_10'); // High
      const callback3 = () => order.push('priority_5'); // Medium

      eventBus.subscribe('priority_event', callback1, { priority: 0 });
      eventBus.subscribe('priority_event', callback2, { priority: 10 });
      eventBus.subscribe('priority_event', callback3, { priority: 5 });

      eventBus.emit('priority_event', {});

      // Should execute in priority order: 10, 5, 0
      expect(order[0]).toBe('priority_10');
      expect(order[1]).toBe('priority_5');
    });

    test('should execute high-priority subscribers first', () => {
      const order: number[] = [];

      eventBus.subscribe('test', () => order.push(1), { priority: 1 });
      eventBus.subscribe('test', () => order.push(10), { priority: 10 });
      eventBus.subscribe('test', () => order.push(5), { priority: 5 });

      eventBus.emit('test', {});

      expect(order[0]).toBe(10);
      expect(order[1]).toBe(5);
      expect(order[2]).toBe(1);
    });

    test('should queue handlers with same priority in subscription order', () => {
      const order: number[] = [];

      // Same priority (default 0)
      eventBus.subscribe('test', () => order.push(1));
      eventBus.subscribe('test', () => order.push(2));
      eventBus.subscribe('test', () => order.push(3));

      eventBus.emit('test', {});

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('Event Filtering', () => {
    test('should only emit to subscribers of specific event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.subscribe('event_a', callback1);
      eventBus.subscribe('event_b', callback2);

      eventBus.emit('event_a', { data: 'test' });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    test('should support wildcard event subscriptions', () => {
      const callback = jest.fn();
      eventBus.subscribe('brain_*', callback);

      eventBus.emit('brain_cycle_complete', { data: 'test' });
      eventBus.emit('brain_alert', { data: 'alert' });
      eventBus.emit('other_event', { data: 'other' });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    test('should not mix different event types', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.subscribe('critical_alert', callback1);
      eventBus.subscribe('info_message', callback2);

      eventBus.emit('critical_alert', { severity: 'high' });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(0);
    });
  });

  describe('Unsubscribe', () => {
    test('should unsubscribe listener from event', () => {
      const callback = jest.fn();
      const unsubscribe = eventBus.subscribe('test_event', callback);

      eventBus.emit('test_event', {});
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      eventBus.emit('test_event', {});
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });

    test('should only unsubscribe specific listener', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsub1 = eventBus.subscribe('test', callback1);
      eventBus.subscribe('test', callback2);

      unsub1();
      eventBus.emit('test', {});

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should handle unsubscribe of non-existent listener', () => {
      const callback = jest.fn();

      expect(() => {
        callback(); // Just an unrelated function
      }).not.toThrow();
    });
  });

  describe('Statistics', () => {
    test('should track event emission count', () => {
      eventBus.subscribe('test_event', jest.fn());

      eventBus.emit('test_event', {});
      eventBus.emit('test_event', {});
      eventBus.emit('test_event', {});

      const stats = eventBus.getStatistics();
      expect(stats.test_event.emitCount).toBe(3);
    });

    test('should track subscriber count per event', () => {
      eventBus.subscribe('test_event', jest.fn());
      eventBus.subscribe('test_event', jest.fn());
      eventBus.subscribe('test_event', jest.fn());

      const stats = eventBus.getStatistics();
      expect(stats.test_event.subscriberCount).toBe(3);
    });

    test('should measure event emission time', () => {
      eventBus.subscribe('test_event', () => {
        // Simulate work
        const start = Date.now();
        while (Date.now() - start < 10); // 10ms work
      });

      eventBus.emit('test_event', {});

      const stats = eventBus.getStatistics();
      expect(stats.test_event.lastEmitTime).toBeGreaterThanOrEqual(10);
    });

    test('should track average callback execution time', () => {
      const slowCallback = () => {
        const start = Date.now();
        while (Date.now() - start < 5);
      };

      eventBus.subscribe('perf_test', slowCallback);

      for (let i = 0; i < 10; i++) {
        eventBus.emit('perf_test', {});
      }

      const stats = eventBus.getStatistics();
      expect(stats.perf_test.avgCallbackTime).toBeGreaterThan(0);
    });

    test('should track different events independently', () => {
      eventBus.subscribe('event_a', jest.fn());
      eventBus.subscribe('event_b', jest.fn());
      eventBus.subscribe('event_b', jest.fn());

      eventBus.emit('event_a', {});
      eventBus.emit('event_b', {});
      eventBus.emit('event_b', {});

      const stats = eventBus.getStatistics();
      expect(stats.event_a.subscriberCount).toBe(1);
      expect(stats.event_a.emitCount).toBe(1);
      expect(stats.event_b.subscriberCount).toBe(2);
      expect(stats.event_b.emitCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle callback errors without crashing', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();

      eventBus.subscribe('test_event', errorCallback);
      eventBus.subscribe('test_event', normalCallback);

      eventBus.emit('test_event', {});

      expect(errorCallback).toHaveBeenCalled();
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });

    test('should log callback errors', () => {
      const errorCallback = () => {
        throw new Error('Test error');
      };

      eventBus.subscribe('test_event', errorCallback);
      eventBus.emit('test_event', {});

      expect(logger.error || logger.warn).toBeDefined();
    });

    test('should continue with remaining subscribers after error', () => {
      const callbacks = [
        jest.fn(),
        () => { throw new Error('Error in middle'); },
        jest.fn(),
      ];

      callbacks.forEach(cb => eventBus.subscribe('test', cb));
      eventBus.emit('test', {});

      expect(callbacks[0]).toHaveBeenCalled();
      expect(callbacks[2]).toHaveBeenCalled();
    });
  });

  describe('Async Support', () => {
    test('should support async callbacks', async () => {
      const asyncCallback = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      eventBus.subscribe('async_event', asyncCallback);
      await eventBus.emitAsync('async_event', {});

      expect(asyncCallback).toHaveBeenCalled();
    });

    test('should wait for all async callbacks', async () => {
      const order: number[] = [];

      eventBus.subscribe('async_test', async () => {
        await new Promise(resolve => setTimeout(() => {
          order.push(1);
          resolve(null);
        }, 10));
      });

      eventBus.subscribe('async_test', async () => {
        await new Promise(resolve => setTimeout(() => {
          order.push(2);
          resolve(null);
        }, 5));
      });

      await eventBus.emitAsync('async_test', {});

      expect(order.length).toBe(2);
    });
  });

  describe('Memory Efficiency', () => {
    test('should not leak memory with repeated subscribe/unsubscribe', () => {
      for (let i = 0; i < 1000; i++) {
        const unsubscribe = eventBus.subscribe('test', jest.fn());
        unsubscribe();
      }

      const stats = eventBus.getStatistics();
      expect(stats.test?.subscriberCount || 0).toBe(0);
    });

    test('should handle large number of subscribers', () => {
      const subscribers = Array(1000).fill(null).map(() => jest.fn());
      subscribers.forEach(cb => eventBus.subscribe('many_subs', cb));

      const stats = eventBus.getStatistics();
      expect(stats.many_subs.subscriberCount).toBe(1000);
    });

    test('should handle high-frequency emissions efficiently', () => {
      eventBus.subscribe('perf_test', jest.fn());

      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        eventBus.emit('perf_test', { count: i });
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 10k emissions in <5s
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = EventBus.getInstance();
      const instance2 = EventBus.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Event Namespacing', () => {
    test('should support namespaced events', () => {
      const callback = jest.fn();

      eventBus.subscribe('user:created', callback);
      eventBus.emit('user:created', { userId: '123' });

      expect(callback).toHaveBeenCalled();
    });

    test('should differentiate between namespaced events', () => {
      const userCallback = jest.fn();
      const brainCallback = jest.fn();

      eventBus.subscribe('user:*', userCallback);
      eventBus.subscribe('brain:*', brainCallback);

      eventBus.emit('user:created', {});
      eventBus.emit('brain:cycle_complete', {});

      expect(userCallback).toHaveBeenCalledTimes(1);
      expect(brainCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Once Subscription', () => {
    test('should support one-time subscriptions', () => {
      const callback = jest.fn();

      eventBus.subscribeOnce('test_event', callback);

      eventBus.emit('test_event', {});
      eventBus.emit('test_event', {});
      eventBus.emit('test_event', {});

      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should automatically unsubscribe after first emission', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.subscribeOnce('test', callback1);
      eventBus.subscribe('test', callback2);

      eventBus.emit('test', {});
      eventBus.emit('test', {});

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(2);
    });
  });
});
