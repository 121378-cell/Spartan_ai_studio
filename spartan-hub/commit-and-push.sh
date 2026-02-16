#!/bin/bash
# Git commit and push script for Spartan Hub
# Usage: ./commit-and-push.sh [commit-message] [type]

set -e

# Get current timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')

# Determine commit type (default: feat)
TYPE="${2:-feat}"

# Determine commit message following conventional commits
if [ -z "$1" ]; then
    COMMIT_MSG="${TYPE}: update project files - ${TIMESTAMP}"
else
    COMMIT_MSG="${TYPE}: $1 - ${TIMESTAMP}"
fi

echo "========================================"
echo "Git Commit and Push Script"
echo "========================================"
echo "Timestamp: ${TIMESTAMP}"
echo "Commit message: ${COMMIT_MSG}"
echo ""

# Stage all changes
echo "[1/4] Staging all modified and new files..."
if ! git add -A; then
    echo "ERROR: Failed to stage files" >&2
    exit 1
fi

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "No changes to commit. Exiting."
    exit 0
fi

# Show staged files
echo "Staged files:"
git diff --cached --name-only | sed 's/^/  - /'
echo ""

# Commit with message
echo "[2/4] Committing changes..."
if ! git commit -m "${COMMIT_MSG}"; then
    echo "ERROR: Failed to commit changes" >&2
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "[3/4] Determining current branch..."
echo "Current branch: ${CURRENT_BRANCH}"

# Push to remote
echo "[4/4] Pushing to remote..."
if ! git push origin "${CURRENT_BRANCH}"; then
    echo "ERROR: Failed to push changes" >&2
    exit 1
fi

echo ""
echo "========================================"
echo "SUCCESS: Changes committed and pushed!"
echo "========================================"
echo "Commit: ${COMMIT_MSG}"
echo "Branch: ${CURRENT_BRANCH}"
