import { logger } from '../../utils/logger';

/**
 * Migration 013: Add Injury Risk Score
 * Adds injury_risk_score column to form_analysis_sessions
 */

export async function up(db: any): Promise<void> {
    try {
        // Check if column already exists to avoid errors on re-run
        const tableInfo = db.prepare("PRAGMA table_info(form_analysis_sessions)").all();
        const hasColumn = tableInfo.some((col: any) => col.name === 'injury_risk_score');

        if (!hasColumn) {
            db.exec(`
        ALTER TABLE form_analysis_sessions 
        ADD COLUMN injury_risk_score REAL DEFAULT 0
      `);
            logger.info('Migration 013: Added injury_risk_score column to form_analysis_sessions');
        } else {
            logger.info('Migration 013: injury_risk_score column already exists');
        }
    } catch (error) {
        logger.error('Migration 013 failed', { error: String(error) });
        throw error;
    }
}

export async function down(db: any): Promise<void> {
    // SQLite doesn't easily support dropping columns.
    // In a real production environment, we would recreate the table.
    logger.warn('Migration 013 down is not fully implemented (SQLite column drop limitation)');
}
