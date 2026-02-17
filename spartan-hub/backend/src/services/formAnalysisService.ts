const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';
import { FormAnalysisDatabaseService } from './formAnalysisDatabaseService';
import { getMLForecastingService } from './mlForecastingService';

/**
 * Form Analysis Service
 * Contains business logic for form analysis operations
 */
export class FormAnalysisService {
  private dbService: FormAnalysisDatabaseService;

  constructor(db: DatabaseType) {
    this.dbService = new FormAnalysisDatabaseService(db);
  }

  /**
   * Process and validate incoming form analysis data
   */
  async processFormAnalysis(userId: number, analysisData: any): Promise<number> {
    try {
      // Validate required fields
      this.validateAnalysisData(analysisData);

      // Start new session if needed
      let sessionId: number;
      if (analysisData.sessionId) {
        sessionId = analysisData.sessionId;
      } else {
        sessionId = await this.dbService.createSession(
          userId,
          analysisData.exerciseType,
          analysisData.notes
        );
      }

      // Process rep data if provided
      if (analysisData.repData) {
        await this.processRepAnalysis(sessionId, analysisData.repData, analysisData.exerciseType);
      }

      // Update session statistics if session is ending
      if (analysisData.isSessionEnd && analysisData.sessionStats) {
        const injuryRiskScore = 1.0 - (analysisData.sessionStats.averageScore / 100);
        const stats = { ...analysisData.sessionStats, injuryRiskScore };

        await this.dbService.endSession(sessionId,
          analysisData.sessionStats.durationSeconds,
          stats
        );

        // Update ML predictions
        await this.updateMLPredictions(userId, stats.averageScore, analysisData.exerciseType);
      }

      logger.info('Form analysis processed successfully', {
        metadata: {
          sessionId: sessionId.toString(),
          userId: userId.toString(),
          exerciseType: analysisData.exerciseType
        }
      });

      return sessionId;
    } catch (error) {
      logger.error('Failed to process form analysis', {
        context: 'form-analysis-service',
        metadata: { error: String(error), userId, exerciseType: analysisData?.exerciseType }
      });
      throw error;
    }
  }

  /**
   * Save a complete form analysis in one call (monolithic)
   */
  async saveAnalysis(userId: string | number, data: any): Promise<number> {
    try {
      this.validateAnalysisData(data);

      const sessionId = await this.dbService.createSession(userId, data.exerciseType, data.notes);

      if (data.reps && Array.isArray(data.reps)) {
        for (const rep of data.reps) {
          await this.processRepAnalysis(sessionId, rep, data.exerciseType);
        }
      } else if (data.metrics) {
        // If it's a summary result from frontend like in the POC
        const repData = {
          repNumber: 1,
          score: data.formScore,
          keypoints: data.keypoints || {},
          angles: data.angles || {},
          metrics: data.metrics || {},
          feedback: data.recommendations?.join('. ')
        };
        await this.processRepAnalysis(sessionId, repData, data.exerciseType);
      }

      const stats = data.sessionStats || {
        averageScore: data.formScore || 0,
        bestScore: data.formScore || 0,
        worstScore: data.formScore || 0,
        totalReps: data.reps?.length || (data.metrics ? 1 : 0),
        completedReps: data.reps?.length || (data.metrics ? 1 : 0)
      };

      const injuryRiskScore = 1.0 - (stats.averageScore / 100);
      stats.injuryRiskScore = injuryRiskScore;

      await this.dbService.endSession(sessionId, data.durationSeconds || 0, stats);

      await this.updateMLPredictions(userId, stats.averageScore, data.exerciseType);

      return sessionId;
    } catch (error) {
      logger.error('Failed to save monolithic form analysis', {
        context: 'form-analysis-service',
        metadata: { error: String(error), userId, exerciseType: data?.exerciseType }
      });
      throw error;
    }
  }

