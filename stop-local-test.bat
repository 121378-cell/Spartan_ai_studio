@echo off
REM =============================================================================
REM Spartan Hub 2.0 - Local Test Environment Stop (Windows)
REM =============================================================================
REM This script stops all local test environment services
REM =============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     Spartan Hub 2.0 - Local Test Environment                  ║
echo ║     Stop Services (Windows)                                   ║
echo ╚═══════════════════════════════════════════════════════════════╝
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

echo [INFO] Stopping all services...
echo.

REM Stop all Docker services
docker-compose -f docker-compose.local-test.yml down

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to stop Docker services.
    echo Check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] All services stopped successfully!
echo.

echo ═══════════════════════════════════════════════════════════════
echo Note:
echo ═══════════════════════════════════════════════════════════════
echo.
echo - Data volumes are preserved
echo - To remove all data, run: docker-compose -f docker-compose.local-test.yml down -v
echo.

pause
