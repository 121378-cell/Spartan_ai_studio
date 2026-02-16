import { Router } from 'express';
import {
  getUserAchievements,
  getUserAchievementProgress,
  getAvailableAchievements,
  checkUnlockedAchievements,
  getUserAchievementStats
} from '../controllers/achievementsController';

import {
  createChallenge,
  joinChallenge,
  updateChallengeProgress,
  updateUserStreak,
  recordSocialInteraction,
  getUserActiveChallenges,
  getUserStreaks,
  getLeaderboard,
  getAvailableChallenges
} from '../controllers/engagementController';

import {
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
  createPost,
  likePost,
  unlikePost,
  addComment,
  shareWorkout,
  likeWorkout,
  createGroupChallenge,
  joinGroupChallenge,
  getUserFeed,
  searchUsers
} from '../controllers/communityController';

import {
  trackActivity,
  calculateEngagementScore,
  predictChurnRisk,
  getUserRetentionMetrics,
  getCohortAnalysis,
  getUsersNeedingIntervention,
  recordIntervention,
  getRetentionDashboard
} from '../controllers/retentionController';

const router = Router();

// Achievement Routes
router.get('/achievements/user/:userId', getUserAchievements);
router.get('/achievements/user/:userId/progress', getUserAchievementProgress);
router.get('/achievements/available', getAvailableAchievements);
router.post('/achievements/user/:userId/check', checkUnlockedAchievements);
router.get('/achievements/user/:userId/stats', getUserAchievementStats);

// Engagement Routes
router.post('/engagement/challenges', createChallenge);
router.post('/engagement/challenges/:userId/:challengeId/join', joinChallenge);
router.put('/engagement/challenges/:userId/:challengeId/progress', updateChallengeProgress);
router.post('/engagement/streaks/:userId/:streakType/update', updateUserStreak);
router.post('/engagement/social-interactions', recordSocialInteraction);
router.get('/engagement/challenges/user/:userId/active', getUserActiveChallenges);
router.get('/engagement/streaks/user/:userId', getUserStreaks);
router.get('/engagement/leaderboard', getLeaderboard);
router.get('/engagement/challenges/user/:userId/available', getAvailableChallenges);

// Community Routes
router.post('/community/users/:followerId/follow/:followedId', followUser);
router.delete('/community/users/:followerId/unfollow/:followedId', unfollowUser);
router.get('/community/users/:userId/followers', getUserFollowers);
router.get('/community/users/:userId/following', getUserFollowing);
router.post('/community/posts/:userId', createPost);
router.post('/community/posts/:userId/:postId/like', likePost);
router.delete('/community/posts/:userId/:postId/unlike', unlikePost);
router.post('/community/posts/:postId/comments', addComment);
router.post('/community/workouts/:userId/share', shareWorkout);
router.post('/community/workouts/:userId/:workoutId/like', likeWorkout);
router.post('/community/group-challenges', createGroupChallenge);
router.post('/community/group-challenges/:userId/:challengeId/join', joinGroupChallenge);
router.get('/community/feed/:userId', getUserFeed);
router.get('/community/users/search', searchUsers);

// Retention Analytics Routes
router.post('/analytics/activity/:userId', trackActivity);
router.get('/analytics/engagement/:userId/score', calculateEngagementScore);
router.get('/analytics/churn/:userId/predict', predictChurnRisk);
router.get('/analytics/retention/:userId/metrics', getUserRetentionMetrics);
router.get('/analytics/cohort-analysis', getCohortAnalysis);
router.get('/analytics/intervention/users', getUsersNeedingIntervention);
router.post('/analytics/intervention/:userId', recordIntervention);
router.get('/analytics/dashboard', getRetentionDashboard);

export default router;