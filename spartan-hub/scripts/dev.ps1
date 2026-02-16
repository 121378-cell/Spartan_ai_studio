#!/usr/bin/env pwsh

$ErrorActionPreference = 'Stop'

Write-Host "🚀 Iniciando Spartan Hub en modo desarrollo local..." -ForegroundColor Green

# Verificar si Ollama está instalado localmente
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ Ollama no está instalado. Instalando..." -ForegroundColor Yellow
    
    # Descargar e instalar Ollama según el sistema operativo
    $ollamaInstaller = "https://ollama.ai/download/ollama-windows-amd64.zip"
    $ollamaZip = ".\ollama.zip"
    
    Invoke-WebRequest -Uri $ollamaInstaller -OutFile $ollamaZip
    Expand-Archive -Path $ollamaZip -DestinationPath ".\ollama" -Force
    Remove-Item $ollamaZip
    
    # Agregar Ollama al PATH
    $env:PATH += ";$((Get-Location).Path)\ollama"
    
    Write-Host "✅ Ollama instalado correctamente" -ForegroundColor Green
}

# Función para manejar la limpieza al salir
function Cleanup {
    Write-Host "`n🛑 Deteniendo servicios..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process
    Get-Process -Name "ollama" -ErrorAction SilentlyContinue | Stop-Process
    Write-Host "✅ Servicios detenidos" -ForegroundColor Green
}

# Registrar manejador de limpieza
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

try {
    # Instalar modelos de Ollama necesarios
    Write-Host "📦 Verificando modelos de Ollama..." -ForegroundColor Yellow
    ollama pull mistral
    
    # Iniciar Ollama en segundo plano
    Start-Process ollama -ArgumentList "serve" -NoNewWindow
    
    # Esperar a que Ollama esté listo
    Write-Host "⏳ Esperando que Ollama esté listo..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Iniciar servicios de desarrollo
    Write-Host "🛠️ Iniciando servicios en modo desarrollo..." -ForegroundColor Yellow
    
    # Terminal para el backend
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WindowStyle Normal
    
    # Terminal para el frontend
    Start-Process pwsh -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal
    
    Write-Host "`n✨ Entorno de desarrollo iniciado" -ForegroundColor Green
    Write-Host "📝 Frontend: http://localhost:3002" -ForegroundColor Cyan
    Write-Host "🔧 Backend: http://localhost:3001" -ForegroundColor Cyan
    Write-Host "🤖 Ollama: http://localhost:11434" -ForegroundColor Cyan
    Write-Host "🛑 Para detener, presione Ctrl+C" -ForegroundColor Yellow
    
    # Mantener el script ejecutándose hasta Ctrl+C
    while ($true) {
        Start-Sleep -Seconds 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Cleanup
    exit 1
} finally {
    Cleanup
}