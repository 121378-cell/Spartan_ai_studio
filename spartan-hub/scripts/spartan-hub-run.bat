@echo off
title Spartan Hub - Fitness Coaching Application

echo 🚀 Spartan Hub Launcher
echo ====================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed
    echo 💡 Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Display Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% is installed

REM Check if Ollama is installed
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama is not installed
    echo 💡 Please install Ollama from https://ollama.com/
    pause
    exit /b 1
)

echo ✅ Ollama is installed

REM Check if gemma2 model is available
echo 🔍 Checking for gemma2:2b model...
ollama list | findstr "gemma2:2b" >nul
if %errorlevel% neq 0 (
    echo ⚠️  gemma2:2b model not found
    echo 💡 To download the model, run: ollama pull gemma2:2b
    pause
    exit /b 1
)

echo ✅ gemma2:2b model is available

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

echo ✅ Setup completed successfully!

echo 🚀 Starting Spartan Hub Backend...
echo ================================

echo 🔧 Backend API will be available at http://localhost:3001
echo 💡 Press Ctrl+C to stop the service

node spartan-hub-launcher.js

echo 🛑 Application stopped
pause