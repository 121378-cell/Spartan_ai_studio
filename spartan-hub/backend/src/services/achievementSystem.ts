/**
 * Achievement System
 * Phase B: Social Features - Week 6 Day 2
 * 
 * Manages achievements, unlocks, progress tracking, and rewards
 */

import { logger } from '../utils/logger';

export type AchievementCategory = 'fitness' | 'consistency' | 'social' | 'mastery' | 'special';
export type AchievementDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  icon: string;
  condition: AchievementCondition;
  rewards: AchievementReward[];
  hidden: boolean;
  createdAt: number;
}

export interface AchievementCondition {
  type: 'workouts_completed' | 'form_score' | 'streak_days' | 'challenges_won' | 
        'team_joined' | 'social_shares' | 'perfect_form' | 'personal_record';
  target: number;
  metadata?: Record<string, any>;
}

export interface AchievementReward {
  type: 'points' | 'badge' | 'title' | 'premium_days';
  value: number | string;
  description: string;
}

export interface UserAchievement {
  achievementId: string;
  userId: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  percentage: number;
  claimed: boolean;
}

/**
 * Achievement System
 */
export class AchievementSystem {
  private achievements: Map<string, Achievement> = new Map();
  private userAchievements: Map<string, Map<string, UserAchievement>> = new Map(); // userId -> achievementId -> UserAchievement
  private pointsMultiplier: Map<string, number> = new Map(); // userId -> multiplier

  constructor() {
    this.initializeDefaultAchievements();
    logger.info('AchievementSystem initialized', {
      context: 'achievements',
      metadata: {
        totalAchievements: this.achievements.size
      }
    });
  }

