#!/usr/bin/env ts-node

/**
 * Database Verification Script
 * 
 * Verifies database integrity, checks for corruption, and validates schema.
 * Performs PRAGMA integrity checks and reports any issues found.
 * 
 * Usage: npm run db:verify
 */

import { getDatabase, getDatabaseManager, initializeDatabase } from '../database/databaseManager';
import BackupManager from '../database/backupManager';
import logger from '../utils/logger';
import path from 'path';

async function main(): Promise<void> {
  try {
    logger.info('🔍 Starting database verification...', { context: 'database-verify' });

    // Initialize database if not already initialized
    await initializeDatabase();

    // Get database
    const db = getDatabase();
    const manager = getDatabaseManager();
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    const backupManager = new BackupManager(db, backupDir);

    // Run health check
    const health = await manager.healthCheck();

    console.log('\n📊 Database Health Check\n');
    console.log(`Connected: ${health.connected ? '✅ Yes' : '❌ No'}`);
  console.log(`Healthy: ${health.healthy ? '✅ Yes' : '⚠️ Warnings'}`);
  console.log(`Tables: ${health.tables}`);

    // Verify integrity
    const integrity = await backupManager.verifyIntegrity();

    console.log('\n🔐 Integrity Check\n');
    console.log(`Status: ${integrity.healthy ? '✅ Healthy' : '⚠️ Issues Found'}`);
    console.log(`Tables Checked: ${integrity.tables.length}`);

    integrity.tables.forEach((table) => {
      console.log(`   - ${table.name}: ${table.integrity === 'ok' ? '✅' : '❌'}`);
    });

    if (integrity.errors.length > 0) {
      console.log('\n❌ Errors:');
      integrity.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
    }

    if (integrity.warnings && integrity.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      integrity.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
    }

    // Check schema version
    const schema = db.prepare('PRAGMA schema_version').get() as any;
    const userVersion = db.prepare('PRAGMA user_version').get() as any;

    console.log('\n📋 Schema Information\n');
    console.log(`Schema Version: ${schema.schema_version}`);
    console.log(`User Version: ${userVersion.user_version}`);

    // List tables
    const tables = db.prepare(`
      SELECT name, sql FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as any[];

    console.log(`\n📊 Tables (${tables.length})\n`);
    tables.forEach((table) => {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as any[];
      console.log(`   ${table.name}:`);
      console.log(`      Columns: ${columns.length}`);

      // Check for indexes
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name = ?
      `).all(table.name) as any[];

      if (indexes.length > 0) {
        console.log(`      Indexes: ${indexes.length}`);
        indexes.forEach((idx) => {
          console.log(`         - ${idx.name}`);
        });
      }
    });

    // Check foreign keys
    const fk = db.prepare('PRAGMA foreign_keys').get() as any;
    console.log(`\n🔗 Foreign Keys: ${fk.foreign_keys ? '✅ Enabled' : '❌ Disabled'}`);

    // Check WAL mode
    const walInfo = db.prepare('PRAGMA journal_mode').get() as any;
    console.log(`📝 Journal Mode: ${walInfo.journal_mode.toUpperCase()}`);

    // Database file size
    const stat = require('fs').statSync(`${process.cwd()  }/data/spartan-hub.db`);
    const sizeInMB = (stat.size / 1024 / 1024).toFixed(2);
    console.log(`📦 Database Size: ${sizeInMB} MB`);

    // Summary
    console.log(`\n${  '='.repeat(50)}`);
    if (integrity.healthy && health.healthy) {
      console.log('✅ All checks passed! Database is healthy.');
    } else if (integrity.healthy && !health.healthy) {
      console.log('⚠️ Database integrity is good, but some health warnings detected.');
    } else {
      console.log('❌ Database has issues. Please investigate or restore from backup.');
    }
    console.log('='.repeat(50));

    logger.info('✅ Database verification completed', {
      context: 'database-verify',
      metadata: {
        healthy: integrity.healthy,
        errors: integrity.errors.length,
        warnings: integrity.warnings?.length ?? 0,
        tables: tables.length
      }
    });

    process.exit(integrity.healthy ? 0 : 1);
  } catch (error) {
    logger.error('💥 Verification script error', {
      context: 'database-verify',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('\n❌ Verification failed with error!');
    console.error(error);
    process.exit(1);
  }
}

main();
