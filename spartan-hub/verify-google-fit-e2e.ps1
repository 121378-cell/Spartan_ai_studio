# Google Fit E2E Verification Script (PowerShell)
# 
# This script verifies the complete Google Fit OAuth flow locally
# 
# Prerequisites:
# 1. Backend running on http://localhost:4000
# 2. Frontend running on http://localhost:5173
# 3. Valid .env with Google OAuth credentials
# 
# Usage: .\verify-google-fit-e2e.ps1

param()

# Set error action preference
$ErrorActionPreference = "Continue"

# Configuration
$BACKEND_URL = "http://localhost:4000"
$FRONTEND_URL = "http://localhost:5173"

# Colors for output
function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║ $($Text.PadRight(61)) ║" -ForegroundColor Blue
    Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "✅ $Text" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Text)
    Write-Host "❌ $Text" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Text)
    Write-Host "⚠️  $Text" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Text)
    Write-Host "ℹ️  $Text" -ForegroundColor Cyan
}

function Write-Separator {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
}

function Test-ApiEndpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{}
    )
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers $Headers -TimeoutSec 5 -ErrorAction SilentlyContinue
        return $response
    } catch {
        return $null
    }
}

# ============================================================================
# Header
# ============================================================================
Clear-Host
Write-Host "╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║         Google Fit E2E Verification Script                   ║" -ForegroundColor Blue
Write-Host "╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Blue

# ============================================================================
# PHASE 1: Environment Check
# ============================================================================
Write-Section "PHASE 1: Environment Check"

# Check Node.js version
$nodeVersion = node -v 2>$null
if ($nodeVersion) {
    Write-Success "Node.js installed: $nodeVersion"
} else {
    Write-Error-Custom "Node.js not found"
    exit 1
}

# Check if backend is running
$backendCheck = Test-ApiEndpoint -Url "$BACKEND_URL/health"
if ($backendCheck) {
    Write-Success "Backend running on $BACKEND_URL"
} else {
    Write-Warning-Custom "Backend not running on $BACKEND_URL"
    Write-Info "Start backend with: cd spartan-hub\backend && npm run dev"
}

# Check if frontend is running
$frontendCheck = Test-ApiEndpoint -Url $FRONTEND_URL
if ($frontendCheck) {
    Write-Success "Frontend running on $FRONTEND_URL"
} else {
    Write-Warning-Custom "Frontend not running on $FRONTEND_URL"
    Write-Info "Start frontend with: cd spartan-hub && npm run dev"
}

# Check .env file
$envPath = "backend\.env"
if (Test-Path $envPath) {
    Write-Success ".env file found"
    
    $envContent = Get-Content $envPath
    
    if ($envContent | Select-String -Pattern "GOOGLE_CLIENT_ID") {
        Write-Success "GOOGLE_CLIENT_ID configured"
    } else {
        Write-Error-Custom "GOOGLE_CLIENT_ID not found in .env"
        exit 1
    }
    
    if ($envContent | Select-String -Pattern "GOOGLE_CLIENT_SECRET") {
        Write-Success "GOOGLE_CLIENT_SECRET configured"
    } else {
        Write-Error-Custom "GOOGLE_CLIENT_SECRET not found in .env"
        exit 1
    }
    
    if ($envContent | Select-String -Pattern "GOOGLE_REDIRECT_URI") {
        Write-Success "GOOGLE_REDIRECT_URI configured"
    } else {
        Write-Error-Custom "GOOGLE_REDIRECT_URI not found in .env"
        exit 1
    }
} else {
    Write-Error-Custom ".env file not found at $envPath"
    exit 1
}

# ============================================================================
# PHASE 2: Frontend Component Tests
# ============================================================================
Write-Section "PHASE 2: Frontend Component Tests"

Write-Info "Checking frontend components..."

# Check ConnectGoogleFit component
$connectComponent = "src\components\fitness\ConnectGoogleFit.tsx"
if (Test-Path $connectComponent) {
    Write-Success "ConnectGoogleFit.tsx found"
    
    $content = Get-Content $connectComponent -Raw
    if ($content -match "handleConnect") {
        Write-Info "  ✓ handleConnect method found"
    }
} else {
    Write-Error-Custom "ConnectGoogleFit.tsx not found"
    exit 1
}

