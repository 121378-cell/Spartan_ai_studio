/**
 * Gamification Service
 * Phase B: Gamification - Week 7 Day 1
 * 
 * Core gamification system (points, levels, XP, rewards)
 */

import { logger } from '../utils/logger';

export type PointsSource = 'workout' | 'achievement' | 'challenge' | 'social' | 'quest' | 'event';
export type PointsSpendType = 'shop' | 'reward' | 'upgrade' | 'donation';

export interface PointsTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'spend';
  source: PointsSource | PointsSpendType;
  amount: number;
  balance: number;
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface UserLevel {
  userId: string;
  currentLevel: number;
  currentXP: number;
  requiredXP: number;
  progress: number; // percentage 0-100
  totalXP: number; // lifetime XP
  levelHistory: LevelHistory[];
}

export interface LevelHistory {
  level: number;
  achievedAt: number;
  totalXP: number;
}

export interface LevelConfig {
  level: number;
  requiredXP: number;
  rewards: LevelReward[];
  unlocks?: string[];
}

export interface LevelReward {
  type: 'points' | 'badge' | 'title' | 'feature' | 'premium_days';
  value: number | string;
  description: string;
}

/**
 * Gamification Service
 */
export class GamificationService {
  private userPoints: Map<string, number> = new Map(); // userId -> points
  private userLevels: Map<string, UserLevel> = new Map();
  private pointsTransactions: Map<string, PointsTransaction[]> = new Map();
  private levelConfigs: Map<number, LevelConfig> = new Map();

  constructor() {
    this.initializeLevelConfigs();
    logger.info('GamificationService initialized', {
      context: 'gamification',
      metadata: {
        levelConfigs: this.levelConfigs.size
      }
    });
  }

  /**
   * Initialize level configurations
   */
  private initializeLevelConfigs(): void {
    // Generate 100 levels with increasing XP requirements
    for (let level = 1; level <= 100; level++) {
      const requiredXP = this.calculateRequiredXP(level);
      const rewards = this.generateLevelRewards(level);

      this.levelConfigs.set(level, {
        level,
        requiredXP,
        rewards,
        unlocks: this.getLevelUnlocks(level)
      });
    }

    logger.debug('Level configs initialized', {
      context: 'gamification',
      metadata: {
        totalLevels: 100,
        maxRequiredXP: this.calculateRequiredXP(100)
      }
    });
  }

  /**
   * Calculate required XP for level
   */
  private calculateRequiredXP(level: number): number {
    // Exponential curve: base 1000, 15% increase per level
    return Math.floor(1000 * Math.pow(1.15, level - 1));
  }

  /**
   * Generate level rewards
   */
  private generateLevelRewards(level: number): LevelReward[] {
    const rewards: LevelReward[] = [];

    // Points reward (every level)
    rewards.push({
      type: 'points',
      value: level * 100,
      description: `${level * 100} points`
    });

    // Badge at milestone levels
    if (level % 10 === 0) {
      rewards.push({
        type: 'badge',
        value: `level_${level}_badge`,
        description: `Level ${level} Milestone Badge`
      });
    }

    // Title at major milestones
    if (level === 10) {
      rewards.push({
        type: 'title',
        value: 'Fitness Enthusiast',
        description: 'Fitness Enthusiast Title'
      });
    }

    if (level === 25) {
      rewards.push({
        type: 'title',
        value: 'Fitness Expert',
        description: 'Fitness Expert Title'
      });
    }

    if (level === 50) {
      rewards.push({
        type: 'title',
        value: 'Fitness Master',
        description: 'Fitness Master Title'
      });
    }

    if (level === 100) {
      rewards.push({
        type: 'title',
        value: 'Fitness Legend',
        description: 'Fitness Legend Title'
      });
    }

    // Premium days at level 20, 40, 60, 80
    if ([20, 40, 60, 80].includes(level)) {
      rewards.push({
        type: 'premium_days',
        value: '7',
        description: '7 days premium access'
      });
    }

    return rewards;
  }

  /**
   * Get level unlocks
   */
  private getLevelUnlocks(level: number): string[] {
    const unlocks: string[] = [];

    if (level === 5) {
      unlocks.push('custom_workouts');
    }

    if (level === 15) {
      unlocks.push('advanced_analytics');
    }

    if (level === 30) {
      unlocks.push('team_creation');
    }

    if (level === 50) {
      unlocks.push('challenge_creation');
    }

    return unlocks;
  }

  /**
   * Get or create user level
   */
  private getUserLevel(userId: string): UserLevel {
    if (!this.userLevels.has(userId)) {
      this.userLevels.set(userId, {
        userId,
        currentLevel: 1,
        currentXP: 0,
        requiredXP: this.levelConfigs.get(1)?.requiredXP || 1000,
        progress: 0,
        totalXP: 0,
        levelHistory: []
      });
    }

    return this.userLevels.get(userId)!;
  }

  /**
   * Award points to user
   */
  awardPoints(userId: string, amount: number, source: PointsSource, description?: string): number {
    const currentBalance = this.userPoints.get(userId) || 0;
    const newBalance = currentBalance + amount;
    
    this.userPoints.set(userId, newBalance);

    // Record transaction
    this.recordTransaction(userId, 'earn', source, amount, newBalance, description || `Earned ${amount} points from ${source}`);

    logger.info('Points awarded', {
      context: 'gamification',
      metadata: {
        userId,
        amount,
        source,
        newBalance
      }
    });

    return newBalance;
  }

