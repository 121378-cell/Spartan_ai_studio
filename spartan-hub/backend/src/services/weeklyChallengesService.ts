/**
 * Weekly Challenges Service
 * Phase B: Gamification - Week 7 Day 3
 * 
 * Weekly challenges with leaderboards and rewards
 */

import { logger } from '../utils/logger';

export type ChallengeCategory = 'fitness' | 'consistency' | 'social' | 'skill' | 'team';
export type ChallengeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface WeeklyChallenge {
  id: string;
  name: string;
  description: string;
  category: ChallengeCategory;
  tier: ChallengeTier;
  objective: ChallengeObjective;
  startDate: number;
  endDate: number;
  participants: ChallengeParticipant[];
  rewards: ChallengeRewards;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: number;
}

export interface ChallengeObjective {
  type: string;
  target: number;
  unit: string;
  metadata?: Record<string, any>;
}

export interface ChallengeParticipant {
  userId: string;
  progress: number;
  rank?: number;
  tier?: ChallengeTier;
  completed: boolean;
  completedAt?: number;
  rewardsClaimed: boolean;
}

export interface ChallengeRewards {
  bronze: ChallengeReward[];
  silver: ChallengeReward[];
  gold: ChallengeReward[];
  platinum: ChallengeReward[];
  diamond: ChallengeReward[];
}

export interface ChallengeReward {
  type: 'points' | 'xp' | 'badge' | 'title' | 'premium_days';
  value: number | string;
  description: string;
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  progress: number;
  percentage: number;
  tier: ChallengeTier;
}

/**
 * Weekly Challenges Service
 */
export class WeeklyChallengesService {
  private challenges: Map<string, WeeklyChallenge> = new Map();
  private userParticipations: Map<string, string[]> = new Map(); // userId -> challengeIds
  private leaderboardCache: Map<string, ChallengeLeaderboardEntry[]> = new Map();

  constructor() {
    logger.info('WeeklyChallengesService initialized', {
      context: 'weekly-challenges'
    });
  }

