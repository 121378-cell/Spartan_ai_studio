"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testBackup = testBackup;
const databaseBackup_1 = require("./databaseBackup");
const backupStatus_1 = require("./backupStatus");
const logger_1 = require("../src/utils/logger");
async function testBackup() {
    console.log('🧪 Starting database backup test...');
    try {
        const backup = new databaseBackup_1.DatabaseBackup();
        console.log('💾 Creating backup...');
        const backupPath = await backup.createBackup();
        console.log(`✅ Backup created successfully: ${backupPath}`);
        const fs = require('fs');
        const stats = fs.statSync(backupPath);
        console.log(`📊 Backup file size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
        const status = new backupStatus_1.BackupStatus();
        const statusInfo = await status.getBackupStatus();
        console.log('📋 Backup status:');
        console.log(`   Total backups: ${statusInfo.data.totalBackups}`);
        console.log(`   Latest backup: ${statusInfo.data.latestBackup?.name}`);
        console.log(`   Backup directory: ${statusInfo.data.backupDir}`);
        const report = await status.generateReport();
        console.log('\n📄 Generated backup report:');
        console.log(report);
        const isHealthy = await status.isBackupHealthy();
        console.log(`\n🏥 Backup health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
        console.log('\n🎉 Backup test completed successfully!');
    }
    catch (error) {
        console.error('❌ Backup test failed:', error);
        logger_1.logger.error('Backup test failed', {
            context: 'backup-test',
            metadata: {
                error: error instanceof Error ? error.message : String(error)
            }
        });
        process.exit(1);
    }
}
if (require.main === module) {
    testBackup();
}
//# sourceMappingURL=testBackup.js.map