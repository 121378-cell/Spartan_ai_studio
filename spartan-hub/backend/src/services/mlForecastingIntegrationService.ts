const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';

/**
 * ML Forecasting Integration Service
 * Integrates form analysis data with ML forecasting models
 */
export class MLForecastingIntegrationService {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
  }

  /**
   * Process form analysis data for ML model integration
   */
  async processFormAnalysisForML(userId: number, sessionId: number, analysisData: any): Promise<void> {
    try {
      // Extract relevant features for ML models
      const mlFeatures = this.extractMLFeatures(analysisData);
      
      // Update user's biometric profile based on form quality
      await this.updateBiometricProfile(userId, analysisData);
      
      // Calculate injury risk adjustment
      const injuryRiskAdjustment = this.calculateInjuryRiskAdjustment(analysisData);
      
      // Calculate CNS fatigue impact
      const cnsFatigueImpact = this.calculateCNSFatigueImpact(analysisData);
      
      // Log ML integration event
      await this.logMLEvent(userId, {
        eventType: 'form_analysis_processed',
        sessionId,
        features: mlFeatures,
        injuryRiskAdjustment,
        cnsFatigueImpact,
        timestamp: new Date().toISOString()
      });

      logger.info('Form analysis processed for ML integration', { 
        userId: userId.toString(), 
        metadata: {
          sessionId: sessionId.toString(),
          injuryRiskAdjustment,
          cnsFatigueImpact
        }
      });
    } catch (error) {
      logger.error('Failed to process form analysis for ML', { 
        context: 'ml-integration', 
        metadata: { error: String(error), userId, sessionId } 
      });
      // Don't throw error as this is supplementary functionality
    }
  }

  /**
   * Extract features for ML models
   */
  private extractMLFeatures(analysisData: any): any {
    const features: any = {};

    // Basic form metrics
    if (analysisData.repData?.score !== undefined) {
      features.form_quality_score = analysisData.repData.score / 100; // Normalize to 0-1
    }

    // Angle-based features
    if (analysisData.repData?.angles) {
      const {angles} = analysisData.repData;
      
      // Knee angle deviation from optimal (90 degrees)
      if (angles.knee_angle !== undefined) {
        features.knee_angle_deviation = Math.abs(angles.knee_angle - 90) / 90;
      }
      
      // Back angle deviation from optimal (180 degrees)
      if (angles.back_angle !== undefined) {
        features.back_angle_deviation = Math.abs(angles.back_angle - 180) / 180;
      }
      
      // Hip angle deviation from optimal (90 degrees)
      if (angles.hip_angle !== undefined) {
        features.hip_angle_deviation = Math.abs(angles.hip_angle - 90) / 90;
      }
    }

    // Movement quality metrics
    if (analysisData.repData?.metrics) {
      const {metrics} = analysisData.repData;
      
      if (metrics.formScore !== undefined) {
        features.form_consistency = metrics.formScore;
      }
      
      if (metrics.tempoScore !== undefined) {
        features.tempo_consistency = metrics.tempoScore;
      }
      
      if (metrics.controlScore !== undefined) {
        features.movement_control = metrics.controlScore;
      }
      
      if (metrics.balanceScore !== undefined) {
        features.balance_stability = metrics.balanceScore;
      }
    }

    // Session-level features
    if (analysisData.sessionStats) {
      features.session_avg_score = analysisData.sessionStats.averageScore / 100;
      features.session_best_score = analysisData.sessionStats.bestScore / 100;
      features.session_worst_score = analysisData.sessionStats.worstScore / 100;
      features.completion_rate = analysisData.sessionStats.completedReps / Math.max(1, analysisData.sessionStats.totalReps);
    }

    // Time-based features
    if (analysisData.repData?.durationMs) {
      features.rep_duration_seconds = analysisData.repData.durationMs / 1000;
    }

    return features;
  }

  /**
   * Update user's biometric profile based on form analysis
   */
  private async updateBiometricProfile(userId: number, analysisData: any): Promise<void> {
    try {
      // Calculate form quality impact on biometric metrics
      const formQuality = analysisData.repData?.score || 0;
      
      // Poor form increases injury risk and CNS fatigue
      let injuryRiskIncrease = 0;
      let cnsFatigueIncrease = 0;
      
      if (formQuality < 60) {
        injuryRiskIncrease = (60 - formQuality) / 100; // Scale 0-0.6
        cnsFatigueIncrease = (60 - formQuality) / 200; // Scale 0-0.3
      } else if (formQuality < 80) {
        injuryRiskIncrease = (80 - formQuality) / 400; // Scale 0-0.05
        cnsFatigueIncrease = (80 - formQuality) / 800; // Scale 0-0.025
      }

      // Update biometric events table with form impact
      const stmt = this.db.prepare(`
        INSERT INTO biometric_events (user_id, event_type, event_value, metadata, timestamp)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      // Log injury risk increase
      if (injuryRiskIncrease > 0) {
        stmt.run(
          userId,
          'form_quality_impact',
          injuryRiskIncrease,
          JSON.stringify({
            impact_type: 'injury_risk_increase',
            original_score: formQuality,
            calculated_increase: injuryRiskIncrease,
            source: 'form_analysis'
          })
        );
      }

      // Log CNS fatigue increase
      if (cnsFatigueIncrease > 0) {
        stmt.run(
          userId,
          'form_quality_impact',
          cnsFatigueIncrease,
          JSON.stringify({
            impact_type: 'cns_fatigue_increase',
            original_score: formQuality,
            calculated_increase: cnsFatigueIncrease,
            source: 'form_analysis'
          })
        );
      }

      logger.info('Biometric profile updated based on form analysis', {
        userId: userId.toString(),
        metadata: {
          formQuality,
          injuryRiskIncrease,
          cnsFatigueIncrease
        }
      });
    } catch (error) {
      logger.error('Failed to update biometric profile', {
        context: 'ml-integration',
        metadata: { error: String(error), userId }
      });
      // Don't throw error as this is supplementary functionality
    }
  }

  /**
   * Calculate injury risk adjustment based on form quality
   */
  private calculateInjuryRiskAdjustment(analysisData: any): number {
    const formScore = analysisData.repData?.score || 100;
    
    // Convert form score to injury risk factor (inverse relationship)
    // Perfect form (100) = 0 injury risk factor
    // Poor form (0) = 1.0 injury risk factor
    const injuryRiskFactor = Math.max(0, (100 - formScore) / 100);
    
    // Apply exponential weighting for severe form issues
    if (formScore < 50) {
      return Math.pow(injuryRiskFactor, 1.5); // Amplify risk for very poor form
    }
    
    return injuryRiskFactor;
  }

  /**
   * Calculate CNS fatigue impact based on form quality
   */
  private calculateCNSFatigueImpact(analysisData: any): number {
    const formScore = analysisData.repData?.score || 100;
    
    // Poor form increases CNS fatigue due to inefficient movement patterns
    // Perfect form (100) = 0 CNS fatigue impact
    // Poor form (0) = 0.5 CNS fatigue impact (50% increase)
    const cnsImpact = Math.max(0, (100 - formScore) / 200);
    
    // Additional impact for specific form violations
    let additionalImpact = 0;
    
    if (analysisData.repData?.angles) {
      const {angles} = analysisData.repData;
      
      // Excessive forward lean significantly increases CNS demand
      if (angles.back_angle !== undefined && angles.back_angle < 150) {
        additionalImpact += 0.1;
      }
      
      // Poor knee tracking increases neuromuscular demand
      if (angles.knee_angle !== undefined && angles.knee_angle > 130) {
        additionalImpact += 0.05;
      }
    }
    
    return Math.min(1, cnsImpact + additionalImpact); // Cap at 100% impact
  }

  /**
   * Log ML integration events for monitoring and debugging
   */
  private async logMLEvent(userId: number, eventData: any): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO ml_integration_events (user_id, event_type, event_data, timestamp)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(
        userId,
        eventData.eventType,
        JSON.stringify(eventData),
        eventData.timestamp
      );
    } catch (error) {
      logger.error('Failed to log ML event', {
        context: 'ml-integration',
        metadata: { error: String(error), userId, eventType: eventData.eventType }
      });
      // Don't throw error as this is supplementary logging
    }
  }

  /**
   * Get user's form-based ML insights
   */
  async getUserFormInsights(userId: number): Promise<any> {
    try {
      // Get recent form analysis sessions
      const sessionsStmt = this.db.prepare(`
        SELECT 
          fas.id as session_id,
          fas.exercise_type,
          fas.average_score,
          fas.session_start,
          COUNT(ra.id) as rep_count
        FROM form_analysis_sessions fas
        LEFT JOIN rep_analyses ra ON fas.id = ra.session_id
        WHERE fas.user_id = ? 
          AND fas.session_end IS NOT NULL
          AND fas.session_start >= datetime('now', '-30 days')
        GROUP BY fas.id
        ORDER BY fas.session_start DESC
        LIMIT 10
      `);

      const recentSessions = sessionsStmt.all(userId) as any[];

      // Calculate form trends
      const insights = this.calculateFormTrends(recentSessions);
      
      // Get injury risk assessment based on recent form
      const injuryRisk = this.assessInjuryRiskFromForm(recentSessions);
      
      // Get CNS fatigue projection
      const cnsProjection = this.projectCNSFatigue(userId);

      const result = {
        userId,
        formTrends: insights,
        injuryRiskAssessment: injuryRisk,
        cnsFatigueProjection: cnsProjection,
        recentSessions: recentSessions.map(session => ({
          sessionId: session.session_id,
          exerciseType: session.exercise_type,
          averageScore: session.average_score,
          sessionDate: session.session_start,
          repCount: session.rep_count
        })),
        generatedAt: new Date().toISOString()
      };

      logger.info('User form insights generated', { userId: userId.toString() });
      return result;
    } catch (error) {
      logger.error('Failed to generate user form insights', {
        context: 'ml-integration',
        metadata: { error: String(error), userId }
      });
      throw error;
    }
  }

  /**
   * Calculate form trends from session data
   */
  private calculateFormTrends(sessions: any[]): any {
    if (sessions.length === 0) {
      return {
        trend: 'insufficient_data',
        averageScore: 0,
        improvementRate: 0,
        consistency: 0
      };
    }

    const scores = sessions.map(s => s.average_score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Calculate improvement rate (simple linear regression approximation)
    let improvementRate = 0;
    if (sessions.length > 1) {
      const firstHalfAvg = scores.slice(0, Math.ceil(scores.length / 2))
        .reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 2);
      const secondHalfAvg = scores.slice(Math.floor(scores.length / 2))
        .reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
      improvementRate = secondHalfAvg - firstHalfAvg;
    }

    // Calculate consistency (coefficient of variation)
    const stdDev = Math.sqrt(
      scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
    );
    const consistency = avgScore > 0 ? (1 - (stdDev / avgScore)) : 0;

    let trend: string;
    if (improvementRate > 5) trend = 'improving';
    else if (improvementRate < -5) trend = 'declining';
    else trend = 'stable';

    return {
      trend,
      averageScore: Math.round(avgScore * 100) / 100,
      improvementRate: Math.round(improvementRate * 100) / 100,
      consistency: Math.round(consistency * 100) / 100
    };
  }

  /**
   * Assess injury risk based on form analysis
   */
  private assessInjuryRiskFromForm(sessions: any[]): any {
    if (sessions.length === 0) {
      return {
        riskLevel: 'unknown',
        riskScore: 0,
        primaryConcerns: []
      };
    }

    const avgScore = sessions.reduce((sum, s) => sum + s.average_score, 0) / sessions.length;
    
    // Convert average score to risk score (inverse relationship)
    const riskScore = Math.max(0, (100 - avgScore) / 100);
    
    let riskLevel: string;
    if (riskScore > 0.7) riskLevel = 'high';
    else if (riskScore > 0.4) riskLevel = 'medium';
    else riskLevel = 'low';

    // Identify primary concerns based on exercise types and scores
    const concerns: string[] = [];
    if (avgScore < 70) {
      concerns.push('General form quality needs improvement');
    }
    
    const exerciseCounts = sessions.reduce((acc, session) => {
      acc[session.exercise_type] = (acc[session.exercise_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostFrequentExercise = Object.entries(exerciseCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0];
    
    if (mostFrequentExercise) {
      concerns.push(`Focus on ${mostFrequentExercise} technique`);
    }

    return {
      riskLevel,
      riskScore: Math.round(riskScore * 100) / 100,
      primaryConcerns: concerns
    };
  }

  /**
   * Project CNS fatigue based on recent form analysis
   */
  private async projectCNSFatigue(userId: number): Promise<any> {
    try {
      // This would typically integrate with existing biometric/CNS tracking
      // For now, providing a basic projection based on form quality
      
      const stmt = this.db.prepare(`
        SELECT 
          AVG(fas.average_score) as avg_form_score,
          COUNT(*) as session_count
        FROM form_analysis_sessions fas
        WHERE fas.user_id = ? 
          AND fas.session_end IS NOT NULL
          AND fas.session_start >= datetime('now', '-7 days')
      `);

      const recentData = stmt.get(userId) as { avg_form_score: number; session_count: number } | undefined;
      
      if (!recentData || recentData.session_count === 0) {
        return {
          projectedFatigue: 0,
          confidence: 'low',
          recommendation: 'Insufficient recent data for CNS projection'
        };
      }

      // Poor recent form suggests higher CNS demand
      const formImpact = Math.max(0, (100 - recentData.avg_form_score) / 200);
      
      // More sessions = more accumulated fatigue
      const volumeImpact = Math.min(0.3, recentData.session_count * 0.05);
      
      const projectedFatigue = Math.min(1, formImpact + volumeImpact);

      let confidence: string;
      if (recentData.session_count >= 5) confidence = 'high';
      else if (recentData.session_count >= 2) confidence = 'medium';
      else confidence = 'low';

      return {
        projectedFatigue: Math.round(projectedFatigue * 100) / 100,
        confidence,
        basedOnSessions: recentData.session_count,
        avgFormScore: Math.round(recentData.avg_form_score * 100) / 100,
        recommendation: projectedFatigue > 0.5 
          ? 'Consider reducing training intensity due to high CNS demand'
          : 'Current CNS load appears manageable'
      };
    } catch (error) {
      logger.error('Failed to project CNS fatigue', {
        context: 'ml-integration',
        metadata: { error: String(error), userId }
      });
      
      return {
        projectedFatigue: 0,
        confidence: 'low',
        recommendation: 'Unable to calculate CNS projection'
      };
    }
  }

  /**
   * Generate comprehensive user insights from form analysis data
   */
  async generateUserInsights(userId: number): Promise<any[]> {
    try {
      // Get recent form analysis data
      const recentSessions = await this.getRecentSessions(userId, 10);
      const formTrends = await this.analyzeFormTrends(recentSessions);
      
      const insights: any[] = [];

      // Performance trend insight
      if (formTrends.overallImprovement !== undefined) {
        insights.push({
          type: 'performance_trend',
          title: this.getPerformanceTitle(formTrends.overallImprovement),
          description: this.getPerformanceDescription(formTrends.overallImprovement, formTrends.consistency),
          severity: this.getPerformanceSeverity(formTrends.overallImprovement),
          recommendation: this.getPerformanceRecommendation(formTrends.overallImprovement),
          confidence: 0.85,
          timestamp: new Date().toISOString()
        });
      }

      // Injury risk insight
      const injuryRisk = await this.assessInjuryRisk(userId, recentSessions);
      if (injuryRisk.riskLevel !== 'low') {
        insights.push({
          type: 'injury_risk',
          title: `Injury Risk: ${injuryRisk.riskLevel.toUpperCase()}`,
          description: injuryRisk.description,
          severity: injuryRisk.riskLevel === 'high' ? 'high' : 'medium',
          recommendation: injuryRisk.recommendation,
          confidence: injuryRisk.confidence,
          timestamp: new Date().toISOString()
        });
      }

      // Training load insight
      const trainingLoad = await this.assessTrainingLoad(userId);
      if (trainingLoad.loadStatus !== 'optimal') {
        insights.push({
          type: 'training_load',
          title: `Training Load: ${trainingLoad.loadStatus.toUpperCase()}`,
          description: trainingLoad.description,
          severity: trainingLoad.severity,
          recommendation: trainingLoad.recommendation,
          confidence: trainingLoad.confidence,
          timestamp: new Date().toISOString()
        });
      }

      // CNS fatigue insight
      const cnsFatigue = await this.assessCNSFatigue(userId);
      if (cnsFatigue.fatigueLevel > 0.6) {
        insights.push({
          type: 'cns_fatigue',
          title: 'Central Nervous System Fatigue Detected',
          description: cnsFatigue.description,
          severity: cnsFatigue.fatigueLevel > 0.8 ? 'high' : 'medium',
          recommendation: cnsFatigue.recommendation,
          confidence: cnsFatigue.confidence,
          timestamp: new Date().toISOString()
        });
      }

      logger.info('User insights generated successfully', { userId: userId.toString(), metadata: { insightCount: insights.length.toString() } });
      return insights;
    } catch (error) {
      logger.error('Failed to generate user insights', { 
        context: 'ml-forecasting-integration', 
        metadata: { error: String(error), userId } 
      });
      throw error;
    }
  }

  /**
   * Get recent workout sessions for analysis
   */
  private async getRecentSessions(userId: number, limit: number = 10): Promise<any[]> {
    // This would query the actual database
    // For now, returning mock data
    return [
      {
        id: 1,
        userId,
        exerciseType: 'squat',
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() - 86300000).toISOString(),
        averageScore: 85,
        totalReps: 10,
        formIssues: []
      },
      {
        id: 2,
        userId,
        exerciseType: 'deadlift',
        startTime: new Date(Date.now() - 172800000).toISOString(),
        endTime: new Date(Date.now() - 172700000).toISOString(),
        averageScore: 78,
        totalReps: 8,
        formIssues: [{ type: 'back_posture', severity: 'medium' }]
      }
    ];
  }

  /**
   * Analyze form trends from session data
   */
  private async analyzeFormTrends(sessions: any[]): Promise<{
    overallImprovement: number;
    consistency: number;
    strongestExercise: string;
    weakestExercise: string;
  }> {
    if (sessions.length < 2) {
      return {
        overallImprovement: 0,
        consistency: 1,
        strongestExercise: 'unknown',
        weakestExercise: 'unknown'
      };
    }

    // Calculate improvement rate
    const scores = sessions.map(s => s.averageScore);
    const recentScores = scores.slice(0, Math.min(3, scores.length));
    const olderScores = scores.slice(Math.min(3, scores.length));
    
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const avgOlder = olderScores.length > 0 
      ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length 
      : avgRecent;
    
    const improvement = ((avgRecent - avgOlder) / avgOlder) * 100;

    // Calculate consistency (inverse of coefficient of variation)
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const consistency = 1 - (stdDev / mean);

    // Find strongest/weakest exercises
    const exerciseScores: Record<string, number[]> = {};
    sessions.forEach(session => {
      if (!exerciseScores[session.exerciseType]) {
        exerciseScores[session.exerciseType] = [];
      }
      exerciseScores[session.exerciseType].push(session.averageScore);
    });

    let strongestExercise = 'unknown';
    let weakestExercise = 'unknown';
    let maxAvg = 0;
    let minAvg = 100;

    Object.entries(exerciseScores).forEach(([exercise, scores]) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > maxAvg) {
        maxAvg = avg;
        strongestExercise = exercise;
      }
      if (avg < minAvg) {
        minAvg = avg;
        weakestExercise = exercise;
      }
    });

    return {
      overallImprovement: improvement,
      consistency,
      strongestExercise,
      weakestExercise
    };
  }

  /**
   * Assess injury risk based on form analysis patterns
   */
  private async assessInjuryRisk(userId: number, sessions: any[]): Promise<{
    riskLevel: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
    confidence: number;
  }> {
    // Count form issues and severity
    const allIssues = sessions.flatMap(session => session.formIssues || []);
    const severeIssues = allIssues.filter(issue => issue.severity === 'high').length;
    const moderateIssues = allIssues.filter(issue => issue.severity === 'medium').length;
    
    const totalIssues = severeIssues + moderateIssues;
    const sessionCount = sessions.length;

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let description = '';
    let recommendation = '';
    let confidence = 0.7;

    if (totalIssues === 0) {
      riskLevel = 'low';
      description = 'No significant form issues detected in recent sessions';
      recommendation = 'Continue current training approach with regular form checks';
    } else if (severeIssues > sessionCount * 0.3 || totalIssues > sessionCount * 0.6) {
      riskLevel = 'high';
      description = 'Multiple severe form issues detected, indicating elevated injury risk';
      recommendation = 'Immediately address form issues with professional guidance and reduced training load';
      confidence = 0.9;
    } else if (moderateIssues > sessionCount * 0.4) {
      riskLevel = 'medium';
      description = 'Several form issues detected that may increase injury risk over time';
      recommendation = 'Focus on technique corrections and consider reducing training intensity';
    }

    return { riskLevel, description, recommendation, confidence };
  }

  /**
   * Assess training load status
   */
  private async assessTrainingLoad(userId: number): Promise<{
    loadStatus: 'underloaded' | 'optimal' | 'overloaded';
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
    confidence: number;
  }> {
    // This would integrate with actual training load data
    // For now, returning mock assessment
    return {
      loadStatus: 'optimal',
      description: 'Training volume appears well-balanced for current fitness level',
      severity: 'low',
      recommendation: 'Maintain current training schedule while monitoring recovery',
      confidence: 0.8
    };
  }

  /**
   * Assess CNS (Central Nervous System) fatigue
   */
  private async assessCNSFatigue(userId: number): Promise<{
    fatigueLevel: number;
    description: string;
    recommendation: string;
    confidence: number;
  }> {
    // This would analyze heart rate variability, sleep data, and performance metrics
    // For now, returning mock assessment
    const fatigueLevel = 0.4; // 0-1 scale
    
    return {
      fatigueLevel,
      description: fatigueLevel > 0.7 
        ? 'High CNS fatigue detected - nervous system may be overtaxed'
        : fatigueLevel > 0.4
          ? 'Moderate CNS fatigue - consider lighter training sessions'
          : 'CNS fatigue levels appear normal',
      recommendation: fatigueLevel > 0.7
        ? 'Take complete rest day and prioritize sleep/recovery'
        : fatigueLevel > 0.4
          ? 'Reduce training intensity and focus on technique work'
          : 'Current training load appears sustainable',
      confidence: 0.75
    };
  }

  /**
   * Get performance trend title
   */
  private getPerformanceTitle(improvement: number): string {
    if (improvement > 10) return 'Significant Performance Improvement';
    if (improvement > 5) return 'Positive Performance Trend';
    if (improvement > -5) return 'Stable Performance Level';
    if (improvement > -15) return 'Performance Decline Detected';
    return 'Significant Performance Drop';
  }

  /**
   * Get performance trend description
   */
  private getPerformanceDescription(improvement: number, consistency: number): string {
    const trendDesc = improvement > 5 
      ? 'showing consistent improvement'
      : improvement < -5
        ? 'experiencing a decline'
        : 'maintaining stable performance';
    
    const consistencyDesc = consistency > 0.8
      ? 'with excellent consistency'
      : consistency > 0.6
        ? 'with good consistency'
        : 'with some variability';
    
    return `Your form quality is ${trendDesc} ${consistencyDesc} across recent sessions.`;
  }

  /**
   * Get performance severity level
   */
  private getPerformanceSeverity(improvement: number): 'low' | 'medium' | 'high' {
    if (Math.abs(improvement) > 15) return 'high';
    if (Math.abs(improvement) > 8) return 'medium';
    return 'low';
  }

  /**
   * Get performance recommendation
   */
  private getPerformanceRecommendation(improvement: number): string {
    if (improvement > 10) return 'Continue current training approach and consider progressive overload';
    if (improvement > 0) return 'Maintain current routine while focusing on consistency';
    if (improvement > -10) return 'Review technique fundamentals and reduce training volume temporarily';
    return 'Seek professional coaching and significantly reduce training load';
  }
}