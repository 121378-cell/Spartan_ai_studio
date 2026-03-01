@echo off
REM =============================================================================
REM Spartan Hub 2.0 - Safety Setup Verification
REM =============================================================================
REM This script verifies that all safety configurations are in place
REM =============================================================================

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║     Spartan Hub 2.0 - Safety Setup Verification               ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

setlocal enabledelayedexpansion
set ERRORS=0
set WARNINGS=0

REM =============================================================================
REM Check Safe Kill Scripts
REM =============================================================================

echo [CHECK 1] Verifying safe kill scripts...

if exist "spartan-hub\scripts\safe-kill-node.bat" (
    echo   ✓ spartan-hub\scripts\safe-kill-node.bat exists
) else (
    echo   ✗ MISSING: spartan-hub\scripts\safe-kill-node.bat
    set /a ERRORS+=1
)

if exist "safe-kill.bat" (
    echo   ✓ safe-kill.bat exists
) else (
    echo   ✗ MISSING: safe-kill.bat
    set /a ERRORS+=1
)

echo.

REM =============================================================================
REM Check Documentation
REM =============================================================================

echo [CHECK 2] Verifying documentation...

if exist "spartan-hub\docs\guides\SAFE_NODE_KILL_GUIDE.md" (
    echo   ✓ SAFE_NODE_KILL_GUIDE.md exists
) else (
    echo   ✗ MISSING: spartan-hub\docs\guides\SAFE_NODE_KILL_GUIDE.md
    set /a ERRORS+=1
)

if exist "CRITICAL_ERROR_PREVENTION.md" (
    echo   ✓ CRITICAL_ERROR_PREVENTION.md exists
) else (
    echo   ✗ MISSING: CRITICAL_ERROR_PREVENTION.md
    set /a ERRORS+=1
)

if exist "spartan-hub\.qwen\README.md" (
    echo   ✓ spartan-hub\.qwen\README.md exists
) else (
    echo   ✗ MISSING: spartan-hub\.qwen\README.md
    set /a WARNINGS+=1
)

if exist "spartan-hub\.qwen-code-config" (
    echo   ✓ spartan-hub\.qwen-code-config exists
) else (
    echo   ✗ MISSING: spartan-hub\.qwen-code-config
    set /a WARNINGS+=1
)

echo.

REM =============================================================================
REM Check npm Scripts
REM =============================================================================

echo [CHECK 3] Verifying npm scripts...

findstr /C:"\"stop:safe\"" spartan-hub\package.json >nul 2>&1
if !ERRORLEVEL! equ 0 (
    echo   ✓ npm run stop:safe script configured
) else (
    echo   ✗ MISSING: npm run stop:safe in package.json
    set /a ERRORS+=1
)

echo.

REM =============================================================================
REM Check Git Hooks
REM =============================================================================

echo [CHECK 4] Verifying Git hooks...

if exist ".git\hooks\pre-commit" (
    echo   ✓ Git pre-commit hook exists (Unix/Linux)
) else (
    echo   ⚠ MISSING: .git\hooks\pre-commit (optional for Windows)
    set /a WARNINGS+=1
)

if exist ".git\hooks\pre-commit.bat" (
    echo   ✓ Git pre-commit hook exists (Windows)
) else (
    echo   ⚠ MISSING: .git\hooks\pre-commit.bat (optional)
    set /a WARNINGS+=1
)

echo.

REM =============================================================================
REM Check Dangerous Patterns in Code
REM =============================================================================

echo [CHECK 5] Scanning for dangerous patterns in code...

set DANGEROUS_FOUND=0
for /r %%f in (*.bat *.cmd *.ps1 *.js *.ts *.json *.md) do (
    findstr /i /C:"taskkill /IM node.exe" /C:"taskkill /IM node" "%%f" >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        REM Exclude documentation that warns about it
        findstr /i /C:"NEVER" /C:"NO USAR" /C:"DO NOT" /C:"DANGEROUS" "%%f" >nul 2>&1
        if !ERRORLEVEL! neq 0 (
            echo   ⚠ WARNING: Dangerous pattern found in %%f
            set DANGEROUS_FOUND=1
        )
    )
)

if !DANGEROUS_FOUND! equ 0 (
    echo   ✓ No dangerous patterns found in code
)

echo.

REM =============================================================================
REM Summary
REM =============================================================================

echo ═══════════════════════════════════════════════════════════════
echo Summary:
echo ═══════════════════════════════════════════════════════════════

if !ERRORS! equ 0 (
    echo   ✓ All critical safety files are in place
) else (
    echo   ✗ !ERRORS! error(s) found - Critical safety files missing
)

if !WARNINGS! equ 0 (
    echo   ✓ No warnings
) else (
    echo   ⚠ !WARNINGS! warning(s) found - Non-critical files missing
)

echo.

if !ERRORS! gtr 0 (
    echo [ACTION REQUIRED] Please run the setup script to create missing files
    echo.
    echo To create missing safety files, run:
    echo   cd spartan-hub
    echo   npm run setup:safety
    echo.
) else (
    echo [OK] Safety setup is complete!
    echo.
    echo Safe commands to use:
    echo   npm run stop:safe     - Safe process killer (recommended)
    echo   npm run stop:all      - Stop all project processes
    echo   npm run stop:backend  - Stop only backend
    echo   .\safe-kill.bat       - Quick kill from project root
    echo.
    echo NEVER use: taskkill /F /IM node.exe  (kills Qwen CLI!)
)

echo ═══════════════════════════════════════════════════════════════
echo.

endlocal

if %ERRORS% gtr 0 exit /b 1
exit /b 0
