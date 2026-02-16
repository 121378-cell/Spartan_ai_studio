/**
 * Backup Status Monitoring Script
 * Checks the status of database backups and alerts if they're not up to date
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BACKUP_DIR = path.join(__dirname, 'backups');
const MAX_BACKUP_AGE_HOURS = process.env.MAX_BACKUP_AGE_HOURS || 25; // Default: alert if no backup in last 25 hours (for daily backup)

/**
 * Get all backup files sorted by date
 */
function getBackupFiles() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`Backup directory does not exist: ${BACKUP_DIR}`);
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR);
  const backupFiles = files.filter(file => 
    file.startsWith('backup_') && (file.endsWith('.sql.gz') || file.endsWith('.db.gz'))
  );

  // Sort by date (newest first)
  return backupFiles.sort((a, b) => {
    const dateA = extractDateFromFilename(a);
    const dateB = extractDateFromFilename(b);
    
    if (!dateA || !dateB) return 0;
    return new Date(dateB) - new Date(dateA);
  });
}

/**
 * Extract date from backup filename
 */
function extractDateFromFilename(filename) {
  // Format: backup_type_YYYY-MM-DD_HH-MM-SS-mmmZ.ext.gz
  const dateMatch = filename.match(/\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}Z/);
  if (dateMatch) {
    const dateStr = dateMatch[0];
    // Convert to format that Date constructor can parse: YYYY-MM-DDTHH:MM:SS.mmmZ
    // Format is: YYYY-MM-DD_HH-MM-SS-mmmZ
    const [datePart, timePartWithZ] = dateStr.split('_');
    const [year, month, day] = datePart.split('-');
    const timePart = timePartWithZ.replace('Z', ''); // Remove the Z
    const [hour, minute, second, millisecond] = timePart.split('-');
    const isoStr = `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}Z`;
    return new Date(isoStr);
  }
  return null;
}

/**
 * Check if the most recent backup is recent enough
 */
function checkBackupStatus() {
  const backupFiles = getBackupFiles();
  
  if (backupFiles.length === 0) {
    console.log('ALERT: No backup files found in backup directory!');
    return {
      status: 'failed',
      message: 'No backup files found',
      lastBackup: null,
      ageHours: null
    };
  }

  const latestBackup = backupFiles[0];
  const latestBackupDate = extractDateFromFilename(latestBackup);
  
  if (!latestBackupDate || isNaN(latestBackupDate.getTime())) {
    console.log(`ERROR: Could not parse date from backup file: ${latestBackup}`);
    return {
      status: 'failed',
      message: 'Could not parse backup date',
      lastBackup: latestBackup,
      ageHours: null
    };
  }

  const now = new Date();
  const ageMs = now - latestBackupDate;
  const ageHours = ageMs / (1000 * 60 * 60);
  
  const isRecent = ageHours <= MAX_BACKUP_AGE_HOURS;
  
  const status = isRecent ? 'ok' : 'failed';
  const message = isRecent 
    ? `Latest backup is ${ageHours.toFixed(2)} hours old: ${latestBackup}`
    : `Latest backup is TOO OLD (${ageHours.toFixed(2)} hours): ${latestBackup}`;
  
  if (!isRecent) {
    console.log(`ALERT: ${message}`);
  } else {
    console.log(`OK: ${message}`);
  }

  return {
    status,
    message,
    lastBackup: latestBackup,
    ageHours: parseFloat(ageHours.toFixed(2)),
    backupCount: backupFiles.length
  };
}

/**
 * Generate backup report
 */
function generateReport() {
  const backupFiles = getBackupFiles();
  const status = checkBackupStatus();
  
  const report = {
    timestamp: new Date().toISOString(),
    backupDirectory: BACKUP_DIR,
    status: status.status,
    message: status.message,
    latestBackup: status.lastBackup,
    latestBackupAgeHours: status.ageHours,
    totalBackups: backupFiles.length,
    backupFiles: backupFiles.map(file => {
      const date = extractDateFromFilename(file);
      return {
        filename: file,
        date: date ? date.toISOString() : null,
        ageHours: date ? parseFloat(((new Date() - date) / (1000 * 60 * 60)).toFixed(2)) : null
      };
    })
  };
  
  console.log('\nBackup Status Report:');
  console.log('====================');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Status: ${report.status.toUpperCase()}`);
  console.log(`Message: ${report.message}`);
  console.log(`Backup Directory: ${report.backupDirectory}`);
  console.log(`Total Backups: ${report.totalBackups}`);
  console.log(`Latest Backup: ${report.latestBackup || 'N/A'}`);
  console.log(`Latest Backup Age: ${report.latestBackupAgeHours !== null ? report.latestBackupAgeHours + ' hours' : 'N/A'}`);
  
  return report;
}

// Run the check if this script is executed directly
if (require.main === module) {
  const report = generateReport();
  
  // Exit with appropriate code
  process.exit(report.status === 'failed' ? 1 : 0);
}

module.exports = {
  checkBackupStatus,
  generateReport,
  getBackupFiles,
  extractDateFromFilename
};