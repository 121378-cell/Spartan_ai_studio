/**
 * Daily Quests Service
 * Phase B: Gamification - Week 7 Day 2
 * 
 * Daily quests system with generation, tracking, and rewards
 */

import { logger } from '../utils/logger';

export type QuestType = 'workout' | 'social' | 'achievement' | 'streak' | 'challenge';
export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';
export type QuestStatus = 'active' | 'completed' | 'claimed' | 'expired';

export interface DailyQuest {
  id: string;
  userId: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  title: string;
  description: string;
  objective: QuestObjective;
  progress: number;
  status: QuestStatus;
  rewards: QuestReward[];
  createdAt: number;
  expiresAt: number;
  completedAt?: number;
  claimedAt?: number;
}

export interface QuestObjective {
  type: string;
  target: number;
  current: number;
  metadata?: Record<string, any>;
}

export interface QuestReward {
  type: 'points' | 'xp' | 'badge' | 'item';
  value: number | string;
  description: string;
  bonus?: number; // Streak bonus multiplier
}

export interface QuestTemplate {
  type: QuestType;
  difficulty: QuestDifficulty;
  title: string;
  description: string;
  objectiveType: string;
  baseTarget: number;
  rewards: QuestReward[];
}

/**
 * Daily Quests Service
 */
export class DailyQuestsService {
  private userQuests: Map<string, DailyQuest[]> = new Map(); // userId -> quests
  private questTemplates: QuestTemplate[] = [];
  private streakData: Map<string, { current: number; best: number; lastClaim: string }> = new Map();

  constructor() {
    this.initializeQuestTemplates();
    logger.info('DailyQuestsService initialized', {
      context: 'daily-quests',
      metadata: {
        templates: this.questTemplates.length
      }
    });
  }

  /**
   * Initialize quest templates
   */
  private initializeQuestTemplates(): void {
    // Workout Quests
    this.addTemplate({
      type: 'workout',
      difficulty: 'easy',
      title: 'Quick Workout',
      description: 'Complete a quick workout session',
      objectiveType: 'workout_duration',
      baseTarget: 15,
      rewards: [
        { type: 'points', value: 100, description: '100 points' },
        { type: 'xp', value: 50, description: '50 XP' }
      ]
    });

    this.addTemplate({
      type: 'workout',
      difficulty: 'medium',
      title: 'Solid Training',
      description: 'Complete a solid training session',
      objectiveType: 'workout_duration',
      baseTarget: 30,
      rewards: [
        { type: 'points', value: 250, description: '250 points' },
        { type: 'xp', value: 120, description: '120 XP' }
      ]
    });

    this.addTemplate({
      type: 'workout',
      difficulty: 'hard',
      title: 'Intense Workout',
      description: 'Complete an intense workout session',
      objectiveType: 'workout_duration',
      baseTarget: 60,
      rewards: [
        { type: 'points', value: 500, description: '500 points' },
        { type: 'xp', value: 250, description: '250 XP' }
      ]
    });

    this.addTemplate({
      type: 'workout',
      difficulty: 'medium',
      title: 'Form Master',
      description: 'Achieve high form score in workout',
      objectiveType: 'form_score',
      baseTarget: 90,
      rewards: [
        { type: 'points', value: 300, description: '300 points' },
        { type: 'xp', value: 150, description: '150 XP' }
      ]
    });

    // Social Quests
    this.addTemplate({
      type: 'social',
      difficulty: 'easy',
      title: 'Social Sharer',
      description: 'Share a workout on social media',
      objectiveType: 'social_share',
      baseTarget: 1,
      rewards: [
        { type: 'points', value: 150, description: '150 points' },
        { type: 'xp', value: 75, description: '75 XP' }
      ]
    });

    this.addTemplate({
      type: 'social',
      difficulty: 'medium',
      title: 'Team Player',
      description: 'Participate in a team challenge',
      objectiveType: 'team_challenge_participation',
      baseTarget: 1,
      rewards: [
        { type: 'points', value: 300, description: '300 points' },
        { type: 'xp', value: 150, description: '150 XP' }
      ]
    });

    // Achievement Quests
    this.addTemplate({
      type: 'achievement',
      difficulty: 'medium',
      title: 'Achievement Hunter',
      description: 'Unlock an achievement',
      objectiveType: 'achievement_unlock',
      baseTarget: 1,
      rewards: [
        { type: 'points', value: 400, description: '400 points' },
        { type: 'xp', value: 200, description: '200 XP' }
      ]
    });

    // Streak Quests
    this.addTemplate({
      type: 'streak',
      difficulty: 'easy',
      title: 'Consistency King',
      description: 'Maintain your workout streak',
      objectiveType: 'streak_maintain',
      baseTarget: 1,
      rewards: [
        { type: 'points', value: 200, description: '200 points' },
        { type: 'xp', value: 100, description: '100 XP' }
      ]
    });

    this.addTemplate({
      type: 'streak',
      difficulty: 'hard',
      title: 'Unstoppable',
      description: 'Reach a 7-day workout streak',
      objectiveType: 'streak_days',
      baseTarget: 7,
      rewards: [
        { type: 'points', value: 700, description: '700 points' },
        { type: 'xp', value: 350, description: '350 XP' },
        { type: 'badge', value: 'unstoppable', description: 'Unstoppable Badge' }
      ]
    });

    // Challenge Quests
    this.addTemplate({
      type: 'challenge',
      difficulty: 'medium',
      title: 'Challenge Accepted',
      description: 'Complete a challenge',
      objectiveType: 'challenge_completion',
      baseTarget: 1,
      rewards: [
        { type: 'points', value: 500, description: '500 points' },
        { type: 'xp', value: 250, description: '250 XP' }
      ]
    });

    logger.debug('Quest templates initialized', {
      context: 'daily-quests',
      metadata: {
        total: this.questTemplates.length,
        byType: this.getTemplatesByType()
      }
    });
  }

