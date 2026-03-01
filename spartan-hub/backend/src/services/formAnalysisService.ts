/**
 * Form Analysis Service
 * 
 * Handles business logic for video form analysis.
 * Phase A: Video Form Analysis MVP
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import {
  FormAnalysis,
  CreateFormAnalysisDTO,
  UpdateFormAnalysisDTO,
  FormAnalysisFilters
} from '../models/FormAnalysis';

export class FormAnalysisService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Create a new form analysis record
   */
  create(dto: CreateFormAnalysisDTO): FormAnalysis {
    const id = uuidv4();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO form_analyses (id, userId, exerciseType, formScore, metrics, warnings, recommendations, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.userId,
      dto.exerciseType,
      dto.formScore,
      JSON.stringify(dto.metrics),
      JSON.stringify(dto.warnings),
      JSON.stringify(dto.recommendations),
      now
    );

    logger.info('Form analysis created', {
      context: 'form-analysis',
      metadata: {
        id,
        userId: dto.userId,
        exerciseType: dto.exerciseType,
        formScore: dto.formScore
      }
    });

    return {
      id,
      userId: dto.userId,
      exerciseType: dto.exerciseType,
      formScore: dto.formScore,
      metrics: dto.metrics,
      warnings: dto.warnings,
      recommendations: dto.recommendations,
      createdAt: now
    };
  }

  /**
   * Find form analysis by ID
   */
  findById(id: string): FormAnalysis | null {
    const stmt = this.db.prepare('SELECT * FROM form_analyses WHERE id = ?');
    const result = stmt.get(id) as any;

    if (!result) {
      return null;
    }

    return this.mapToFormAnalysis(result);
  }

  /**
   * Find all form analyses for a user
   */
  findByUserId(userId: string, limit: number = 50): FormAnalysis[] {
    const stmt = this.db.prepare(`
      SELECT * FROM form_analyses 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT ?
    `);

    const results = stmt.all(userId, limit) as any[];
    return results.map(r => this.mapToFormAnalysis(r));
  }

  /**
   * Find form analyses with filters
   */
  find(filters: FormAnalysisFilters): FormAnalysis[] {
    let query = 'SELECT * FROM form_analyses WHERE 1=1';
    const params: any[] = [];

    if (filters.userId) {
      query += ' AND userId = ?';
      params.push(filters.userId);
    }

    if (filters.exerciseType) {
      query += ' AND exerciseType = ?';
      params.push(filters.exerciseType);
    }

    if (filters.minScore !== undefined) {
      query += ' AND formScore >= ?';
      params.push(filters.minScore);
    }

    if (filters.maxScore !== undefined) {
      query += ' AND formScore <= ?';
      params.push(filters.maxScore);
    }

    if (filters.startDate) {
      query += ' AND createdAt >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND createdAt <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY createdAt DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as any[];
    return results.map(r => this.mapToFormAnalysis(r));
  }

  /**
   * Update form analysis
   */
  update(id: string, dto: UpdateFormAnalysisDTO): FormAnalysis | null {
    const existing = this.findById(id);
    if (!existing) {
      logger.warn('Form analysis not found for update', {
        context: 'form-analysis',
        metadata: { id }
      });
      return null;
    }

    const updates: string[] = [];
    const updateParams: any[] = [];

    if (dto.formScore !== undefined) {
      updates.push('formScore = ?');
      updateParams.push(dto.formScore);
    }

    if (dto.metrics) {
      updates.push('metrics = ?');
      updateParams.push(JSON.stringify({ ...existing.metrics, ...dto.metrics }));
    }

    if (dto.warnings) {
      updates.push('warnings = ?');
      updateParams.push(JSON.stringify(dto.warnings));
    }

    if (dto.recommendations) {
      updates.push('recommendations = ?');
      updateParams.push(JSON.stringify(dto.recommendations));
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('id = ?');
    updateParams.push(id);

    const stmt = this.db.prepare(`
      UPDATE form_analyses 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...updateParams);

    logger.info('Form analysis updated', {
      context: 'form-analysis',
      metadata: { id }
    });

    return this.findById(id);
  }

  /**
   * Delete form analysis
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM form_analyses WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
      logger.info('Form analysis deleted', {
        context: 'form-analysis',
        metadata: { id }
      });
      return true;
    }

    logger.warn('Form analysis not found for deletion', {
      context: 'form-analysis',
      metadata: { id }
    });
    return false;
  }

  /**
   * Get user's form analysis statistics
   */
  getUserStats(userId: string): {
    totalAnalyses: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    byExerciseType: Record<string, { count: number; averageScore: number }>;
  } {
    // Get basic stats
    const statsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as totalAnalyses,
        AVG(formScore) as averageScore,
        MAX(formScore) as bestScore,
        MIN(formScore) as worstScore
      FROM form_analyses
      WHERE userId = ?
    `);

    const stats = statsStmt.get(userId) as any;

    // Get stats by exercise type
    const byTypeStmt = this.db.prepare(`
      SELECT 
        exerciseType,
        COUNT(*) as count,
        AVG(formScore) as averageScore
      FROM form_analyses
      WHERE userId = ?
      GROUP BY exerciseType
    `);

    const byTypeResults = byTypeStmt.all(userId) as any[];
    const byExerciseType: Record<string, { count: number; averageScore: number }> = {};
    byTypeResults.forEach(r => {
      byExerciseType[r.exerciseType] = {
        count: r.count,
        averageScore: r.averageScore
      };
    });

    return {
      totalAnalyses: stats.totalAnalyses || 0,
      averageScore: stats.averageScore || 0,
      bestScore: stats.bestScore || 0,
      worstScore: stats.worstScore || 0,
      byExerciseType
    };
  }

  /**
   * Helper: Map database row to FormAnalysis object
   */
  private mapToFormAnalysis(row: any): FormAnalysis {
    return {
      id: row.id,
      userId: row.userId,
      exerciseType: row.exerciseType as any,
      formScore: row.formScore,
      metrics: JSON.parse(row.metrics),
      warnings: JSON.parse(row.warnings),
      recommendations: JSON.parse(row.recommendations),
      createdAt: row.createdAt
    };
  }
}

// Singleton instance (for backwards compatibility)
let instance: FormAnalysisService | null = null;

export function getFormAnalysisService(db?: Database): FormAnalysisService {
  if (!db) {
    throw new Error('Database instance required');
  }
  
  if (!instance) {
    instance = new FormAnalysisService(db);
  }
  
  return instance;
}

export default FormAnalysisService;
