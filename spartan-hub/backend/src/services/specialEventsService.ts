/**
 * Special Events Service
 * Phase B: Gamification - Week 7 Day 4
 * 
 * Limited-time events with exclusive rewards
 */

import { logger } from '../utils/logger';

export type EventType = 'holiday' | 'seasonal' | 'anniversary' | 'challenge' | 'community';
export type EventStatus = 'upcoming' | 'active' | 'completed' | 'expired';

export interface SpecialEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
  startDate: number;
  endDate: number;
  status: EventStatus;
  challenges: EventChallenge[];
  rewards: EventReward[];
  participants: string[]; // userIds
  exclusive: boolean;
  icon: string;
  theme: EventTheme;
}

export interface EventChallenge {
  id: string;
  title: string;
  description: string;
  objective: {
    type: string;
    target: number;
    current: number;
  };
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  points: number;
  completed: boolean;
}

export interface EventReward {
  id: string;
  name: string;
  description: string;
  type: 'badge' | 'title' | 'points' | 'premium_days' | 'exclusive_item';
  value: number | string;
  requirement: {
    challengeId: string;
    completed: boolean;
  };
  exclusive: boolean;
  icon: string;
}

export interface EventTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundImage?: string;
  music?: string;
}

export interface UserEventProgress {
  userId: string;
  eventId: string;
  challengesCompleted: number;
  totalChallenges: number;
  pointsEarned: number;
  rewardsClaimed: string[]; // rewardIds
  rank: number;
}

/**
 * Special Events Service
 */
export class SpecialEventsService {
  private events: Map<string, SpecialEvent> = new Map();
  private userProgress: Map<string, Map<string, UserEventProgress>> = new Map(); // eventId -> userId -> progress
  private eventTemplates: Map<string, Partial<SpecialEvent>> = new Map();

  constructor() {
    this.initializeEventTemplates();
    logger.info('SpecialEventsService initialized', {
      context: 'special-events',
      metadata: {
        templates: this.eventTemplates.size
      }
    });
  }

  /**
   * Initialize event templates
   */
  private initializeEventTemplates(): void {
    // New Year Challenge
    this.eventTemplates.set('new_year', {
      name: 'New Year, New You Challenge',
      description: 'Start the year strong with our exclusive fitness challenge',
      type: 'holiday',
      icon: '🎉',
      theme: {
        primaryColor: '#FFD700',
        secondaryColor: '#C0C0C0'
      }
    });

    // Summer Shred
    this.eventTemplates.set('summer_shred', {
      name: 'Summer Shred Challenge',
      description: 'Get beach-ready with our intense summer transformation',
      type: 'seasonal',
      icon: '☀️',
      theme: {
        primaryColor: '#FF6B6B',
        secondaryColor: '#4ECDC4'
      }
    });

    // Anniversary Special
    this.eventTemplates.set('anniversary', {
      name: 'Spartan Anniversary Celebration',
      description: 'Celebrate with us and earn exclusive rewards',
      type: 'anniversary',
      icon: '🎂',
      theme: {
        primaryColor: '#9B59B6',
        secondaryColor: '#E91E63'
      }
    });

    // Community Challenge
    this.eventTemplates.set('community', {
      name: 'Community Power Challenge',
      description: 'Unite with the community to unlock massive rewards',
      type: 'community',
      icon: '🤝',
      theme: {
        primaryColor: '#3498DB',
        secondaryColor: '#2ECC71'
      }
    });

    // Halloween Spooktacular
    this.eventTemplates.set('halloween', {
      name: 'Halloween Spooktacular',
      description: 'Scary good workouts with terrifying rewards',
      type: 'holiday',
      icon: '🎃',
      theme: {
        primaryColor: '#FF6600',
        secondaryColor: '#000000'
      }
    });

    logger.debug('Event templates initialized', {
      context: 'special-events',
      metadata: {
        total: this.eventTemplates.size
      }
    });
  }

