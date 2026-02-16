/**
 * Engagement Schema - Phase 9: User Engagement & Retention System
 * 
 * Database schema for achievements, badges, challenges, and gamification features.
 * Supports SQLite with PostgreSQL migration path.
 */

import { z } from 'zod';
import { strictStringSchema, userInputSchema } from './validationSchema';

// ============================================================================
// ENUM TYPE DEFINITIONS
// ============================================================================

export enum AchievementTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

export enum AchievementCategory {
  WORKOUT = 'workout',
  STREAK = 'streak',
  SOCIAL = 'social',
  MILESTONE = 'milestone',
  CHALLENGE = 'challenge',
  SPECIAL = 'special'
}

export enum BadgeRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum ChallengeStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

export enum ChallengeType {
  PERSONAL = 'personal',
  TEAM = 'team',
  FRIEND = 'friend',
  COMMUNITY = 'community'
}

export enum NotificationType {
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  BADGE_EARNED = 'badge_earned',
  CHALLENGE_COMPLETED = 'challenge_completed',
  STREAK_MILESTONE = 'streak_milestone',
  POINTS_MILESTONE = 'points_milestone',
  LEVEL_UP = 'level_up',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  REMINDER = 'reminder'
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Achievement definition schema
 */
export const achievementSchema = z.object({
  id: strictStringSchema(1, 50),
  name: userInputSchema(1, 100),
  description: userInputSchema(1, 500),
  icon: strictStringSchema(1, 255),
  tier: z.nativeEnum(AchievementTier),
  category: z.nativeEnum(AchievementCategory),
  points: z.number().int().min(0).max(10000),
  criteria: z.object({
    type: z.enum(['count', 'streak', 'value', 'time']),
    target: z.number().int().min(0),
    metric: z.string().min(1),
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'lifetime']).optional()
  }),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export type Achievement = z.infer<typeof achievementSchema>;

/**
 * User achievement progress schema
 */
export const userAchievementSchema = z.object({
  id: strictStringSchema(1, 50),
  userId: strictStringSchema(1, 50),
  achievementId: strictStringSchema(1, 50),
  progress: z.number().int().min(0),
  isCompleted: z.boolean().default(false),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type UserAchievement = z.infer<typeof userAchievementSchema>;

/**
 * Badge definition schema
 */
export const badgeSchema = z.object({
  id: strictStringSchema(1, 50),
  name: userInputSchema(1, 100),
  description: userInputSchema(1, 500),
  iconUrl: strictStringSchema(1, 255),
  rarity: z.nativeEnum(BadgeRarity),
  requirements: z.object({
    type: z.enum(['achievement_count', 'points', 'streak', 'workout_count', 'special']),
    target: z.number().int().min(0)
  }),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export type Badge = z.infer<typeof badgeSchema>;

/**
 * User badge earned schema
 */
export const userBadgeSchema = z.object({
  id: strictStringSchema(1, 50),
  userId: strictStringSchema(1, 50),
  badgeId: strictStringSchema(1, 50),
  earnedAt: z.string().datetime(),
  isNew: z.boolean().default(true)
});

export type UserBadge = z.infer<typeof userBadgeSchema>;

/**
 * Challenge definition schema
 */
export const challengeSchema = z.object({
  id: strictStringSchema(1, 50),
  name: userInputSchema(1, 100),
  description: userInputSchema(1, 500),
  type: z.nativeEnum(ChallengeType),
  icon: strictStringSchema(1, 255),
  goals: z.array(z.object({
    metric: z.string().min(1),
    target: z.number().int().min(0),
    current: z.number().int().min(0).default(0)
  })),
  duration: z.number().int().min(1), // days
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  rewards: z.object({
    points: z.number().int().min(0).default(0),
    badgeId: strictStringSchema(1, 50).optional(),
    xp: z.number().int().min(0).default(0)
  }),
  isActive: z.boolean().default(true),
  isGlobal: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export type Challenge = z.infer<typeof challengeSchema>;

/**
 * User challenge participation schema
 */
export const userChallengeSchema = z.object({
  id: strictStringSchema(1, 50),
  userId: strictStringSchema(1, 50),
  challengeId: strictStringSchema(1, 50),
  progress: z.array(z.object({
    metric: z.string().min(1),
    current: z.number().int().min(0),
    target: z.number().int().min(0)
  })),
  status: z.nativeEnum(ChallengeStatus),
  joinedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  isTeamChallenge: z.boolean().default(false),
  teamId: strictStringSchema(1, 50).optional()
});

export type UserChallenge = z.infer<typeof userChallengeSchema>;

/**
 * User points and level schema
 */
export const userPointsSchema = z.object({
  userId: strictStringSchema(1, 50).optional(),
  totalPoints: z.number().int().min(0).default(0),
  currentLevel: z.number().int().min(1).default(1),
  xpForCurrentLevel: z.number().int().min(0).default(0),
  xpToNextLevel: z.number().int().min(0).default(100),
  lifetimePoints: z.number().int().min(0).default(0),
  weeklyPoints: z.number().int().min(0).default(0),
  monthlyPoints: z.number().int().min(0).default(0),
  lastUpdated: z.string().datetime()
});

export type UserPoints = z.infer<typeof userPointsSchema>;

/**
 * Engagement event schema for tracking user actions
 */
export const engagementEventSchema = z.object({
  id: strictStringSchema(1, 50),
  userId: strictStringSchema(1, 50),
  eventType: z.enum([
    'workout_complete',
    'streak_update',
    'challenge_join',
    'challenge_complete',
    'achievement_unlocked',
    'badge_earned',
    'level_up',
    'login',
    'friend_joined',
    'share'
  ]),
  metadata: z.record(z.string(), z.any()).optional(),
  timestamp: z.string().datetime()
});

export type EngagementEvent = z.infer<typeof engagementEventSchema>;

/**
 * Notification schema
 */
export const notificationSchema = z.object({
  id: strictStringSchema(1, 50),
  userId: strictStringSchema(1, 50),
  type: z.nativeEnum(NotificationType),
  title: userInputSchema(1, 200),
  message: userInputSchema(1, 500),
  data: z.record(z.string(), z.any()).optional(),
  isRead: z.boolean().default(false),
  createdAt: z.string().datetime()
});

export type Notification = z.infer<typeof notificationSchema>;

// ============================================================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================================================

export const getAchievementsSchema = z.object({
  query: z.object({
    category: z.nativeEnum(AchievementCategory).optional(),
    tier: z.nativeEnum(AchievementTier).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0)
  })
});

export const getUserAchievementsSchema = z.object({
  params: z.object({
    userId: strictStringSchema(1, 50)
  }),
  query: z.object({
    includeCompleted: z.boolean().optional().default(true),
    limit: z.coerce.number().int().min(1).max(100).optional().default(50)
  })
});

export const claimAchievementSchema = z.object({
  body: z.object({
    userId: strictStringSchema(1, 50),
    achievementId: strictStringSchema(1, 50)
  })
});

export const getChallengesSchema = z.object({
  query: z.object({
    status: z.nativeEnum(ChallengeStatus).optional(),
    type: z.nativeEnum(ChallengeType).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
  })
});

export const joinChallengeSchema = z.object({
  body: z.object({
    userId: strictStringSchema(1, 50),
    challengeId: strictStringSchema(1, 50)
  })
});

export const getLeaderboardSchema = z.object({
  query: z.object({
    timeframe: z.enum(['daily', 'weekly', 'monthly', 'lifetime']).optional().default('weekly'),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10)
  })
});

export const getUserStatsSchema = z.object({
  params: z.object({
    userId: strictStringSchema(1, 50)
  })
});

export const recordEngagementEventSchema = z.object({
  body: z.object({
    userId: strictStringSchema(1, 50),
    eventType: engagementEventSchema.shape.eventType,
    metadata: z.record(z.string(), z.any()).optional()
  })
});

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

export const ENGAGEMENT_TABLES_SQL = `
-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  category TEXT NOT NULL CHECK (category IN ('workout', 'streak', 'social', 'milestone', 'challenge', 'special')),
  points INTEGER NOT NULL DEFAULT 0,
  criteria TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User achievements progress table
CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE(user_id, achievement_id)
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  requirements TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User badges earned table
CREATE TABLE IF NOT EXISTS user_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  is_new INTEGER DEFAULT 1,
  FOREIGN KEY (badge_id) REFERENCES badges(id),
  UNIQUE(user_id, badge_id)
);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'team', 'friend', 'community')),
  icon TEXT NOT NULL,
  goals TEXT NOT NULL,
  duration INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  rewards TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  is_global INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User challenges participation table
CREATE TABLE IF NOT EXISTS user_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  progress TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  is_team_challenge INTEGER DEFAULT 0,
  team_id TEXT,
  FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  UNIQUE(user_id, challenge_id)
);

-- User points and levels table
CREATE TABLE IF NOT EXISTS user_points (
  user_id TEXT PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  xp_for_current_level INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  weekly_points INTEGER NOT NULL DEFAULT 0,
  monthly_points INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Engagement events table
CREATE TABLE IF NOT EXISTS engagement_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(is_active, status);
CREATE INDEX IF NOT EXISTS idx_engagement_events_user_id ON engagement_events(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_timestamp ON engagement_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);
`;

export default {
  AchievementTier,
  AchievementCategory,
  BadgeRarity,
  ChallengeStatus,
  ChallengeType,
  NotificationType,
  achievementSchema,
  userAchievementSchema,
  badgeSchema,
  userBadgeSchema,
  challengeSchema,
  userChallengeSchema,
  userPointsSchema,
  engagementEventSchema,
  notificationSchema,
  ENGAGEMENT_TABLES_SQL
};