  /**
   * Update ML forecasts with form data
   */
  private async updateMLPredictions(userId: string | number, formScore: number, exerciseType: string): Promise<void> {
    try {
      const mlService = getMLForecastingService();
      const riskFactor = 1.0 - (formScore / 100);

      await mlService.updateWithFormData({
        userId: userId.toString(),
        formScore,
        exerciseType,
        riskFactor,
        timestamp: new Date()
      });

      logger.info('ML predictions updated with form analysis', {
        metadata: { userId: userId.toString(), formScore, exerciseType }
      });
    } catch (error) {
      logger.warn('Failed to update ML predictions but continuing', {
        metadata: { error: String(error) }
      });
    }
  }

  /**
   * Validate form analysis data structure
   */
  private validateAnalysisData(data: any): void {
    if (!data.exerciseType) {
      throw new Error('Exercise type is required');
    }

    // Valid exercise types aligned with frontend ExerciseType
    const validExercises = [
      'squat', 'deadlift', 'push_up', 'overhead_press', 'bench_press',
      'row', 'pull_up', 'lunge', 'plank', 'custom'
    ];
    // Normalize legacy exercise type names for backward compatibility
    const normalizedType = data.exerciseType === 'pushup' ? 'push_up' :
                          data.exerciseType === 'pullup' ? 'pull_up' : data.exerciseType;
    if (!validExercises.includes(normalizedType)) {
      throw new Error(`Invalid exercise type: ${data.exerciseType}. Valid types: ${validExercises.join(', ')}`);
    }
    data.exerciseType = normalizedType;

    if (data.repData) {
      if (data.repData.score === undefined || data.repData.score < 0 || data.repData.score > 100) {
        throw new Error('Rep score must be between 0 and 100');
      }

      if (!data.repData.repNumber || data.repData.repNumber <= 0) {
        throw new Error('Valid rep number is required');
      }
    }

    if (data.sessionStats) {
      const requiredStats = ['averageScore', 'bestScore', 'worstScore', 'totalReps', 'completedReps'];
      for (const stat of requiredStats) {
        if (data.sessionStats[stat] === undefined) {
          throw new Error(`Missing required session statistic: ${stat}`);
        }
      }
    }
  }

  /**
   * Process individual rep analysis data
   */
  private async processRepAnalysis(sessionId: number, repData: any, exerciseType?: string): Promise<number> {
    try {
      // Calculate additional metrics if not provided
      const processedRepData = await this.enhanceRepData(repData, exerciseType);

      // Add to database
      const repId = await this.dbService.addRepAnalysis(sessionId, processedRepData);

      // Generate automatic feedback based on analysis
      await this.generateAutomaticFeedback(sessionId, repId, processedRepData, exerciseType);

      return repId;
    } catch (error) {
      logger.error('Failed to process rep analysis', {
        context: 'form-analysis-service',
        metadata: { error: String(error), sessionId, repNumber: repData?.repNumber }
      });
      throw error;
    }
  }

  /**
   * Enhance rep data with calculated metrics
   */
  private async enhanceRepData(repData: any, exerciseType?: string): Promise<any> {
    const enhancedData = { ...repData };

    // Calculate duration if start/end times provided
    if (repData.startTime && repData.endTime) {
      const start = new Date(repData.startTime);
      const end = new Date(repData.endTime);
      enhancedData.durationMs = end.getTime() - start.getTime();
    }

    // Calculate composite score if individual metrics provided
    if (repData.metrics) {
      enhancedData.score = this.calculateCompositeScore(repData.metrics);
    }

    // Generate basic feedback if not provided
    if (!enhancedData.feedback && repData.angles) {
      enhancedData.feedback = this.generateBasicFeedback(repData.angles, repData.metrics, exerciseType);
    }

    return enhancedData;
  }

