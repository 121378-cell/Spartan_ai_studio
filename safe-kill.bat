@echo off
REM =============================================================================
REM Spartan Hub 2.0 - Quick Safe Kill (Root Directory)
REM =============================================================================
REM Run this from ANY directory - it will navigate to the project automatically
REM =============================================================================

cd /d "%~dp0spartan-hub\scripts" 2>nul
if exist "safe-kill-node.bat" (
    call safe-kill-node.bat
) else (
    echo [ERROR] safe-kill-node.bat not found!
    echo Please run from project root or navigate to spartan-hub\scripts\
)
