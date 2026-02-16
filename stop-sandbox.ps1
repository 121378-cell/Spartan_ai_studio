# Helper script to stop the Spartan Hub Sandbox
Write-Host "🛑 Stopping Spartan Hub Docker Sandbox..." -ForegroundColor Yellow

if (-not (Test-Path "sandbox")) {
    Write-Host "❌ Sandbox directory not found!" -ForegroundColor Red
    exit 1
}

Push-Location sandbox
docker-compose down
Pop-Location

Write-Host "✅ Sandbox stopped." -ForegroundColor Green
