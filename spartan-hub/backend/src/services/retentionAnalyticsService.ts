const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../utils/logger';

/**
 * Retention Analytics Service
 * Tracks user engagement, identifies churn risks, and provides retention insights
 */
export class RetentionAnalyticsService {
  private db: DatabaseType;

  constructor(db: DatabaseType) {
    this.db = db;
    this.initializeTables();
  }

  /**
   * Initialize retention analytics tables
   */
  private initializeTables(): void {
    try {
      // User activity tracking
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_activities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          activity_type TEXT NOT NULL,
          activity_data TEXT,
          session_duration INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Churn prediction data
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS churn_predictions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          prediction_score REAL NOT NULL,
          risk_level TEXT NOT NULL CHECK(risk_level IN ('low', 'medium', 'high')),
          factors TEXT,
          predicted_churn_date DATE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // User engagement scores
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_engagement_scores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          engagement_score REAL NOT NULL,
          activity_frequency INTEGER DEFAULT 0,
          last_active_date DATE NOT NULL,
          calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Cohort analysis
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_cohorts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          cohort_month DATE NOT NULL,
          signup_source TEXT,
          user_segment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Retention events
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS retention_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          event_type TEXT NOT NULL,
          event_value REAL,
          related_entity_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Intervention records
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS retention_interventions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          intervention_type TEXT NOT NULL,
          intervention_data TEXT,
          outcome TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Create indexes
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_user_activities_date ON user_activities(created_at)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_churn_predictions_user ON churn_predictions(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_engagement_scores_user ON user_engagement_scores(user_id)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_cohorts_month ON user_cohorts(cohort_month)');
      this.db.exec('CREATE INDEX IF NOT EXISTS idx_retention_events_user ON retention_events(user_id)');

      logger.info('Retention analytics tables initialized successfully', { context: 'analytics' });
    } catch (error) {
      logger.error('Failed to initialize retention analytics tables', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Track user activity
   */
  async trackActivity(userId: number, activityType: string, activityData?: any, sessionDuration?: number): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO user_activities (user_id, activity_type, activity_data, session_duration)
        VALUES (?, ?, ?, ?)
      `);

      stmt.run(userId, activityType, activityData ? JSON.stringify(activityData) : null, sessionDuration || 0);
      
      logger.info('User activity tracked', { context: 'analytics' });
    } catch (error) {
      logger.error('Failed to track user activity', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Calculate user engagement score
   */
  async calculateEngagementScore(userId: number): Promise<number> {
    try {
      // Get activity data for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activitiesStmt = this.db.prepare(`
        SELECT 
          activity_type,
          COUNT(*) as count,
          SUM(session_duration) as total_duration
        FROM user_activities 
        WHERE user_id = ? AND created_at >= ?
        GROUP BY activity_type
      `);

      const activities = activitiesStmt.all(userId, thirtyDaysAgo.toISOString()) as Array<{
        activity_type: string;
        count: number;
        total_duration: number;
      }>;

      // Calculate weighted score based on activity types
      let score = 0;
      const weights = {
        'workout_completed': 10,
        'workout_started': 5,
        'app_login': 3,
        'profile_update': 2,
        'social_interaction': 4,
        'challenge_joined': 6,
        'goal_set': 3,
        'progress_viewed': 2
      };

      for (const activity of activities) {
        const weight = weights[activity.activity_type as keyof typeof weights] || 1;
        score += activity.count * weight + (activity.total_duration / 60) * 0.1; // Duration bonus
      }

      // Normalize score (0-100 scale)
      const normalizedScore = Math.min(100, Math.max(0, score));

      // Store the engagement score
      const storeStmt = this.db.prepare(`
        INSERT INTO user_engagement_scores (user_id, engagement_score, activity_frequency, last_active_date)
        VALUES (?, ?, ?, DATE('now'))
        ON CONFLICT(user_id) DO UPDATE SET 
          engagement_score = excluded.engagement_score,
          activity_frequency = excluded.activity_frequency,
          last_active_date = excluded.last_active_date,
          calculated_at = CURRENT_TIMESTAMP
      `);

      const activityCount = activities.reduce((sum, act) => sum + act.count, 0);
      storeStmt.run(userId, normalizedScore, activityCount);

      logger.info('Engagement score calculated', { context: 'analytics' });
      return normalizedScore;
    } catch (error) {
      logger.error('Failed to calculate engagement score', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Predict churn risk for user
   */
  async predictChurnRisk(userId: number): Promise<{ score: number; riskLevel: 'low' | 'medium' | 'high' }> {
    try {
      // Get user activity patterns
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const activityStmt = this.db.prepare(`
        SELECT 
          activity_type,
          created_at,
          julianday('now') - julianday(created_at) as days_ago
        FROM user_activities 
        WHERE user_id = ? AND created_at >= ?
        ORDER BY created_at DESC
      `);

      const activities = activityStmt.all(userId, ninetyDaysAgo.toISOString()) as Array<{
        activity_type: string;
        created_at: string;
        days_ago: number;
      }>;

      // Calculate churn risk factors
      let riskScore = 0;
      const factors: string[] = [];

      // Factor 1: Days since last activity
      if (activities.length > 0) {
        const daysSinceLast = activities[0].days_ago;
        if (daysSinceLast > 14) {
          riskScore += 40;
          factors.push('inactive_14_days');
        } else if (daysSinceLast > 7) {
          riskScore += 20;
          factors.push('inactive_7_days');
        }
      } else {
        riskScore += 60;
        factors.push('no_recent_activity');
      }

      // Factor 2: Activity frequency decline
      const recentActivities = activities.filter(a => a.days_ago <= 30).length;
      const olderActivities = activities.filter(a => a.days_ago > 30 && a.days_ago <= 60).length;
      
      if (olderActivities > 0 && recentActivities < olderActivities * 0.5) {
        riskScore += 25;
        factors.push('declining_activity');
      }

      // Factor 3: Missing key activities
      const activityTypes = new Set(activities.map(a => a.activity_type));
      const keyActivities = ['workout_completed', 'app_login'];
      
      for (const keyActivity of keyActivities) {
        if (!activityTypes.has(keyActivity)) {
          riskScore += 15;
          factors.push(`missing_${keyActivity}`);
        }
      }

      // Factor 4: Engagement score
      const engagementStmt = this.db.prepare('SELECT engagement_score FROM user_engagement_scores WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1');
      const engagement = engagementStmt.get(userId) as { engagement_score: number } | undefined;
      
      if (engagement) {
        if (engagement.engagement_score < 30) {
          riskScore += 20;
          factors.push('low_engagement');
        } else if (engagement.engagement_score < 60) {
          riskScore += 10;
          factors.push('medium_engagement');
        }
      }

      // Normalize and categorize risk
      const normalizedScore = Math.min(100, Math.max(0, riskScore));
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      
      if (normalizedScore >= 70) {
        riskLevel = 'high';
      } else if (normalizedScore >= 40) {
        riskLevel = 'medium';
      }

      // Store prediction
      const storeStmt = this.db.prepare(`
        INSERT INTO churn_predictions (user_id, prediction_score, risk_level, factors, predicted_churn_date)
        VALUES (?, ?, ?, ?, DATE('now', '+30 days'))
      `);

      storeStmt.run(userId, normalizedScore, riskLevel, JSON.stringify(factors));

      logger.info('Churn risk predicted', { context: 'analytics' });
      return { score: normalizedScore, riskLevel };
    } catch (error) {
      logger.error('Failed to predict churn risk', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get user retention metrics
   */
  async getUserRetentionMetrics(userId: number): Promise<any> {
    try {
      // Get basic user info
      const userStmt = this.db.prepare('SELECT created_at FROM users WHERE id = ?');
      const user = userStmt.get(userId) as { created_at: string } | undefined;

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate days since signup
      const signupDate = new Date(user.created_at);
      const today = new Date();
      const daysSinceSignup = Math.floor((today.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get activity stats
      const activityStatsStmt = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT DATE(created_at)) as active_days,
          COUNT(*) as total_activities,
          MIN(created_at) as first_activity,
          MAX(created_at) as last_activity
        FROM user_activities 
        WHERE user_id = ?
      `);

      const activityStats = activityStatsStmt.get(userId) as {
        active_days: number;
        total_activities: number;
        first_activity: string;
        last_activity: string;
      };

      // Get engagement score
      const engagementStmt = this.db.prepare('SELECT engagement_score FROM user_engagement_scores WHERE user_id = ? ORDER BY calculated_at DESC LIMIT 1');
      const engagement = engagementStmt.get(userId) as { engagement_score: number } | undefined;

      // Get churn prediction
      const churnStmt = this.db.prepare('SELECT prediction_score, risk_level FROM churn_predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
      const churnPrediction = churnStmt.get(userId) as { prediction_score: number; risk_level: string } | undefined;

      const metrics = {
        userId,
        daysSinceSignup,
        activeDays: activityStats.active_days || 0,
        totalActivities: activityStats.total_activities || 0,
        firstActivity: activityStats.first_activity,
        lastActivity: activityStats.last_activity,
        engagementScore: engagement?.engagement_score || 0,
        churnRiskScore: churnPrediction?.prediction_score || 0,
        churnRiskLevel: churnPrediction?.risk_level || 'unknown',
        retentionRate: activityStats.active_days ? (activityStats.active_days / daysSinceSignup) * 100 : 0
      };

      logger.info('User retention metrics retrieved', { context: 'analytics' });
      return metrics;
    } catch (error) {
      logger.error('Failed to get user retention metrics', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(month?: string): Promise<any[]> {
    try {
      let query = `
        SELECT 
          strftime('%Y-%m', uc.cohort_month) as cohort_month,
          COUNT(DISTINCT uc.user_id) as cohort_size,
          COUNT(DISTINCT CASE WHEN ua.created_at IS NOT NULL THEN uc.user_id END) as active_users,
          ROUND(COUNT(DISTINCT CASE WHEN ua.created_at IS NOT NULL THEN uc.user_id END) * 100.0 / 
                COUNT(DISTINCT uc.user_id), 2) as retention_rate
        FROM user_cohorts uc
        LEFT JOIN user_activities ua ON uc.user_id = ua.user_id 
          AND ua.created_at >= uc.cohort_month 
          AND ua.created_at < date(uc.cohort_month, '+1 month')
      `;

      const params: any[] = [];
      
      if (month) {
        query += ' WHERE strftime(\'%Y-%m\', uc.cohort_month) = ?';
        params.push(month);
      }

      query += ' GROUP BY strftime(\'%Y-%m\', uc.cohort_month) ORDER BY cohort_month';

      const stmt = this.db.prepare(query);
      const results = stmt.all(...params);
      
      logger.info('Cohort analysis retrieved', { context: 'analytics' });
      return results as any[];
    } catch (error) {
      logger.error('Failed to get cohort analysis', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Identify users needing intervention
   */
  async getUsersNeedingIntervention(): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          cp.user_id,
          u.username,
          cp.prediction_score,
          cp.risk_level,
          cp.factors,
          ues.engagement_score,
          ues.last_active_date
        FROM churn_predictions cp
        JOIN users u ON cp.user_id = u.id
        JOIN user_engagement_scores ues ON cp.user_id = ues.user_id
        WHERE cp.risk_level IN ('medium', 'high')
          AND cp.created_at = (
            SELECT MAX(created_at) 
            FROM churn_predictions cp2 
            WHERE cp2.user_id = cp.user_id
          )
        ORDER BY cp.prediction_score DESC
      `);

      const users = stmt.all();
      
      logger.info('Users needing intervention identified', { context: 'analytics' });
      return users as any[];
    } catch (error) {
      logger.error('Failed to identify users needing intervention', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Record retention intervention
   */
  async recordIntervention(userId: number, interventionType: string, interventionData?: any): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO retention_interventions (user_id, intervention_type, intervention_data)
        VALUES (?, ?, ?)
      `);

      stmt.run(userId, interventionType, interventionData ? JSON.stringify(interventionData) : null);
      
      logger.info('Retention intervention recorded', { context: 'analytics' });
    } catch (error) {
      logger.error('Failed to record retention intervention', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Get retention dashboard data
   */
  async getRetentionDashboard(): Promise<any> {
    try {
      // Overall retention metrics
      const overallStmt = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN ua.created_at >= date('now', '-30 days') THEN u.id END) as active_last_30_days,
          COUNT(DISTINCT CASE WHEN ua.created_at >= date('now', '-7 days') THEN u.id END) as active_last_7_days,
          AVG(ues.engagement_score) as avg_engagement_score
        FROM users u
        LEFT JOIN user_activities ua ON u.id = ua.user_id
        LEFT JOIN user_engagement_scores ues ON u.id = ues.user_id
      `);

      const overall = overallStmt.get() as {
        total_users: number;
        active_last_30_days: number;
        active_last_7_days: number;
        avg_engagement_score: number;
      };

      // Churn risk distribution
      const churnStmt = this.db.prepare(`
        SELECT 
          risk_level,
          COUNT(*) as count
        FROM churn_predictions
        WHERE created_at = (
          SELECT MAX(created_at) 
          FROM churn_predictions cp2 
          WHERE cp2.user_id = churn_predictions.user_id
        )
        GROUP BY risk_level
      `);

      const churnDistribution = churnStmt.all();

      // Recent interventions
      const interventionsStmt = this.db.prepare(`
        SELECT 
          intervention_type,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM retention_interventions
        WHERE created_at >= date('now', '-30 days')
        GROUP BY intervention_type, DATE(created_at)
        ORDER BY date DESC
      `);

      const recentInterventions = interventionsStmt.all();

      const dashboard = {
        overall: {
          totalUsers: overall.total_users,
          activeLast30Days: overall.active_last_30_days,
          activeLast7Days: overall.active_last_7_days,
          retentionRate30Days: overall.total_users > 0 ? (overall.active_last_30_days / overall.total_users) * 100 : 0,
          avgEngagementScore: overall.avg_engagement_score || 0
        },
        churnDistribution,
        recentInterventions
      };

      logger.info('Retention dashboard data retrieved', { context: 'analytics' });
      return dashboard;
    } catch (error) {
      logger.error('Failed to get retention dashboard', { context: 'analytics', metadata: { error: String(error) } });
      throw error;
    }
  }
}