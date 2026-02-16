// Engagement System Types

export interface Achievement {
  id: number;
  userId: number;
  achievementId: string;
  title: string;
  description: string;
  status: 'locked' | 'unlocked' | 'in_progress';
  progress: number;
  requirement: number;
  rewardPoints: number;
  category: string;
  unlockedAt: string;
  createdAt: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rewardPoints: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: 'active' | 'completed' | 'failed' | 'expired';
  progressPercentage: number;
  joinedDate?: string;
  completionDate?: string;
  earnedPoints: number;
  isJoined: boolean;
}

export interface Streak {
  id: number;
  userId: number;
  streakType: 'workout' | 'login' | 'completion';
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  id: number;
  username: string;
  totalPoints: number;
  challengesCompleted: number;
  workoutStreak: number;
  rank?: number;
}

export interface EngagementEvent {
  id: number;
  userId: number;
  eventType: string;
  eventData: Record<string, any>;
  pointsEarned: number;
  createdAt: string;
}

// Community System Types

export interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  level?: string;
  points?: number;
  isFollowing?: boolean;
  createdAt: string;
}

export interface CommunityPost {
  id: number;
  userId: number;
  author: User;
  content: string;
  mediaUrl?: string;
  likesCount: number;
  commentsCount: number;
  likedByUser: boolean;
  visibility: 'public' | 'friends' | 'private';
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  author?: User;
  content: string;
  likesCount: number;
  parentCommentId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutShare {
  id: number;
  userId: number;
  author: User;
  workoutData: any;
  description?: string;
  likesCount: number;
  sharesCount: number;
  isPublic: boolean;
  createdAt: string;
}

export interface GroupChallenge {
  id: number;
  creatorId: number;
  creator: User;
  title: string;
  description: string;
  goalType: 'distance' | 'time' | 'calories' | 'workouts';
  goalValue: number;
  startDate: string;
  endDate: string;
  maxParticipants?: number;
  currentParticipants: number;
  isActive: boolean;
  participants: ChallengeParticipant[];
  createdAt: string;
}

export interface ChallengeParticipant {
  id: number;
  challengeId: number;
  userId: number;
  user: User;
  progressValue: number;
  joinedAt: string;
  completedAt?: string;
}

// Retention Analytics Types

export interface UserActivity {
  id: number;
  userId: number;
  activityType: string;
  activityData: Record<string, any>;
  sessionDuration: number;
  createdAt: string;
}

export interface EngagementScore {
  userId: number;
  engagementScore: number;
  activityFrequency: number;
  lastActiveDate: string;
  calculatedAt: string;
}

export interface ChurnPrediction {
  userId: number;
  predictionScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: string[];
  predictedChurnDate: string;
  createdAt: string;
}

export interface UserRetentionMetrics {
  userId: number;
  daysSinceSignup: number;
  activeDays: number;
  totalActivities: number;
  firstActivity: string;
  lastActivity: string;
  engagementScore: number;
  churnRiskScore: number;
  churnRiskLevel: string;
  retentionRate: number;
}

export interface CohortAnalysis {
  cohortMonth: string;
  cohortSize: number;
  activeUsers: number;
  retentionRate: number;
}

export interface InterventionRecord {
  id: number;
  userId: number;
  interventionType: string;
  interventionData: Record<string, any>;
  outcome?: string;
  createdAt: string;
}

export interface RetentionDashboard {
  overall: {
    totalUsers: number;
    activeLast30Days: number;
    activeLast7Days: number;
    retentionRate30Days: number;
    avgEngagementScore: number;
  };
  churnDistribution: Array<{
    riskLevel: string;
    count: number;
  }>;
  recentInterventions: Array<{
    interventionType: string;
    count: number;
    date: string;
  }>;
}

// WebSocket Event Types

export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export interface ChallengeUpdateEvent extends WebSocketEvent {
  type: 'challenge_updated';
  payload: {
    challengeId: number;
    userId: number;
    progress: number;
    status: string;
  };
}

export interface AchievementUnlockedEvent extends WebSocketEvent {
  type: 'achievement_unlocked';
  payload: {
    userId: number;
    achievement: Achievement;
  };
}

export interface StreakExtendedEvent extends WebSocketEvent {
  type: 'streak_extended';
  payload: {
    userId: number;
    streakType: string;
    newStreak: number;
  };
}

export interface SocialNotificationEvent extends WebSocketEvent {
  type: 'social_notification';
  payload: {
    userId: number;
    notificationType: 'like' | 'comment' | 'follow' | 'mention';
    fromUserId: number;
    relatedId?: number;
  };
}

// API Response Types

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  cached?: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message: string;
}

// Hook Return Types

export interface UseEngagementReturn {
  achievements: Achievement[];
  challenges: Challenge[];
  streaks: Streak[];
  leaderboard: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export interface UseCommunityReturn {
  posts: CommunityPost[];
  following: User[];
  followers: User[];
  loading: boolean;
  error: string | null;
  createPost: (content: string, mediaUrl?: string) => Promise<void>;
  likePost: (postId: number) => Promise<void>;
  addComment: (postId: number, content: string) => Promise<void>;
  followUser: (userId: number) => Promise<void>;
}

export interface UseAnalyticsReturn {
  engagementScore: number | null;
  churnRisk: ChurnPrediction | null;
  retentionMetrics: UserRetentionMetrics | null;
  loading: boolean;
  error: string | null;
  trackActivity: (activityType: string, data?: any) => Promise<void>;
  calculateEngagement: () => Promise<void>;
  predictChurn: () => Promise<void>;
}