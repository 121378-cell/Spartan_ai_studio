/**
 * Achievement Service - Phase 9: User Engagement & Retention System
 * Core service for managing achievements, badges, challenges, points, and gamification.
 */
import { v4 as uuidv4 } from 'uuid';
const Database = require('better-sqlite3');
type DatabaseType = any;
import { Achievement, Badge, Challenge, UserPoints, ENGAGEMENT_TABLES_SQL } from '../schemas/engagementSchema';
import { logger } from '../utils/logger';

const NOTIFICATION_TYPES = {
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  BADGE_EARNED: 'badge_earned',
  CHALLENGE_COMPLETED: 'challenge_completed',
  LEVEL_UP: 'level_up'
} as const;

export class AchievementService {
  private db: DatabaseType | null = null;
  constructor(database: DatabaseType | null) { this.db = database; }

  initializeTables(): void {
    if (!this.db) return;
    try {
      this.db.pragma('foreign_keys = ON');
      const stmts = ENGAGEMENT_TABLES_SQL.split(';').filter(s => s.trim());
      for (const s of stmts) if (s.trim()) this.db.exec(`${s.trim()  };`);
      logger.info('Engagement tables initialized', { context: 'achievementService', metadata: { operation: 'initializeTables' } });
    } catch (error) {
      logger.error('Failed to initialize tables', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
    }
  }

  getAllAchievements(filters?: { category?: string; tier?: string; limit?: number; offset?: number }): Achievement[] {
    if (!this.db) return [];
    try {
      let q = 'SELECT * FROM achievements WHERE is_active = 1';
      const p: unknown[] = [];
      if (filters?.category) { q += ' AND category = ?'; p.push(filters.category); }
      if (filters?.tier) { q += ' AND tier = ?'; p.push(filters.tier); }
      q += ' ORDER BY points ASC';
      if (filters?.limit) { q += ' LIMIT ? OFFSET ?'; p.push(filters.limit, filters.offset || 0); }
      const r = this.db.prepare(q).all(...p) as Record<string, unknown>[];
      return r.map((row: Record<string, unknown>) => this.parseAchievement(row));
    } catch (error) {
      logger.error('getAllAchievements failed', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  getAchievementById(id: string): Achievement | null {
    if (!this.db) return null;
    try {
      const row = this.db.prepare('SELECT * FROM achievements WHERE id = ? AND is_active = 1').get(id);
      return row ? this.parseAchievement(row as Record<string, unknown>) : null;
    } catch (error) {
      logger.error('getAchievementById failed', { context: 'achievementService', metadata: { id, error: error instanceof Error ? error.message : String(error) } });
      return null;
    }
  }

  getUserAchievements(userId: string, includeCompleted = true): Array<Achievement & { progress: number; isCompleted: boolean; completedAt: string | null }> {
    if (!this.db) return [];
    try {
      let q = 'SELECT a.*, ua.progress, ua.is_completed, ua.completed_at FROM achievements a LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ? WHERE a.is_active = 1';
      if (!includeCompleted) q += ' AND (ua.is_completed IS NULL OR ua.is_completed = 0)';
      q += ' ORDER BY a.points ASC';
      const r = this.db.prepare(q).all(userId) as Record<string, unknown>[];
      return r.map((row: Record<string, unknown>) => ({
        ...this.parseAchievement(row),
        progress: (row.progress as number) || 0,
        isCompleted: Boolean(row.is_completed),
        completedAt: row.completed_at as string | null
      }));
    } catch (error) {
      logger.error('getUserAchievements failed', { context: 'achievementService', metadata: { userId, error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  async checkAndUpdateAchievementProgress(userId: string, eventType: string, metadata: Record<string, unknown>): Promise<Array<{ achievement: Achievement; newlyCompleted: boolean }>> {
    if (!this.db) return [];
    const results: Array<{ achievement: Achievement; newlyCompleted: boolean }> = [];
    try {
      const achievements = this.getAllAchievements();
      const userAchievements = this.getUserAchievements(userId, false);
      const progressMap = new Map(userAchievements.map(a => [a.id, a]));
      for (const achievement of achievements) {
        if (progressMap.get(achievement.id)?.isCompleted) continue;
        if (this.shouldUpdate(achievement, eventType)) {
          const current = progressMap.get(achievement.id)?.progress || 0;
          const increment = this.calcIncrement(achievement, eventType, metadata);
          const completed = current + increment >= achievement.criteria.target;
          this.upsertAchievement(userId, achievement.id, current + increment, completed);
          if (completed && current < achievement.criteria.target) this.handleComplete(userId, achievement);
          results.push({ achievement, newlyCompleted: completed && current < achievement.criteria.target });
        }
      }
      return results;
    } catch (error) {
      logger.error('checkProgress failed', { context: 'achievementService', metadata: { userId, error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  private handleComplete(userId: string, achievement: Achievement): void {
    try {
      this.awardPoints(userId, achievement.points, `achievement_${achievement.id}`);
      this.notify({ userId, type: NOTIFICATION_TYPES.ACHIEVEMENT_UNLOCKED, title: 'Achievement Unlocked!', message: `You've earned "${achievement.name}"!`, data: { achievementId: achievement.id, tier: achievement.tier } });
      this.checkBadges(userId);
    } catch (error) {
      logger.error('handleComplete failed', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
    }
  }

  getAllBadges(): Badge[] {
    if (!this.db) return [];
    try {
      const r = this.db.prepare('SELECT * FROM badges WHERE is_active = 1 ORDER BY rarity ASC').all() as Record<string, unknown>[];
      return r.map((row: Record<string, unknown>) => this.parseBadge(row));
    } catch (error) {
      logger.error('getAllBadges failed', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  getUserBadges(userId: string): Array<Badge & { earnedAt: string; isNew: boolean }> {
    if (!this.db) return [];
    try {
      const r = this.db.prepare('SELECT b.*, ub.earned_at, ub.is_new FROM badges b JOIN user_badges ub ON b.id = ub.badge_id WHERE ub.user_id = ? ORDER BY ub.earned_at DESC').all(userId) as Record<string, unknown>[];
      return r.map((row: Record<string, unknown>) => ({ ...this.parseBadge(row), earnedAt: row.earned_at as string, isNew: Boolean(row.is_new) }));
    } catch (error) {
      logger.error('getUserBadges failed', { context: 'achievementService', metadata: { userId, error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  private checkBadges(userId: string): void {
    if (!this.db) return;
    try {
      const badges = this.getAllBadges();
      const earned = new Set(this.getUserBadges(userId).map(b => b.id));
      const stats = this.getUserStats(userId);
      if (!stats) return;
      for (const badge of badges) {
        if (!earned.has(badge.id) && this.evalBadge(badge, stats)) this.awardBadge(userId, badge.id);
      }
    } catch (error) {
      logger.error('checkBadges failed', { context: 'achievementService', metadata: { userId, error: error instanceof Error ? error.message : String(error) } });
    }
  }

  private awardBadge(userId: string, badgeId: string): void {
    if (!this.db) return;
    try {
      const badge = this.getAllBadges().find(b => b.id === badgeId);
      if (!badge) return;
      const id = uuidv4();
      this.db.prepare('INSERT INTO user_badges (id, user_id, badge_id, earned_at, is_new) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)').run(id, userId, badgeId);
      this.notify({ userId, type: NOTIFICATION_TYPES.BADGE_EARNED, title: 'Badge Earned!', message: `You've earned "${badge.name}"!`, data: { badgeId, rarity: badge.rarity } });
    } catch (error) {
      logger.error('awardBadge failed', { context: 'achievementService', metadata: { userId, badgeId, error: error instanceof Error ? error.message : String(error) } });
    }
  }

  getActiveChallenges(): Challenge[] {
    if (!this.db) return [];
    try {
      const r = this.db.prepare('SELECT * FROM challenges WHERE is_active = 1 AND status = \'active\' AND datetime(start_date) <= datetime(\'now\') AND datetime(end_date) >= datetime(\'now\') ORDER BY end_date ASC').all() as Record<string, unknown>[];
      return r.map((row: Record<string, unknown>) => this.parseChallenge(row));
    } catch (error) {
      logger.error('getActiveChallenges failed', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  getUserChallenges(userId: string): Array<Challenge & { userProgress: Array<{ metric: string; current: number; target: number }>; status: string }> {
    if (!this.db) return [];
    try {
      const r = this.db.prepare('SELECT c.*, uc.progress, uc.status FROM challenges c JOIN user_challenges uc ON c.id = uc.challenge_id WHERE uc.user_id = ? ORDER BY uc.joined_at DESC').all(userId) as Record<string, unknown>[];
      return r.map((row: Record<string, unknown>) => ({ ...this.parseChallenge(row), userProgress: JSON.parse(row.progress as string || '[]'), status: row.status as string }));
    } catch (error) {
      logger.error('getUserChallenges failed', { context: 'achievementService', metadata: { userId, error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  joinChallenge(userId: string, challengeId: string): { success: boolean; message: string } {
    if (!this.db) return { success: false, message: 'DB not initialized' };
    try {
      const challenge = this.getActiveChallenges().find(c => c.id === challengeId);
      if (!challenge) return { success: false, message: 'Challenge not found' };
      const existing = this.db.prepare('SELECT id FROM user_challenges WHERE user_id = ? AND challenge_id = ?').get(userId, challengeId);
      if (existing) return { success: false, message: 'Already joined' };
      const id = uuidv4();
      const progress = challenge.goals.map(g => ({ metric: g.metric, current: 0, target: g.target }));
      this.db.prepare('INSERT INTO user_challenges (id, user_id, challenge_id, progress, status, joined_at) VALUES (?, ?, ?, ?, \'active\', CURRENT_TIMESTAMP)').run(id, userId, challengeId, JSON.stringify(progress));
      return { success: true, message: 'Joined challenge' };
    } catch (error) {
      logger.error('joinChallenge failed', { context: 'achievementService', metadata: { userId, challengeId, error: error instanceof Error ? error.message : String(error) } });
      return { success: false, message: 'Failed to join' };
    }
  }

  updateChallengeProgress(userId: string, challengeId: string, metric: string, inc: number): { success: boolean; completed: boolean; rewards?: { points: number; xp: number } } {
    if (!this.db) return { success: false, completed: false };
    try {
      const uc = this.db.prepare('SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ? AND status = \'active\'').get(userId, challengeId) as Record<string, unknown> | undefined;
      if (!uc) return { success: false, completed: false };
      const progress = JSON.parse(uc.progress as string || '[]') as Array<{ metric: string; current: number; target: number }>;
      const idx = progress.findIndex(g => g.metric === metric);
      if (idx === -1) return { success: false, completed: false };
      progress[idx].current = Math.min(progress[idx].current + inc, progress[idx].target);
      const allDone = progress.every(g => g.current >= g.target);
      const status = allDone ? 'completed' : 'active';
      this.db.prepare('UPDATE user_challenges SET progress = ?, status = ?, completed_at = ? WHERE id = ?').run(JSON.stringify(progress), status, allDone ? new Date().toISOString() : null, uc.id);
      if (allDone) {
        const challenge = this.getActiveChallenges().find(c => c.id === challengeId);
        if (challenge) {
          this.awardPoints(userId, challenge.rewards.points, `challenge_${challengeId}`);
          this.awardXp(userId, challenge.rewards.xp);
          this.notify({ userId, type: NOTIFICATION_TYPES.CHALLENGE_COMPLETED, title: 'Challenge Completed!', message: `Completed "${challenge.name}"!`, data: { challengeId } });
          return { success: true, completed: true, rewards: { points: challenge.rewards.points, xp: challenge.rewards.xp } };
        }
      }
      return { success: true, completed: false };
    } catch (error) {
      logger.error('updateProgress failed', { context: 'achievementService', metadata: { userId, challengeId, error: error instanceof Error ? error.message : String(error) } });
      return { success: false, completed: false };
    }
  }

  getUserStats(userId: string): UserPoints | null {
    if (!this.db) return null;
    try {
      const row = this.db.prepare('SELECT * FROM user_points WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
      if (!row) {
        this.db.prepare('INSERT INTO user_points (user_id, total_points, current_level, xp_for_current_level, xp_to_next_level, lifetime_points, weekly_points, monthly_points, last_updated) VALUES (?, 0, 1, 0, 100, 0, 0, 0, CURRENT_TIMESTAMP)').run(userId);
        return { userId, totalPoints: 0, currentLevel: 1, xpForCurrentLevel: 0, xpToNextLevel: 100, lifetimePoints: 0, weeklyPoints: 0, monthlyPoints: 0, lastUpdated: new Date().toISOString() };
      }
      return { userId: row.user_id as string, totalPoints: row.total_points as number, currentLevel: row.current_level as number, xpForCurrentLevel: row.xp_for_current_level as number, xpToNextLevel: row.xp_to_next_level as number, lifetimePoints: row.lifetime_points as number, weeklyPoints: row.weekly_points as number, monthlyPoints: row.monthly_points as number, lastUpdated: row.last_updated as string };
    } catch (error) {
      logger.error('getUserStats failed', { context: 'achievementService', metadata: { userId, error: error instanceof Error ? error.message : String(error) } });
      return null;
    }
  }

  awardPoints(userId: string, points: number, source: string): void {
    if (!this.db || points <= 0) return;
    try {
      this.getUserStats(userId);
      this.db.prepare('UPDATE user_points SET total_points = total_points + ?, lifetime_points = lifetime_points + ?, weekly_points = weekly_points + ?, monthly_points = monthly_points + ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?').run(points, points, points, points, userId);
      logger.info('Points awarded', { context: 'achievementService', metadata: { userId, points, source } });
    } catch (error) {
      logger.error('awardPoints failed', { context: 'achievementService', metadata: { userId, points, error: error instanceof Error ? error.message : String(error) } });
    }
  }

  awardXp(userId: string, xp: number): { leveledUp: boolean; newLevel: number } {
    if (!this.db || xp <= 0) return { leveledUp: false, newLevel: 1 };
    try {
      const stats = this.getUserStats(userId);
      if (!stats) return { leveledUp: false, newLevel: 1 };
      let newXp = stats.xpForCurrentLevel + xp;
      let level = stats.currentLevel;
      let leveled = false;
      while (newXp >= stats.xpToNextLevel) {
        newXp -= stats.xpToNextLevel;
        level++;
        leveled = true;
        const nextReq = Math.floor(stats.xpToNextLevel * 1.2);
        this.db.prepare('UPDATE user_points SET current_level = ?, xp_for_current_level = ?, xp_to_next_level = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?').run(level, newXp, nextReq, userId);
      }
      if (!leveled) this.db.prepare('UPDATE user_points SET xp_for_current_level = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?').run(newXp, userId);
      if (leveled) this.notify({ userId, type: NOTIFICATION_TYPES.LEVEL_UP, title: 'Level Up!', message: `Reached level ${level}!`, data: { newLevel: level } });
      return { leveledUp: leveled, newLevel: level };
    } catch (error) {
      logger.error('awardXp failed', { context: 'achievementService', metadata: { userId, xp, error: error instanceof Error ? error.message : String(error) } });
      return { leveledUp: false, newLevel: 1 };
    }
  }

  getLeaderboard(timeframe: 'daily' | 'weekly' | 'monthly' | 'lifetime' = 'weekly', limit = 10): Array<{ rank: number; userId: string; points: number; level: number }> {
    if (!this.db) return [];
    try {
      const col = timeframe === 'daily' ? 'weekly_points' : timeframe === 'monthly' ? 'monthly_points' : 'total_points';
      const r = this.db.prepare(`SELECT user_id, ${col} as points, current_level as level FROM user_points ORDER BY ${col} DESC LIMIT ?`).all(limit) as Array<Record<string, unknown>>;
      return r.map((row, i) => ({ rank: i + 1, userId: row.user_id as string, points: row.points as number, level: row.level as number }));
    } catch (error) {
      logger.error('getLeaderboard failed', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  getNotifications(userId: string, unreadOnly = false): Array<{ id: string; type: string; title: string; message: string; data?: Record<string, unknown>; isRead: boolean; createdAt: string }> {
    if (!this.db) return [];
    try {
      let q = 'SELECT * FROM notifications WHERE user_id = ?';
      const p: unknown[] = [userId];
      if (unreadOnly) { q += ' AND is_read = 0'; }
      q += ' ORDER BY created_at DESC LIMIT 50';
      const r = this.db.prepare(q).all(...p) as Record<string, unknown>[];
      return r.map((row: Record<string, unknown>) => ({ id: row.id as string, type: row.type as string, title: row.title as string, message: row.message as string, data: row.data ? JSON.parse(row.data as string) : undefined, isRead: Boolean(row.is_read), createdAt: row.created_at as string }));
    } catch (error) {
      logger.error('getNotifications failed', { context: 'achievementService', metadata: { userId, error: error instanceof Error ? error.message : String(error) } });
      return [];
    }
  }

  markNotificationRead(id: string): void {
    if (!this.db) return;
    try { this.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id); } catch (error) {
      logger.error('markNotificationRead failed', { context: 'achievementService', metadata: { id, error: error instanceof Error ? error.message : String(error) } });
    }
  }

  private notify(data: { userId: string; type: string; title: string; message: string; data?: Record<string, unknown> }): void {
    if (!this.db) return;
    try {
      const id = uuidv4();
      this.db.prepare('INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)').run(id, data.userId, data.type, data.title, data.message, JSON.stringify(data.data));
    } catch (error) {
      logger.error('notify failed', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
    }
  }

  private shouldUpdate(a: Achievement, eventType: string): boolean {
    const m: Record<string, string[]> = { workout_complete: ['workout', 'milestone'], streak_update: ['streak'], challenge_join: ['challenge'], challenge_complete: ['challenge', 'milestone'], login: ['streak'], friend_joined: ['social'], share: ['social'] };
    return m[eventType]?.includes(a.category) || false;
  }

  private calcIncrement(a: Achievement, eventType: string, meta: Record<string, unknown>): number {
    if (a.criteria.type === 'count' && a.criteria.metric === eventType) return 1;
    if (a.criteria.type === 'streak' && eventType === 'streak_update' && a.criteria.metric === (meta.streakType as string)) return 1;
    if (a.criteria.type === 'value' && a.criteria.metric === eventType) return (meta.value as number) || 1;
    return 0;
  }

  private upsertAchievement(userId: string, achievementId: string, progress: number, completed: boolean): void {
    if (!this.db) return;
    try {
      const existing = this.db.prepare('SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?').get(userId, achievementId);
      if (existing) {
        this.db.prepare('UPDATE user_achievements SET progress = ?, is_completed = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND achievement_id = ?').run(progress, completed ? 1 : 0, completed ? new Date().toISOString() : null, userId, achievementId);
      } else {
        const id = uuidv4();
        this.db.prepare('INSERT INTO user_achievements (id, user_id, achievement_id, progress, is_completed, completed_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, achievementId, progress, completed ? 1 : 0, completed ? new Date().toISOString() : null);
      }
    } catch (error) {
      logger.error('upsertAchievement failed', { context: 'achievementService', metadata: { error: error instanceof Error ? error.message : String(error) } });
    }
  }

  private evalBadge(badge: Badge, stats: UserPoints): boolean {
    const r = badge.requirements;
    if (r.type === 'achievement_count') return stats.totalPoints >= r.target * 10;
    if (r.type === 'points') return stats.totalPoints >= r.target;
    if (r.type === 'workout_count') return stats.lifetimePoints >= r.target * 5;
    return false;
  }

  private parseAchievement(row: Record<string, unknown>): Achievement {
    return { id: row.id as string, name: row.name as string, description: row.description as string, icon: row.icon as string, tier: row.tier as Achievement['tier'], category: row.category as Achievement['category'], points: row.points as number, criteria: JSON.parse(row.criteria as string || '{}'), isActive: Boolean(row.is_active), createdAt: row.created_at as string | undefined, updatedAt: row.updated_at as string | undefined };
  }

  private parseBadge(row: Record<string, unknown>): Badge {
    return { id: row.id as string, name: row.name as string, description: row.description as string, iconUrl: row.icon_url as string, rarity: row.rarity as Badge['rarity'], requirements: JSON.parse(row.requirements as string || '{}'), isActive: Boolean(row.is_active), createdAt: row.created_at as string | undefined, updatedAt: row.updated_at as string | undefined };
  }

  private parseChallenge(row: Record<string, unknown>): Challenge {
    return { id: row.id as string, name: row.name as string, description: row.description as string, type: row.type as Challenge['type'], icon: row.icon as string, goals: JSON.parse(row.goals as string || '[]'), duration: row.duration as number, startDate: row.start_date as string, endDate: row.end_date as string, rewards: JSON.parse(row.rewards as string || '{}'), isActive: Boolean(row.is_active), isGlobal: Boolean(row.is_global), createdAt: row.created_at as string | undefined, updatedAt: row.updated_at as string | undefined };
  }
}

let service: AchievementService | null = null;
export const getAchievementService = (db: DatabaseType | null): AchievementService => {
  if (!service) service = new AchievementService(db);
  return service;
};
export default AchievementService;
