/**
 * Test Backup Script
 * This script tests the database backup functionality
 */

import { DatabaseBackup } from './databaseBackup';
import { BackupStatus } from './backupStatus';
import { logger } from '../src/utils/logger';

async function testBackup() {
  console.log('🧪 Starting database backup test...');
  
  try {
    const backup = new DatabaseBackup();
    
    console.log('💾 Creating backup...');
    const backupPath = await backup.createBackup();
    
    console.log(`✅ Backup created successfully: ${backupPath}`);
    
    // Check if file exists and get stats
    const fs = require('fs');
    const stats = fs.statSync(backupPath);
    console.log(`📊 Backup file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
    
    // Get backup status
    const status = new BackupStatus();
    const statusInfo = await status.getBackupStatus();
    
    console.log('📋 Backup status:');
    console.log(`   Total backups: ${statusInfo.data.totalBackups}`);
    console.log(`   Latest backup: ${statusInfo.data.latestBackup?.name}`);
    console.log(`   Backup directory: ${statusInfo.data.backupDir}`);
    
    // Generate a report
    const report = await status.generateReport();
    console.log('\n📄 Generated backup report:');
    console.log(report);
    
    // Check backup health
    const isHealthy = await status.isBackupHealthy();
    console.log(`\n🏥 Backup health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    console.log('\n🎉 Backup test completed successfully!');
  } catch (error) {
    console.error('❌ Backup test failed:', error);
    logger.error('Backup test failed', {
      context: 'backup-test',
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testBackup();
}

export { testBackup };