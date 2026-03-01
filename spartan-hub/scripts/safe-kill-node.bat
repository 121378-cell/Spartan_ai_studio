@echo off
REM =============================================================================
REM Spartan Hub 2.0 - Safe Node Process Killer
REM =============================================================================
REM This script kills ONLY project-related Node.js processes by port.
REM It WILL NOT affect Qwen CLI or other Node.js applications.
REM =============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     Spartan Hub 2.0 - Safe Node Process Killer                ║
echo ║     (Qwen CLI Safe - Will NOT affect Qwen Code)               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

setlocal enabledelayedexpansion

set KILLED_COUNT=0

REM =============================================================================
REM Kill process by port number (safe method)
REM =============================================================================

echo [INFO] Scanning for Node.js processes on project ports...
echo.

:: Port 3001 - Backend API
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr LISTENING') do (
    set PID=%%a
    echo [FOUND] Backend process on port 3001 - PID: !PID!
    taskkill /F /PID !PID! >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [KILLED] Backend process !PID! stopped
        set /a KILLED_COUNT+=1
    ) else (
        echo [ERROR] Failed to kill process !PID!
    )
)

:: Port 5173 - Frontend Vite
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr LISTENING') do (
    set PID=%%a
    echo [FOUND] Frontend process on port 5173 - PID: !PID!
    taskkill /F /PID !PID! >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [KILLED] Frontend process !PID! stopped
        set /a KILLED_COUNT+=1
    ) else (
        echo [ERROR] Failed to kill process !PID!
    )
)

:: Port 8000 - AI Microservice
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr LISTENING') do (
    set PID=%%a
    echo [FOUND] AI Service process on port 8000 - PID: !PID!
    taskkill /F /PID !PID! >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [KILLED] AI Service process !PID! stopped
        set /a KILLED_COUNT+=1
    ) else (
        echo [ERROR] Failed to kill process !PID!
    )
)

:: Port 3000 - Alternative frontend
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr LISTENING') do (
    set PID=%%a
    echo [FOUND] Alternative process on port 3000 - PID: !PID!
    taskkill /F /PID !PID! >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [KILLED] Alternative process !PID! stopped
        set /a KILLED_COUNT+=1
    ) else (
        echo [ERROR] Failed to kill process !PID!
    )
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo Summary:
echo ═══════════════════════════════════════════════════════════════
echo Processes killed: %KILLED_COUNT%
echo.

if %KILLED_COUNT% EQU 0 (
    echo [INFO] No project processes were found running.
    echo [INFO] Qwen CLI and other Node.js apps are NOT affected.
) else (
    echo [OK] Project processes stopped successfully.
    echo [OK] Qwen CLI and other Node.js apps are NOT affected.
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo Safety Information:
echo ═══════════════════════════════════════════════════════════════
echo This script ONLY kills processes on specific ports:
echo   - Port 3001 (Backend API)
echo   - Port 5173 (Frontend Vite)
echo   - Port 8000 (AI Microservice)
echo   - Port 3000 (Alternative frontend)
echo.
echo This script DOES NOT kill:
echo   - Qwen CLI (no specific port)
echo   - Other Node.js applications on different ports
echo   - System processes
echo.
echo NEVER use: taskkill /F /IM node.exe
echo   (This kills ALL Node.js processes including Qwen CLI!)
echo ═══════════════════════════════════════════════════════════════
echo.

endlocal
pause
