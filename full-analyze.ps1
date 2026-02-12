# ====================================================================
# Script de análisis completo para Spartan Hub 2.0
# ====================================================================

Set-Location $PSScriptRoot

Write-Host "`n🔹 COMIENZO DEL ANÁLISIS COMPLETO" -ForegroundColor Cyan

# ==========================================================
# 1️⃣ ESLint
# ==========================================================
Write-Host "`n🔹 1. ESLint" -ForegroundColor Cyan

if (-Not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias npm..." -ForegroundColor Yellow
    npm install
}

if (-Not (Test-Path "node_modules\.bin\eslint")) {
    Write-Host "Instalando ESLint..." -ForegroundColor Yellow
    npm install eslint --save-dev
}

Write-Host "Ejecutando ESLint --fix..." -ForegroundColor Yellow
npx eslint . --fix


# ==========================================================
# 2️⃣ Snyk
# ==========================================================
Write-Host "`n🔹 2. Snyk" -ForegroundColor Cyan

if (-Not (Get-Command snyk -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando Snyk..." -ForegroundColor Yellow
    npm install -g snyk
}

# Verificar autenticación
snyk whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Autenticando Snyk..." -ForegroundColor Yellow
    snyk auth
}

Write-Host "Ejecutando Snyk test..." -ForegroundColor Yellow
snyk test

Write-Host "Ejecutando Snyk code test..." -ForegroundColor Yellow
snyk code test


# ==========================================================
# 3️⃣ diffray
# ==========================================================
Write-Host "`n🔹 3. diffray" -ForegroundColor Cyan

if (-Not (Get-Command diffray -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando diffray..." -ForegroundColor Yellow
    npm install -g diffray
}

Write-Host "Ejecutando diffray review..." -ForegroundColor Yellow
diffray review


# ==========================================================
# 4️⃣ CodeQL
# ==========================================================
Write-Host "`n🔹 4. CodeQL" -ForegroundColor Cyan

if (-Not (Get-Command codeql -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ CodeQL CLI no está instalado o no está en PATH." -ForegroundColor Red
    Write-Host "Descarga desde: https://github.com/github/codeql-cli-binaries" -ForegroundColor Red
}
else {

    if (Test-Path "codeql-db") {
        Remove-Item -Recurse -Force "codeql-db"
    }

    Write-Host "Creando base de datos CodeQL..." -ForegroundColor Yellow
    codeql database create codeql-db `
        --language=javascript `
        --source-root=.

    Write-Host "Analizando base de datos CodeQL..." -ForegroundColor Yellow
    codeql database analyze codeql-db `
        --format=sarif-latest `
        --output=codeql-results.sarif `
        codeql/javascript-queries

    Write-Host "✅ CodeQL completado. Resultado: codeql-results.sarif" -ForegroundColor Green
}

Write-Host "`n🎯 ANÁLISIS COMPLETO FINALIZADO" -ForegroundColor Green
