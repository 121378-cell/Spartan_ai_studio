#!/bin/sh

# Wait for services to be healthy
wait_for_service() {
    echo "Waiting for $1 to be healthy..."
    while true; do
        if wget -q --spider "http://localhost:$2/health"; then
            echo "$1 is healthy!"
            break
        fi
        sleep 5
    done
}

# Create secrets directory if it doesn't exist
mkdir -p ./backend/secrets

# Generate secure random values for secrets if they don't exist
if [ ! -f ./backend/secrets/api_key.txt ]; then
    openssl rand -base64 32 > ./backend/secrets/api_key.txt
fi

if [ ! -f ./backend/secrets/db_password.txt ]; then
    openssl rand -base64 32 > ./backend/secrets/db_password.txt
fi

if [ ! -f ./backend/secrets/ollama_api_key.txt ]; then
    openssl rand -base64 32 > ./backend/secrets/ollama_api_key.txt
fi

# Set proper permissions on secrets
chmod 600 ./backend/secrets/*.txt

# Start services
docker-compose up -d

# Wait for services to be healthy
wait_for_service "backend" 3001
wait_for_service "ollama" 11434
wait_for_service "nginx" 443

echo "All services are up and healthy!"