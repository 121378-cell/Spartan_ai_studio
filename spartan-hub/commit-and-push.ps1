#!/usr/bin/env pwsh
# Git commit and push script for Spartan Hub
# Usage: .\commit-and-push.ps1 [-Message "custom message"]

param(
    [Parameter()]
    [string]$Message = "",

    [Parameter()]
    [ValidateSet("feat", "fix", "docs", "style", "refactor", "test", "chore")]
    [string]$Type = "feat"
)

$ErrorActionPreference = "Stop"

# Get current timestamp in ISO format
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"

# Determine commit message following conventional commits
if ([string]::IsNullOrWhiteSpace($Message)) {
    $commitMsg = "$Type`: update project files - $timestamp"
} else {
    $commitMsg = "$Type`: $Message - $timestamp"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Commit and Push Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Timestamp: $timestamp"
Write-Host "Commit message: $commitMsg"
Write-Host ""

# Stage all changes
Write-Host "[1/4] Staging all modified and new files..." -ForegroundColor Yellow
try {
    git add -A
    if ($LASTEXITCODE -ne 0) { throw "Failed to stage files" }
} catch {
    Write-Host "ERROR: Failed to stage files" -ForegroundColor Red
    exit 1
}

# Check if there are changes to commit
$stagedFiles = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($stagedFiles)) {
    Write-Host "No changes to commit. Exiting." -ForegroundColor Green
    exit 0
}

Write-Host "Staged files:" -ForegroundColor Gray
$stagedFiles | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host ""

# Commit with message
Write-Host "[2/4] Committing changes..." -ForegroundColor Yellow
try {
    git commit -m "$commitMsg"
    if ($LASTEXITCODE -ne 0) { throw "Failed to commit changes" }
} catch {
    Write-Host "ERROR: Failed to commit changes" -ForegroundColor Red
    exit 1
}

# Get current branch
Write-Host "[3/4] Determining current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
$defaultRemote = git config --get init.defaultBranch
if ([string]::IsNullOrWhiteSpace($defaultRemote)) {
    $defaultRemote = "origin/main"
}
Write-Host "Current branch: $currentBranch"
Write-Host "Default remote: $defaultRemote"

# Push to remote
Write-Host "[4/4] Pushing to remote..." -ForegroundColor Yellow
try {
    git push origin $currentBranch
    if ($LASTEXITCODE -ne 0) { throw "Failed to push changes" }
} catch {
    Write-Host "ERROR: Failed to push changes" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SUCCESS: Changes committed and pushed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Commit: $commitMsg" -ForegroundColor Gray
Write-Host "Branch: $currentBranch" -ForegroundColor Gray
