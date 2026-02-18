import { EventBus } from '../services/eventBus';
import { logger } from '../utils/logger';

jest.mock('../utils/logger');

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    jest.clearAllMocks();
    EventBus.resetInstance();
    eventBus = EventBus.getInstance();
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

      eventBus.emit('test_event', undefined);

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
      const callback1 = () => { order.push(1); };
      const callback2 = () => { order.push(2); };
      const callback3 = () => { order.push(3); };

      eventBus.subscribe('ordered_event', callback1);
      eventBus.subscribe('ordered_event', callback2);
      eventBus.subscribe('ordered_event', callback3);

      eventBus.emit('ordered_event', {});

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('Priority Handling', () => {
    test('should accept priority parameter in emit', () => {
      const callback = jest.fn();
      eventBus.subscribe('priority_event', callback);

      eventBus.emit('priority_event', { data: 'test' }, 'high');

      expect(callback).toHaveBeenCalled();
    });

    test('should log high priority events', () => {
      eventBus.emit('critical_event', { data: 'critical' }, 'critical');

      expect(logger.info).toHaveBeenCalled();
    });

    test('should log high priority events with userId', () => {
      eventBus.emit('user_event', { userId: 'user123', data: 'test' }, 'high');

      expect(logger.info).toHaveBeenCalled();
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
    test('should unsubscribe all listeners from event', () => {
      const callback = jest.fn();
      eventBus.subscribe('test_event', callback);

      eventBus.emit('test_event', {});
      expect(callback).toHaveBeenCalledTimes(1);

      eventBus.unsubscribe('test_event');

      eventBus.emit('test_event', {});
      expect(callback).toHaveBeenCalledTimes(1);
    });

    test('should remove all listeners for event type', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.subscribe('test', callback1);
      eventBus.subscribe('test', callback2);

      eventBus.unsubscribe('test');
      eventBus.emit('test', {});

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    test('should track total events', () => {
      eventBus.emit('test_event', {});
      eventBus.emit('test_event', {});
      eventBus.emit('other_event', {});

      const stats = eventBus.getStatistics();
      expect(stats.totalEvents).toBe(3);
    });

    test('should track events by type', () => {
      eventBus.emit('event_a', {});
      eventBus.emit('event_a', {});
      eventBus.emit('event_b', {});

      const stats = eventBus.getStatistics();
      expect(stats.eventsByType['event_a']).toBe(2);
      expect(stats.eventsByType['event_b']).toBe(1);
    });

    test('should track events by priority', () => {
      eventBus.emit('test1', {}, 'high');
      eventBus.emit('test2', {}, 'low');
      eventBus.emit('test3', {}, 'high');

      const stats = eventBus.getStatistics();
      expect(stats.eventsByPriority['high']).toBe(2);
      expect(stats.eventsByPriority['low']).toBe(1);
    });

    test('should track last event time', () => {
      const beforeEmit = Date.now();
      eventBus.emit('test_event', {});
      const afterEmit = Date.now();

      const stats = eventBus.getStatistics();
      expect(stats.lastEventTime).toBeGreaterThanOrEqual(beforeEmit);
      expect(stats.lastEventTime).toBeLessThanOrEqual(afterEmit);
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
      expect(normalCallback).toHaveBeenCalled();
    });

    test('should log callback errors', () => {
      const errorCallback = () => {
        throw new Error('Test error');
      };

      eventBus.subscribe('test_event', errorCallback);
      eventBus.emit('test_event', {});

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Async Support', () => {
    test('should support async callbacks', async () => {
      const asyncCallback = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      eventBus.subscribe('async_event', asyncCallback);
      eventBus.emit('async_event', {});

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(asyncCallback).toHaveBeenCalled();
    });

    test('should handle async callback errors', async () => {
      const asyncCallback = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        throw new Error('Async error');
      });

      eventBus.subscribe('async_event', asyncCallback);

      expect(() => {
        eventBus.emit('async_event', {});
      }).not.toThrow();
    });
  });

  describe('Memory Efficiency', () => {
    test('should handle subscribe/unsubscribe cycles', () => {
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        eventBus.subscribe('test', callback);
        eventBus.unsubscribe('test');
      }

      expect(eventBus.listenerCount('test')).toBe(0);
    });

    test('should handle large number of subscribers', () => {
      const subscribers = Array(1000).fill(null).map(() => jest.fn());
      subscribers.forEach(cb => eventBus.subscribe('many_subs', cb));

      expect(eventBus.listenerCount('many_subs')).toBe(1000);
    });

    test('should handle high-frequency emissions efficiently', () => {
      eventBus.subscribe('perf_test', jest.fn());

      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        eventBus.emit('perf_test', { count: i });
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
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

    test('should differentiate between events', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      eventBus.subscribe('user:created', callback1);
      eventBus.subscribe('brain:cycle', callback2);

      eventBus.emit('user:created', {});
      eventBus.emit('brain:cycle', {});

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
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

  describe('Recent Events', () => {
    test('should return recent events', () => {
      eventBus.emit('event1', { data: 1 });
      eventBus.emit('event2', { data: 2 });
      eventBus.emit('event3', { data: 3 });

      const recent = eventBus.getRecentEvents();

      expect(recent.length).toBe(3);
    });

    test('should filter by event type', () => {
      eventBus.emit('type_a', { data: 1 });
      eventBus.emit('type_b', { data: 2 });
      eventBus.emit('type_a', { data: 3 });

      const recent = eventBus.getRecentEvents(100, { eventType: 'type_a' });

      expect(recent.length).toBe(2);
    });

    test('should filter by userId', () => {
      eventBus.emit('test', { userId: 'user1', data: 1 });
      eventBus.emit('test', { userId: 'user2', data: 2 });
      eventBus.emit('test', { userId: 'user1', data: 3 });

      const recent = eventBus.getRecentEvents(100, { userId: 'user1' });

      expect(recent.length).toBe(2);
    });

    test('should limit count', () => {
      for (let i = 0; i < 20; i++) {
        eventBus.emit('test', { data: i });
      }

      const recent = eventBus.getRecentEvents(5);

      expect(recent.length).toBe(5);
    });
  });

  describe('Clear Functions', () => {
    test('should clear event log', () => {
      eventBus.emit('test1', {});
      eventBus.emit('test2', {});

      eventBus.clearLog();

      const stats = eventBus.getStatistics();
      expect(stats.totalEvents).toBe(0);
    });

    test('should clear all subscribers', () => {
      eventBus.subscribe('test1', jest.fn());
      eventBus.subscribe('test2', jest.fn());

      eventBus.clearAllSubscribers();

      expect(eventBus.listenerCount('test1')).toBe(0);
      expect(eventBus.listenerCount('test2')).toBe(0);
    });
  });
});
