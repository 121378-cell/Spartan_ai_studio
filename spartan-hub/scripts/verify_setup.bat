@echo off
echo 🚀 Verifying Spartan Hub Local Ollama Setup
echo.

echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    exit /b 1
)
echo ✅ Node.js is installed
echo.

echo 🔍 Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed or not in PATH
    exit /b 1
)
echo ✅ npm is installed
echo.

echo 🔍 Checking Ollama installation...
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama is not installed
    exit /b 1
)
echo ✅ Ollama is installed
echo.

echo 🔍 Checking Ollama service...
powershell -Command "Invoke-WebRequest -Uri http://localhost:11434/api/tags -TimeoutSec 5" >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Ollama service is not running
    echo 💡 Start Ollama from the system tray or run 'ollama serve'
    exit /b 1
)
echo ✅ Ollama service is running
echo.

echo 🔍 Testing AI service...
node test_ai_service.js >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ AI service test failed
    exit /b 1
)
echo ✅ AI service test passed
echo.

echo 🎉 All checks passed! Your local Ollama setup is working correctly.
echo 🚀 You can now run the application