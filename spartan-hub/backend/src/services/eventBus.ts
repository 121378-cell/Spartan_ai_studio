/**
 * Central Event Bus
 * 
 * Unified event emitter for the entire Spartan Brain system.
 * Coordinates communication between:
 * - Data ingestion layer (Terra/biometrics)
 * - Brain decision engine
 * - Plan adjustment service
 * - Real-time notification service
 * - Frontend WebSocket connections
 * 
 * Event types follow domain-driven naming:
 * - {domain}.{action}: biometric.dataReceived, brain.decisionMade, plan.adjusted
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

interface BrainEvent {
  type: string;
  timestamp: number;
  data: any;
  userId?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventLog: BrainEvent[] = [];
  private maxLogSize: number = 10000; // Keep last 10k events in memory

  private constructor() {
    super();
    this.setMaxListeners(50); // Increase from default 10

    logger.info('EventBus initialized', { context: 'event-bus' });
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emit event with structured logging
   */
  emit(eventType: string, data: any, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): boolean {
    const event: BrainEvent = {
      type: eventType,
      timestamp: Date.now(),
      data,
      userId: data?.userId,
      priority
    };

    // Log critical events
    if (priority === 'critical' || priority === 'high') {
      logger.info(`Event: ${eventType}`, {
        context: 'event-bus',
        metadata: {
          eventType,
          userId: data?.userId,
          priority,
          dataKeys: Object.keys(data || {})
        }
      });
    }

    // Maintain event log (circular buffer)
    this.eventLog.push(event);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog.shift();
    }

    return super.emit(eventType, data);
  }

  /**
   * On event listener with error handling
   */
  on(eventType: string, handler: (data: any) => void | Promise<void>): this {
    const wrappedHandler = async (data: any) => {
      try {
        const result = handler(data);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        logger.error(`Error in event handler for ${eventType}`, {
          context: 'event-bus',
          metadata: {
            eventType,
            errorMessage: error instanceof Error ? error.message : String(error),
            userId: data?.userId
          }
        });
      }
    };

    return super.on(eventType, wrappedHandler);
  }

  /**
   * One-time event listener
   */
  once(eventType: string, handler: (data: any) => void | Promise<void>): this {
    const wrappedHandler = async (data: any) => {
      try {
        const result = handler(data);
        if (result instanceof Promise) {
          await result;
        }
      } catch (error) {
        logger.error(`Error in one-time event handler for ${eventType}`, {
          context: 'event-bus',
          metadata: {
            eventType,
            errorMessage: error instanceof Error ? error.message : String(error),
            userId: data?.userId
          }
        });
      }
    };

    return super.once(eventType, wrappedHandler);
  }

  /**
   * Get recent events (for debugging/monitoring)
   */
  getRecentEvents(count: number = 100, filter?: { eventType?: string; userId?: string }): BrainEvent[] {
    let events = this.eventLog.slice(-count);

    if (filter?.eventType) {
      events = events.filter(e => e.type === filter.eventType);
    }

    if (filter?.userId) {
      events = events.filter(e => e.userId === filter.userId);
    }

    return events;
  }

  /**
   * Get event statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByPriority: Record<string, number>;
    lastEventTime: number;
  } {
    const stats = {
      totalEvents: this.eventLog.length,
      eventsByType: {} as Record<string, number>,
      eventsByPriority: {} as Record<string, number>,
      lastEventTime: this.eventLog[this.eventLog.length - 1]?.timestamp || 0
    };

    for (const event of this.eventLog) {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
      const priority = event.priority || 'normal';
      stats.eventsByPriority[priority] = (stats.eventsByPriority[priority] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear event log (for testing/cleanup)
   */
  clearLog(): void {
    this.eventLog = [];
    logger.info('Event log cleared', { context: 'event-bus' });
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();

export default eventBus;
