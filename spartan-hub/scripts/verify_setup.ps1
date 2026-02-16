# Spartan Hub - Setup Verification Script

Write-Host "🔍 Verifying Spartan Hub Local Ollama Setup" -ForegroundColor Green

# Check Node.js installation
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check npm installation
Write-Host "🔍 Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check Ollama installation
Write-Host "🔍 Checking Ollama installation..." -ForegroundColor Yellow
try {
    $ollamaVersion = ollama --version
    Write-Host "✅ Ollama is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama is not installed" -ForegroundColor Red
    exit 1
}

# Check Ollama service
Write-Host "🔍 Checking Ollama service..." -ForegroundColor Yellow
try {
    $ollamaResponse = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Timeout 5
    Write-Host "✅ Ollama service is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama service is not running" -ForegroundColor Red
    Write-Host "💡 Start Ollama from the system tray or run ollama serve" -ForegroundColor Yellow
    exit 1
}

# Check required model
Write-Host "🔍 Checking for required model (gemma2:2b)..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags"
    $hasModel = $models.models | Where-Object { $_.name -eq "gemma2:2b" }
    
    if ($hasModel) {
        Write-Host "✅ Required model (gemma2:2b) is available" -ForegroundColor Green
    } else {
        Write-Host "❌ Required model (gemma2:2b) is not available" -ForegroundColor Red
        Write-Host "📥 To download: ollama pull gemma2:2b" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Error checking models" -ForegroundColor Red
    exit 1
}

# Check dependencies
Write-Host "🔍 Checking project dependencies..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "✅ package.json found" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found" -ForegroundColor Red
    exit 1
}

# Check AI service file
Write-Host "🔍 Checking AI service implementation..." -ForegroundColor Yellow
if (Test-Path "backend/src/services/aiService.ts") {
    Write-Host "✅ AI service file found" -ForegroundColor Green
} else {
    Write-Host "❌ AI service file not found" -ForegroundColor Red
    exit 1
}

# Test AI service
Write-Host "🔍 Testing AI service..." -ForegroundColor Yellow
try {
    node test_ai_service.js
    Write-Host "✅ AI service test passed" -ForegroundColor Green
} catch {
    Write-Host "❌ AI service test failed" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 All checks passed! Your local Ollama setup is working correctly." -ForegroundColor Green
Write-Host "🚀 You can now run the application with: .\start_app.ps1" -ForegroundColor Yellow