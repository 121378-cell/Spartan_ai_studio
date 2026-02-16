#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

Write-Host "🚀 Iniciando Spartan Hub..." -ForegroundColor Green

# Check if setup has been run
if (-not (Test-Path ".\backend\secrets\api_key.txt")) {
    Write-Host "⚠️ Primera ejecución detectada, ejecutando setup..." -ForegroundColor Yellow
    .\setup.ps1
}

# Function to handle cleanup on exit
function Cleanup {
    Write-Host "`n� Deteniendo servicios..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "✅ Servicios detenidos" -ForegroundColor Green
}

# Register cleanup handler
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

# Check if Docker is installed
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker instalado: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está instalado. Por favor, instale Docker primero." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
try {
    $dockerComposeVersion = docker-compose --version
    Write-Host "✅ Docker Compose instalado: $dockerComposeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose no está instalado. Por favor, instale Docker Compose primero." -ForegroundColor Red
    exit 1
}

# Check if Docker daemon is running
try {
    $dockerInfo = docker info
    Write-Host "✅ Docker daemon is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker daemon is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Build and start services in detached mode
Write-Host "🏗️  Building and starting services..." -ForegroundColor Yellow
docker-compose up -d --build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    
    # Display service status
    Write-Host "📋 Service status:" -ForegroundColor Yellow
    docker-compose ps
    
    Write-Host ""
    Write-Host "🔗 Access the application at:" -ForegroundColor Cyan
    Write-Host "   Backend API: http://localhost:3001"
    Write-Host "   AI Service: http://localhost:8000"
    Write-Host ""
    Write-Host "📊 Health checks:" -ForegroundColor Cyan
    Write-Host "   Backend Health: http://localhost:3001/health"
    Write-Host "   AI Health: http://localhost:8000/health"
    Write-Host ""
    Write-Host "🎉 Spartan Hub is now running!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start services. Check the logs above for details." -ForegroundColor Red
    exit 1
}