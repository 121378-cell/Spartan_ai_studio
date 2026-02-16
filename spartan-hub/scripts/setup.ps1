#!/usr/bin/env pwsh

# Function to check if a command exists
function Test-Command {
    param ($Command)
    $oldPreference = $ErrorActionPreference
    $ErrorActionPreference = 'stop'
    try {
        if (Get-Command $Command) { return $true }
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $oldPreference
    }
}

Write-Host "🚀 Iniciando configuración de Spartan Hub..." -ForegroundColor Green

# Check Node.js
if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js no encontrado. Por favor instale Node.js v18 o superior." -ForegroundColor Red
    exit 1
}

# Check Python
if (-not (Test-Command "python")) {
    Write-Host "❌ Python no encontrado. Por favor instale Python 3.10 o superior." -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creando directorios necesarios..." -ForegroundColor Yellow
$directories = @(
    ".\data",
    ".\backend\secrets",
    ".\logs",
    ".\dist",
    ".\dist-exe",
    ".\public"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
        Write-Host "✅ Creado directorio: $dir" -ForegroundColor Green
    }
}

# Install dependencies
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow

# Frontend dependencies
Write-Host "Frontend dependencies..." -ForegroundColor Cyan
npm install

# Backend dependencies
Write-Host "Backend dependencies..." -ForegroundColor Cyan
Push-Location backend
npm install
Pop-Location

# Python dependencies
Write-Host "Python dependencies..." -ForegroundColor Cyan
Push-Location AI
python -m pip install -r requirements.txt
Pop-Location

# Check for .env file
Write-Host "🔍 Verificando archivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".\.env")) {
    Write-Host "❌ No se encontró archivo .env" -ForegroundColor Red
    Write-Host "Copiando .env.example a .env..." -ForegroundColor Yellow
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "✅ Archivo .env creado. Por favor, edítalo con tus valores reales." -ForegroundColor Green
    Write-Host "⚠️ IMPORTANTE: Añade valores seguros para JWT_SECRET y SESSION_SECRET" -ForegroundColor Yellow
}

# Generate random secrets for security if not set in .env
$envContent = Get-Content ".\.env" -Raw
if (-not ($envContent -match "JWT_SECRET=.+")) {
    $jwtSecret = [Convert]::ToBase64String((New-Object byte[] 32).Random())
    Add-Content ".\.env" "`nJWT_SECRET=$jwtSecret"
    Write-Host "✅ JWT_SECRET generado" -ForegroundColor Green
}

if (-not ($envContent -match "SESSION_SECRET=.+")) {
    $sessionSecret = [Convert]::ToBase64String((New-Object byte[] 32).Random())
    Add-Content ".\.env" "`nSESSION_SECRET=$sessionSecret"
    Write-Host "✅ SESSION_SECRET generado" -ForegroundColor Green
}

# Build the application
Write-Host "🏗️ Construyendo la aplicación..." -ForegroundColor Yellow
npm run build:all

Write-Host "`n✨ Configuración completada" -ForegroundColor Green
Write-Host "Para iniciar la aplicación:" -ForegroundColor Cyan
Write-Host "1. En modo desarrollo: npm run dev" -ForegroundColor White
Write-Host "2. En modo producción: npm start" -ForegroundColor White
Write-Host "3. Con Docker: docker-compose up -d" -ForegroundColor White