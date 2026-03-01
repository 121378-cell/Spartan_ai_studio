@echo off
REM =============================================================================
REM Spartan Hub 2.0 - Local Test Environment Quick Start (Windows)
REM =============================================================================
REM This script starts all services for local multi-user testing
REM =============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     Spartan Hub 2.0 - Local Test Environment                  ║
echo ║     Quick Start Script (Windows)                              ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Check if docker-compose.local-test.yml exists
if not exist "docker-compose.local-test.yml" (
    echo [ERROR] docker-compose.local-test.yml not found!
    echo Please ensure you are in the project root directory.
    echo.
    pause
    exit /b 1
)

echo [INFO] Starting all services...
echo.

REM Start all Docker services
docker-compose -f docker-compose.local-test.yml up -d --build

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to start Docker services.
    echo Check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Services started successfully!
echo.

REM Wait for services to be ready
echo [INFO] Waiting for services to be healthy (this may take 1-2 minutes)...
echo.

REM Check service status
:wait_loop
docker-compose -f docker-compose.local-test.yml ps | findstr "healthy" >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 5 /nobreak >nul
    goto wait_loop
)

echo.
echo [OK] All services are healthy!
echo.

REM Display service status
echo ═══════════════════════════════════════════════════════════════
echo Service Status:
echo ═══════════════════════════════════════════════════════════════
docker-compose -f docker-compose.local-test.yml ps
echo.

REM Display access information
echo ═══════════════════════════════════════════════════════════════
echo Access URLs:
echo ═══════════════════════════════════════════════════════════════
echo Frontend:     http://localhost:5173
echo Backend API:  http://localhost:3001
echo AI Service:   http://localhost:8000
echo Mock Terra:   http://localhost:8080
echo Ollama:       http://localhost:11434
echo Qdrant:       http://localhost:6333
echo.

REM Display test user credentials
echo ═══════════════════════════════════════════════════════════════
echo Test User Credentials:
echo ═══════════════════════════════════════════════════════════════
echo User 1: test1@local.test / TestUser123!
echo User 2: test2@local.test / TestUser123!
echo.

REM Check if seed script needs to be run
if exist "scripts\seed-test-users.ts" (
    echo ═══════════════════════════════════════════════════════════════
    echo Next Steps:
    echo ═══════════════════════════════════════════════════════════════
    echo.
    echo 1. Open http://localhost:5173 in your browser
    echo 2. Run seed script to create test data:
    echo    npx ts-node scripts\seed-test-users.ts
    echo 3. Login with test credentials above
    echo.
) else (
    echo ═══════════════════════════════════════════════════════════════
    echo Next Steps:
    echo ═══════════════════════════════════════════════════════════════
    echo.
    echo 1. Open http://localhost:5173 in your browser
    echo 2. Login with test credentials above
    echo.
)

echo ═══════════════════════════════════════════════════════════════
echo Useful Commands:
echo ═══════════════════════════════════════════════════════════════
echo View logs:     docker-compose -f docker-compose.local-test.yml logs -f
echo Stop services: docker-compose -f docker-compose.local-test.yml down
echo Restart:       .\start-local-test.bat
echo.

pause
