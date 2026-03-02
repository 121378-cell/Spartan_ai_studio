@echo off
REM stop-backend.bat - Stop only the Spartan Hub backend process

echo ============================================
echo   Stopping Spartan Hub Backend Process
echo ============================================

REM Find the backend process by looking for server.js on port 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    set PID=%%a
    goto :found
)

:found
if defined PID (
    echo Found backend process on port 3001 with PID: %PID%
    echo Stopping process %PID%...
    taskkill /F /PID %PID%
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✓ Backend process stopped successfully
    ) else (
        echo.
        echo ✗ Failed to stop backend process
        echo   Try running as Administrator
    )
) else (
    echo No backend process found running on port 3001
)

echo.
echo ============================================
echo   Done
echo ============================================
