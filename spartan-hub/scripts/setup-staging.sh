#!/bin/bash

# =============================================================================
# Spartan Hub 2.0 - Staging Environment Setup Script
# =============================================================================
# This script sets up the complete staging environment for beta testing
# 
# Usage:
#   ./scripts/setup-staging.sh
#
# What it does:
#   1. Checks prerequisites (Node.js 18+, npm)
#   2. Creates staging environment files
#   3. Installs dependencies
#   4. Runs all tests
#   5. Builds the application
#   6. Creates deployment package
#   7. Validates configuration
#
# Requirements:
#   - Node.js 18 or higher
#   - npm
#   - Git (optional, for deployment)
#   - GitHub CLI (optional, for easier deployments)
# =============================================================================

set -e  # Exit on error

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SPARTAN_HUB_DIR="$PROJECT_ROOT/spartan-hub"
BACKEND_DIR="$SPARTAN_HUB_DIR/backend"
DEPLOY_DIR="$PROJECT_ROOT/staging-deploy"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}=============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================${NC}\n"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_warning "$2"
        return 1
    fi
    return 0
}

# =============================================================================
# STEP 1: CHECK PREREQUISITES
# =============================================================================

check_prerequisites() {
    log_step "Step 1/8: Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18+ first."
        echo "Download from: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version must be 18 or higher. Current: $NODE_VERSION"
        exit 1
    fi
    log_success "Node.js $(node -v) installed"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    log_success "npm $(npm -v) installed"
    
    # Check Git (optional)
    if check_command git "Git is not installed. Some features may not work."; then
        log_success "Git $(git --version | cut -d' ' -f3) installed"
    fi
    
    # Check GitHub CLI (optional)
    if check_command gh "GitHub CLI is not installed. Install for easier deployments: https://cli.github.com/"; then
        log_success "GitHub CLI $(gh --version | head -n1) installed"
    fi
    
    # Check disk space (need at least 1GB free)
    FREE_SPACE=$(df -k "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    MIN_SPACE=1048576  # 1GB in KB
    if [ "$FREE_SPACE" -lt "$MIN_SPACE" ]; then
        log_warning "Low disk space. Free: $((FREE_SPACE / 1024))MB, Recommended: 1GB+"
    else
        log_success "Disk space OK: $((FREE_SPACE / 1024))MB free"
    fi
    
    log_info "Prerequisites check passed"
}

# =============================================================================
# STEP 2: CREATE STAGING ENVIRONMENT FILES
# =============================================================================

create_env_files() {
    log_step "Step 2/8: Creating staging environment files..."
    
    # Create frontend .env.staging
    if [ ! -f "$SPARTAN_HUB_DIR/.env.staging" ]; then
        if [ -f "$SPARTAN_HUB_DIR/.env.staging.example" ]; then
            cp "$SPARTAN_HUB_DIR/.env.staging.example" "$SPARTAN_HUB_DIR/.env.staging"
            log_success "Created spartan-hub/.env.staging from example"
        else
            log_warning "spartan-hub/.env.staging.example not found"
        fi
    else
        log_info "spartan-hub/.env.staging already exists, skipping..."
    fi
    
    # Create backend .env.staging
    if [ ! -f "$BACKEND_DIR/.env.staging" ]; then
        if [ -f "$BACKEND_DIR/.env.staging.example" ]; then
            cp "$BACKEND_DIR/.env.staging.example" "$BACKEND_DIR/.env.staging"
            log_success "Created spartan-hub/backend/.env.staging from example"
        else
            log_warning "spartan-hub/backend/.env.staging.example not found"
        fi
    else
        log_info "spartan-hub/backend/.env.staging already exists, skipping..."
    fi
    
    # Warn about placeholder values
    if grep -q "your_" "$SPARTAN_HUB_DIR/.env.staging" 2>/dev/null; then
        log_warning "Found placeholder values in .env.staging. Please update:"
        grep "your_" "$SPARTAN_HUB_DIR/.env.staging" | sed 's/^/    /'
    fi
}

# =============================================================================
# STEP 3: INSTALL DEPENDENCIES
# =============================================================================

install_dependencies() {
    log_step "Step 3/8: Installing dependencies..."
    
    # Frontend dependencies
    log_info "Installing frontend dependencies..."
    cd "$SPARTAN_HUB_DIR"
    if [ -f "package-lock.json" ]; then
        npm ci --silent
    else
        npm install --silent
    fi
    log_success "Frontend dependencies installed"
    
    # Backend dependencies
    log_info "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    if [ -f "package-lock.json" ]; then
        npm ci --silent
    else
        npm install --silent
    fi
    log_success "Backend dependencies installed"
    
    cd "$PROJECT_ROOT"
    log_info "Dependencies installed successfully"
}

# =============================================================================
# STEP 4: RUN TESTS
# =============================================================================

run_tests() {
    log_step "Step 4/8: Running tests..."
    
    # Frontend tests
    log_info "Running frontend tests..."
    cd "$SPARTAN_HUB_DIR"
    if npm run test:node --silent; then
        log_success "Frontend tests passed"
    else
        log_error "Frontend tests failed. Please fix errors before deploying."
        exit 1
    fi
    
    # Backend tests
    log_info "Running backend tests..."
    cd "$BACKEND_DIR"
    if npm run test:fast --silent; then
        log_success "Backend tests passed"
    else
        log_error "Backend tests failed. Please fix errors before deploying."
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
    log_info "All tests passed"
}

# =============================================================================
# STEP 5: BUILD APPLICATION
# =============================================================================

build_application() {
    log_step "Step 5/8: Building application..."
    
    # Build frontend
    log_info "Building frontend..."
    cd "$SPARTAN_HUB_DIR"
    VITE_API_URL=https://staging-api.spartan-hub.com \
    VITE_NODE_ENV=staging \
    VITE_APP_VERSION=2.0.0 \
    npm run build --silent
    log_success "Frontend build complete"
    
    # Build backend
    log_info "Building backend..."
    cd "$BACKEND_DIR"
    npm run build --silent
    log_success "Backend build complete"
    
    cd "$PROJECT_ROOT"
    log_info "Build complete"
}

# =============================================================================
# STEP 6: CREATE DEPLOYMENT PACKAGE
# =============================================================================

create_deployment_package() {
    log_step "Step 6/8: Creating deployment package..."
    
    # Clean previous deployment package
    if [ -d "$DEPLOY_DIR" ]; then
        rm -rf "$DEPLOY_DIR"
    fi
    
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR/frontend"
    mkdir -p "$DEPLOY_DIR/backend"
    
    # Copy frontend build
    if [ -d "$SPARTAN_HUB_DIR/dist" ]; then
        cp -r "$SPARTAN_HUB_DIR/dist"/* "$DEPLOY_DIR/frontend/"
        log_success "Frontend build copied"
    fi
    
    # Copy backend build
    if [ -d "$BACKEND_DIR/dist" ]; then
        cp -r "$BACKEND_DIR/dist" "$DEPLOY_DIR/backend/"
        log_success "Backend build copied"
    fi
    
    # Copy backend node_modules
    if [ -d "$BACKEND_DIR/node_modules" ]; then
        cp -r "$BACKEND_DIR/node_modules" "$DEPLOY_DIR/backend/"
        log_success "Backend node_modules copied"
    fi
    
    # Copy package.json
    cp "$BACKEND_DIR/package.json" "$DEPLOY_DIR/backend/"
    
    # Copy environment files
    cp "$SPARTAN_HUB_DIR/.env.staging" "$DEPLOY_DIR/.env" 2>/dev/null || true
    cp "$BACKEND_DIR/.env.staging" "$DEPLOY_DIR/backend/.env" 2>/dev/null || true
    
    # Create deployment manifest
    cat > "$DEPLOY_DIR/DEPLOYMENT_MANIFEST.json" << EOF
{
  "version": "2.0.0",
  "environment": "staging",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node -v)",
  "npmVersion": "$(npm -v)"
}
EOF
    log_success "Deployment manifest created"
    
    log_info "Deployment package created in staging-deploy/"
}

# =============================================================================
# STEP 7: VALIDATE CONFIGURATION
# =============================================================================

validate_configuration() {
    log_step "Step 7/8: Validating configuration..."
    
    ERRORS=0
    
    # Check deployment directory exists
    if [ ! -d "$DEPLOY_DIR" ]; then
        log_error "Deployment directory not found: $DEPLOY_DIR"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check frontend build
    if [ ! -f "$DEPLOY_DIR/frontend/index.html" ]; then
        log_error "Frontend build not found"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check backend build
    if [ ! -f "$DEPLOY_DIR/backend/dist/server.js" ] && [ ! -f "$DEPLOY_DIR/backend/server.js" ]; then
        log_error "Backend build not found"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check environment files
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        log_warning "Frontend .env file not found in deployment package"
    fi
    
    if [ ! -f "$DEPLOY_DIR/backend/.env" ]; then
        log_warning "Backend .env file not found in deployment package"
    fi
    
    # Check for placeholder values
    if grep -q "your_" "$DEPLOY_DIR/.env" 2>/dev/null; then
        log_warning "Found placeholder values in deployment .env:"
        grep "your_" "$DEPLOY_DIR/.env" | sed 's/^/    /'
        log_warning "These must be replaced before deployment!"
    fi
    
    # Validate required environment variables
    REQUIRED_VARS=(
        "NODE_ENV"
        "POSTGRES_HOST"
        "POSTGRES_DB"
        "POSTGRES_USER"
        "JWT_SECRET"
        "REDIS_URL"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" "$DEPLOY_DIR/backend/.env" 2>/dev/null; then
            log_warning "Missing required variable: $var"
        fi
    done
    
    if [ $ERRORS -gt 0 ]; then
        log_error "Validation failed with $ERRORS error(s)"
        exit 1
    fi
    
    log_success "Configuration validated"
}

# =============================================================================
# STEP 8: DISPLAY NEXT STEPS
# =============================================================================

display_next_steps() {
    log_step "Step 8/8: Setup complete!"
    
    echo ""
    echo -e "${GREEN}======================================================${NC}"
    echo -e "${GREEN}✅ STAGING ENVIRONMENT SETUP COMPLETE${NC}"
    echo -e "${GREEN}======================================================${NC}"
    echo ""
    echo -e "${CYAN}📦 Deployment package:${NC} staging-deploy/"
    echo ""
    echo -e "${CYAN}🚀 Next steps:${NC}"
    echo ""
    echo "   1. Review and update staging-deploy/.env with actual values"
    echo "      - Database credentials"
    echo "      - Redis URL"
    echo "      - JWT secrets"
    echo "      - API keys"
    echo ""
    echo "   2. Deploy to staging server:"
    echo ""
    echo "      # Using GitHub CLI:"
    echo "      gh workflow run deploy-staging-manual.yml \\"
    echo "        --field version='v2.0.0' \\"
    echo "        --field beta_testers='50'"
    echo ""
    echo "      # Or manually via GitHub UI:"
    echo "      Actions > Deploy to Staging (Manual) > Run workflow"
    echo ""
    echo -e "${CYAN}🌐 Staging URLs (after deployment):${NC}"
    echo ""
    echo "      Frontend: https://staging.spartan-hub.com"
    echo "      Backend:  https://staging-api.spartan-hub.com"
    echo "      Health:   https://staging-api.spartan-hub.com/api/health"
    echo "      Grafana:  https://staging-grafana.spartan-hub.com"
    echo ""
    echo -e "${CYAN}📊 Monitoring (after deployment):${NC}"
    echo ""
    echo "      # View application logs"
    echo "      ssh user@staging.spartan-hub.com 'pm2 logs'"
    echo ""
    echo "      # View PM2 status"
    echo "      ssh user@staging.spartan-hub.com 'pm2 status'"
    echo ""
    echo "      # View Grafana dashboards"
    echo "      https://staging-grafana.spartan-hub.com"
    echo ""
    echo -e "${CYAN}🧪 Testing checklist:${NC}"
    echo ""
    echo "      □ Health check endpoint accessible"
    echo "      □ Login/logout working"
    echo "      □ Video analysis functional"
    echo "      □ AI Coach responding"
    echo "      □ Wearable sync operational"
    echo "      □ No console errors"
    echo "      □ Performance acceptable (<500ms p95)"
    echo ""
    echo -e "${CYAN}📞 Support:${NC}"
    echo ""
    echo "      DevOps Team:     devops@spartan-hub.com"
    echo "      Beta Support:    beta-support@spartan-hub.com"
    echo "      Emergency:       emergency@spartan-hub.com"
    echo ""
    echo -e "${GREEN}======================================================${NC}"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║   SPARTAN HUB 2.0 - STAGING ENVIRONMENT SETUP       ║${NC}"
    echo -e "${CYAN}║   Version 2.0.0 | March 1, 2026                     ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    START_TIME=$(date +%s)
    
    # Execute all steps
    check_prerequisites
    create_env_files
    install_dependencies
    run_tests
    build_application
    create_deployment_package
    validate_configuration
    display_next_steps
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo -e "${GREEN}Total setup time: ${DURATION} seconds${NC}"
    echo ""
}

# Run main function
main "$@"
