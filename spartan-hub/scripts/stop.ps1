# Spartan Hub - Stop Script (PowerShell)
# This script stops the entire application ecosystem using Docker Compose

Write-Host "🛑 Stopping Spartan Hub Fitness Application..." -ForegroundColor Yellow

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
try {
    $dockerComposeVersion = docker-compose --version
    Write-Host "✅ Docker Compose is installed: $dockerComposeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose is not installed." -ForegroundColor Red
    exit 1
}

# Check if Docker daemon is running
try {
    $dockerInfo = docker info
    Write-Host "✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon is not running." -ForegroundColor Red
    exit 1
}

# Stop services
Write-Host "⏹️  Stopping services..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services stopped successfully!" -ForegroundColor Green
    Write-Host "🧹 Cleanup complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to stop services. Check the logs above for details." -ForegroundColor Red
    exit 1
}