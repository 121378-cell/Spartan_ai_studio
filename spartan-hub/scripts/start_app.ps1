# Spartan Hub - Local Ollama Startup Script

Write-Host "🚀 Starting Spartan Hub with Local Ollama Integration" -ForegroundColor Green

# Check if Ollama is running
Write-Host "🔍 Checking Ollama status..." -ForegroundColor Yellow
try {
    $ollamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Timeout 5
    Write-Host "✅ Ollama is running and accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama is not accessible. Please start Ollama service." -ForegroundColor Red
    Write-Host "💡 Tip: You can start Ollama from the system tray icon or run 'ollama serve'" -ForegroundColor Yellow
    exit 1
}

# Check if required model is available
Write-Host "🔍 Checking for required model (gemma2:2b)..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:11434/api/tags"
    $hasModel = $models.models | Where-Object { $_.name -eq "gemma2:2b" }
    
    if ($hasModel) {
        Write-Host "✅ Required model (gemma2:2b) is available" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Required model (gemma2:2b) not found" -ForegroundColor Yellow
        Write-Host "📥 Downloading gemma2:2b model..." -ForegroundColor Yellow
        ollama pull gemma2:2b
    }
} catch {
    Write-Host "❌ Error checking models: $_" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
if (!(Test-Path "node_modules")) {
    npm install
}

# Compile TypeScript code
Write-Host "⚙️  Compiling TypeScript code..." -ForegroundColor Yellow
Set-Location backend
try {
    npx tsc
    Write-Host "✅ TypeScript compilation successful" -ForegroundColor Green
} catch {
    Write-Host "❌ TypeScript compilation failed: $_" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Start the application
Write-Host "🚀 Starting the application..." -ForegroundColor Green
Write-Host "💡 The application will be available at http://localhost:3001" -ForegroundColor Yellow

# Note: You would start your actual application server here
# For example:
# node backend/dist/server.js

Write-Host "✅ Spartan Hub is ready!" -ForegroundColor Green
Write-Host "📝 To test the AI integration, run: node test_ai_service.js" -ForegroundColor Yellow