  /**
   * Add quest template
   */
  private addTemplate(template: QuestTemplate): void {
    this.questTemplates.push(template);
  }

  /**
   * Get templates by type
   */
  private getTemplatesByType(): Record<QuestType, number> {
    const counts: Record<QuestType, number> = {
      workout: 0,
      social: 0,
      achievement: 0,
      streak: 0,
      challenge: 0
    };

    this.questTemplates.forEach(t => {
      counts[t.type]++;
    });

    return counts;
  }

  /**
   * Generate daily quests for user
   */
  generateDailyQuests(userId: string, count: number = 3): DailyQuest[] {
    const now = Date.now();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const quests: DailyQuest[] = [];

    // Generate quests
    for (let i = 0; i < count; i++) {
      const template = this.getRandomTemplate();
      const quest = this.createQuestFromTemplate(userId, template, now, tomorrow.getTime());
      quests.push(quest);
    }

    // Store quests
    this.userQuests.set(userId, quests);

    logger.info('Daily quests generated', {
      context: 'daily-quests',
      metadata: {
        userId,
        questCount: quests.length,
        expiresAt: tomorrow.toISOString()
      }
    });

    return quests;
  }

  /**
   * Get random template
   */
  private getRandomTemplate(): QuestTemplate {
    const index = Math.floor(Math.random() * this.questTemplates.length);
    return this.questTemplates[index];
  }

