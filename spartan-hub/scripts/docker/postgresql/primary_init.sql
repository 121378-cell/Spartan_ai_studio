#!/bin/bash
set -e

echo "Initializing replication user..."

# Read replication password from Docker secret
# Docker mounts secrets at /run/secrets/<secret_name>
if [ -f "/run/secrets/postgres_replication_password" ]; then
    POSTGRES_REPLICATION_PASSWORD=$(cat /run/secrets/postgres_replication_password)
    export POSTGRES_REPLICATION_PASSWORD
else
    echo "ERROR: Secret file /run/secrets/postgres_replication_password not found"
    exit 1
fi

# Create replication user securely using the password from secret
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'replicator') THEN
            CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD '$POSTGRES_REPLICATION_PASSWORD';
        ELSE
            ALTER USER replicator WITH ENCRYPTED PASSWORD '$POSTGRES_REPLICATION_PASSWORD';
        END IF;
    END
    \$\$;
EOSQL

echo "Replication user configured successfully."
