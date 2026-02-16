#!/usr/bin/env ts-node

/**
 * Database Restore Script
 * 
 * Restores the SQLite database from a backup file.
 * Creates a temporary backup before restoration for rollback capability.
 * Verifies integrity after restoration.
 * 
 * Usage: npm run db:restore [-- --file <backup-file>]
 */

import { getDatabase, getDatabaseManager } from '../database/databaseManager';
import BackupManager from '../database/backupManager';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let backupFile: string | null = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--file' && i + 1 < args.length) {
        backupFile = args[i + 1];
      }
    }

    if (!backupFile) {
      // List available backups and prompt for selection
      const db = getDatabase();
      const backupDir = path.join(process.cwd(), 'data', 'backups');
      const backupManager = new BackupManager(db, backupDir);
      const backups = backupManager.listBackups();

      if (backups.length === 0) {
        console.error('❌ No backups available. Create a backup first with: npm run db:backup');
        process.exit(1);
      }

      console.log('\n📦 Available Backups:');
      backups.slice(0, 10).forEach((backup, index) => {
        const date = new Date(backup.created);
        console.log(`   ${index}. ${backup.name} - ${backup.size.toFixed(2)} MB - ${date.toISOString()}`);
      });

      console.log('\n❌ Please specify a backup file to restore:');
      console.log('   npm run db:restore -- --file data/backups/<backup-filename>');
      process.exit(1);
    }

    // Validate backup file exists
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      process.exit(1);
    }

    logger.info('🔄 Starting database restore...', {
      context: 'database-restore',
      metadata: { backupFile }
    });

    // Get database and backup manager
    const db = getDatabase();
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    const backupManager = new BackupManager(db, backupDir);

    console.log('\n⚠️  WARNING: This will restore the database from the specified backup.');
    console.log(`    Backup File: ${backupFile}`);
    console.log('    A temporary backup of the current database will be created for rollback.\n');

    // Restore from backup
    const result = await backupManager.restoreFromBackup(backupFile);

    if (!result.success) {
      logger.error('❌ Restore failed', {
        context: 'database-restore',
        metadata: { errors: result.errors }
      });
      console.error('\n❌ Restore failed!');
      console.error(`Error: ${result.errors.join(', ')}`);
      process.exit(1);
    }

    logger.info('✅ Restore completed successfully', {
      context: 'database-restore',
      metadata: {
        restoredFrom: backupFile
      }
    });

    // Verify integrity
    const integrity = await backupManager.verifyIntegrity();

    console.log('\n✅ Database restore completed successfully!\n');
    console.log('📋 Restore Details:');
    console.log(`   - Restored From: ${path.basename(backupFile)}`);

    console.log('\n🔍 Database Integrity Verification:');
    console.log(`   - Status: ${integrity.healthy ? '✅ Healthy' : '⚠️ Warning'}`);
    console.log(`   - Tables Checked: ${integrity.tables.length}`);

    if (integrity.errors.length > 0) {
      console.log(`   - Errors: ${integrity.errors.length}`);
      integrity.errors.forEach((error) => {
        console.log(`      - ${error}`);
      });
    }

    if (integrity.warnings && integrity.warnings.length > 0) {
      console.log(`   - Warnings: ${integrity.warnings.length}`);
      integrity.warnings.forEach((warning) => {
        console.log(`      - ${warning}`);
      });
    }

    process.exit(0);
  } catch (error) {
    logger.error('💥 Restore script error', {
      context: 'database-restore',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('\n❌ Restore failed with error!');
    console.error(error);
    process.exit(1);
  }
}

main();
