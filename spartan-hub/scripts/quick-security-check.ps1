# Quick Docker Security Validation Script (Windows PowerShell)
# Runs basic security checks on the Spartan Hub Docker setup

Write-Host "🚀 Starting Spartan Hub Docker Security Validation..." -ForegroundColor Green

# Check if Docker is running
try {
    $dockerVersion = docker version
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check for running containers
Write-Host "📋 Checking running containers..." -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check for privileged containers
Write-Host "🔒 Checking for privileged containers..." -ForegroundColor Cyan
$privilegedContainers = docker ps --filter "privileged=true" --format "{{.Names}}"
if ($privilegedContainers) {
    Write-Host "⚠️  WARNING: Privileged containers found:" -ForegroundColor Yellow
    $privilegedContainers
} else {
    Write-Host "✅ No privileged containers found" -ForegroundColor Green
}

# Check for containers running as root
Write-Host "👤 Checking container user contexts..." -ForegroundColor Cyan
$rootContainers = @()
docker ps --format '{{.Names}}' | ForEach-Object {
    $container = $_
    try {
        $user = docker exec $container whoami 2>$null
        if ($user -eq "root") {
            $rootContainers += $container
        }
    } catch {
        # Ignore containers where we can't determine user
    }
}

if ($rootContainers.Count -gt 0) {
    Write-Host "⚠️  WARNING: Containers running as root: $($rootContainers -join ', ')" -ForegroundColor Yellow
} else {
    Write-Host "✅ All containers running with non-root users" -ForegroundColor Green
}

# Check exposed ports
Write-Host "🌐 Checking exposed ports..." -ForegroundColor Cyan
docker ps --format 'table {{.Names}}\t{{.Ports}}'

# Check image information
Write-Host "🔍 Checking image information..." -ForegroundColor Cyan
docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}' | Select-Object -First 10

# Network security check
Write-Host "使用網路 security check..." -ForegroundColor Cyan
docker network ls

Write-Host "✅ Docker security validation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Recommendations:" -ForegroundColor Cyan
Write-Host "1. Consider running the full security scanner: .\docker-security-scan.ps1" -ForegroundColor White
Write-Host "2. Regularly update base images with: docker-compose pull" -ForegroundColor White
Write-Host "3. Monitor container logs for security events" -ForegroundColor White
Write-Host "4. Implement runtime security monitoring in production" -ForegroundColor White