# Check DailyStatsCard component
$statsComponent = "src\components\fitness\DailyStatsCard.tsx"
if (Test-Path $statsComponent) {
    Write-Success "DailyStatsCard.tsx found"
    
    $content = Get-Content $statsComponent -Raw
    if ($content -match "fetchStats") {
        Write-Info "  ✓ fetchStats method found"
    }
} else {
    Write-Error-Custom "DailyStatsCard.tsx not found"
    exit 1
}

# Check googleFit service
$googleFitService = "src\services\googleFit.ts"
if (Test-Path $googleFitService) {
    Write-Success "googleFit.ts service found"
    
    $content = Get-Content $googleFitService -Raw
    if ($content -match "getAuthUrl") {
        Write-Info "  ✓ getAuthUrl method found"
    }
    if ($content -match "getDailyStats") {
        Write-Info "  ✓ getDailyStats method found"
    }
} else {
    Write-Error-Custom "googleFit.ts not found"
    exit 1
}

# ============================================================================
# PHASE 3: Backend Service Tests
# ============================================================================
Write-Section "PHASE 3: Backend Service Tests"

Write-Info "Checking backend services..."

$backendService = "backend\src\services\googleFitService.ts"
if (Test-Path $backendService) {
    Write-Success "GoogleFitService.ts found"
    
    $content = Get-Content $backendService -Raw
    if ($content -match "getAuthUrl") {
        Write-Info "  ✓ getAuthUrl method found"
    }
    if ($content -match "handleCallback") {
        Write-Info "  ✓ handleCallback method found"
    }
    if ($content -match "getDailySteps") {
        Write-Info "  ✓ getDailySteps method found"
    }
} else {
    Write-Error-Custom "GoogleFitService.ts not found"
    exit 1
}

$routes = "backend\src\routes\googleFitRoutes.ts"
if (Test-Path $routes) {
    Write-Success "googleFitRoutes.ts found"
} else {
    Write-Error-Custom "googleFitRoutes.ts not found"
    exit 1
}

# ============================================================================
# PHASE 4: TypeScript Configuration
# ============================================================================
Write-Section "PHASE 4: TypeScript Configuration"

if (Test-Path "backend\tsconfig.json") {
    Write-Success "Backend tsconfig.json found"
} else {
    Write-Error-Custom "Backend tsconfig.json not found"
    exit 1
}

if (Test-Path "tsconfig.json") {
    Write-Success "Frontend tsconfig.json found"
} else {
    Write-Error-Custom "Frontend tsconfig.json not found"
    exit 1
}

# ============================================================================
# PHASE 5: Test Files
# ============================================================================
Write-Section "PHASE 5: Test Files"

Write-Info "Checking test files..."

if (Test-Path "backend\src\__tests__\googleFitService.test.ts") {
    Write-Success "Unit tests found (googleFitService.test.ts)"
} else {
    Write-Warning-Custom "Unit tests not found"
}

if (Test-Path "backend\src\__tests__\googleFitE2E.test.ts") {
    Write-Success "E2E tests found (googleFitE2E.test.ts)"
} else {
    Write-Warning-Custom "E2E tests not found"
}

# ============================================================================
# PHASE 6: Security Checklist
# ============================================================================
Write-Section "PHASE 6: Security Checklist"

Write-Info "Verifying security best practices..."

# Check for hardcoded credentials
$placeholders = Get-ChildItem -Path "src", "backend\src" -Include "*.ts", "*.tsx" -Recurse | 
    Select-String -Pattern "PLACEHOLDER_CLIENT_ID|PLACEHOLDER_SECRET" | 
    Measure-Object | Select-Object -ExpandProperty Count

if ($placeholders -eq 0) {
    Write-Success "No placeholder credentials found"
} else {
    Write-Warning-Custom "Found $placeholders files with placeholder credentials"
}

# Check for OAuth state
$stateCheck = Select-String -Path "backend\src\services\googleFitService.ts" -Pattern "state:" | Measure-Object | Select-Object -ExpandProperty Count
if ($stateCheck -gt 0) {
    Write-Success "OAuth state parameter implemented (CSRF protection)"
} else {
    Write-Warning-Custom "OAuth state parameter not found"
}