  /**
   * Create special event
   */
  createSpecialEvent(
    templateId: string,
    startDate: number,
    endDate: number,
    challenges: EventChallenge[],
    rewards: EventReward[]
  ): SpecialEvent {
    const template = this.eventTemplates.get(templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const event: SpecialEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: template.name || 'Special Event',
      description: template.description || '',
      type: template.type || 'challenge',
      startDate,
      endDate,
      status: this.calculateStatus(startDate, endDate),
      challenges,
      rewards,
      participants: [],
      exclusive: true,
      icon: template.icon || '🎯',
      theme: template.theme || {
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF'
      }
    };

    this.events.set(event.id, event);

    logger.info('Special event created', {
      context: 'special-events',
      metadata: {
        eventId: event.id,
        name: event.name,
        type: event.type,
        duration: endDate - startDate,
        challenges: challenges.length,
        rewards: rewards.length
      }
    });

    return event;
  }

  /**
   * Calculate event status
   */
  private calculateStatus(startDate: number, endDate: number): EventStatus {
    const now = Date.now();
    
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'active';
    if (now > endDate) return 'expired';
    return 'completed';
  }

  /**
   * Join event
   */
  joinEvent(eventId: string, userId: string): boolean {
    const event = this.events.get(eventId);
    
    if (!event) {
      logger.warn('Event not found', {
        context: 'special-events',
        metadata: { eventId }
      });
      return false;
    }

    if (event.status !== 'active' && event.status !== 'upcoming') {
      logger.warn('Cannot join event - not active', {
        context: 'special-events',
        metadata: { eventId, status: event.status }
      });
      return false;
    }

    if (event.participants.includes(userId)) {
      logger.warn('User already in event', {
        context: 'special-events',
        metadata: { eventId, userId }
      });
      return false;
    }

    event.participants.push(userId);

    // Initialize user progress
    this.initializeUserProgress(userId, eventId, event.challenges.length);

    logger.info('User joined event', {
      context: 'special-events',
      metadata: {
        eventId,
        userId,
        participantCount: event.participants.length
      }
    });

    return true;
  }

  /**
   * Initialize user progress
   */
  private initializeUserProgress(userId: string, eventId: string, totalChallenges: number): void {
    if (!this.userProgress.has(eventId)) {
      this.userProgress.set(eventId, new Map());
    }

    const progress: UserEventProgress = {
      userId,
      eventId,
      challengesCompleted: 0,
      totalChallenges,
      pointsEarned: 0,
      rewardsClaimed: [],
      rank: 0
    };

    this.userProgress.get(eventId)!.set(userId, progress);
  }

  /**
   * Update challenge progress
   */
  updateChallengeProgress(
    eventId: string,
    userId: string,
    challengeId: string,
    value: number
  ): number {
    const event = this.events.get(eventId);
    
    if (!event) {
      return -1;
    }

    const challenge = event.challenges.find(c => c.id === challengeId);
    
    if (!challenge) {
      return -1;
    }

    const progress = this.userProgress.get(eventId)?.get(userId);
    
    if (!progress) {
      return -1;
    }

    // Update challenge
    challenge.objective.current += value;
    
    // Check completion
    if (!challenge.completed && challenge.objective.current >= challenge.objective.target) {
      challenge.completed = true;
      progress.challengesCompleted++;
      progress.pointsEarned += challenge.points;

      logger.info('Event challenge completed!', {
        context: 'special-events',
        metadata: {
          eventId,
          userId,
          challengeId,
          points: challenge.points
        }
      });
    }

    // Update rank
    this.updateUserRank(eventId, userId);

    return challenge.objective.current;
  }

  /**
   * Update user rank
   */
  private updateUserRank(eventId: string, userId: string): void {
    const progressMap = this.userProgress.get(eventId);
    
    if (!progressMap) {
      return;
    }

    // Sort by points
    const sorted = Array.from(progressMap.values())
      .sort((a, b) => b.pointsEarned - a.pointsEarned);

    // Update ranks
    sorted.forEach((p, index) => {
      p.rank = index + 1;
    });
  }

