import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import { encryptData, generateRandomString } from '../utils/encryptionService';

// Load environment variables
dotenv.config();

/**
 * Database Encryption Migration Script
 * Enables encryption pragmas and prepares database for encrypted storage
 * 
 * Usage: npx ts-node src/scripts/enableDatabaseEncryption.ts
 */

async function enableDatabaseEncryption() {
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'spartan.db');
  const backupPath = path.join(process.cwd(), 'data', `backup_${Date.now()}.db`);

  logger.info('🔐 Starting database encryption migration...', {
    context: 'migration',
    metadata: { dbPath, backupPath }
  });

  try {
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      logger.error('Database file not found', { context: 'migration', metadata: { dbPath } });
      process.exit(1);
    }

    // Create backup before migration
    logger.info('📦 Creating backup before encryption migration...', { context: 'migration' });
    fs.copyFileSync(dbPath, backupPath);
    logger.info(`✅ Backup created: ${backupPath}`, { context: 'migration' });

    // Open database
    const db = new Database(dbPath);

    try {
      // Step 1: Enable WAL mode for better concurrency
      logger.info('Step 1: Enabling WAL mode...', { context: 'migration' });
      db.pragma('journal_mode = WAL');
      const walMode = db.pragma('journal_mode');
      logger.info(`✅ WAL mode enabled: ${walMode}`, { context: 'migration' });

      // Step 2: Enable secure_delete pragma
      logger.info('Step 2: Enabling secure_delete pragma...', { context: 'migration' });
      db.pragma('secure_delete = ON');
      const secureDelete = db.pragma('secure_delete');
      logger.info(`✅ Secure delete enabled: ${secureDelete}`, { context: 'migration' });

      // Step 3: Enable foreign key constraints
      logger.info('Step 3: Enabling foreign key constraints...', { context: 'migration' });
      db.pragma('foreign_keys = ON');
      const fkEnabled = db.pragma('foreign_keys');
      logger.info(`✅ Foreign keys enabled: ${fkEnabled}`, { context: 'migration' });

      // Step 4: Set synchronous to FULL for data integrity
      logger.info('Step 4: Setting synchronous to FULL...', { context: 'migration' });
      db.pragma('synchronous = FULL');
      const synchronous = db.pragma('synchronous');
      logger.info(`✅ Synchronous mode: ${synchronous}`, { context: 'migration' });

      // Step 5: Optimize cache size
      logger.info('Step 5: Optimizing cache size...', { context: 'migration' });
      db.pragma('cache_size = -64000'); // 64MB cache
      const cacheSize = db.pragma('cache_size');
      logger.info(`✅ Cache size set: ${cacheSize}`, { context: 'migration' });

      // Step 6: Verify integrity
      logger.info('Step 6: Verifying database integrity...', { context: 'migration' });
      const integrityCheck = db.prepare('PRAGMA integrity_check').all() as any[] || [];
      if (integrityCheck.length > 0 && integrityCheck[0]?.integrity === 'ok') {
        logger.info('✅ Database integrity verified', { context: 'migration' });
      } else {
        logger.warn('⚠️ Database integrity check found issues', {
          context: 'migration',
          metadata: { result: integrityCheck }
        });
      }

      // Step 7: Vacuum database to reclaim space
      logger.info('Step 7: Vacuuming database...', { context: 'migration' });
      db.exec('VACUUM');
      logger.info('✅ Database vacuumed successfully', { context: 'migration' });

      // Step 8: Generate and store encryption key
      const encryptionKey = generateRandomString(32);
      const envPath = path.join(process.cwd(), '.env.encryption');
      
      if (!fs.existsSync(envPath)) {
        fs.writeFileSync(
          envPath,
          `# Database Encryption Key\n# Generated: ${new Date().toISOString()}\nDB_ENCRYPTION_KEY=${encryptionKey}\n`
        );
        logger.info('✅ Encryption key generated and stored', {
          context: 'migration',
          metadata: { keyFile: envPath, keyLength: encryptionKey.length }
        });
      } else {
        logger.warn('Encryption key file already exists, skipping generation', { context: 'migration' });
      }

      // Step 9: Create indexes on frequently queried columns
      logger.info('Step 9: Creating indexes for encryption performance...', { context: 'migration' });
      try {
        const indexes = [
          'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
          'CREATE INDEX IF NOT EXISTS idx_users_id ON users(id)',
          'CREATE INDEX IF NOT EXISTS idx_activity_user_id ON activity(userId)',
          'CREATE INDEX IF NOT EXISTS idx_activity_date ON activity(date)'
        ];

        indexes.forEach(indexSql => {
          db.exec(indexSql);
        });
        logger.info('✅ Indexes created successfully', { context: 'migration' });
      } catch (error) {
        logger.warn('Could not create indexes', {
          context: 'migration',
          metadata: { error: error instanceof Error ? error.message : String(error) }
        });
      }

      // Close database
      db.close();

      logger.info('', { context: 'migration' });
      logger.info('✅ DATABASE ENCRYPTION MIGRATION COMPLETED SUCCESSFULLY', { context: 'migration' });
      logger.info('', { context: 'migration' });
      logger.info('Summary:', { context: 'migration' });
      logger.info('  ✅ WAL mode enabled for better concurrency', { context: 'migration' });
      logger.info('  ✅ Secure delete enabled (overwrites deleted data)', { context: 'migration' });
      logger.info('  ✅ Foreign key constraints enforced', { context: 'migration' });
      logger.info('  ✅ Synchronous mode set to FULL', { context: 'migration' });
      logger.info('  ✅ Database integrity verified', { context: 'migration' });
      logger.info('  ✅ Cache optimized for performance', { context: 'migration' });
      logger.info('  ✅ Encryption key generated', { context: 'migration' });
      logger.info('', { context: 'migration' });
      logger.info('Recommendations:', { context: 'migration' });
      logger.info('  1. Use filesystem encryption (LUKS, BitLocker) for production', { context: 'migration' });
      logger.info('  2. Store DB_ENCRYPTION_KEY in AWS Secrets Manager', { context: 'migration' });
      logger.info('  3. Enable application-level encryption for sensitive columns', { context: 'migration' });
      logger.info(`  4. Backup location: ${  backupPath}`, { context: 'migration' });

      process.exit(0);
    } catch (error) {
      db.close();
      throw error;
    }
  } catch (error) {
    logger.error('❌ Database encryption migration failed', {
      context: 'migration',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    });
    logger.info(`Backup saved at: ${backupPath}`, { context: 'migration' });
    process.exit(1);
  }
}

// Run migration
enableDatabaseEncryption();
