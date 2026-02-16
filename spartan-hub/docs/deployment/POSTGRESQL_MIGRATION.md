# PostgreSQL Migration Guide

This document explains how to migrate the Spartan Hub application from SQLite to PostgreSQL for multi-user environments.

## Overview

The Spartan Hub application has been enhanced to support PostgreSQL as an alternative to SQLite. This allows for better scalability and concurrent access in multi-user environments.

## Architecture Changes

### Database Abstraction Layer

A new database abstraction layer has been implemented to support both SQLite and PostgreSQL:

1. **Database Service Factory** - Dynamically selects the appropriate database implementation based on environment variables
2. **PostgreSQL Implementation** - Full implementation of all database operations using the `pg` library
3. **SQLite Implementation** - Existing implementation preserved for backward compatibility

### Environment Configuration

The application uses environment variables to determine which database to use:

```bash
# Use PostgreSQL
DATABASE_TYPE=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=spartan_fitness
POSTGRES_USER=spartan_user
POSTGRES_PASSWORD=spartan_password
```

## Implementation Details

### 1. PostgreSQL Configuration (`src/config/postgresConfig.ts`)

- Connection pooling with configurable limits
- Transaction support
- Error handling and connection recovery
- Environment-based configuration

### 2. PostgreSQL Database Service (`src/services/postgresDatabaseService.ts`)

Complete implementation of all database operations:
- User management (create, read, update, find)
- Routine management
- Exercise management
- Plan assignments
- Commitments

### 3. Database Service Factory (`src/services/databaseServiceFactory.ts`)

Dynamically imports and exports the appropriate database service based on configuration.

### 4. Docker Configuration (`docker-compose.yml`)

Added PostgreSQL service with:
- Persistent volume storage
- Health checks
- Resource limits
- Proper networking

### 5. Environment Files

- `.env.production.example` - Production environment configuration template (safe to commit)
- `.env.production` - Actual production environment (NOT committed to version control)
- `.env` - Local development environment (NOT committed to version control)

## Migration Process

### 1. Schema Initialization

Run the schema initialization script to create tables in PostgreSQL:

```bash
npm run init-postgres-schema
```

### 2. Data Migration

Use the migration script to transfer existing data from SQLite to PostgreSQL:

```bash
npm run migrate-to-postgres
```

## Testing PostgreSQL Connectivity

To verify PostgreSQL connectivity:

1. Start the services:
   ```bash
   docker-compose up -d postgres
   ```

2. Check the logs:
   ```bash
   docker-compose logs postgres
   ```

3. Verify connectivity:
   ```bash
   docker-compose exec postgres pg_isready -U spartan_user -d spartan_fitness
   ```

## Rollback Procedure

To rollback to SQLite:

1. Update environment variables:
   ```bash
   # Remove or comment out DATABASE_TYPE
   # DATABASE_TYPE=postgres
   ```

2. Restart the application

## Performance Considerations

PostgreSQL offers several advantages over SQLite for multi-user environments:

1. **Concurrent Access** - Better handling of simultaneous read/write operations
2. **Scalability** - Can handle larger datasets and more concurrent users
3. **Advanced Features** - Support for complex queries, indexing, and transactions
4. **Reliability** - Enterprise-grade reliability and data integrity

## Security Considerations

1. **Connection Security** - All database connections use secure authentication
2. **Environment Variables** - Sensitive information stored in environment variables
3. **Access Control** - Proper user permissions and role-based access
4. **Data Encryption** - Data encryption at rest and in transit

## Troubleshooting

### Common Issues

1. **Connection Refused** - Ensure PostgreSQL service is running and accessible
2. **Authentication Failed** - Verify username and password in environment variables
3. **Database Not Found** - Ensure database name is correct and database exists
4. **Permission Denied** - Check user permissions and database ownership

### Logs and Monitoring

Check the application logs for database-related errors:
```bash
docker-compose logs synergycoach_backend_1
docker-compose logs postgres
```

## Future Enhancements

1. **Connection Pooling Optimization** - Fine-tune connection pool settings based on usage patterns
2. **Indexing Strategy** - Implement advanced indexing for improved query performance
3. **Backup and Recovery** - Implement automated backup and recovery procedures
4. **Monitoring and Alerting** - Add database-specific monitoring and alerting