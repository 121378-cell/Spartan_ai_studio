#!/bin/bash

# Test script to verify deployment of Spartan Hub services

echo "=== Spartan Hub Deployment Verification ==="

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "ERROR: Docker is not installed or not in PATH"
    echo "Please install Docker Desktop or Docker Engine"
    exit 1
fi

echo "✓ Docker is installed"

# Check if Docker Compose is available
if ! docker compose version &> /dev/null
then
    echo "ERROR: Docker Compose is not available"
    echo "Please ensure Docker Compose plugin is installed"
    exit 1
fi

echo "✓ Docker Compose is available"

# Check if services are running
if ! docker ps | grep -q "ollama_service"; then
    echo "WARNING: Ollama service is not running"
    echo "Starting services..."
    docker compose up -d
    sleep 10
fi

# Check running containers
echo ""
echo "=== Running Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Networks}}"

# Check if required services are running
OLLAMA_RUNNING=$(docker ps | grep -c "ollama_service")
BACKEND_1_RUNNING=$(docker ps | grep -c "synergycoach_backend_1")
BACKEND_2_RUNNING=$(docker ps | grep -c "synergycoach_backend_2")
AI_SERVICE_RUNNING=$(docker ps | grep -c "ai_microservice")

if [ $OLLAMA_RUNNING -eq 0 ]; then
    echo "ERROR: Ollama service is not running"
    exit 1
fi

if [ $BACKEND_1_RUNNING -eq 0 ]; then
    echo "ERROR: Backend service instance 1 is not running"
    exit 1
fi

if [ $BACKEND_2_RUNNING -eq 0 ]; then
    echo "ERROR: Backend service instance 2 is not running"
    exit 1
fi

if [ $AI_SERVICE_RUNNING -eq 0 ]; then
    echo "ERROR: AI microservice is not running"
    exit 1
fi

echo "✓ All services are running"

# Check if services are on the same network
OLLAMA_NETWORK=$(docker inspect ollama_service | grep -o '"synergycoach_net"' | head -1)
BACKEND_1_NETWORK=$(docker inspect synergycoach_backend_1 | grep -o '"synergycoach_net"' | head -1)
BACKEND_2_NETWORK=$(docker inspect synergycoach_backend_2 | grep -o '"synergycoach_net"' | head -1)
AI_NETWORK=$(docker inspect ai_microservice | grep -o '"synergycoach_net"' | head -1)

if [ -z "$OLLAMA_NETWORK" ] || [ -z "$BACKEND_1_NETWORK" ] || [ -z "$BACKEND_2_NETWORK" ] || [ -z "$AI_NETWORK" ]; then
    echo "ERROR: Services are not on the expected network"
    exit 1
fi

echo "✓ Services are on the same network"

# Check backend logs for connection errors
echo ""
echo "=== Checking Backend Logs ==="
echo "--- Backend Instance 1 ---"
docker logs synergycoach_backend_1 2>&1 | grep -i "error\|fail" | head -5

echo "--- Backend Instance 2 ---"
docker logs synergycoach_backend_2 2>&1 | grep -i "error\|fail" | head -5

# If no errors found, check for successful startup messages
if [ $(docker logs synergycoach_backend_1 2>&1 | grep -c "Server is running on port") -gt 0 ]; then
    echo "✓ Backend instance 1 started successfully"
else
    echo "WARNING: Could not confirm backend instance 1 startup"
fi

if [ $(docker logs synergycoach_backend_2 2>&1 | grep -c "Server is running on port") -gt 0 ]; then
    echo "✓ Backend instance 2 started successfully"
else
    echo "WARNING: Could not confirm backend instance 2 startup"
fi

# Test health endpoints
echo ""
echo "=== Testing Health Endpoints ==="

# Test backend health
if curl -f -s http://localhost:3001/health > /dev/null; then
    echo "✓ Backend health check passed"
else
    echo "ERROR: Backend health check failed"
    exit 1
fi

# Test AI service health
if curl -f -s http://localhost:3001/ai/health > /dev/null; then
    echo "✓ AI service health check passed"
else
    echo "ERROR: AI service health check failed"
    exit 1
fi

# Test Ollama service
if curl -f -s http://localhost:11434/api/tags > /dev/null; then
    echo "✓ Ollama service is responding"
else
    echo "ERROR: Ollama service is not responding"
    exit 1
fi

# Test load balancing by making multiple requests
echo ""
echo "=== Testing Load Balancing ==="
echo "Making 5 requests to verify load distribution..."

for i in {1..5}; do
    RESPONSE=$(curl -s http://localhost:3001/health)
    echo "Request $i: $RESPONSE"
done

echo ""
echo "=== Deployment Verification Complete ==="
echo "All checks passed! Services are running and interconnected properly."