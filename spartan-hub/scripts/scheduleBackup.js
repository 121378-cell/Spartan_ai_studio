/**
 * Database Backup Scheduler
 * Schedules automated database backups using cron-like functionality
 */

const cron = require('node-cron');
const { performBackup } = require('./backupDatabase');
const fs = require('fs');
const path = require('path');

// Configuration for backup schedule
const BACKUP_SCHEDULE = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Default: daily at 2 AM
const BACKUP_RETENTION_DAYS = process.env.BACKUP_RETENTION_DAYS || 30; // Default: keep 30 days of backups

// Initialize backup directory if it doesn't exist
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Function to log backup events
function logBackupEvent(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Function to send notifications (placeholder)
function sendNotification(message, isError = false) {
  const timestamp = new Date().toISOString();
  if (isError) {
    console.error(`[${timestamp}] NOTIFICATION: ${message}`);
  } else {
    console.log(`[${timestamp}] NOTIFICATION: ${message}`);
  }
  
  // In a real implementation, this would send notifications via email, Slack, etc.
  // For example: sendEmail(notificationEmail, 'Database Backup Status', message);
}

// Schedule the backup job
function scheduleBackup() {
  logBackupEvent(`Scheduling database backup with cron pattern: ${BACKUP_SCHEDULE}`);
  logBackupEvent(`Backup retention set to ${BACKUP_RETENTION_DAYS} days`);
  
  const task = cron.schedule(BACKUP_SCHEDULE, async () => {
    logBackupEvent('Starting scheduled database backup...');
    
    try {
      await performBackup();
      sendNotification('Database backup completed successfully');
      logBackupEvent('Database backup completed successfully');
    } catch (error) {
      sendNotification(`Database backup failed: ${error.message}`, true);
      logBackupEvent(`Database backup failed: ${error.message}`);
    }
  }, {
    scheduled: true,
    timezone: process.env.BACKUP_TIMEZONE || 'Etc/UTC'
  });
  
  logBackupEvent('Database backup scheduler started');
  
  // Start the scheduled task
  task.start();
  
  return task;
}

// Function to run a one-time backup
async function runOneTimeBackup() {
  logBackupEvent('Starting one-time database backup...');
  
  try {
    await performBackup();
    sendNotification('One-time database backup completed successfully');
    logBackupEvent('One-time database backup completed successfully');
  } catch (error) {
    sendNotification(`One-time database backup failed: ${error.message}`, true);
    logBackupEvent(`One-time database backup failed: ${error.message}`);
    throw error;
  }
}

// If this script is run directly, start the scheduler
if (require.main === module) {
  // Check if we should run a one-time backup instead of starting the scheduler
  const args = process.argv.slice(2);
  if (args.includes('--once') || args.includes('--run-once')) {
    runOneTimeBackup()
      .then(() => {
        logBackupEvent('One-time backup process completed.');
        process.exit(0);
      })
      .catch((error) => {
        logBackupEvent(`One-time backup process failed: ${error.message}`);
        process.exit(1);
      });
  } else {
    // Start the scheduled backup service
    scheduleBackup();
    
    logBackupEvent('Backup scheduler is running. Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logBackupEvent('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      logBackupEvent('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });
  }
}

module.exports = {
  scheduleBackup,
  runOneTimeBackup
};