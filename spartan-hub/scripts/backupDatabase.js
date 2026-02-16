/**
 * Automated Database Backup Script
 * Creates automated backups of the application database with security and verification
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { createGzip, createGunzip } = require('zlib');
const { pipeline } = require('stream');
const { createReadStream, createWriteStream } = require('fs');

const execAsync = promisify(exec);

// Configuration
const BACKUP_DIR = path.join(__dirname, 'backups');
const DATE_STAMP = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').split('.')[0];
const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite'; // 'sqlite' or 'postgres'

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Backup SQLite database
 */
async function backupSQLite() {
  console.log('Starting SQLite database backup...');
  
  const dbPath = process.env.DATABASE_PATH || path.join('/app', 'data', 'spartan.db');
  const backupFileName = `backup_${DATABASE_TYPE}_${DATE_STAMP}.db.gz`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  return new Promise((resolve, reject) => {
    // Create a read stream from the database file
    const readStream = createReadStream(dbPath);
    // Create a write stream to the backup file with gzip compression
    const writeStream = createWriteStream(backupPath);
    const gzip = createGzip();
    
    // Pipeline: read from DB file -> compress -> write to backup file
    pipeline(readStream, gzip, writeStream, (err) => {
      if (err) {
        console.error('Error during SQLite backup:', err);
        reject(err);
      } else {
        console.log(`SQLite backup created: ${backupPath}`);
        resolve(backupPath);
      }
    });
  });
}

/**
 * Backup PostgreSQL database
 */
async function backupPostgreSQL() {
  console.log('Starting PostgreSQL database backup...');
  
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'spartan_fitness';
  const dbUser = process.env.DB_USER || 'spartan_user';
  const dbPassword = process.env.DB_PASSWORD; // This should be set in environment
  
  if (!dbPassword) {
    throw new Error('DB_PASSWORD environment variable is required for PostgreSQL backup');
  }
  
  const backupFileName = `backup_${DATABASE_TYPE}_${DATE_STAMP}.sql.gz`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);
  
  // Set the PGPASSWORD environment variable for the pg_dump command
  const env = { ...process.env, PGPASSWORD: dbPassword };
  
  const pgDumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password | gzip > "${backupPath}"`;
  
  try {
    const { stdout, stderr } = await execAsync(pgDumpCommand, { env });
    console.log('PostgreSQL backup created:', backupPath);
    if (stderr) {
      console.warn('pg_dump stderr:', stderr);
    }
    return backupPath;
  } catch (error) {
    console.error('Error during PostgreSQL backup:', error);
    throw error;
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupPath) {
  console.log(`Verifying backup integrity: ${backupPath}`);
  
  const isCompressed = backupPath.endsWith('.gz');
  
  if (isCompressed) {
    // For compressed files, try to decompress to verify integrity
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(backupPath);
      const gunzip = createGunzip();
      
      let verified = false;
      
      readStream.on('error', (err) => {
        console.error(`Backup verification failed: ${err.message}`);
        reject(err);
      });
      
      gunzip.on('error', (err) => {
        console.error(`Backup verification failed: ${err.message}`);
        reject(err);
      });
      
      gunzip.on('end', () => {
        if (!verified) {
          verified = true;
          console.log(`Backup verification successful: ${backupPath}`);
          resolve(true);
        }
      });
      
      pipeline(readStream, gunzip, (err) => {
        if (err) {
          console.error(`Backup verification failed: ${err.message}`);
          reject(err);
        } else if (!verified) {
          verified = true;
          console.log(`Backup verification successful: ${backupPath}`);
          resolve(true);
        }
      });
    });
  } else {
    // For uncompressed files, just check if the file exists and has content
    try {
      const stats = await fs.promises.stat(backupPath);
      if (stats.size > 0) {
        console.log(`Backup verification successful: ${backupPath}`);
        return true;
      } else {
        throw new Error(`Backup file is empty: ${backupPath}`);
      }
    } catch (error) {
      console.error(`Backup verification failed: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Apply retention policy
 */
async function applyRetentionPolicy() {
  console.log('Applying backup retention policy...');
  
  try {
    const files = await fs.promises.readdir(BACKUP_DIR);
    const backupFiles = files.filter(file => file.startsWith('backup_') && (file.endsWith('.sql.gz') || file.endsWith('.db.gz')));
    
    // Sort files by date (newest first)
    const sortedFiles = backupFiles.sort((a, b) => {
      const dateA = a.match(/\d{4}-\d{2}-\d{2}_\d{6}/)?.[0] || '';
      const dateB = b.match(/\d{4}-\d{2}-\d{2}_\d{6}/)?.[0] || '';
      return dateB.localeCompare(dateA);
    });
    
    // Keep last 7 daily backups
    const now = new Date();
    const dailyBackups = new Map();
    const weeklyBackups = new Map();
    const monthlyBackups = new Map();
    
    for (const file of sortedFiles) {
      const dateMatch = file.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (!dateMatch) continue;
      
      const fileDate = new Date(dateMatch);
      const daysDiff = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));
      
      // Extract date components for grouping
      const yearMonth = `${fileDate.getFullYear()}-${String(fileDate.getMonth() + 1).padStart(2, '0')}`;
      const yearWeek = getWeekNumber(fileDate);
      
      // Keep last 7 daily backups (one per day max)
      if (!dailyBackups.has(dateMatch) && dailyBackups.size < 7) {
        dailyBackups.set(dateMatch, file);
      }
      // Keep last 4 weekly backups (one per week max)
      else if (!weeklyBackups.has(yearWeek) && weeklyBackups.size < 4) {
        weeklyBackups.set(yearWeek, file);
      }
      // Keep last 12 monthly backups (one per month max)
      else if (!monthlyBackups.has(yearMonth) && monthlyBackups.size < 12) {
        monthlyBackups.set(yearMonth, file);
      }
      // Delete older files that don't fit retention policy
      else {
        const filePath = path.join(BACKUP_DIR, file);
        console.log(`Deleting old backup: ${filePath}`);
        await fs.promises.unlink(filePath);
      }
    }
    
    console.log(`Retention policy applied. Kept ${dailyBackups.size} daily, ${weeklyBackups.size} weekly, ${monthlyBackups.size} monthly backups.`);
  } catch (error) {
    console.error('Error applying retention policy:', error);
    throw error;
  }
}

/**
 * Helper function to get week number
 */
function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Send alert notification (placeholder)
 */
function sendAlert(message) {
  console.error(`ALERT: ${message}`);
  // In a real implementation, this would send notifications via email, Slack, etc.
}

/**
 * Main backup function
 */
async function performBackup() {
  try {
    console.log('Starting database backup process...');
    
    let backupPath;
    
    if (DATABASE_TYPE.toLowerCase() === 'postgres' || DATABASE_TYPE.toLowerCase() === 'postgresql') {
      backupPath = await backupPostgreSQL();
    } else {
      // Default to SQLite
      backupPath = await backupSQLite();
    }
    
    // Verify the backup integrity
    await verifyBackup(backupPath);
    
    // Apply retention policy
    await applyRetentionPolicy();
    
    console.log('Database backup completed successfully!');
    return backupPath;
  } catch (error) {
    console.error('Database backup failed:', error);
    sendAlert(`Database backup failed: ${error.message}`);
    throw error;
  }
}

// Run backup if this script is executed directly
if (require.main === module) {
  performBackup()
    .then(() => {
      console.log('Backup process completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backup process failed:', error);
      process.exit(1);
    });
}

module.exports = {
  performBackup,
  backupSQLite,
  backupPostgreSQL,
  verifyBackup,
  applyRetentionPolicy
};