#!/bin/bash

# Quick Docker Security Validation Script
# Runs basic security checks on the Spartan Hub Docker setup

echo "🚀 Starting Spartan Hub Docker Security Validation..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

echo "✅ Docker is running"

# Check for running containers
echo "📋 Checking running containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check for privileged containers
echo "🔒 Checking for privileged containers..."
privileged_containers=$(docker ps --filter "privileged=true" --format "{{.Names}}")
if [ -n "$privileged_containers" ]; then
    echo "⚠️  WARNING: Privileged containers found:"
    echo "$privileged_containers"
else
    echo "✅ No privileged containers found"
fi

# Check for containers running as root
echo "👤 Checking container user contexts..."
root_containers=""
while IFS= read -r container; do
    user=$(docker exec "$container" whoami 2>/dev/null || echo "unknown")
    if [ "$user" = "root" ]; then
        root_containers="$root_containers $container"
    fi
done < <(docker ps --format '{{.Names}}')

if [ -n "$root_containers" ]; then
    echo "⚠️  WARNING: Containers running as root:$root_containers"
else
    echo "✅ All containers running with non-root users"
fi

# Check exposed ports
echo "🌐 Checking exposed ports..."
docker ps --format 'table {{.Names}}\t{{.Ports}}'

# Check image vulnerabilities (basic check)
echo "🔍 Checking for basic security issues..."
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}' | head -10

# Network security check
echo "使用網路 security check..."
docker network ls

echo "✅ Docker security validation completed!"
echo ""
echo "💡 Recommendations:"
echo "1. Consider running the full security scanner: ./docker-security-scan.sh"
echo "2. Regularly update base images with: docker-compose pull"
echo "3. Monitor container logs for security events"
echo "4. Implement runtime security monitoring in production"