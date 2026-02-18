/**
 * Biometric Persistence Service
 *
 * Handles database operations for biometric data storage and retrieval.
 * Provides a unified interface for accessing data across different sources.
 */

import Database from 'better-sqlite3';
type DatabaseType = any;
import { getDatabase } from '../database/databaseManager';
import { logger } from '../utils/logger';
import { DailyBiometrics } from '../models/BiometricData';

export interface BiometricSummary {
    userId: string;
    date: string;
    heartRateAvg?: number;
    hrvAvg?: number;
    stressLevelAvg?: number;
    sleepDuration?: number;
    trainingLoad?: number;
}

export class BiometricPersistenceService {
  private static instance: BiometricPersistenceService;
  private db: any;

  private constructor() {
    this.db = getDatabase();
  }

  public static getInstance(): BiometricPersistenceService {
    if (!BiometricPersistenceService.instance) {
      BiometricPersistenceService.instance = new BiometricPersistenceService();
    }
    return BiometricPersistenceService.instance;
  }

  /**
     * Get daily biometric summary for a specific user and date
     */
  public async getDailySummary(userId: string, date: string): Promise<BiometricSummary | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM daily_biometric_summaries
        WHERE userId = ? AND date = ?
      `);

      const row = stmt.get(userId, date) as any;
      if (!row) return null;

      return {
        userId: row.userId,
        date: row.date,
        heartRateAvg: row.heartRateAvg,
        hrvAvg: row.hrvAvg,
        stressLevelAvg: row.stressLevel, // Mapping column name
        sleepDuration: row.sleepDuration,
        trainingLoad: row.totalCalories > 0 ? Math.round((row.totalCalories / 2000) * 100) : 50
      };
    } catch (error) {
      logger.error('Error fetching daily summary', {
        context: 'biometric-persistence',
        metadata: { userId, date, error: error instanceof Error ? error.message : String(error) }
      });
      return null;
    }
  }

  /**
     * Get latest metrics for a user
     */
  public async getLatestMetrics(userId: string): Promise<BiometricSummary | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM daily_biometric_summaries
        WHERE userId = ?
        ORDER BY date DESC
        LIMIT 1
      `);

      const row = stmt.get(userId) as any;
      if (!row) return null;

      return {
        userId: row.userId,
        date: row.date,
        heartRateAvg: row.heartRateAvg,
        hrvAvg: row.hrvAvg,
        stressLevelAvg: row.stressLevel,
        sleepDuration: row.sleepDuration,
        trainingLoad: 100, // TODO: calculate from activities
      };
    } catch (error) {
      logger.error('Error fetching latest metrics', {
        context: 'biometric-persistence',
        metadata: { userId, error: error instanceof Error ? error.message : String(error) }
      });
      return null;
    }
  }

  /**
     * Get HRV trend for the last N days
     */
  public async getHrvTrend(userId: string, days: number = 7): Promise<number[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT hrvAvg FROM daily_biometric_summaries
        WHERE userId = ?
        ORDER BY date DESC
        LIMIT ?
      `);

      const rows = stmt.all(userId, days) as any[];
      return rows.map(r => r.hrvAvg).filter(v => v !== null).reverse();
    } catch (error) {
      logger.error('Error fetching HRV trend', {
        context: 'biometric-persistence',
        metadata: { userId, days, error: error instanceof Error ? error.message : String(error) }
      });
      return [];
    }
  }

  /**
     * Get metrics trend for many days
     */
  public async getMetricsTrend(userId: string, days: number = 30): Promise<BiometricSummary[]> {
    try {
      const stmt = this.db.prepare(`
            SELECT * FROM daily_biometric_summaries
            WHERE userId = ?
            ORDER BY date DESC
            LIMIT ?
          `);

      const rows = stmt.all(userId, days) as any[];
      return rows.map(row => ({
        userId: row.userId,
        date: row.date,
        heartRateAvg: row.heartRateAvg,
        hrvAvg: row.hrvAvg,
        stressLevelAvg: row.stressLevel,
        sleepDuration: row.sleepDuration,
      })).reverse();
    } catch (error) {
      logger.error('Error fetching metrics trend', {
        context: 'biometric-persistence',
        metadata: { userId, days, error: error instanceof Error ? error.message : String(error) }
      });
      return [];
    }
  }
}

export const getBiometricPersistenceService = () => BiometricPersistenceService.getInstance();