  /**
   * Initialize default achievements
   */
  private initializeDefaultAchievements(): void {
    // Fitness Achievements
    this.addAchievement({
      id: 'first_workout',
      name: 'First Steps',
      description: 'Complete your first workout',
      category: 'fitness',
      difficulty: 'easy',
      icon: '🏋️',
      condition: {
        type: 'workouts_completed',
        target: 1
      },
      rewards: [{
        type: 'points',
        value: 100,
        description: '100 points'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    this.addAchievement({
      id: 'workout_warrior',
      name: 'Workout Warrior',
      description: 'Complete 50 workouts',
      category: 'fitness',
      difficulty: 'medium',
      icon: '⚔️',
      condition: {
        type: 'workouts_completed',
        target: 50
      },
      rewards: [{
        type: 'points',
        value: 500,
        description: '500 points'
      }, {
        type: 'badge',
        value: 'workout_warrior',
        description: 'Workout Warrior Badge'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    this.addAchievement({
      id: 'fitness_legend',
      name: 'Fitness Legend',
      description: 'Complete 200 workouts',
      category: 'fitness',
      difficulty: 'legendary',
      icon: '🏆',
      condition: {
        type: 'workouts_completed',
        target: 200
      },
      rewards: [{
        type: 'points',
        value: 2000,
        description: '2000 points'
      }, {
        type: 'title',
        value: 'Fitness Legend',
        description: 'Exclusive title'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    // Consistency Achievements
    this.addAchievement({
      id: 'seven_day_streak',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      category: 'consistency',
      difficulty: 'easy',
      icon: '📅',
      condition: {
        type: 'streak_days',
        target: 7
      },
      rewards: [{
        type: 'points',
        value: 200,
        description: '200 points'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    this.addAchievement({
      id: 'thirty_day_streak',
      name: 'Monthly Master',
      description: 'Maintain a 30-day streak',
      category: 'consistency',
      difficulty: 'hard',
      icon: '🌟',
      condition: {
        type: 'streak_days',
        target: 30
      },
      rewards: [{
        type: 'points',
        value: 1000,
        description: '1000 points'
      }, {
        type: 'badge',
        value: 'monthly_master',
        description: 'Monthly Master Badge'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    this.addAchievement({
      id: 'perfect_year',
      name: 'Year of Excellence',
      description: 'Maintain a 365-day streak',
      category: 'consistency',
      difficulty: 'legendary',
      icon: '👑',
      condition: {
        type: 'streak_days',
        target: 365
      },
      rewards: [{
        type: 'points',
        value: 10000,
        description: '10000 points'
      }, {
        type: 'premium_days',
        value: '365',
        description: '1 year premium access'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    // Mastery Achievements
    this.addAchievement({
      id: 'perfect_form',
      name: 'Form Perfectionist',
      description: 'Achieve 95+ form score on 10 workouts',
      category: 'mastery',
      difficulty: 'hard',
      icon: '💎',
      condition: {
        type: 'perfect_form',
        target: 10,
        metadata: { minScore: 95 }
      },
      rewards: [{
        type: 'points',
        value: 800,
        description: '800 points'
      }, {
        type: 'badge',
        value: 'form_perfectionist',
        description: 'Form Perfectionist Badge'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    this.addAchievement({
      id: 'personal_record',
      name: 'Record Breaker',
      description: 'Set 5 personal records',
      category: 'mastery',
      difficulty: 'medium',
      icon: '📈',
      condition: {
        type: 'personal_record',
        target: 5
      },
      rewards: [{
        type: 'points',
        value: 500,
        description: '500 points'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    // Social Achievements
    this.addAchievement({
      id: 'team_player',
      name: 'Team Player',
      description: 'Join a team',
      category: 'social',
      difficulty: 'easy',
      icon: '🤝',
      condition: {
        type: 'team_joined',
        target: 1
      },
      rewards: [{
        type: 'points',
        value: 150,
        description: '150 points'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    this.addAchievement({
      id: 'challenge_champion',
      name: 'Challenge Champion',
      description: 'Win 10 challenges',
      category: 'social',
      difficulty: 'hard',
      icon: '🥇',
      condition: {
        type: 'challenges_won',
        target: 10
      },
      rewards: [{
        type: 'points',
        value: 1000,
        description: '1000 points'
      }, {
        type: 'title',
        value: 'Challenge Champion',
        description: 'Exclusive title'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    this.addAchievement({
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Share 25 workouts on social media',
      category: 'social',
      difficulty: 'medium',
      icon: '🦋',
      condition: {
        type: 'social_shares',
        target: 25
      },
      rewards: [{
        type: 'points',
        value: 400,
        description: '400 points'
      }],
      hidden: false,
      createdAt: Date.now()
    });

    // Hidden Achievements
    this.addAchievement({
      id: 'secret_master',
      name: '???',
      description: '???',
      category: 'special',
      difficulty: 'legendary',
      icon: '❓',
      condition: {
        type: 'workouts_completed',
        target: 500
      },
      rewards: [{
        type: 'points',
        value: 5000,
        description: '???'
      }],
      hidden: true,
      createdAt: Date.now()
    });

    logger.info('Default achievements initialized', {
      context: 'achievements',
      metadata: {
        totalAchievements: this.achievements.size,
        byCategory: this.getAchievementsByCategory()
      }
    });
  }

  /**
   * Add achievement to system
   */
  addAchievement(achievement: Achievement): void {
    this.achievements.set(achievement.id, achievement);
  }

  /**
   * Get achievement by ID
   */
  getAchievement(achievementId: string): Achievement | null {
    return this.achievements.get(achievementId) || null;
  }

  /**
   * Get all achievements
   */
  getAllAchievements(includeHidden: boolean = false): Achievement[] {
    const all = Array.from(this.achievements.values());
    if (includeHidden) {
      return all;
    }
    return all.filter(a => !a.hidden);
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(): Record<AchievementCategory, number> {
    const categories: Record<AchievementCategory, number> = {
      fitness: 0,
      consistency: 0,
      social: 0,
      mastery: 0,
      special: 0
    };

    this.achievements.forEach(achievement => {
      categories[achievement.category]++;
    });

    return categories;
  }

  /**
   * Get or create user achievement progress
   */
  getUserAchievement(userId: string, achievementId: string): UserAchievement {
    if (!this.userAchievements.has(userId)) {
      this.userAchievements.set(userId, new Map());
    }

    const userAchievements = this.userAchievements.get(userId)!;
    
    if (!userAchievements.has(achievementId)) {
      const achievement = this.achievements.get(achievementId);
      if (!achievement) {
        throw new Error(`Achievement ${achievementId} not found`);
      }

      userAchievements.set(achievementId, {
        achievementId,
        userId,
        unlocked: false,
        progress: 0,
        percentage: 0,
        claimed: false
      });
    }

    return userAchievements.get(achievementId)!;
  }

  /**
   * Update achievement progress
   */
  updateProgress(userId: string, achievementId: string, progress: number): UserAchievement {
    const userAchievement = this.getUserAchievement(userId, achievementId);
    const achievement = this.achievements.get(achievementId);

    if (!achievement) {
      throw new Error(`Achievement ${achievementId} not found`);
    }

    // Update progress
    userAchievement.progress = progress;
    userAchievement.percentage = Math.min(100, (progress / achievement.condition.target) * 100);

    // Check if unlocked
    if (progress >= achievement.condition.target && !userAchievement.unlocked) {
      userAchievement.unlocked = true;
      userAchievement.unlockedAt = Date.now();

      logger.info('Achievement unlocked!', {
        context: 'achievements',
        metadata: {
          userId,
          achievementId,
          achievementName: achievement.name
        }
      });
    }

    return userAchievement;
  }

  /**
   * Check and update all relevant achievements
   */
  checkAchievements(userId: string, eventType: string, value: number): UserAchievement[] {
    const updatedAchievements: UserAchievement[] = [];

    this.achievements.forEach((achievement, achievementId) => {
      // Check if achievement is relevant to this event
      if (this.isAchievementRelevant(achievement, eventType)) {
        const userAchievement = this.getUserAchievement(userId, achievementId);
        
        if (!userAchievement.unlocked) {
          const newProgress = userAchievement.progress + value;
          const updated = this.updateProgress(userId, achievementId, newProgress);
          updatedAchievements.push(updated);
        }
      }
    });

    return updatedAchievements;
  }

  /**
   * Get user's unlocked achievements
   */
  getUnlockedAchievements(userId: string): UserAchievement[] {
    const userAchievements = this.userAchievements.get(userId);
    if (!userAchievements) {
      return [];
    }

    return Array.from(userAchievements.values())
      .filter(ua => ua.unlocked);
  }

  /**
   * Get user's locked achievements with progress
   */
  getLockedAchievements(userId: string): UserAchievement[] {
    const userAchievements = this.userAchievements.get(userId);
    if (!userAchievements) {
      return [];
    }

    return Array.from(userAchievements.values())
      .filter(ua => !ua.unlocked && ua.progress > 0);
  }

  /**
   * Get user's total points from achievements
   */
  getTotalPoints(userId: string): number {
    const unlocked = this.getUnlockedAchievements(userId);
    let totalPoints = 0;

    unlocked.forEach(ua => {
      const achievement = this.achievements.get(ua.achievementId);
      if (achievement) {
        const pointsReward = achievement.rewards.find(r => r.type === 'points');
        if (pointsReward && typeof pointsReward.value === 'number') {
          totalPoints += pointsReward.value;
        }
      }
    });

    // Apply multiplier if exists
    const multiplier = this.pointsMultiplier.get(userId) || 1;
    return Math.round(totalPoints * multiplier);
  }

  /**
   * Claim achievement reward
   */
  claimReward(userId: string, achievementId: string): boolean {
    const userAchievement = this.getUserAchievement(userId, achievementId);
    
    if (!userAchievement.unlocked || userAchievement.claimed) {
      return false;
    }

    userAchievement.claimed = true;

    logger.info('Achievement reward claimed', {
      context: 'achievements',
      metadata: {
        userId,
        achievementId
      }
    });

    return true;
  }

  /**
   * Set points multiplier for user
   */
  setPointsMultiplier(userId: string, multiplier: number): void {
    this.pointsMultiplier.set(userId, multiplier);
  }

  /**
   * Get achievement difficulty distribution
   */
  getDifficultyDistribution(): Record<AchievementDifficulty, number> {
    const distribution: Record<AchievementDifficulty, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
      legendary: 0
    };

    this.achievements.forEach(achievement => {
      distribution[achievement.difficulty]++;
    });

    return distribution;
  }

  // Private helper methods

  private isAchievementRelevant(achievement: Achievement, eventType: string): boolean {
    const conditionType = achievement.condition.type;
    
    const eventMapping: Record<string, string[]> = {
      'workout_completed': ['workouts_completed'],
      'streak_updated': ['streak_days'],
      'challenge_won': ['challenges_won'],
      'team_joined': ['team_joined'],
      'workout_shared': ['social_shares'],
      'form_score_achieved': ['perfect_form'],
      'personal_record_set': ['personal_record']
    };

    const relevantConditions = eventMapping[eventType] || [];
    return relevantConditions.includes(conditionType);
  }
}

export default AchievementSystem;