  /**
   * Create weekly challenge
   */
  createWeeklyChallenge(
    name: string,
    description: string,
    category: ChallengeCategory,
    objectiveType: string,
    target: number,
    unit: string,
    daysFromNow: number = 7
  ): WeeklyChallenge {
    const now = Date.now();
    const startDate = now;
    const endDate = now + (daysFromNow * 24 * 60 * 60 * 1000);

    const challenge: WeeklyChallenge = {
      id: `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      tier: 'bronze', // Base tier, participants can achieve higher
      objective: {
        type: objectiveType,
        target,
        unit
      },
      startDate,
      endDate,
      participants: [],
      rewards: this.generateRewards(target),
      status: 'active',
      createdAt: now
    };

    this.challenges.set(challenge.id, challenge);
    this.leaderboardCache.set(challenge.id, []);

    logger.info('Weekly challenge created', {
      context: 'weekly-challenges',
      metadata: {
        challengeId: challenge.id,
        name,
        category,
        target,
        duration: daysFromNow
      }
    });

    return challenge;
  }

  /**
   * Generate rewards based on target
   */
  private generateRewards(target: number): ChallengeRewards {
    return {
      bronze: [
        { type: 'points', value: target * 10, description: `${target * 10} points` },
        { type: 'xp', value: target * 5, description: `${target * 5} XP` }
      ],
      silver: [
        { type: 'points', value: target * 25, description: `${target * 25} points` },
        { type: 'xp', value: target * 12, description: `${target * 12} XP` },
        { type: 'badge', value: 'silver_achiever', description: 'Silver Achiever Badge' }
      ],
      gold: [
        { type: 'points', value: target * 50, description: `${target * 50} points` },
        { type: 'xp', value: target * 25, description: `${target * 25} XP` },
        { type: 'badge', value: 'gold_achiever', description: 'Gold Achiever Badge' },
        { type: 'title', value: 'Gold Champion', description: 'Gold Champion Title' }
      ],
      platinum: [
        { type: 'points', value: target * 100, description: `${target * 100} points` },
        { type: 'xp', value: target * 50, description: `${target * 50} XP` },
        { type: 'badge', value: 'platinum_master', description: 'Platinum Master Badge' },
        { type: 'title', value: 'Platinum Master', description: 'Platinum Master Title' },
        { type: 'premium_days', value: '7', description: '7 days premium' }
      ],
      diamond: [
        { type: 'points', value: target * 200, description: `${target * 200} points` },
        { type: 'xp', value: target * 100, description: `${target * 100} XP` },
        { type: 'badge', value: 'diamond_legend', description: 'Diamond Legend Badge' },
        { type: 'title', value: 'Diamond Legend', description: 'Diamond Legend Title' },
        { type: 'premium_days', value: '30', description: '30 days premium' }
      ]
    };
  }

  /**
   * Join challenge
   */
  joinChallenge(challengeId: string, userId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      logger.warn('Challenge not found', {
        context: 'weekly-challenges',
        metadata: { challengeId }
      });
      return false;
    }

    if (challenge.status !== 'active') {
      logger.warn('Challenge not active', {
        context: 'weekly-challenges',
        metadata: { challengeId, status: challenge.status }
      });
      return false;
    }

    // Check if already participating
    if (challenge.participants.some(p => p.userId === userId)) {
      logger.warn('User already in challenge', {
        context: 'weekly-challenges',
        metadata: { challengeId, userId }
      });
      return false;
    }

    // Add participant
    challenge.participants.push({
      userId,
      progress: 0,
      rank: challenge.participants.length + 1,
      completed: false,
      rewardsClaimed: false
    });

    // Track user participation
    if (!this.userParticipations.has(userId)) {
      this.userParticipations.set(userId, []);
    }
    this.userParticipations.get(userId)!.push(challengeId);

    // Invalidate leaderboard cache
    this.leaderboardCache.delete(challengeId);

    logger.info('User joined challenge', {
      context: 'weekly-challenges',
      metadata: {
        challengeId,
        userId,
        participantCount: challenge.participants.length
      }
    });

    return true;
  }

  /**
   * Update challenge progress
   */
  updateProgress(challengeId: string, userId: string, value: number): number {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return -1;
    }

    const participant = challenge.participants.find(p => p.userId === userId);
    
    if (!participant) {
      logger.warn('Participant not found', {
        context: 'weekly-challenges',
        metadata: { challengeId, userId }
      });
      return -1;
    }

    // Update progress
    participant.progress += value;
    
    // Check completion
    if (!participant.completed && participant.progress >= challenge.objective.target) {
      participant.completed = true;
      participant.completedAt = Date.now();
      participant.tier = this.calculateTier(participant.progress, challenge.objective.target);

      logger.info('Challenge completed!', {
        context: 'weekly-challenges',
        metadata: {
          challengeId,
          userId,
          progress: participant.progress,
          tier: participant.tier
        }
      });
    }

    // Update ranks
    this.updateRanks(challenge);

    // Invalidate leaderboard cache
    this.leaderboardCache.delete(challengeId);

    return participant.progress;
  }

  /**
   * Calculate tier based on progress
   */
  private calculateTier(progress: number, target: number): ChallengeTier {
    const percentage = (progress / target) * 100;
    
    if (percentage >= 200) return 'diamond';
    if (percentage >= 150) return 'platinum';
    if (percentage >= 100) return 'gold';
    if (percentage >= 75) return 'silver';
    return 'bronze';
  }

  /**
   * Update participant ranks
   */
  private updateRanks(challenge: WeeklyChallenge): void {
    // Sort by progress
    challenge.participants.sort((a, b) => b.progress - a.progress);
    
    // Update ranks
    challenge.participants.forEach((p, index) => {
      p.rank = index + 1;
    });
  }

  /**
   * Get challenge leaderboard
   */
  getLeaderboard(challengeId: string, limit: number = 10): ChallengeLeaderboardEntry[] {
    // Check cache
    const cached = this.leaderboardCache.get(challengeId);
    if (cached && cached.length > 0) {
      return cached.slice(0, limit);
    }

    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return [];
    }

    // Generate leaderboard
    const leaderboard: ChallengeLeaderboardEntry[] = challenge.participants.map(p => ({
      rank: p.rank || 0,
      userId: p.userId,
      userName: `User ${p.userId}`, // In production, fetch from user service
      progress: p.progress,
      percentage: Math.min(100, (p.progress / challenge.objective.target) * 100),
      tier: p.tier || this.calculateTier(p.progress, challenge.objective.target)
    }));

    // Cache leaderboard
    this.leaderboardCache.set(challengeId, leaderboard);

    return leaderboard.slice(0, limit);
  }

  /**
   * Get user's challenge progress
   */
  getUserProgress(challengeId: string, userId: string): {
    progress: number;
    target: number;
    percentage: number;
    rank: number;
    tier: ChallengeTier;
    completed: boolean;
  } | null {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return null;
    }

    const participant = challenge.participants.find(p => p.userId === userId);
    
    if (!participant) {
      return null;
    }

    return {
      progress: participant.progress,
      target: challenge.objective.target,
      percentage: Math.min(100, (participant.progress / challenge.objective.target) * 100),
      rank: participant.rank || 0,
      tier: participant.tier || this.calculateTier(participant.progress, challenge.objective.target),
      completed: participant.completed
    };
  }

  /**
   * Claim challenge rewards
   */
  claimRewards(challengeId: string, userId: string): ChallengeReward[] {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      throw new Error('Challenge not found');
    }

    const participant = challenge.participants.find(p => p.userId === userId);
    
    if (!participant) {
      throw new Error('Not participating in challenge');
    }

    if (!participant.completed) {
      throw new Error('Challenge not completed');
    }

    if (participant.rewardsClaimed) {
      throw new Error('Rewards already claimed');
    }

    // Get rewards for achieved tier
    const tier = participant.tier || 'bronze';
    const rewards = challenge.rewards[tier];

    participant.rewardsClaimed = true;

    logger.info('Challenge rewards claimed', {
      context: 'weekly-challenges',
      metadata: {
        challengeId,
        userId,
        tier,
        rewardCount: rewards.length
      }
    });

    return rewards;
  }

  /**
   * Get active challenges
   */
  getActiveChallenges(): WeeklyChallenge[] {
    const now = Date.now();
    
    return Array.from(this.challenges.values())
      .filter(c => c.status === 'active' && c.endDate > now);
  }

  /**
   * Get user's challenges
   */
  getUserChallenges(userId: string): WeeklyChallenge[] {
    const challengeIds = this.userParticipations.get(userId) || [];
    
    return challengeIds
      .map(id => this.challenges.get(id))
      .filter((c): c is WeeklyChallenge => !!c);
  }

  /**
   * Update challenge status
   */
  updateChallengeStatus(challengeId: string): void {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return;
    }

    const now = Date.now();
    
    if (now < challenge.startDate) {
      challenge.status = 'upcoming';
    } else if (now >= challenge.startDate && now <= challenge.endDate) {
      challenge.status = 'active';
    } else {
      challenge.status = 'completed';
      
      // Auto-assign tiers to non-completers
      challenge.participants.forEach(p => {
        if (!p.completed) {
          p.tier = this.calculateTier(p.progress, challenge.objective.target);
        }
      });
    }
  }

  /**
   * Create default weekly challenges
   */
  createDefaultWeeklyChallenges(): WeeklyChallenge[] {
    const challenges: WeeklyChallenge[] = [];

    // Fitness Challenge
    challenges.push(this.createWeeklyChallenge(
      'Weekly Workout Warrior',
      'Complete as many workouts as possible this week',
      'fitness',
      'workouts_completed',
      10,
      'workouts'
    ));

    // Consistency Challenge
    challenges.push(this.createWeeklyChallenge(
      '7-Day Streak Master',
      'Maintain a 7-day workout streak',
      'consistency',
      'streak_days',
      7,
      'days'
    ));

    // Social Challenge
    challenges.push(this.createWeeklyChallenge(
      'Social Butterfly',
      'Share your workouts on social media',
      'social',
      'social_shares',
      5,
      'shares'
    ));

    // Skill Challenge
    challenges.push(this.createWeeklyChallenge(
      'Form Perfectionist',
      'Achieve 95+ form score in workouts',
      'skill',
      'perfect_form_workouts',
      5,
      'workouts'
    ));

    // Team Challenge
    challenges.push(this.createWeeklyChallenge(
      'Team Player',
      'Participate in team challenges',
      'team',
      'team_challenges_completed',
      3,
      'challenges'
    ));

    logger.info('Default weekly challenges created', {
      context: 'weekly-challenges',
      metadata: {
        count: challenges.length
      }
    });

    return challenges;
  }

  /**
   * Get challenge statistics
   */
  getChallengeStats(challengeId: string): {
    totalParticipants: number;
    completionRate: number;
    averageProgress: number;
    topTier: {
      diamond: number;
      platinum: number;
      gold: number;
      silver: number;
      bronze: number;
    };
  } {
    const challenge = this.challenges.get(challengeId);
    
    if (!challenge) {
      return {
        totalParticipants: 0,
        completionRate: 0,
        averageProgress: 0,
        topTier: { diamond: 0, platinum: 0, gold: 0, silver: 0, bronze: 0 }
      };
    }

    const total = challenge.participants.length;
    const completed = challenge.participants.filter(p => p.completed).length;
    const totalProgress = challenge.participants.reduce((sum, p) => sum + p.progress, 0);
    
    const tierCounts = {
      diamond: challenge.participants.filter(p => p.tier === 'diamond').length,
      platinum: challenge.participants.filter(p => p.tier === 'platinum').length,
      gold: challenge.participants.filter(p => p.tier === 'gold').length,
      silver: challenge.participants.filter(p => p.tier === 'silver').length,
      bronze: challenge.participants.filter(p => p.tier === 'bronze' || !p.tier).length
    };

    return {
      totalParticipants: total,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      averageProgress: total > 0 ? totalProgress / total : 0,
      topTier: tierCounts
    };
  }
}

export default WeeklyChallengesService;
