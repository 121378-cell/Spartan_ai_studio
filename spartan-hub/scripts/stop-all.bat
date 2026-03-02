@echo off
REM stop-all.bat - Stop all Spartan Hub processes safely

echo ============================================
echo   Stopping All Spartan Hub Processes
echo ============================================
echo.

REM Stop frontend (port 5173)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    set FRONTEND_PID=%%a
    goto :found_frontend
)

:found_frontend
if defined FRONTEND_PID (
    echo Found frontend on port 5173 with PID: %FRONTEND_PID%
    taskkill /F /PID %FRONTEND_PID% 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Frontend stopped
    )
) else (
    echo No frontend process found on port 5173
)

echo.

REM Stop backend (port 3001)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    set BACKEND_PID=%%a
    goto :found_backend
)

:found_backend
if defined BACKEND_PID (
    echo Found backend on port 3001 with PID: %BACKEND_PID%
    taskkill /F /PID %BACKEND_PID% 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Backend stopped
    )
) else (
    echo No backend process found on port 3001
)

echo.
echo ============================================
echo   Done - All processes stopped
echo ============================================
echo.
echo NOTE: Qwen CLI and other Node.js processes are NOT affected
