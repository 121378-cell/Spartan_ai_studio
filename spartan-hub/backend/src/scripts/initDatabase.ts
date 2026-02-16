#!/usr/bin/env ts-node

/**
 * Database Initialization Script
 * 
 * Initializes the SQLite database with all required tables, indexes, and constraints.
 * Runs all pending migrations and sets up the database for production use.
 * 
 * Usage: npm run db:init
 */

import { initializeDatabase, getDatabase, getDatabaseManager } from '../database/databaseManager';
import logger from '../utils/logger';

async function main(): Promise<void> {
  try {
    logger.info('🚀 Starting database initialization...', { context: 'database-init' });

    // Initialize database
    const initResult = await initializeDatabase();

    if (!initResult.success) {
      logger.error('❌ Database initialization failed', {
        context: 'database-init',
        metadata: { errors: initResult.errors }
      });
      process.exit(1);
    }

    logger.info('✅ Database initialized successfully', {
      context: 'database-init',
      metadata: {
        schemaVersion: initResult.schemaVersion,
        tablesCount: initResult.tablesCount,
        indexesCount: initResult.indexesCount,
        migrationsRun: initResult.migrationsRun
      }
    });

    // Run health check
    const manager = getDatabaseManager();
    const health = await manager.healthCheck();

    if (!health.healthy) {
      logger.warn('⚠️ Database health check warnings detected', {
        context: 'database-init',
        metadata: { 
          errors: health.errors
        }
      });
    } else {
      logger.info('✅ Database health check passed', {
        context: 'database-init',
        metadata: {
          connected: health.connected,
          tables: health.tables
        }
      });
    }

    // Log database info
    const db = getDatabase();
    const pragma = db.prepare('PRAGMA database_list').all() as any[];
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as any[];
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name LIKE 'idx_%'
    `).all() as any[];

    logger.info('📊 Database Schema Information', {
      context: 'database-init',
      metadata: {
        databases: pragma.map((p: any) => ({ name: p.name, path: p.file })),
        tables: tables.map((t: any) => t.name),
        indexes: indexes.map((i: any) => i.name)
      }
    });

    console.log('\n✅ Database initialization completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Schema Version: ${initResult.schemaVersion}`);
    console.log(`   - Tables Created: ${initResult.tablesCount}`);
    console.log(`   - Indexes Created: ${initResult.indexesCount}`);
    console.log(`   - Migrations Run: ${initResult.migrationsRun.join(', ')}`);
    console.log(`\n💾 Database Path: ${pragma[0].file}`);
    console.log('\n📊 Tables:');
    tables.forEach((t: any) => {
      console.log(`   - ${t.name}`);
    });
    console.log('\n🔍 Performance Indexes:');
    indexes.forEach((i: any) => {
      console.log(`   - ${i.name}`);
    });

    process.exit(0);
  } catch (error) {
    logger.error('💥 Database initialization error', {
      context: 'database-init',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    console.error('\n❌ Database initialization failed!');
    console.error(error);
    process.exit(1);
  }
}

main();
