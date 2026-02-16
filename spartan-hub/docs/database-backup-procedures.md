# Database Backup Procedures

## Overview
This document describes the automated database backup strategy implemented for the Spartan Hub application. The system provides automated backups with retention policies and monitoring capabilities.

## Backup Configuration

### Environment Variables
Configure the backup system using the following environment variables:

```bash
# Backup directory (default: ./backups)
BACKUP_DIR=/path/to/backup/directory

# Retention policies (default values shown)
BACKUP_RETENTION_DAILY=7     # Keep last 7 daily backups
BACKUP_RETENTION_WEEKLY=4    # Keep last 4 weekly backups  
BACKUP_RETENTION_MONTHLY=12  # Keep last 12 monthly backups

# Compression settings (default: true)
BACKUP_COMPRESS=true         # Enable/disable backup compression
```

### Database Configuration
The system supports both SQLite and PostgreSQL databases:

- **SQLite**: Uses the `better-sqlite3` library for backup operations
- **PostgreSQL**: Uses `pg_dump` for backup operations (requires `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`)

## Backup Schedule

The system implements the following backup schedule:

- **Daily**: 2:00 AM every day
- **Weekly**: 3:00 AM every Sunday
- **Monthly**: 4:00 AM on the 1st of each month

## Backup Verification

Each backup is automatically verified for integrity after creation:

- **SQLite**: Opens the database file and runs a simple query
- **PostgreSQL**: Checks for basic SQL structure in the dump file

## Retention Policy

The system implements the following retention policy:

1. **Daily backups**: Keeps the last N days (configurable)
2. **Weekly backups**: Keeps one backup per week for the last N weeks (configurable)
3. **Monthly backups**: Keeps one backup per month for the last N months (configurable)

## Backup File Naming

Backup files follow the naming convention:
```
backup_[database-type]_[timestamp].db[.gz]
```

Examples:
- `backup_sqlite_2025-01-01_02-00-00-123Z.db.gz` (compressed SQLite)
- `backup_postgres_2025-01-01_02-00-00-123Z.db` (uncompressed PostgreSQL)

## Monitoring and Alerting

### Backup Status
Check backup status using the backup status module:

```bash
# From the backend directory
node -e "const {BackupStatus} = require('./build/scripts/backupStatus'); const status = new BackupStatus(); status.getBackupStatus().then(console.log);"
```

### Health Check
The system includes a backup health check that verifies the latest backup is recent (within 24 hours for daily backups).

## Manual Backup Operations

### Create Manual Backup
```bash
# From the backend directory
node -e "const {DatabaseBackup} = require('./build/scripts/databaseBackup'); const backup = new DatabaseBackup(); backup.createBackup().then(console.log);"
```

### Generate Backup Report
```bash
# From the backend directory  
node -e "const {BackupStatus} = require('./build/scripts/backupStatus'); const status = new BackupStatus(); status.generateReport().then(console.log);"
```

## Backup Restoration

### SQLite Restoration
1. Stop the application
2. Copy the backup file to the database location
3. If compressed, decompress: `gunzip backup_file.db.gz`
4. Restart the application

### PostgreSQL Restoration
1. Stop the application
2. Restore using pg_restore or psql:
   ```bash
   gunzip -c backup_file.sql.gz | psql -h host -U user -d database
   ```
3. Restart the application

## Security Considerations

- Backup files are stored in the configured backup directory
- Access to backup files should be restricted to authorized personnel
- For production environments, consider encrypting backup files at rest
- Regularly test backup restoration procedures

## Troubleshooting

### Common Issues
- **Permission errors**: Ensure the backup directory is writable by the application
- **Disk space**: Monitor available space in the backup directory
- **Database locks**: For SQLite, backups are performed during low-activity periods

### Error Logging
Backup operations are logged using the application's structured logging system with the context 'backup'.

## Integration with Application

The backup scheduler can be integrated into the main application server:

```typescript
import { BackupScheduler } from './scripts/backupScheduler';

const backupScheduler = new BackupScheduler();
backupScheduler.start();
```