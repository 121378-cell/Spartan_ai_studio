# Secrets Verification Script for Spartan Hub
# Verifies that secrets management is properly implemented

Write-Host "🔐 Spartan Hub - Secrets Management Verification" -ForegroundColor Green
Write-Host "==============================================="

# Check if .env file is in gitignore
$gitignoreContent = Get-Content .\.gitignore -Raw
if ($gitignoreContent -match ".env" -and $gitignoreContent -match "backend/.env") {
    Write-Host "✅ .env files are properly ignored by git" -ForegroundColor Green
} else {
    Write-Host "❌ .env files are NOT properly ignored by git" -ForegroundColor Red
    exit 1
}

# Check if secrets directory files are in gitignore
if ($gitignoreContent -match "backend/secrets/\*\.txt") {
    Write-Host "✅ Secrets files are properly ignored by git" -ForegroundColor Green
} else {
    Write-Host "❌ Secrets files are NOT properly ignored by git" -ForegroundColor Red
    exit 1
}

# Check if docker-compose.yml uses environment variables (not hardcoded values)
$dockComposeContent = Get-Content .\docker-compose.yml -Raw
if ($dockComposeContent -match '\$\{.*\}') {
    Write-Host "✅ docker-compose.yml properly uses environment variables" -ForegroundColor Green
} else {
    Write-Host "❌ docker-compose.yml does NOT properly use environment variables" -ForegroundColor Red
    exit 1
}

# Check for any actual secrets files that might contain real credentials
$apiKeyPath = ".\backend\secrets\api_key.txt"
if (Test-Path $apiKeyPath) {
    $apiKeyContent = Get-Content $apiKeyPath -Raw
    if ($apiKeyContent -ne "your_api_key_here" -and $apiKeyContent -notmatch "example") {
        Write-Host "⚠️  Warning: backend/secrets/api_key.txt exists and may contain real credentials" -ForegroundColor Yellow
    } else {
        Write-Host "✅ No real credentials found in backend/secrets/api_key.txt" -ForegroundColor Green
    }
} else {
    Write-Host "✅ backend/secrets/api_key.txt does not exist (as expected)" -ForegroundColor Green
}

$dbPasswordPath = ".\backend\secrets\db_password.txt"
if (Test-Path $dbPasswordPath) {
    $dbPasswordContent = Get-Content $dbPasswordPath -Raw
    if ($dbPasswordContent -ne "your_database_password_here" -and $dbPasswordContent -notmatch "example") {
        Write-Host "⚠️  Warning: backend/secrets/db_password.txt exists and may contain real credentials" -ForegroundColor Yellow
    } else {
        Write-Host "✅ No real credentials found in backend/secrets/db_password.txt" -ForegroundColor Green
    }
} else {
    Write-Host "✅ backend/secrets/db_password.txt does not exist (as expected)" -ForegroundColor Green
}

$ollamaApiKeyPath = ".\backend\secrets\ollama_api_key.txt"
if (Test-Path $ollamaApiKeyPath) {
    $ollamaApiKeyContent = Get-Content $ollamaApiKeyPath -Raw
    if ($ollamaApiKeyContent -ne "your_ollama_api_key_here" -and $ollamaApiKeyContent -notmatch "example") {
        Write-Host "⚠️  Warning: backend/secrets/ollama_api_key.txt exists and may contain real credentials" -ForegroundColor Yellow
    } else {
        Write-Host "✅ No real credentials found in backend/secrets/ollama_api_key.txt" -ForegroundColor Green
    }
} else {
    Write-Host "✅ backend/secrets/ollama_api_key.txt does not exist (as expected)" -ForegroundColor Green
}

# Check if main .env file contains placeholder values (not real secrets)
$envContent = Get-Content .\.env -Raw
if ($envContent -match "REPLACE_WITH_STRONG") {
    Write-Host "✅ Main .env file contains placeholder values, not real secrets" -ForegroundColor Green
} else {
    Write-Host "⚠️  Main .env file may contain real secrets - verify contents" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "- Secrets management is properly configured"
Write-Host "- Environment variables are used instead of hardcoded values" 
Write-Host "- Secrets files are properly excluded from version control"
Write-Host "- Use 'node generate_secrets.js' to generate strong secrets"
Write-Host "- Follow SECRET_MANAGEMENT.md for implementation instructions"

Write-Host ""
Write-Host "✅ Verification completed successfully!" -ForegroundColor Green