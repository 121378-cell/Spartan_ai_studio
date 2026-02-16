# Helper script to start the Spartan Hub Sandbox
Write-Host "🚀 Starting Spartan Hub Docker Sandbox..." -ForegroundColor Green

if (-not (Test-Path "sandbox")) {
    Write-Host "❌ Sandbox directory not found!" -ForegroundColor Red
    exit 1
}

Push-Location sandbox

# Check if docker is running
docker ps > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Docker is not running or not accessible. Please start Docker Desktop." -ForegroundColor Yellow
    Pop-Location
    exit 1
}

Write-Host "🐳 Running docker-compose build..." -ForegroundColor Cyan
docker-compose build

Write-Host "🐳 Running docker-compose up..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "`n✨ Sandbox is running!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "AI Service:  http://localhost:9000" -ForegroundColor White
Write-Host "Database:    localhost:5432 (Postgres)" -ForegroundColor White
Write-Host "`nUse 'docker-compose logs -f' in the sandbox directory to see output." -ForegroundColor Gray
Write-Host "Use './stop-sandbox.ps1' to stop the services." -ForegroundColor Gray

Pop-Location
