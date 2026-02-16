import { getDatabase } from '../database/databaseManager';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface FormAnalysisData {
    id?: string;
    userId: string;
    exerciseType: string;
    formScore: number;
    metrics: any;
    warnings: string[];
    recommendations: string[];
    createdAt?: number;
}

export class FormAnalysis {
    /**
     * Create a new form analysis entry
     */
    static create(data: FormAnalysisData): FormAnalysisData {
        const db = getDatabase();
        const id = data.id || uuidv4();
        const createdAt = data.createdAt || Date.now();

        const stmt = db.prepare(`
      INSERT INTO form_analyses (
        id, userId, exerciseType, formScore, metrics, warnings, recommendations, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            id,
            data.userId,
            data.exerciseType,
            data.formScore,
            JSON.stringify(data.metrics),
            JSON.stringify(data.warnings),
            JSON.stringify(data.recommendations),
            createdAt
        );

        return { ...data, id, createdAt };
    }

    /**
     * Find analysis by ID
     */
    static findById(id: string): FormAnalysisData | null {
        const db = getDatabase();
        const stmt = db.prepare('SELECT * FROM form_analyses WHERE id = ?');
        const row = stmt.get(id) as any;

        if (!row) return null;

        return {
            ...row,
            metrics: JSON.parse(row.metrics),
            warnings: JSON.parse(row.warnings),
            recommendations: JSON.parse(row.recommendations)
        };
    }

    /**
     * Find latest analysis for user and exercise
     */
    static findLatest(userId: string, exerciseType?: string): FormAnalysisData | null {
        const db = getDatabase();
        let query = 'SELECT * FROM form_analyses WHERE userId = ?';
        const params: any[] = [userId];

        if (exerciseType) {
            query += ' AND exerciseType = ?';
            params.push(exerciseType);
        }

        query += ' ORDER BY createdAt DESC LIMIT 1';

        const stmt = db.prepare(query);
        const row = stmt.get(...params) as any;

        if (!row) return null;

        return {
            ...row,
            metrics: JSON.parse(row.metrics),
            warnings: JSON.parse(row.warnings),
            recommendations: JSON.parse(row.recommendations)
        };
    }

    /**
     * Get user analysis history
     */
    static findByUser(userId: string, limit: number = 20): FormAnalysisData[] {
        const db = getDatabase();
        const stmt = db.prepare(`
      SELECT * FROM form_analyses 
      WHERE userId = ? 
      ORDER BY createdAt DESC 
      LIMIT ?
    `);

        const rows = stmt.all(userId, limit) as any[];

        return rows.map(row => ({
            ...row,
            metrics: JSON.parse(row.metrics),
            warnings: JSON.parse(row.warnings),
            recommendations: JSON.parse(row.recommendations)
        }));
    }
}

export default FormAnalysis;
