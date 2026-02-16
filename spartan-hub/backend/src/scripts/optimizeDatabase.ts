#!/usr/bin/env ts-node

/**
 * Database Optimization Script
 * 
 * Optimizes the SQLite database for better performance.
 * Runs VACUUM to compact the database and ANALYZE to update statistics.
 * 
 * Usage: npm run db:optimize
 */

import { getDatabase, getDatabaseManager } from '../database/databaseManager';
import BackupManager from '../database/backupManager';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

async function main(): Promise<void> {
  try {
    logger.info('⚡ Starting database optimization...', { context: 'database-optimize' });

    const db = getDatabase();
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    const backupManager = new BackupManager(db, backupDir);

    // Get size before optimization
    const dbPath = `${process.cwd()  }/data/spartan-hub.db`;
    const statBefore = fs.statSync(dbPath);
    const sizeBefore = statBefore.size / 1024 / 1024;

    console.log('\n⚡ Database Optimization\n');
    console.log(`Starting size: ${sizeBefore.toFixed(2)} MB`);

    // Run optimization
    const result = await backupManager.optimize();

    if (!result.success) {
      logger.error('❌ Optimization failed', {
        context: 'database-optimize',
        metadata: { errors: result.errors }
      });
      console.error('❌ Optimization failed!');
      result.errors.forEach((error) => console.error(`   - ${error}`));
      process.exit(1);
    }

    // Get size after optimization
    const statAfter = fs.statSync(dbPath);
    const sizeAfter = statAfter.size / 1024 / 1024;
    const reduction = sizeBefore - sizeAfter;
    const reductionPercent = ((reduction / sizeBefore) * 100).toFixed(1);

    console.log(`\nAfter optimization: ${sizeAfter.toFixed(2)} MB`);
    console.log(`Reduction: ${reduction.toFixed(2)} MB (${reductionPercent}%)`);

    // Get table statistics
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as any[];

    console.log('\n📊 Table Statistics\n');
    tables.forEach((table) => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as any;
      console.log(`   ${table.name}: ${count.count} rows`);
    });

    // Log completion
    logger.info('✅ Database optimization completed', {
      context: 'database-optimize',
      metadata: {
        sizeBefore: sizeBefore.toFixed(2),
        sizeAfter: sizeAfter.toFixed(2),
        reduction: reduction.toFixed(2),
        reductionPercent
      }
    });

    console.log('\n✅ Database optimization completed!');

    process.exit(0);
  } catch (error) {
    logger.error('💥 Optimization script error', {
      context: 'database-optimize',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('\n❌ Optimization failed with error!');
    console.error(error);
    process.exit(1);
  }
}

main();
