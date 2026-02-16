#!/usr/bin/env pwsh

function Test-Port {
    param(
        [string]$HostName = "localhost",
        [int]$Port
    )
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.ConnectAsync($Host, $Port).Wait(1000) | Out-Null
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Get-ServiceStatus {
    param(
        [string]$ServiceName,
        [string]$HostName,
        [int]$Port
    )
    if (Test-Port -HostName $HostName -Port $Port) {
        Write-Host "✅ $ServiceName está ejecutándose en puerto $Port" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $ServiceName no responde en puerto $Port" -ForegroundColor Red
        return $false
    }
}

Write-Host "🔍 Verificando estado de Spartan Hub..." -ForegroundColor Yellow

# Check if Docker is running
if (Get-Command docker -ErrorAction SilentlyContinue) {
    if ((docker ps -q).Length -gt 0) {
        Write-Host "✅ Docker está ejecutándose" -ForegroundColor Green
    } else {
        Write-Host "❌ Docker no está ejecutándose" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Docker no está instalado" -ForegroundColor Yellow
}

# Check services
$services = @{
    "Frontend" = @{HostName="localhost"; Port=3002}
    "Backend API" = @{HostName="localhost"; Port=3001}
    "Ollama Service" = @{HostName="localhost"; Port=11434}
    "NGINX Proxy" = @{HostName="localhost"; Port=443}
}

$allServicesOk = $true
foreach ($service in $services.GetEnumerator()) {
    if (-not (Get-ServiceStatus -ServiceName $service.Key -HostName $service.Value.HostName -Port $service.Value.Port)) {
        $allServicesOk = $false
    }
}

# Check directories and files
$criticalPaths = @(
    @{Path=".\data"; Type="Directory"}
    @{Path=".\dist"; Type="Directory"}
    @{Path=".\backend\secrets"; Type="Directory"}
    @{Path=".\backend\secrets\api_key.txt"; Type="File"}
    @{Path=".\backend\secrets\db_password.txt"; Type="File"}
    @{Path=".\backend\secrets\ollama_api_key.txt"; Type="File"}
)

Write-Host "`n📁 Verificando archivos y directorios críticos:" -ForegroundColor Yellow
foreach ($item in $criticalPaths) {
    if (Test-Path $item.Path) {
        Write-Host "✅ $($item.Path) existe" -ForegroundColor Green
    } else {
        Write-Host "❌ $($item.Path) no existe" -ForegroundColor Red
        $allServicesOk = $false
    }
}

# Final status
Write-Host "`n📊 Resumen de estado:" -ForegroundColor Yellow
if ($allServicesOk) {
    Write-Host "✅ Todos los servicios están funcionando correctamente" -ForegroundColor Green
} else {
    Write-Host "❌ Hay servicios que requieren atención" -ForegroundColor Red
    Write-Host "Sugerencias:" -ForegroundColor Yellow
    Write-Host "1. Ejecute './setup.ps1' para reinicializar la configuración" -ForegroundColor White
    Write-Host "2. Ejecute 'docker-compose up -d' para reiniciar los servicios" -ForegroundColor White
    Write-Host "3. Revise los logs con 'docker-compose logs'" -ForegroundColor White
}