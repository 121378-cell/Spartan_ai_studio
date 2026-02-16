@echo off
REM Git commit and push script for Spartan Hub
REM Usage: commit-and-push.bat [commit-message]

cd /d "%~dp0"

REM Get current timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a:%%b)
set TIMESTAMP=%mydate% %mytime%

REM Determine commit message
if "%~1"=="" (
    set COMMIT_MSG=feat: update project files - %TIMESTAMP%
) else (
    set COMMIT_MSG=%~1 - %TIMESTAMP%
)

echo ========================================
echo Git Commit and Push Script
echo ========================================
echo Timestamp: %TIMESTAMP%
echo Commit message: %COMMIT_MSG%
echo.

REM Stage all changes
echo [1/4] Staging all modified and new files...
git add -A
if errorlevel 1 (
    echo ERROR: Failed to stage files
    exit /b 1
)

REM Check if there are changes to commit
git diff --cached --quiet
if %errorlevel% == 0 (
    echo No changes to commit. Exiting.
    exit /b 0
)

REM Commit with message
echo [2/4] Committing changes...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo ERROR: Failed to commit changes
    exit /b 1
)

REM Get default remote branch
echo [3/4] Determining default remote branch...
for /f "tokens=*" %%a in ('git symbolic-ref refs/remotes/origin/HEAD 2^>nul') do (
    set DEFAULT_BRANCH=%%a
)
if "!DEFAULT_BRANCH!"=="" (
    set DEFAULT_BRANCH=origin/main
)
echo Default branch: %DEFAULT_BRANCH%

REM Push to remote
echo [4/4] Pushing to remote...
git push origin HEAD
if errorlevel 1 (
    echo ERROR: Failed to push changes
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS: Changes committed and pushed!
echo ========================================
exit /b 0
