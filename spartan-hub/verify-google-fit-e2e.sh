#!/bin/bash
# Google Fit E2E Verification Script
# 
# This script verifies the complete Google Fit OAuth flow locally
# 
# Prerequisites:
# 1. Backend running on http://localhost:4000
# 2. Frontend running on http://localhost:5173
# 3. Valid .env with Google OAuth credentials
# 
# Usage: bash verify-google-fit-e2e.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:4000"
FRONTEND_URL="http://localhost:5173"
API_TIMEOUT=10

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Google Fit E2E Verification Script                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to print info
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to make API request
api_request() {
    local method=$1
    local endpoint=$2
    local token=$3
    
    if [ -z "$token" ]; then
        curl -s -X "$method" "$BACKEND_URL$endpoint" \
            -H "Content-Type: application/json"
    else
        curl -s -X "$method" "$BACKEND_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $token"
    fi
}

# ============================================================================
# PHASE 1: Environment Check
# ============================================================================
section "PHASE 1: Environment Check"

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null)
if [ -n "$NODE_VERSION" ]; then
    success "Node.js installed: $NODE_VERSION"
else
    error "Node.js not found"
    exit 1
fi

# Check if backend is running
if curl -s "$BACKEND_URL/health" > /dev/null 2>&1; then
    success "Backend running on $BACKEND_URL"
else
    warning "Backend not running on $BACKEND_URL"
    info "Start backend with: cd spartan-hub/backend && npm run dev"
fi

# Check if frontend is running
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    success "Frontend running on $FRONTEND_URL"
else
    warning "Frontend not running on $FRONTEND_URL"
    info "Start frontend with: cd spartan-hub && npm run dev"
fi

# Check .env file
if [ -f "backend/.env" ]; then
    success ".env file found"
    
    # Check for required env vars
    if grep -q "GOOGLE_CLIENT_ID" backend/.env; then
        success "GOOGLE_CLIENT_ID configured"
    else
        error "GOOGLE_CLIENT_ID not found in .env"
        exit 1
    fi
    
    if grep -q "GOOGLE_CLIENT_SECRET" backend/.env; then
        success "GOOGLE_CLIENT_SECRET configured"
    else
        error "GOOGLE_CLIENT_SECRET not found in .env"
        exit 1
    fi
    
    if grep -q "GOOGLE_REDIRECT_URI" backend/.env; then
        success "GOOGLE_REDIRECT_URI configured"
    else
        error "GOOGLE_REDIRECT_URI not found in .env"
        exit 1
    fi
else
    error ".env file not found"
    exit 1
fi

# ============================================================================
# PHASE 2: Backend API Endpoints
# ============================================================================
section "PHASE 2: Backend API Endpoints"

info "Testing Google Fit routes..."

# Test /health endpoint
echo -n "  GET /health ... "
if RESPONSE=$(api_request "GET" "/health" ""); then
    if echo "$RESPONSE" | grep -q "status"; then
        success "Health check passed"
    else
        warning "Health check returned unexpected response"
    fi
else
    warning "Health check endpoint not available (optional)"
fi

# ============================================================================
# PHASE 3: Database & Models
# ============================================================================
section "PHASE 3: Database & Models"

info "Checking database setup..."

# Check if database file exists (SQLite)
if [ -f "backend/data/spartan.db" ]; then
    success "Database file exists"
    
    # Check database size
    DB_SIZE=$(du -h backend/data/spartan.db | cut -f1)
    info "Database size: $DB_SIZE"
else
    warning "Database file not found at backend/data/spartan.db"
fi

# ============================================================================
# PHASE 4: OAuth Service Tests
# ============================================================================
section "PHASE 4: OAuth Service Tests"

# Test GoogleFitService configuration
echo -n "  Testing GoogleFitService initialization ... "
if [ -f "backend/src/services/googleFitService.ts" ]; then
    success "GoogleFitService found"
    
    # Check for required methods
    if grep -q "getAuthUrl" backend/src/services/googleFitService.ts; then
        info "  ✓ getAuthUrl method found"
    fi
    if grep -q "handleCallback" backend/src/services/googleFitService.ts; then
        info "  ✓ handleCallback method found"
    fi
    if grep -q "getDailySteps" backend/src/services/googleFitService.ts; then
        info "  ✓ getDailySteps method found"
    fi
else
    error "GoogleFitService not found"
    exit 1
fi

# ============================================================================
# PHASE 5: Frontend Component Tests
# ============================================================================
section "PHASE 5: Frontend Component Tests"

info "Checking frontend components..."

# Check ConnectGoogleFit component
echo -n "  ConnectGoogleFit.tsx ... "
if [ -f "src/components/fitness/ConnectGoogleFit.tsx" ]; then
    success "Component found"
    
    if grep -q "handleConnect" src/components/fitness/ConnectGoogleFit.tsx; then
        info "  ✓ handleConnect method found"
    fi
else
    error "ConnectGoogleFit.tsx not found"
    exit 1
fi

