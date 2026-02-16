/**
 * Database Migration 006: Fix Coach Vitalis Columns
 * 
 * Adds missing columns for better decision tracking and alert management:
 * - explanation to vital_coach_decisions
 * - expiresAt to vital_coach_alerts
 */

const Database = require('better-sqlite3');
type DatabaseType = any;
import { logger } from '../../utils/logger';

export const fixCoachVitalisColumns = (db: DatabaseType) => {
    try {
        // 1. Add explanation to vital_coach_decisions
        const decisionInfo = db.pragma('table_info(vital_coach_decisions)') as any[];
        if (!decisionInfo.some(c => c.name === 'explanation')) {
            db.exec('ALTER TABLE vital_coach_decisions ADD COLUMN explanation TEXT');
            logger.info('Added column explanation to vital_coach_decisions');
        }

        // 2. Add expiresAt to vital_coach_alerts
        const alertInfo = db.pragma('table_info(vital_coach_alerts)') as any[];
        if (!alertInfo.some(c => c.name === 'expiresAt')) {
            db.exec('ALTER TABLE vital_coach_alerts ADD COLUMN expiresAt DATETIME');
            logger.info('Added column expiresAt to vital_coach_alerts');
        }
    } catch (error) {
        logger.error('Error fixing Coach Vitalis columns', {
            context: 'database.migration',
            metadata: { error: error instanceof Error ? error.message : String(error) }
        });
    }
};

export default fixCoachVitalisColumns;