  /**
   * Create quest from template
   */
  private createQuestFromTemplate(
    userId: string,
    template: QuestTemplate,
    createdAt: number,
    expiresAt: number
  ): DailyQuest {
    return {
      id: `quest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: template.type,
      difficulty: template.difficulty,
      title: template.title,
      description: template.description,
      objective: {
        type: template.objectiveType,
        target: template.baseTarget,
        current: 0
      },
      progress: 0,
      status: 'active',
      rewards: template.rewards,
      createdAt,
      expiresAt
    };
  }

  /**
   * Get user's daily quests
   */
  getUserQuests(userId: string): DailyQuest[] {
    return this.userQuests.get(userId) || [];
  }

  /**
   * Get active quests
   */
  getActiveQuests(userId: string): DailyQuest[] {
    const quests = this.getUserQuests(userId);
    const now = Date.now();
    
    return quests.filter(q => 
      q.status === 'active' && 
      q.expiresAt > now
    );
  }

  /**
   * Update quest progress
   */
  updateQuestProgress(
    userId: string,
    objectiveType: string,
    value: number
  ): DailyQuest[] {
    const quests = this.getActiveQuests(userId);
    const updatedQuests: DailyQuest[] = [];

    quests.forEach(quest => {
      if (quest.objective.type === objectiveType && quest.status === 'active') {
        quest.objective.current += value;
        quest.progress = Math.min(100, (quest.objective.current / quest.objective.target) * 100);

        // Check completion
        if (quest.objective.current >= quest.objective.target) {
          quest.status = 'completed';
          quest.completedAt = Date.now();

          logger.info('Quest completed!', {
            context: 'daily-quests',
            metadata: {
              userId,
              questId: quest.id,
              questTitle: quest.title
            }
          });
        }

        updatedQuests.push(quest);
      }
    });

    return updatedQuests;
  }

  /**
   * Claim quest reward
   */
  claimQuestReward(userId: string, questId: string): { points: number; xp: number; badges: string[] } {
    const quests = this.userQuests.get(userId) || [];
    const quest = quests.find(q => q.id === questId);

    if (!quest) {
      throw new Error('Quest not found');
    }

    if (quest.status !== 'completed') {
      throw new Error('Quest not completed');
    }

    if (quest.claimedAt) {
      throw new Error('Reward already claimed');
    }

    // Calculate rewards with streak bonus
    const streakMultiplier = this.getStreakMultiplier(userId);
    
    const rewards = {
      points: 0,
      xp: 0,
      badges: [] as string[]
    };

    quest.rewards.forEach(reward => {
      if (reward.type === 'points' && typeof reward.value === 'number') {
        const bonus = reward.bonus ? reward.bonus : streakMultiplier;
        rewards.points += Math.floor(reward.value * bonus);
      } else if (reward.type === 'xp' && typeof reward.value === 'number') {
        const bonus = reward.bonus ? reward.bonus : streakMultiplier;
        rewards.xp += Math.floor(reward.value * bonus);
      } else if (reward.type === 'badge' && typeof reward.value === 'string') {
        rewards.badges.push(reward.value);
      }
    });

    quest.status = 'claimed';
    quest.claimedAt = Date.now();

    logger.info('Quest reward claimed', {
      context: 'daily-quests',
      metadata: {
        userId,
        questId,
        points: rewards.points,
        xp: rewards.xp,
        badges: rewards.badges.length,
        streakMultiplier
      }
    });

    return rewards;
  }

  /**
   * Get streak multiplier
   */
  getStreakMultiplier(userId: string): number {
    const streak = this.streakData.get(userId);
    
    if (!streak || streak.current === 0) {
      return 1.0;
    }

    // Bonus: +10% per streak day, max 100% bonus at 10 days
    return Math.min(2.0, 1.0 + (streak.current * 0.1));
  }

  /**
   * Update streak
   */
  updateStreak(userId: string, completed: boolean): void {
    const today = new Date().toISOString().split('T')[0];
    let streak = this.streakData.get(userId);

    if (!streak) {
      streak = { current: 0, best: 0, lastClaim: '' };
    }

    if (completed) {
      streak.current++;
      if (streak.current > streak.best) {
        streak.best = streak.current;
      }
      streak.lastClaim = today;
    } else {
      // Check if streak is broken (missed a day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (streak.lastClaim !== yesterdayStr && streak.lastClaim !== today) {
        streak.current = 1; // Reset to 1 (today)
      }
    }

    this.streakData.set(userId, streak);
  }

  /**
   * Get user streak
   */
  getUserStreak(userId: string): { current: number; best: number } {
    const streak = this.streakData.get(userId);
    
    if (!streak) {
      return { current: 0, best: 0 };
    }

    return {
      current: streak.current,
      best: streak.best
    };
  }

  /**
   * Reset daily quests (called at midnight)
   */
  resetDailyQuests(userId: string): DailyQuest[] {
    const oldQuests = this.userQuests.get(userId) || [];
    
    // Check for unclaimed completed quests (lose them)
    const unclaimed = oldQuests.filter(q => q.status === 'completed' && !q.claimedAt);
    
    if (unclaimed.length > 0) {
      logger.warn('User lost unclaimed quest rewards', {
        context: 'daily-quests',
        metadata: {
          userId,
          unclaimedCount: unclaimed.length
        }
      });
    }

    // Generate new quests
    const newQuests = this.generateDailyQuests(userId);

    logger.info('Daily quests reset', {
      context: 'daily-quests',
      metadata: {
        userId,
        oldQuests: oldQuests.length,
        newQuests: newQuests.length,
        unclaimedLost: unclaimed.length
      }
    });

    return newQuests;
  }

  /**
   * Get quest statistics
   */
  getQuestStats(userId: string): {
    totalCompleted: number;
    totalClaimed: number;
    completionRate: number;
    currentStreak: number;
    bestStreak: number;
  } {
    const quests = this.userQuests.get(userId) || [];
    const completed = quests.filter(q => q.status === 'completed' || q.status === 'claimed').length;
    const claimed = quests.filter(q => q.status === 'claimed').length;
    const streak = this.getUserStreak(userId);

    return {
      totalCompleted: completed,
      totalClaimed: claimed,
      completionRate: quests.length > 0 ? (completed / quests.length) * 100 : 0,
      currentStreak: streak.current,
      bestStreak: streak.best
    };
  }
}

export default DailyQuestsService;