  /**
   * Claim event reward
   */
  claimReward(eventId: string, userId: string, rewardId: string): boolean {
    const event = this.events.get(eventId);
    
    if (!event) {
      return false;
    }

    const reward = event.rewards.find(r => r.id === rewardId);
    
    if (!reward) {
      return false;
    }

    const progress = this.userProgress.get(eventId)?.get(userId);
    
    if (!progress) {
      return false;
    }

    // Check if already claimed
    if (progress.rewardsClaimed.includes(rewardId)) {
      return false;
    }

    // Check requirement
    const requiredChallenge = event.challenges.find(c => c.id === reward.requirement.challengeId);
    
    if (!requiredChallenge || !requiredChallenge.completed) {
      return false;
    }

    // Claim reward
    progress.rewardsClaimed.push(rewardId);

    logger.info('Event reward claimed', {
      context: 'special-events',
      metadata: {
        eventId,
        userId,
        rewardId,
        rewardName: reward.name
      }
    });

    return true;
  }

  /**
   * Get active events
   */
  getActiveEvents(): SpecialEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.status === 'active');
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(): SpecialEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.status === 'upcoming');
  }

  /**
   * Get user's events
   */
  getUserEvents(userId: string): SpecialEvent[] {
    return Array.from(this.events.values())
      .filter(e => e.participants.includes(userId));
  }

  /**
   * Get user's event progress
   */
  getUserEventProgress(userId: string, eventId: string): UserEventProgress | null {
    return this.userProgress.get(eventId)?.get(userId) || null;
  }

  /**
   * Get event leaderboard
   */
  getEventLeaderboard(eventId: string, limit: number = 10): UserEventProgress[] {
    const progressMap = this.userProgress.get(eventId);
    
    if (!progressMap) {
      return [];
    }

    return Array.from(progressMap.values())
      .sort((a, b) => b.pointsEarned - a.pointsEarned)
      .slice(0, limit);
  }

  /**
   * Update event status
   */
  updateEventStatus(eventId: string): void {
    const event = this.events.get(eventId);
    
    if (!event) {
      return;
    }

    const oldStatus = event.status;
    event.status = this.calculateStatus(event.startDate, event.endDate);

    if (oldStatus !== event.status) {
      logger.info('Event status changed', {
        context: 'special-events',
        metadata: {
          eventId,
          oldStatus,
          newStatus: event.status
        }
      });
    }
  }

  /**
   * Create default seasonal events
   */
  createDefaultSeasonalEvents(): SpecialEvent[] {
    const events: SpecialEvent[] = [];
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // Example: Create a 7-day community challenge
    const communityEvent = this.createSpecialEvent(
      'community',
      now,
      now + (7 * day),
      [
        {
          id: 'challenge-1',
          title: 'Workout Warrior',
          description: 'Complete 10 workouts this week',
          objective: {
            type: 'workouts_completed',
            target: 10,
            current: 0
          },
          difficulty: 'medium',
          points: 500,
          completed: false
        },
        {
          id: 'challenge-2',
          title: 'Form Master',
          description: 'Achieve 95+ form score 5 times',
          objective: {
            type: 'perfect_form',
            target: 5,
            current: 0
          },
          difficulty: 'hard',
          points: 750,
          completed: false
        },
        {
          id: 'challenge-3',
          title: 'Social Butterfly',
          description: 'Share 3 workouts on social media',
          objective: {
            type: 'social_shares',
            target: 3,
            current: 0
          },
          difficulty: 'easy',
          points: 300,
          completed: false
        }
      ],
      [
        {
          id: 'reward-1',
          name: 'Community Champion Badge',
          description: 'Exclusive badge for community challenge completion',
          type: 'badge',
          value: 'community_champion',
          requirement: {
            challengeId: 'challenge-1',
            completed: true
          },
          exclusive: true,
          icon: '🏆'
        },
        {
          id: 'reward-2',
          name: 'Form Master Title',
          description: 'Exclusive title for form mastery',
          type: 'title',
          value: 'Form Master',
          requirement: {
            challengeId: 'challenge-2',
            completed: true
          },
          exclusive: true,
          icon: '💎'
        },
        {
          id: 'reward-3',
          name: '1000 Points Bonus',
          description: 'Complete all challenges for bonus points',
          type: 'points',
          value: 1000,
          requirement: {
            challengeId: 'challenge-3',
            completed: true
          },
          exclusive: false,
          icon: '⭐'
        }
      ]
    );

    events.push(communityEvent);

    logger.info('Default seasonal events created', {
      context: 'special-events',
      metadata: {
        count: events.length
      }
    });

    return events;
  }
}

export default SpecialEventsService;
