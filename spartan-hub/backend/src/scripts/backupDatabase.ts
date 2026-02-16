#!/usr/bin/env ts-node

/**
 * Database Backup Script
 * 
 * Creates a backup of the SQLite database with timestamp naming.
 * Automatically manages backup retention (keeps N most recent backups).
 * 
 * Usage: npm run db:backup [-- --retain 5]
 */

import { getDatabase, getDatabaseManager, initializeDatabase } from '../database/databaseManager';
import BackupManager from '../database/backupManager';
import logger from '../utils/logger';
import path from 'path';

async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let retainCount = 5;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--retain' && i + 1 < args.length) {
        retainCount = parseInt(args[i + 1], 10);
        if (isNaN(retainCount) || retainCount < 1) {
          console.error('❌ Invalid --retain value. Must be a positive number.');
          process.exit(1);
        }
      }
    }

    logger.info('💾 Starting database backup...', {
      context: 'database-backup',
      metadata: { retain: retainCount }
    });

    // Initialize database if not already initialized
    await initializeDatabase();

    // Get database and backup manager
    const db = getDatabase();
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    const backupManager = new BackupManager(db, backupDir);

    // Create backup
    const result = await backupManager.createBackup({ retain: retainCount });

    if (!result.success) {
      logger.error('❌ Backup creation failed', {
        context: 'database-backup',
        metadata: { errors: result.errors }
      });
      console.error('\n❌ Backup failed!');
      console.error(`Error: ${result.errors.join(', ')}`);
      process.exit(1);
    }

    logger.info('✅ Backup created successfully', {
      context: 'database-backup',
      metadata: {
        backupPath: result.backupPath,
        size: result.size,
        timestamp: result.timestamp
      }
    });

    // List backups
    const backups = backupManager.listBackups();

    console.log('\n✅ Database backup completed successfully!\n');
    console.log('📋 Backup Details:');
    console.log(`   - File: ${path.basename(result.backupPath)}`);
    console.log(`   - Size: ${result.size.toFixed(2)} MB`);
    console.log(`   - Created: ${new Date(result.timestamp).toISOString()}`);
    console.log(`\n📦 Backup History (${backups.length} backups retained):`);
    backups.slice(0, 5).forEach((backup, index) => {
      const date = new Date(backup.created);
      console.log(`   ${index + 1}. ${backup.name} - ${backup.size.toFixed(2)} MB - ${date.toISOString()}`);
    });

    if (backups.length > 5) {
      console.log(`   ... and ${backups.length - 5} more backups`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('💥 Backup script error', {
      context: 'database-backup',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('\n❌ Backup failed with error!');
    console.error(error);
    process.exit(1);
  }
}

main();