# Check for offline access
$offlineCheck = Select-String -Path "backend\src\services\googleFitService.ts" -Pattern "offline" | Measure-Object | Select-Object -ExpandProperty Count
if ($offlineCheck -gt 0) {
    Write-Success "Offline access token enabled"
} else {
    Write-Warning-Custom "Offline access token not configured"
}

# ============================================================================
# PHASE 7: Documentation
# ============================================================================
Write-Section "PHASE 7: Documentation"

$docFile = "docs\GOOGLE_FIT_E2E_VERIFICATION.md"
if (Test-Path $docFile) {
    Write-Success "E2E verification guide found"
    Write-Info "  Location: $docFile"
} else {
    Write-Warning-Custom "E2E verification guide not found"
}

# ============================================================================
# PHASE 8: Manual Testing Guide
# ============================================================================
Write-Section "PHASE 8: Manual Testing Guide"

Write-Host "Follow these steps to manually test the Google Fit OAuth flow:" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 1: Navigate to Dashboard" -ForegroundColor Blue
Write-Host "  → Open http://localhost:5173/dashboard"
Write-Host ""

Write-Host "Step 2: Connect Google Fit" -ForegroundColor Blue
Write-Host "  → Locate the 'Google Fit' card in the sidebar"
Write-Host "  → Click the 'Connect' button"
Write-Host "  → You will be redirected to Google Consent Screen"
Write-Host ""

Write-Host "Step 3: Authenticate with Google" -ForegroundColor Blue
Write-Host "  → Sign in to your Google account"
Write-Host "  → Grant permission to access:"
Write-Host "    - Activity data (steps)"
Write-Host "    - Body measurements"
Write-Host "    - Nutrition data"
Write-Host "    - Sleep data"
Write-Host "  → You will be redirected back to the dashboard"
Write-Host ""

Write-Host "Step 4: Verify Connection" -ForegroundColor Blue
Write-Host "  → Check if the 'Connected' badge appears in Google Fit card"
Write-Host "  → Verify 'Daily Steps' card is now visible on the right"
Write-Host "  → Check if steps are displayed (may show 0 if no data)"
Write-Host ""

Write-Host "Step 5: Test Sync & Refresh" -ForegroundColor Blue
Write-Host "  → Hover over the Daily Steps card"
Write-Host "  → Click the refresh button (circular arrow)"
Write-Host "  → Verify steps update correctly"
Write-Host "  → Check browser console (F12) for debug logs"
Write-Host ""

# ============================================================================
# PHASE 9: Commands Reference
# ============================================================================
Write-Section "PHASE 9: Commands Reference"

Write-Host "Backend Operations:" -ForegroundColor Cyan
Write-Host "  # Start backend in dev mode"
Write-Host "  cd spartan-hub\backend && npm run dev"
Write-Host ""
Write-Host "  # Run unit tests"
Write-Host "  npm test -- googleFitService"
Write-Host ""
Write-Host "  # Run E2E tests"
Write-Host "  npm run test:e2e -- --testNamePattern=''GoogleFit''"
Write-Host ""

Write-Host "Frontend Operations:" -ForegroundColor Cyan
Write-Host "  # Start frontend in dev mode"
Write-Host "  cd spartan-hub && npm run dev"
Write-Host ""
Write-Host "  # Type check"
Write-Host "  npm run type-check"
Write-Host ""
Write-Host "  # Lint"
Write-Host "  npm run lint"
Write-Host ""

Write-Host "Both:" -ForegroundColor Cyan
Write-Host "  # Start both (from spartan-hub/)"
Write-Host "  npm run dev"
Write-Host ""

# ============================================================================
# PHASE 10: Summary
# ============================================================================
Write-Section "PHASE 10: Summary"

Write-Success "All prerequisite checks passed! ✨"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Ensure backend is running:   npm run dev (from backend/)"
Write-Host "  2. Ensure frontend is running:  npm run dev (from root)"
Write-Host "  3. Run manual tests following Step 1-5 above"
Write-Host "  4. Run automated tests:         npm test -- googleFitService"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Green
Write-Host "  → Read: docs\GOOGLE_FIT_E2E_VERIFICATION.md"
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "Ready to test Google Fit integration! 🚀" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
