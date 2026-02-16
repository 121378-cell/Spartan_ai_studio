import { Request, Response } from 'express';
import { CommunityFeaturesService } from '../services/communityFeaturesService';
import { getDb } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Follow a user
 */
export const followUser = async (req: Request, res: Response) => {
  try {
    const { followerId, followedId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    await communityService.followUser(Number(followerId), Number(followedId));
    
    return res.status(200).json({
      success: true,
      message: 'Successfully followed user'
    });
  } catch (error) {
    logger.error('Failed to follow user', { 
      context: 'community', 
      metadata: { error: String(error), followerId: req.params.followerId, followedId: req.params.followedId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to follow user'
    });
  }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const { followerId, followedId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    await communityService.unfollowUser(Number(followerId), Number(followedId));
    
    return res.status(200).json({
      success: true,
      message: 'Successfully unfollowed user'
    });
  } catch (error) {
    logger.error('Failed to unfollow user', { 
      context: 'community', 
      metadata: { error: String(error), followerId: req.params.followerId, followedId: req.params.followedId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to unfollow user'
    });
  }
};

/**
 * Get user followers
 */
export const getUserFollowers = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const followers = await communityService.getUserFollowers(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: followers,
      message: 'Followers retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user followers', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve followers'
    });
  }
};

/**
 * Get user following
 */
export const getUserFollowing = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const following = await communityService.getUserFollowing(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: following,
      message: 'Following users retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user following', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve following users'
    });
  }
};

/**
 * Create a community post
 */
export const createPost = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { content, mediaUrl } = req.body;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const postId = await communityService.createPost(Number(userId), content, mediaUrl);
    
    return res.status(201).json({
      success: true,
      data: { postId },
      message: 'Post created successfully'
    });
  } catch (error) {
    logger.error('Failed to create post', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create post'
    });
  }
};

/**
 * Like a post
 */
export const likePost = async (req: Request, res: Response) => {
  try {
    const { userId, postId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    await communityService.likePost(Number(userId), Number(postId));
    
    return res.status(200).json({
      success: true,
      message: 'Post liked successfully'
    });
  } catch (error) {
    logger.error('Failed to like post', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId, postId: req.params.postId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to like post'
    });
  }
};

/**
 * Unlike a post
 */
export const unlikePost = async (req: Request, res: Response) => {
  try {
    const { userId, postId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    await communityService.unlikePost(Number(userId), Number(postId));
    
    return res.status(200).json({
      success: true,
      message: 'Post unliked successfully'
    });
  } catch (error) {
    logger.error('Failed to unlike post', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId, postId: req.params.postId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to unlike post'
    });
  }
};

/**
 * Add comment to post
 */
export const addComment = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { userId, content, parentCommentId } = req.body;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const commentId = await communityService.addComment(
      Number(postId),
      Number(userId),
      content,
      parentCommentId ? Number(parentCommentId) : undefined
    );
    
    return res.status(201).json({
      success: true,
      data: { commentId },
      message: 'Comment added successfully'
    });
  } catch (error) {
    logger.error('Failed to add comment', { 
      context: 'community', 
      metadata: { error: String(error), postId: req.params.postId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
};

/**
 * Share a workout
 */
export const shareWorkout = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { workoutData, description } = req.body;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const workoutId = await communityService.shareWorkout(Number(userId), workoutData, description);
    
    return res.status(201).json({
      success: true,
      data: { workoutId },
      message: 'Workout shared successfully'
    });
  } catch (error) {
    logger.error('Failed to share workout', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to share workout'
    });
  }
};

/**
 * Like a shared workout
 */
export const likeWorkout = async (req: Request, res: Response) => {
  try {
    const { userId, workoutId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    await communityService.likeWorkout(Number(userId), Number(workoutId));
    
    return res.status(200).json({
      success: true,
      message: 'Workout liked successfully'
    });
  } catch (error) {
    logger.error('Failed to like workout', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId, workoutId: req.params.workoutId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to like workout'
    });
  }
};

/**
 * Create a group challenge
 */
export const createGroupChallenge = async (req: Request, res: Response) => {
  try {
    const { creatorId, title, description, goalType, goalValue, startDate, endDate, maxParticipants } = req.body;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const challengeId = await communityService.createGroupChallenge({
      creatorId: Number(creatorId),
      title,
      description,
      goalType,
      goalValue,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxParticipants
    });
    
    return res.status(201).json({
      success: true,
      data: { challengeId },
      message: 'Group challenge created successfully'
    });
  } catch (error) {
    logger.error('Failed to create group challenge', { 
      context: 'community', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to create group challenge'
    });
  }
};

/**
 * Join a group challenge
 */
export const joinGroupChallenge = async (req: Request, res: Response) => {
  try {
    const { userId, challengeId } = req.params;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    await communityService.joinGroupChallenge(Number(userId), Number(challengeId));
    
    return res.status(200).json({
      success: true,
      message: 'Successfully joined group challenge'
    });
  } catch (error) {
    logger.error('Failed to join group challenge', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId, challengeId: req.params.challengeId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to join group challenge'
    });
  }
};

/**
 * Get user feed
 */
export const getUserFeed = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const feed = await communityService.getUserFeed(Number(userId), Number(limit));
    
    return res.status(200).json({
      success: true,
      data: feed,
      message: 'User feed retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get user feed', { 
      context: 'community', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user feed'
    });
  }
};

/**
 * Search users
 */
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    const { limit = 10 } = req.query;
    
    const db = getDb();
    const communityService = new CommunityFeaturesService(db);
    
    const users = await communityService.searchUsers(String(query), Number(limit));
    
    return res.status(200).json({
      success: true,
      data: users,
      message: 'Users searched successfully'
    });
  } catch (error) {
    logger.error('Failed to search users', { 
      context: 'community', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
};