  /**
   * Calculate composite score from individual metrics
   */
  private calculateCompositeScore(metrics: any): number {
    if (!metrics) return 0;

    const weights = {
      form: 0.4,
      timing: 0.3,
      control: 0.2,
      balance: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    // Form quality (0-1 scale)
    if (metrics.formScore !== undefined) {
      totalScore += metrics.formScore * 100 * weights.form;
      totalWeight += weights.form;
    }

    // Timing consistency (0-1 scale)
    if (metrics.tempoScore !== undefined) {
      totalScore += metrics.tempoScore * 100 * weights.timing;
      totalWeight += weights.timing;
    }

    // Control/movement quality (0-1 scale)
    if (metrics.controlScore !== undefined) {
      totalScore += metrics.controlScore * 100 * weights.control;
      totalWeight += weights.control;
    }

    // Balance/stability (0-1 scale)
    if (metrics.balanceScore !== undefined) {
      totalScore += metrics.balanceScore * 100 * weights.balance;
      totalWeight += weights.balance;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Generate basic feedback from angle measurements
   */
  private generateBasicFeedback(angles: any, metrics: any, exerciseType?: string): string {
    const feedbackParts: string[] = [];

    switch (exerciseType) {
    case 'push_up':
      return this.generatePushUpFeedback(angles, metrics);
    case 'plank':
      return this.generatePlankFeedback(angles, metrics);
    case 'row':
      return this.generateRowFeedback(angles, metrics);
    default:
      return this.generateGenericFeedback(angles, metrics);
    }
  }

  private generatePushUpFeedback(angles: any, metrics: any): string {
    const feedbackParts: string[] = [];

    if (metrics?.depth !== undefined && metrics.depth < 0.8) {
      feedbackParts.push('Aim for deeper push-ups - chest closer to ground');
    }
    if (metrics?.backStraightness !== undefined && metrics.backStraightness < 0.85) {
      feedbackParts.push('Maintain a straight line from head to heels');
    }
    if (metrics?.elbowAngle !== undefined && metrics.elbowAngle > 80) {
      feedbackParts.push('Keep elbows closer to body at 45 degrees');
    }
    if (metrics?.armExtension !== undefined && metrics.armExtension < 0.9) {
      feedbackParts.push('Extend arms fully at the top');
    }

    if (feedbackParts.length === 0) {
      feedbackParts.push('Excellent push-up form!');
    }

    return feedbackParts.join('. ') + '.';
  }

  private generatePlankFeedback(angles: any, metrics: any): string {
    const feedbackParts: string[] = [];

    if (metrics?.bodyAlignment !== undefined && metrics.bodyAlignment < 0.8) {
      feedbackParts.push('Keep body in a straight line from head to heels');
    }
    if (metrics?.hipPosition !== undefined && metrics.hipPosition < 0.8) {
      feedbackParts.push('Avoid sagging or piking hips');
    }
    if (metrics?.coreEngagement !== undefined && metrics.coreEngagement < 0.7) {
      feedbackParts.push('Engage your core more actively');
    }
    if (metrics?.shoulderStability !== undefined && metrics.shoulderStability < 0.7) {
      feedbackParts.push('Keep shoulders stacked over wrists');
    }

    if (feedbackParts.length === 0) {
      feedbackParts.push('Perfect plank position maintained!');
    }

    return feedbackParts.join('. ') + '.';
  }

  private generateRowFeedback(angles: any, metrics: any): string {
    const feedbackParts: string[] = [];

    if (metrics?.elbowRetraction !== undefined && metrics.elbowRetraction < 80) {
      feedbackParts.push('Pull elbows further back for full contraction');
    }
    if (metrics?.backStraightness !== undefined && metrics.backStraightness < 0.8) {
      feedbackParts.push('Maintain neutral spine throughout the movement');
    }
    if (metrics?.shoulderBladeMovement !== undefined && metrics.shoulderBladeMovement < 0.7) {
      feedbackParts.push('Focus on squeezing shoulder blades together');
    }
    if (metrics?.torsoAngle !== undefined && metrics.torsoAngle < 0.3) {
      feedbackParts.push('Maintain proper hinge angle at hips');
    }

    if (feedbackParts.length === 0) {
      feedbackParts.push('Excellent row technique with great scapular retraction!');
    }

    return feedbackParts.join('. ') + '.';
  }

  private generateGenericFeedback(angles: any, metrics: any): string {
    const feedbackParts: string[] = [];

    if (angles.knee_angle !== undefined) {
      if (angles.knee_angle < 70) {
        feedbackParts.push('Knees bending adequately');
      } else if (angles.knee_angle > 120) {
        feedbackParts.push('Consider deeper knee bend');
      }
    }

    if (angles.back_angle !== undefined) {
      if (angles.back_angle < 160) {
        feedbackParts.push('Maintain straighter back position');
      } else {
        feedbackParts.push('Good back alignment');
      }
    }

    if (angles.hip_angle !== undefined) {
      if (angles.hip_angle < 60) {
        feedbackParts.push('Hip hinge needs adjustment');
      } else if (angles.hip_angle > 100) {
        feedbackParts.push('Good hip mobility');
      }
    }

    if (metrics?.controlScore !== undefined && metrics.controlScore < 0.7) {
      feedbackParts.push('Focus on controlled movement');
    }

    if (metrics?.balanceScore !== undefined && metrics.balanceScore < 0.6) {
      feedbackParts.push('Work on stability and balance');
    }

    return feedbackParts.length > 0
      ? feedbackParts.join('. ') + '.'
      : 'Good form overall!';
  }

  /**
   * Generate automatic feedback based on analysis results
   */
  private async generateAutomaticFeedback(sessionId: number, repId: number, repData: any, exerciseType?: string): Promise<void> {
    try {
      const feedbackItems: Array<{
        feedbackType: 'correction' | 'encouragement' | 'tip' | 'warning';
        bodyPart: string;
        issue: string;
        suggestion: string;
        severity: 'low' | 'medium' | 'high';
      }> = [];

      // Generate exercise-specific feedback
      switch (exerciseType) {
      case 'push_up':
        this.generatePushUpAutomaticFeedback(repData, feedbackItems);
        break;
      case 'plank':
        this.generatePlankAutomaticFeedback(repData, feedbackItems);
        break;
      case 'row':
        this.generateRowAutomaticFeedback(repData, feedbackItems);
        break;
      default:
        this.generateGenericAutomaticFeedback(repData, feedbackItems);
      }

      // Add encouragement for good performance
      if (repData.score >= 90) {
        feedbackItems.push({
          feedbackType: 'encouragement',
          bodyPart: 'overall',
          issue: 'Excellent form execution',
          suggestion: 'Keep up the great work!',
          severity: 'low'
        });
      } else if (repData.score >= 80) {
        feedbackItems.push({
          feedbackType: 'encouragement',
          bodyPart: 'overall',
          issue: 'Good form with minor improvements',
          suggestion: 'Solid execution, small adjustments needed',
          severity: 'low'
        });
      }

      // Save feedback items
      const sessionDetails = await this.dbService.getSessionDetails(sessionId);
      const userId = sessionDetails.user_id;

      for (const feedback of feedbackItems) {
        await this.dbService.addFeedback({
          userId,
          sessionId,
          repId,
          ...feedback
        });
      }

      if (feedbackItems.length > 0) {
        logger.info('Automatic feedback generated', {
          metadata: {
            sessionId: sessionId.toString(),
            repId: repId.toString(),
            feedbackCount: feedbackItems.length
          }
        });
      }
    } catch (error) {
      logger.error('Failed to generate automatic feedback', {
        context: 'form-analysis-service',
        metadata: { error: String(error), sessionId: sessionId.toString(), repId: repId.toString() }
      });
      // Don't throw error as this is supplementary functionality
    }
  }

  private generatePushUpAutomaticFeedback(repData: any, feedbackItems: any[]): void {
    if (repData.metrics) {
      if (repData.metrics.depth !== undefined && repData.metrics.depth < 0.8) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'chest',
          issue: 'Insufficient depth in push-up',
          suggestion: 'Lower chest closer to the ground for full range of motion',
          severity: 'medium'
        });
      }
      if (repData.metrics.backStraightness !== undefined && repData.metrics.backStraightness < 0.85) {
        feedbackItems.push({
          feedbackType: 'warning',
          bodyPart: 'back',
          issue: 'Sagging or arching back',
          suggestion: 'Engage core and glutes to maintain straight body line',
          severity: 'high'
        });
      }
      if (repData.metrics.elbowAngle !== undefined && repData.metrics.elbowAngle > 80) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'elbows',
          issue: 'Elbows flaring out too wide',
          suggestion: 'Keep elbows at 45 degrees from body for optimal shoulder health',
          severity: 'medium'
        });
      }
      if (repData.metrics.armExtension !== undefined && repData.metrics.armExtension < 0.9) {
        feedbackItems.push({
          feedbackType: 'tip',
          bodyPart: 'arms',
          issue: 'Incomplete arm extension',
          suggestion: 'Fully extend arms at the top of each rep',
          severity: 'low'
        });
      }
    }
  }

  private generatePlankAutomaticFeedback(repData: any, feedbackItems: any[]): void {
    if (repData.metrics) {
      if (repData.metrics.bodyAlignment !== undefined && repData.metrics.bodyAlignment < 0.8) {
        feedbackItems.push({
          feedbackType: 'warning',
          bodyPart: 'body',
          issue: 'Body alignment breakdown',
          suggestion: 'Maintain straight line from head to heels throughout hold',
          severity: 'high'
        });
      }
      if (repData.metrics.hipPosition !== undefined && repData.metrics.hipPosition < 0.8) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'hips',
          issue: 'Hip position incorrect',
          suggestion: 'Keep hips level - avoid sagging or piking',
          severity: 'medium'
        });
      }
      if (repData.metrics.coreEngagement !== undefined && repData.metrics.coreEngagement < 0.7) {
        feedbackItems.push({
          feedbackType: 'tip',
          bodyPart: 'core',
          issue: 'Insufficient core activation',
          suggestion: 'Draw belly button toward spine and brace abs',
          severity: 'medium'
        });
      }
      if (repData.metrics.shoulderStability !== undefined && repData.metrics.shoulderStability < 0.7) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'shoulders',
          issue: 'Unstable shoulder position',
          suggestion: 'Stack shoulders directly over wrists',
          severity: 'medium'
        });
      }
    }
  }

  private generateRowAutomaticFeedback(repData: any, feedbackItems: any[]): void {
    if (repData.metrics) {
      if (repData.metrics.elbowRetraction !== undefined && repData.metrics.elbowRetraction < 80) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'back',
          issue: 'Incomplete pull - limited range of motion',
          suggestion: 'Pull elbows further back to fully engage back muscles',
          severity: 'medium'
        });
      }
      if (repData.metrics.backStraightness !== undefined && repData.metrics.backStraightness < 0.8) {
        feedbackItems.push({
          feedbackType: 'warning',
          bodyPart: 'back',
          issue: 'Rounded back during row',
          suggestion: 'Maintain neutral spine throughout the movement',
          severity: 'high'
        });
      }
      if (repData.metrics.shoulderBladeMovement !== undefined && repData.metrics.shoulderBladeMovement < 0.7) {
        feedbackItems.push({
          feedbackType: 'tip',
          bodyPart: 'shoulders',
          issue: 'Limited scapular retraction',
          suggestion: 'Focus on squeezing shoulder blades together at top of pull',
          severity: 'medium'
        });
      }
      if (repData.metrics.torsoAngle !== undefined && repData.metrics.torsoAngle < 0.3) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'torso',
          issue: 'Incorrect torso angle',
          suggestion: 'Maintain consistent hinge angle throughout exercise',
          severity: 'low'
        });
      }
    }
  }

  private generateGenericAutomaticFeedback(repData: any, feedbackItems: any[]): void {
    if (repData.angles) {
      if (repData.angles.knee_angle !== undefined && repData.angles.knee_angle > 130) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'knees',
          issue: 'Insufficient knee bend depth',
          suggestion: 'Aim for deeper knee flexion while maintaining proper form',
          severity: 'medium'
        });
      }
      if (repData.angles.back_angle !== undefined && repData.angles.back_angle < 150) {
        feedbackItems.push({
          feedbackType: 'warning',
          bodyPart: 'back',
          issue: 'Excessive forward lean',
          suggestion: 'Keep chest up and maintain neutral spine position',
          severity: 'high'
        });
      }
      if (repData.angles.hip_angle !== undefined && repData.angles.hip_angle < 50) {
        feedbackItems.push({
          feedbackType: 'correction',
          bodyPart: 'hips',
          issue: 'Limited hip mobility',
          suggestion: 'Focus on hip hinge movement pattern',
          severity: 'medium'
        });
      }
    }
  }

  /**
   * Get comprehensive user progress report
   */
  async getUserProgressReport(userId: number, exerciseType?: string): Promise<any> {
    try {
      const stats = await this.dbService.getUserExerciseStats(userId, exerciseType);

      // Calculate improvement metrics
      const progressReport = stats.map((stat: any) => {
        const improvementRate = this.calculateImprovementRate(userId, stat.exercise_type);
        const consistencyScore = this.calculateConsistencyScore(userId, stat.exercise_type);

        return {
          ...stat,
          improvementRate,
          consistencyScore,
          performanceTrend: this.determinePerformanceTrend(improvementRate),
          recommendation: this.generateExerciseRecommendation(stat, improvementRate, consistencyScore)
        };
      });

      logger.info('User progress report generated', { metadata: { userId: userId.toString(), exerciseType } });
      return progressReport;
    } catch (error) {
      logger.error('Failed to generate user progress report', {
        context: 'form-analysis-service',
        metadata: { error: String(error), userId, exerciseType }
      });
      throw error;
    }
  }

  /**
   * Calculate improvement rate for an exercise
   */
  private calculateImprovementRate(userId: number, exerciseType: string): number {
    // This would typically query historical session data
    // For now, returning a placeholder calculation
    return Math.random() * 20 - 10; // -10% to +10% improvement
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(userId: number, exerciseType: string): number {
    // This would analyze score variance across sessions
    // For now, returning a placeholder score
    return 75 + Math.random() * 20; // 75-95 consistency score
  }

  /**
   * Determine performance trend
   */
  private determinePerformanceTrend(improvementRate: number): string {
    if (improvementRate > 5) return 'improving';
    if (improvementRate < -5) return 'declining';
    return 'stable';
  }

  /**
   * Generate exercise recommendation
   */
  private generateExerciseRecommendation(stat: any, improvementRate: number, consistencyScore: number): string {
    const recommendations: string[] = [];

    if (stat.avg_score < 70) {
      recommendations.push('Focus on form fundamentals and technique');
    }

    if (consistencyScore < 70) {
      recommendations.push('Practice regularly to build consistency');
    }

    if (improvementRate < 0) {
      recommendations.push('Review technique and consider professional guidance');
    } else if (improvementRate > 10) {
      recommendations.push('Great progress! Consider increasing intensity');
    }

    return recommendations.length > 0
      ? recommendations.join('. ')
      : 'Maintain current routine and focus on gradual improvement';
  }

  /**
   * Get form analysis summary for a workout session
   */
  async getFormAnalysisSummary(sessionId: number): Promise<any> {
    const session = await this.dbService.getSessionDetails(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const reps = await this.dbService.getRepAnalysesBySession(sessionId);
    if (reps.length === 0) {
      throw new Error(`No rep analyses found for session ${sessionId}`);
    }

    const avgScore = reps.reduce((sum, rep) => sum + rep.form_score, 0) / reps.length;
    const muscleGroupScores: Record<string, number[]> = {};

    // Group scores by muscle group
    reps.forEach(rep => {
      rep.muscle_groups?.forEach((mg: string) => {
        if (!muscleGroupScores[mg]) muscleGroupScores[mg] = [];
        muscleGroupScores[mg].push(rep.form_score);
      });
    });

    const muscleGroups = Object.entries(muscleGroupScores).map(([group, scores]) => ({
      muscleGroup: group,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      totalReps: scores.length
    }));

    return {
      sessionId,
      totalReps: reps.length,
      averageFormScore: Math.round(avgScore * 100) / 100,
      muscleGroups,
      recommendations: this.generateSummaryRecommendations(reps),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Compare form analysis between two sessions
   */
  async compareSessions(sessionId1: number, sessionId2: number): Promise<any> {
    const [summary1, summary2] = await Promise.all([
      this.getFormAnalysisSummary(sessionId1),
      this.getFormAnalysisSummary(sessionId2)
    ]);

    const scoreImprovement = summary2.averageFormScore - summary1.averageFormScore;
    const repIncrease = summary2.totalReps - summary1.totalReps;

    // Compare muscle group performance
    const muscleGroupChanges: any[] = [];
    const mg1Map = new Map(summary1.muscleGroups.map((mg: any) => [mg.muscleGroup, mg]));
    const mg2Map = new Map(summary2.muscleGroups.map((mg: any) => [mg.muscleGroup, mg]));

    [...new Set([...mg1Map.keys(), ...mg2Map.keys()])].forEach(group => {
      const mg1 = mg1Map.get(group);
      const mg2 = mg2Map.get(group);

      if (mg1 && mg2) {
        muscleGroupChanges.push({
          muscleGroup: group,
          scoreChange: (mg2 as any).averageScore - (mg1 as any).averageScore,
          repCountChange: (mg2 as any).totalReps - (mg1 as any).totalReps
        });
      }
    });

    return {
      sessionId1,
      sessionId2,
      scoreImprovement,
      repIncrease,
      muscleGroupChanges,
      overallProgress: scoreImprovement > 0 ? 'improved' : scoreImprovement < 0 ? 'declined' : 'maintained',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get historical form trends for a user
   */
  async getUserFormTrends(userId: number, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.dbService.getSessionsByUserId(userId);
    const recentSessions = sessions.filter(s => new Date(s.start_time) >= startDate);

    const trends: any[] = [];

    for (const session of recentSessions) {
      try {
        const summary = await this.getFormAnalysisSummary(session.id);
        trends.push({
          date: session.start_time,
          averageScore: summary.averageFormScore,
          totalReps: summary.totalReps,
          muscleGroups: summary.muscleGroups.map((mg: any) => mg.muscleGroup)
        });
      } catch (error) {
        // Skip sessions without form analysis data
        continue;
      }
    }

    return trends.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Generate personalized form improvement plan
   */
  async generateImprovementPlan(userId: number): Promise<any> {
    const trends = await this.getUserFormTrends(userId, 60); // Last 60 days

    if (trends.length < 3) {
      return {
        userId,
        goals: [],
        exercises: [],
        timeline: '2 weeks',
        priorityAreas: []
      };
    }

    // Calculate trend direction
    const scores = trends.map(t => t.averageScore);
    const recentScores = scores.slice(-5);
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const overallAvg = scores.reduce((a, b) => a + b, 0) / scores.length;

    const improving = avgRecent > overallAvg;
    const priorityAreas = this.identifyPriorityAreas(trends);

    return {
      userId,
      goals: [
        {
          id: 'form_improvement',
          title: improving ? 'Maintain Progress' : 'Improve Form Quality',
          description: improving
            ? 'Continue building on recent form improvements'
            : 'Focus on technique corrections to boost form scores',
          targetCompletion: '2 weeks',
          metrics: ['average_form_score']
        }
      ],
      exercises: this.recommendExercises(priorityAreas),
      timeline: '2 weeks',
      priorityAreas
    };
  }

  /**
   * Identify priority areas for improvement based on trends
   */
  private identifyPriorityAreas(trends: any[]): any[] {
    const priorityAreas: any[] = [];

    // Analyze muscle group performance
    const muscleGroupPerformance: Record<string, number[]> = {};

    trends.forEach(trend => {
      trend.muscleGroups.forEach((group: string) => {
        if (!muscleGroupPerformance[group]) {
          muscleGroupPerformance[group] = [];
        }
        // Find trends with this muscle group and get their scores
        const relevantTrend = trends.find(t => t.muscleGroups.includes(group));
        if (relevantTrend) {
          muscleGroupPerformance[group].push(relevantTrend.averageScore);
        }
      });
    });

    // Identify underperforming muscle groups
    Object.entries(muscleGroupPerformance).forEach(([group, scores]) => {
      if (scores.length > 2) {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore < 7.0) { // Below acceptable threshold
          priorityAreas.push({
            area: `${group}_technique`,
            currentLevel: avgScore,
            targetLevel: 8.5,
            difficulty: avgScore < 5 ? 'high' : 'medium'
          });
        }
      }
    });

    return priorityAreas;
  }

  /**
   * Recommend exercises based on priority areas
   */
  private recommendExercises(priorityAreas: any[]): any[] {
    const exerciseMap: Record<string, any> = {
      chest_technique: {
        id: 'chest_form_drills',
        name: 'Chest Form Drills',
        description: 'Isolation exercises to improve chest engagement and positioning',
        sets: 3,
        reps: 12,
        restTime: 90,
        intensity: 'light',
        equipment: ['dumbbells', 'bench']
      },
      shoulders_technique: {
        id: 'shoulder_stability',
        name: 'Shoulder Stability Work',
        description: 'Exercises to improve shoulder blade positioning and joint stability',
        sets: 3,
        reps: 15,
        restTime: 60,
        intensity: 'light',
        equipment: ['resistance_band', 'wall']
      },
      triceps_technique: {
        id: 'tricep_isolation',
        name: 'Tricep Isolation Drills',
        description: 'Focused work on tricep engagement and lockout technique',
        sets: 3,
        reps: 12,
        restTime: 75,
        intensity: 'moderate',
        equipment: ['cable_machine', 'dumbbell']
      }
    };

    return priorityAreas
      .map(area => exerciseMap[area.area])
      .filter(Boolean);
  }

  /**
   * Generate form improvement recommendations for summary
   */
  private generateSummaryRecommendations(repAnalyses: any[]): any[] {
    const recommendations: any[] = [];

    // Analyze common form issues
    const issues = repAnalyses.flatMap(rep => rep.form_issues || []);
    const issueCounts: Record<string, number> = {};

    issues.forEach(issue => {
      issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
    });

    // Generate recommendations based on frequency of issues
    Object.entries(issueCounts).forEach(([type, count]) => {
      if (count > repAnalyses.length * 0.3) { // 30% threshold
        recommendations.push({
          type: 'form_correction',
          priority: 'high',
          message: `Focus on correcting ${type.replace('_', ' ')} in future workouts`,
          exercise: 'general'
        });
      } else if (count > repAnalyses.length * 0.15) { // 15% threshold
        recommendations.push({
          type: 'form_correction',
          priority: 'medium',
          message: `Monitor ${type.replace('_', ' ')} technique`,
          exercise: 'general'
        });
      }
    });

    // Add positive reinforcement for good form
    const goodFormCount = repAnalyses.filter(rep => rep.form_score >= 8.0).length;
    if (goodFormCount > repAnalyses.length * 0.7) {
      recommendations.push({
        type: 'positive_reinforcement',
        priority: 'low',
        message: 'Excellent form consistency! Continue maintaining this quality',
        exercise: 'general'
      });
    }

    return recommendations;
  }
}
