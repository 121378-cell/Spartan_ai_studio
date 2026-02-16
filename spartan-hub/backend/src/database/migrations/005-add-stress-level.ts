/**
 * Database Migration 005: Add Stress Level to Daily Summaries
 */

const Database = require('better-sqlite3');
type DatabaseType = any;

export const addStressLevelColumn = (db: DatabaseType) => {
    try {
        // Check if column already exists
        const info = db.pragma('table_info(daily_biometric_summaries)') as any[];
        const hasStressLevel = info.some(column => column.name === 'stressLevel');

        if (!hasStressLevel) {
            db.exec('ALTER TABLE daily_biometric_summaries ADD COLUMN stressLevel REAL');
            console.log('Added column stressLevel to daily_biometric_summaries');
        }
    } catch (error) {
        console.error('Error adding stressLevel column:', error);
        // Ignore error if it's already there
    }
};

export default addStressLevelColumn;
