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

export interface SocialConnection {
  id: number;
  followerId: number;
  followedId: number;
  status: 'pending' | 'accepted' | 'blocked';
  follower: User;
  followed: User;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'challenge_invite';
  fromUserId: number;
  fromUser: User;
  relatedId?: number;
  relatedType?: 'post' | 'comment' | 'challenge';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface FeedItem {
  id: number;
  type: 'post' | 'workout_share' | 'challenge_update';
  content: any;
  author: User;
  createdAt: string;
  relevanceScore: number;
}

export interface SearchResults {
  users: User[];
  posts: CommunityPost[];
  challenges: GroupChallenge[];
}

export interface CommunityStats {
  totalUsers: number;
  activeUsers24h: number;
  totalPosts: number;
  totalComments: number;
  trendingTopics: string[];
  newUsers24h: number;
}

// API Response Types

export interface CommunityApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedCommunityResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  message: string;
}

// WebSocket Events

export interface CommunityWebSocketEvent {
  type: string;
  payload: any;
  timestamp: string;
}

export interface NewPostEvent extends CommunityWebSocketEvent {
  type: 'new_post';
  payload: {
    post: CommunityPost;
  };
}

export interface PostLikeEvent extends CommunityWebSocketEvent {
  type: 'post_like';
  payload: {
    postId: number;
    userId: number;
    likesCount: number;
  };
}

export interface NewCommentEvent extends CommunityWebSocketEvent {
  type: 'new_comment';
  payload: {
    comment: Comment;
    postId: number;
  };
}

export interface FollowEvent extends CommunityWebSocketEvent {
  type: 'follow';
  payload: {
    followerId: number;
    followedId: number;
    follower: User;
  };
}

export interface ChallengeInviteEvent extends CommunityWebSocketEvent {
  type: 'challenge_invite';
  payload: {
    challengeId: number;
    challenge: GroupChallenge;
    inviterId: number;
    inviter: User;
  };
}

// Hook Return Types

export interface UseCommunityFeedReturn {
  posts: CommunityPost[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export interface UseUserConnectionsReturn {
  following: User[];
  followers: User[];
  pendingRequests: SocialConnection[];
  loading: boolean;
  error: string | null;
  followUser: (userId: number) => Promise<void>;
  unfollowUser: (userId: number) => Promise<void>;
  acceptFollowRequest: (connectionId: number) => Promise<void>;
  rejectFollowRequest: (connectionId: number) => Promise<void>;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => void;
}