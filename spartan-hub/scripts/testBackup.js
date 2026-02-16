/**
 * Backup Test Script
 * Tests the backup functionality to ensure it works correctly
 */

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const { createGunzip } = require('zlib');
const { pipeline } = require('stream');
const { createReadStream } = require('fs');

const execAsync = promisify(exec);

async function testBackupFunctionality() {
  console.log('🧪 Starting backup functionality test...\n');
  
  try {
    // Check if backup directory exists
    const backupDir = path.join(__dirname, '..', 'backup');
    if (!fs.existsSync(backupDir)) {
      console.log('📁 Creating backup directory...');
      fs.mkdirSync(backupDir, { recursive: true });
    }
    console.log(`✅ Backup directory exists: ${backupDir}`);
    
    // Determine database type
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    console.log(`📊 Database type: ${dbType}`);
    
    // Test backup creation
    console.log('\n📝 Testing backup creation...');
    const backupScript = path.join(__dirname, 'backupDatabase.js');
    
    const result = await execAsync(`node "${backupScript}"`);
    console.log('✅ Backup creation test completed');
    console.log('Output:', result.stdout);
    
    if (result.stderr) {
      console.log('Errors:', result.stderr);
    }
    
    // Check for backup files
    console.log('\n🔍 Checking for backup files...');
    const backupFiles = fs.readdirSync(backupDir).filter(file => 
      file.startsWith('backup_') && (file.endsWith('.sql.gz') || file.endsWith('.db.gz'))
    );
    
    if (backupFiles.length > 0) {
      console.log(`✅ Found ${backupFiles.length} backup file(s):`);
      backupFiles.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      });
    } else {
      throw new Error('❌ No backup files were created');
    }
    
    // Test backup verification (take the most recent backup)
    const latestBackup = backupFiles.sort().pop();
    const latestBackupPath = path.join(backupDir, latestBackup);
    
    console.log(`\n🔍 Testing verification of backup: ${latestBackup}`);
    
    // Try to read and decompress the backup to verify integrity
    await new Promise((resolve, reject) => {
      const readStream = createReadStream(latestBackupPath);
      const gunzip = createGunzip();
      
      let verified = false;
      
      readStream.on('error', (err) => {
        reject(new Error(`Failed to read backup file: ${err.message}`));
      });
      
      gunzip.on('error', (err) => {
        reject(new Error(`Failed to decompress backup: ${err.message}`));
      });
      
      gunzip.on('end', () => {
        if (!verified) {
          verified = true;
          console.log('✅ Backup verification successful');
          resolve();
        }
      });
      
      pipeline(readStream, gunzip, (err) => {
        if (err) {
          reject(err);
        } else if (!verified) {
          verified = true;
          console.log('✅ Backup verification successful');
          resolve();
        }
      });
    });
    
    // Test status checking
    console.log('\n📊 Testing backup status check...');
    const statusScript = path.join(__dirname, 'checkBackupStatus.js');
    const statusResult = await execAsync(`node "${statusScript}"`);
    console.log('✅ Backup status check completed');
    console.log('Status output:', statusResult.stdout);
    
    if (statusResult.stderr) {
      console.log('Status errors:', statusResult.stderr);
    }
    
    console.log('\n🎉 Backup functionality test completed successfully!');
    console.log('✅ All backup components are working correctly');
    
    // Show the most recent backup info
    const stats = fs.statSync(latestBackupPath);
    const createdTime = new Date(stats.birthtime);
    console.log(`📝 Latest backup: ${latestBackup} (${createdTime.toISOString()})`);
    
  } catch (error) {
    console.error('\n❌ Backup functionality test failed:', error.message);
    process.exit(1);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testBackupFunctionality()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  testBackupFunctionality
};