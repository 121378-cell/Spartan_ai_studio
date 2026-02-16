import { logger } from '../utils/logger';
import { getDatabase } from '../database/databaseManager';
import { MLForecastingService } from './mlForecastingService';

/**
 * Coach Service
 * Manages operations for professional trainers and their assigned athletes.
 */
export class CoachService {
  private db: any;
  private mlService: MLForecastingService;

  constructor() {
    this.db = getDatabase();
    this.mlService = MLForecastingService.getInstance();
  }

  /**
   * Get all athletes assigned to a specific coach
   */
  async getAssignedAthletes(coachId: string) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          ca.assigned_at,
          u.stats
        FROM users u
        JOIN coach_assignments ca ON u.id = ca.athlete_id
        WHERE ca.coach_id = ? AND ca.status = 'active'
      `);

      const athletes = stmt.all(coachId) as any[];

      // Enrich with real-time ML metrics for the coach dashboard
      const enrichedAthletes = await Promise.all(athletes.map(async (athlete) => {
        try {
          const injuryPred = await this.mlService.predictInjuryRisk(athlete.id);
          const stats = JSON.parse(athlete.stats || '{}');
          
          return {
            id: athlete.id,
            name: athlete.name,
            email: athlete.email,
            assignedAt: athlete.assigned_at,
            totalWorkouts: stats.totalWorkouts || 0,
            injuryRisk: injuryPred.probability,
            riskLevel: this.getRiskLevel(injuryPred.probability),
            recommendation: injuryPred.recommendation
          };
        } catch (e) {
          return { ...athlete, injuryRisk: 0, riskLevel: 'low' };
        }
      }));

      return enrichedAthletes;
    } catch (error) {
      logger.error('CoachService: Failed to get assigned athletes', {
        context: 'coach-service',
        metadata: { coachId, error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Assign an athlete to a coach
   */
  async assignAthlete(coachId: string, athleteId: string) {
    try {
      const id = `assignment_${Date.now()}`;
      const stmt = this.db.prepare(`
        INSERT INTO coach_assignments (id, coach_id, athlete_id)
        VALUES (?, ?, ?)
      `);
      stmt.run(id, coachId, athleteId);
      return { success: true, id };
    } catch (error) {
      logger.error('CoachService: Failed to assign athlete', { metadata: { error: String(error) } });
      throw error;
    }
  }

  private getRiskLevel(prob: number): 'low' | 'medium' | 'high' | 'critical' {
    if (prob > 70) return 'critical';
    if (prob > 50) return 'high';
    if (prob > 30) return 'medium';
    return 'low';
  }
}

export const coachService = new CoachService();