  /**
   * Spend points
   */
  spendPoints(userId: string, amount: number, type: PointsSpendType, description?: string): number {
    const currentBalance = this.userPoints.get(userId) || 0;
    
    if (currentBalance < amount) {
      logger.warn('Insufficient points', {
        context: 'gamification',
        metadata: { userId, currentBalance, amount }
      });
      return -1; // Insufficient points
    }

    const newBalance = currentBalance - amount;
    this.userPoints.set(userId, newBalance);

    // Record transaction
    this.recordTransaction(userId, 'spend', type, amount, newBalance, description || `Spent ${amount} points on ${type}`);

    logger.info('Points spent', {
      context: 'gamification',
      metadata: {
        userId,
        amount,
        type,
        newBalance
      }
    });

    return newBalance;
  }

  /**
   * Get user points balance
   */
  getPoints(userId: string): number {
    return this.userPoints.get(userId) || 0;
  }

  /**
   * Award XP and handle level up
   */
  awardXP(userId: string, amount: number, source?: string): { leveledUp: boolean; newLevel?: number; rewards?: LevelReward[] } {
    const userLevel = this.getUserLevel(userId);
    
    userLevel.currentXP += amount;
    userLevel.totalXP += amount;

    // Check for level up
    let leveledUp = false;
    let newLevel: number | undefined;
    let rewards: LevelReward[] | undefined;

    while (userLevel.currentXP >= userLevel.requiredXP) {
      // Level up!
      userLevel.currentLevel++;
      userLevel.currentXP -= userLevel.requiredXP;
      
      const levelConfig = this.levelConfigs.get(userLevel.currentLevel);
      if (levelConfig) {
        userLevel.requiredXP = levelConfig.requiredXP;
        rewards = levelConfig.rewards;
        
        // Award level rewards
        levelConfig.rewards.forEach(reward => {
          if (reward.type === 'points' && typeof reward.value === 'number') {
            this.awardPoints(userId, reward.value, 'achievement', `Level ${userLevel.currentLevel} reward`);
          }
        });

        // Record level history
        userLevel.levelHistory.push({
          level: userLevel.currentLevel,
          achievedAt: Date.now(),
          totalXP: userLevel.totalXP
        });
      }

      leveledUp = true;
      newLevel = userLevel.currentLevel;

      logger.info('User leveled up!', {
        context: 'gamification',
        metadata: {
          userId,
          newLevel,
          totalXP: userLevel.totalXP
        }
      });
    }

    // Update progress percentage
    userLevel.progress = Math.min(100, (userLevel.currentXP / userLevel.requiredXP) * 100);

    logger.debug('XP awarded', {
      context: 'gamification',
      metadata: {
        userId,
        amount,
        source,
        currentLevel: userLevel.currentLevel,
        progress: userLevel.progress
      }
    });

    return { leveledUp, newLevel, rewards };
  }

  /**
   * Get user level info
   */
  getUserLevelInfo(userId: string): UserLevel {
    return this.getUserLevel(userId);
  }

  /**
   * Get points transaction history
   */
  getPointsHistory(userId: string, limit: number = 20): PointsTransaction[] {
    const transactions = this.pointsTransactions.get(userId) || [];
    return transactions.slice(-limit);
  }

  /**
   * Get points multipliers (for bonuses)
   */
  getPointsMultiplier(userId: string): number {
    const userLevel = this.getUserLevel(userId);
    
    // Base multiplier
    let multiplier = 1.0;

    // Bonus for high levels
    if (userLevel.currentLevel >= 50) {
      multiplier += 0.2; // +20%
    } else if (userLevel.currentLevel >= 25) {
      multiplier += 0.1; // +10%
    } else if (userLevel.currentLevel >= 10) {
      multiplier += 0.05; // +5%
    }

    return multiplier;
  }

  /**
   * Calculate XP for workout
   */
  calculateWorkoutXP(duration: number, formScore: number, intensity: number): number {
    // Base XP from duration (1 XP per minute)
    let xp = duration;

    // Form score bonus (up to 50% bonus)
    const formBonus = formScore / 200; // 95 score = 47.5% bonus
    xp += xp * formBonus;

    // Intensity multiplier
    xp *= intensity;

    return Math.floor(xp);
  }

  /**
   * Reset daily points bonus (anti-exploit)
   */
  private dailyPointsLimit: Map<string, { date: string; points: number }> = new Map();

  canAwardPoints(userId: string, amount: number): boolean {
    const today = new Date().toISOString().split('T')[0];
    const dailyData = this.dailyPointsLimit.get(userId);

    if (!dailyData || dailyData.date !== today) {
      // New day, reset limit
      this.dailyPointsLimit.set(userId, { date: today, points: amount });
      return true;
    }

    const newTotal = dailyData.points + amount;
    
    // Max 10,000 points per day from workouts
    if (newTotal > 10000) {
      logger.warn('Daily points limit exceeded', {
        context: 'gamification',
        metadata: { userId, current: dailyData.points, attempted: amount }
      });
      return false;
    }

    dailyData.points = newTotal;
    return true;
  }

  // Private helper methods

  private recordTransaction(
    userId: string,
    type: 'earn' | 'spend',
    source: PointsSource | PointsSpendType,
    amount: number,
    balance: number,
    description: string
  ): void {
    const transaction: PointsTransaction = {
      id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      source,
      amount,
      balance,
      description,
      timestamp: Date.now()
    };

    if (!this.pointsTransactions.has(userId)) {
      this.pointsTransactions.set(userId, []);
    }

    this.pointsTransactions.get(userId)!.push(transaction);

    // Keep only last 1000 transactions per user
    const transactions = this.pointsTransactions.get(userId)!;
    if (transactions.length > 1000) {
      transactions.splice(0, transactions.length - 1000);
    }
  }
}

export default GamificationService;
