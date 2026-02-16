import { Request, Response } from 'express';
import { RetentionAnalyticsService } from '../services/retentionAnalyticsService';
import { getDb } from '../database/connection';
import { logger } from '../utils/logger';

/**
 * Track user activity
 */
export const trackActivity = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { activityType, activityData, sessionDuration } = req.body;
    
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    await analyticsService.trackActivity(
      Number(userId),
      activityType,
      activityData,
      sessionDuration
    );
    
    return res.status(200).json({
      success: true,
      message: 'Activity tracked successfully'
    });
  } catch (error) {
    logger.error('Failed to track activity', { 
      context: 'retention-analytics', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to track activity'
    });
  }
};

/**
 * Calculate user engagement score
 */
export const calculateEngagementScore = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    const score = await analyticsService.calculateEngagementScore(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: { engagementScore: score },
      message: 'Engagement score calculated successfully'
    });
  } catch (error) {
    logger.error('Failed to calculate engagement score', { 
      context: 'retention-analytics', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate engagement score'
    });
  }
};

/**
 * Predict churn risk for user
 */
export const predictChurnRisk = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    const prediction = await analyticsService.predictChurnRisk(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: prediction,
      message: 'Churn risk predicted successfully'
    });
  } catch (error) {
    logger.error('Failed to predict churn risk', { 
      context: 'retention-analytics', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to predict churn risk'
    });
  }
};

/**
 * Get user retention metrics
 */
export const getUserRetentionMetrics = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    const metrics = await analyticsService.getUserRetentionMetrics(Number(userId));
    
    return res.status(200).json({
      success: true,
      data: metrics,
      message: 'Retention metrics retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get retention metrics', { 
      context: 'retention-analytics', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve retention metrics'
    });
  }
};

/**
 * Get cohort analysis
 */
export const getCohortAnalysis = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;
    
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    const analysis = await analyticsService.getCohortAnalysis(month as string);
    
    return res.status(200).json({
      success: true,
      data: analysis,
      message: 'Cohort analysis retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get cohort analysis', { 
      context: 'retention-analytics', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve cohort analysis'
    });
  }
};

/**
 * Get users needing intervention
 */
export const getUsersNeedingIntervention = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    const users = await analyticsService.getUsersNeedingIntervention();
    
    return res.status(200).json({
      success: true,
      data: users,
      message: 'Users needing intervention retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get users needing intervention', { 
      context: 'retention-analytics', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users needing intervention'
    });
  }
};

/**
 * Record retention intervention
 */
export const recordIntervention = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { interventionType, interventionData } = req.body;
    
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    await analyticsService.recordIntervention(
      Number(userId),
      interventionType,
      interventionData
    );
    
    return res.status(200).json({
      success: true,
      message: 'Intervention recorded successfully'
    });
  } catch (error) {
    logger.error('Failed to record intervention', { 
      context: 'retention-analytics', 
      metadata: { error: String(error), userId: req.params.userId } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to record intervention'
    });
  }
};

/**
 * Get retention dashboard data
 */
export const getRetentionDashboard = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const analyticsService = new RetentionAnalyticsService(db);
    
    const dashboard = await analyticsService.getRetentionDashboard();
    
    return res.status(200).json({
      success: true,
      data: dashboard,
      message: 'Retention dashboard data retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to get retention dashboard', { 
      context: 'retention-analytics', 
      metadata: { error: String(error) } 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve retention dashboard data'
    });
  }
};