@echo off
title Spartan Hub - Fitness Coaching Application

echo 🚀 Spartan Hub Launcher
echo ======================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo 💡 Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Ollama is installed
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama is not installed
    echo 💡 Please install Ollama from https://ollama.com/
    pause
    exit /b 1
)

REM Check if gemma2 model is available
echo 🔍 Checking for gemma2:2b model...
ollama list | findstr "gemma2:2b" >nul
if %errorlevel% neq 0 (
    echo ⚠️  gemma2:2b model not found, downloading...
    ollama pull gemma2:2b
    if %errorlevel% neq 0 (
        echo ❌ Failed to download gemma2:2b model
        pause
        exit /b 1
    )
    echo ✅ gemma2:2b model downloaded
) else (
    echo ✅ gemma2:2b model is available
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install backend dependencies if node_modules doesn't exist
if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install backend dependencies
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

REM Build frontend
echo 🔨 Building frontend...
npx vite build
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)

REM Build backend
echo 🔨 Building backend...
cd backend
npx tsc
if %errorlevel% neq 0 (
    echo ❌ Backend build failed
    cd ..
    pause
    exit /b 1
)
cd ..

echo ✅ Build completed successfully!

echo 🚀 Starting Spartan Hub Application...
echo =====================================

REM Start backend in background
start "Spartan Hub Backend" /min cmd /c "cd backend && node dist/server.js ^& pause"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🌐 Frontend will be available at http://localhost:3000
echo 🔧 Backend API will be available at http://localhost:3001
echo 💡 Press Ctrl+C to stop the frontend server
npx vite preview

echo 🛑 Application stopped
pause