# Spartan Hub Launcher Script
Write-Host "🚀 Spartan Hub Launcher" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "💡 Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if Ollama is installed
try {
    $ollamaVersion = ollama --version
    Write-Host "✅ $ollamaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Ollama is not installed" -ForegroundColor Red
    Write-Host "💡 Please install Ollama from https://ollama.com/" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if gemma2 model is available
Write-Host "🔍 Checking for gemma2:2b model..." -ForegroundColor Yellow
try {
    $models = ollama list
    if ($models -like "*gemma2:2b*") {
        Write-Host "✅ gemma2:2b model is available" -ForegroundColor Green
    } else {
        Write-Host "⚠️  gemma2:2b model not found, downloading..." -ForegroundColor Yellow
        ollama pull gemma2:2b
        Write-Host "✅ gemma2:2b model downloaded" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error checking/downloading model: $_" -ForegroundColor Red
    pause
    exit 1
}

# Install dependencies if node_modules doesn't exist
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        pause
        exit 1
    }
}

# Install backend dependencies if node_modules doesn't exist
if (!(Test-Path "backend\node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        Set-Location ..
        pause
        exit 1
    }
    Set-Location ..
}

# Build frontend
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
npx vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    pause
    exit 1
}

# Build backend
Write-Host "🔨 Building backend..." -ForegroundColor Yellow
Set-Location backend
npx tsc
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed" -ForegroundColor Red
    Set-Location ..
    pause
    exit 1
}
Set-Location ..

Write-Host "✅ Build completed successfully!" -ForegroundColor Green

# Start services
Write-Host "🚀 Starting Spartan Hub Application..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Start backend in background
Write-Host "🔧 Starting backend service..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c cd backend && node dist/server.js" -WindowStyle Minimized

# Wait a moment for backend to start
Start-Sleep -Seconds 3

Write-Host "🌐 Frontend will be available at http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API will be available at http://localhost:3001" -ForegroundColor Cyan
Write-Host "💡 Press Ctrl+C to stop the frontend server" -ForegroundColor Yellow

# Start frontend
npx vite preview

Write-Host "🛑 Application stopped" -ForegroundColor Red
pause