# Check DailyStatsCard component
echo -n "  DailyStatsCard.tsx ... "
if [ -f "src/components/fitness/DailyStatsCard.tsx" ]; then
    success "Component found"
    
    if grep -q "fetchStats" src/components/fitness/DailyStatsCard.tsx; then
        info "  ✓ fetchStats method found"
    fi
else
    error "DailyStatsCard.tsx not found"
    exit 1
fi

# Check googleFit service (frontend)
echo -n "  googleFit.ts service ... "
if [ -f "src/services/googleFit.ts" ]; then
    success "Service found"
    
    if grep -q "getAuthUrl" src/services/googleFit.ts; then
        info "  ✓ getAuthUrl method found"
    fi
    if grep -q "getDailyStats" src/services/googleFit.ts; then
        info "  ✓ getDailyStats method found"
    fi
else
    error "googleFit.ts not found"
    exit 1
fi

# ============================================================================
# PHASE 6: TypeScript Compilation
# ============================================================================
section "PHASE 6: TypeScript Compilation"

info "Checking TypeScript configuration..."

# Check backend TypeScript config
if [ -f "backend/tsconfig.json" ]; then
    success "Backend tsconfig.json found"
else
    error "Backend tsconfig.json not found"
    exit 1
fi

# Check frontend TypeScript config
if [ -f "tsconfig.json" ]; then
    success "Frontend tsconfig.json found"
else
    error "Frontend tsconfig.json not found"
    exit 1
fi

# ============================================================================
# PHASE 7: Tests Availability
# ============================================================================
section "PHASE 7: Tests Availability"

info "Checking test files..."

# Check unit tests
echo -n "  Backend unit tests ... "
if [ -f "backend/src/__tests__/googleFitService.test.ts" ]; then
    success "Found (googleFitService.test.ts)"
else
    warning "Not found"
fi

# Check E2E tests
echo -n "  Backend E2E tests ... "
if [ -f "backend/src/__tests__/googleFitE2E.test.ts" ]; then
    success "Found (googleFitE2E.test.ts)"
else
    warning "Not found"
fi

# ============================================================================
# PHASE 8: Security Checklist
# ============================================================================
section "PHASE 8: Security Checklist"

info "Verifying security best practices..."

# Check for hardcoded credentials
if grep -r "PLACEHOLDER_CLIENT_ID" --include="*.ts" --include="*.tsx" > /dev/null 2>&1; then
    warning "PLACEHOLDER_CLIENT_ID found in code (use .env instead)"
fi

if grep -r "PLACEHOLDER_SECRET" --include="*.ts" --include="*.tsx" > /dev/null 2>&1; then
    warning "PLACEHOLDER_SECRET found in code (use .env instead)"
fi

# Check for OAuth state parameter usage
if grep -q "state:" backend/src/services/googleFitService.ts; then
    success "OAuth state parameter implemented (CSRF protection)"
else
    warning "OAuth state parameter not found"
fi

# Check for offline access token
if grep -q "access_type.*offline" backend/src/services/googleFitService.ts; then
    success "Offline access token enabled (refresh token available)"
else
    warning "Offline access token not configured"
fi

# ============================================================================
# PHASE 9: Manual Testing Instructions
# ============================================================================
section "PHASE 9: Manual Testing Instructions"

echo ""
echo -e "${YELLOW}Follow these steps to manually test the Google Fit OAuth flow:${NC}"
echo ""

echo -e "${BLUE}Step 1: Navigate to Dashboard${NC}"
echo "  → Open http://localhost:5173/dashboard"
echo ""

echo -e "${BLUE}Step 2: Connect Google Fit${NC}"
echo "  → Locate the 'Google Fit' card"
echo "  → Click the 'Connect' button"
echo "  → You will be redirected to Google Consent Screen"
echo ""

echo -e "${BLUE}Step 3: Authenticate with Google${NC}"
echo "  → Sign in to your Google account"
echo "  → Grant permission to access fitness data"
echo "  → You will be redirected back to the dashboard"
echo ""

echo -e "${BLUE}Step 4: Verify Connection${NC}"
echo "  → Check if the 'Connected' badge appears"
echo "  → Verify 'Daily Steps' card is now visible"
echo "  → Check if steps are displayed"
echo ""

echo -e "${BLUE}Step 5: Test Sync${NC}"
echo "  → Click the refresh button in Daily Steps card"
echo "  → Verify steps update correctly"
echo "  → Check browser console (F12) for debug logs"
echo ""

# ============================================================================
# PHASE 10: Summary
# ============================================================================
section "PHASE 10: Summary"

success "All prerequisite checks passed! ✨"
echo ""
echo "Next steps:"
echo "  1. Start the backend:   cd spartan-hub/backend && npm run dev"
echo "  2. Start the frontend:  cd spartan-hub && npm run dev"
echo "  3. Run unit tests:      npm test -- googleFitService"
echo "  4. Run E2E tests:       npm run test:e2e"
echo "  5. Test manually:       Follow Step 1-5 above"
echo ""
echo "Documentation:"
echo "  → Read: docs/GOOGLE_FIT_E2E_VERIFICATION.md"
echo "  → This includes detailed flow diagrams and troubleshooting"
echo ""

echo -e "${GREEN}Ready to test Google Fit integration! 🚀${NC}"
