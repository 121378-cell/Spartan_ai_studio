#!/bin/bash

# Spartan Hub Monorepo Migration Script
# This script helps migrate the existing codebase to the new monorepo structure

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Backup original structure
backup_original() {
    log "Creating backup of original structure..."
    
    if [ ! -d "../spartan-hub-backup" ]; then
        cp -r ../spartan-hub ../spartan-hub-backup
        log_success "Backup created at ../spartan-hub-backup"
    else
        log_warn "Backup already exists, skipping..."
    fi
}

# Move frontend files
migrate_frontend() {
    log "Migrating frontend files..."
    
    # Create frontend directory structure
    mkdir -p packages/frontend/src
    mkdir -p packages/frontend/public
    
    # Move main frontend files
    if [ -f "src/App.tsx" ]; then
        mv src/App.tsx packages/frontend/src/
    fi
    
    if [ -f "src/main.tsx" ]; then
        mv src/main.tsx packages/frontend/src/
    fi
    
    if [ -f "src/index.css" ]; then
        mv src/index.css packages/frontend/src/
    fi
    
    if [ -f "public" ]; then
        mv public/* packages/frontend/public/ 2>/dev/null || true
    fi
    
    # Move components
    if [ -d "src/components" ]; then
        mv src/components packages/frontend/src/
    fi
    
    # Move hooks
    if [ -d "src/hooks" ]; then
        mv src/hooks packages/frontend/src/
    fi
    
    # Move context
    if [ -d "src/context" ]; then
        mv src/context packages/frontend/src/
    fi
    
    # Move services
    if [ -d "src/services" ]; then
        mv src/services packages/frontend/src/
    fi
    
    # Move utils
    if [ -d "src/utils" ]; then
        mv src/utils packages/frontend/src/
    fi
    
    # Move tests
    if [ -d "src/__tests__" ]; then
        mv src/__tests__ packages/frontend/src/
    fi
    
    log_success "Frontend files migrated"
}

# Move backend files
migrate_backend() {
    log "Migrating backend files..."
    
    # Backend files are already in the right place, but let's ensure structure
    if [ -d "backend/src" ]; then
        # Move backend to packages directory
        mv backend packages/backend-temp
        mkdir -p packages/backend
        mv packages/backend-temp/* packages/backend/
        rmdir packages/backend-temp
        
        # Update backend package.json references
        sed -i 's|\.\./\.\./|../../|g' packages/backend/package.json 2>/dev/null || true
    fi
    
    log_success "Backend files migrated"
}

# Move AI files
migrate_ai() {
    log "Migrating AI files..."
    
    mkdir -p packages/ai
    
    if [ -d "src/AI" ]; then
        mv src/AI/* packages/ai/ 2>/dev/null || true
    fi
    
    # Create basic AI package.json
    cat > packages/ai/package.json << EOF
{
  "name": "@spartan-hub/ai",
  "version": "1.0.0",
  "description": "Spartan Hub AI Services",
  "private": true,
  "scripts": {
    "start": "python main.py",
    "test": "python -m pytest",
    "dev": "python main.py"
  }
}
EOF
    
    log_success "AI files migrated"
}

# Update configuration files
update_configs() {
    log "Updating configuration files..."
    
    # Replace main package.json with workspaces version
    if [ -f "package.workspaces.json" ]; then
        mv package.json package.original.json
        mv package.workspaces.json package.json
        log_success "Package.json updated for workspaces"
    fi
    
    # Update tsconfig references
    if [ -f "tsconfig.json" ]; then
        # Update paths to use shared package
        sed -i 's|"@spartan-hub/shared"|"\@spartan-hub/shared"|g' tsconfig.json 2>/dev/null || true
    fi
    
    log_success "Configuration files updated"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install workspace dependencies
    npm run build:shared
    
    log_success "Dependencies installed"
}

# Validate migration
validate_migration() {
    log "Validating migration..."
    
    # Check if all packages exist
    if [ ! -d "packages/frontend" ]; then
        log_error "Frontend package not found"
        return 1
    fi
    
    if [ ! -d "packages/backend" ]; then
        log_error "Backend package not found"
        return 1
    fi
    
    if [ ! -d "packages/shared" ]; then
        log_error "Shared package not found"
        return 1
    fi
    
    # Try building shared package
    if npm run build:shared; then
        log_success "Migration validation passed"
    else
        log_error "Migration validation failed - build failed"
        return 1
    fi
}

# Main migration function
main() {
    log "Starting Spartan Hub Monorepo Migration"
    log "========================================"
    
    backup_original
    migrate_frontend
    migrate_backend
    migrate_ai
    update_configs
    install_dependencies
    validate_migration
    
    log_success "Monorepo migration completed successfully!"
    log ""
    log "Next steps:"
    log "1. Review the migrated structure in packages/"
    log "2. Test the build: npm run build"
    log "3. Test development mode: npm run dev"
    log "4. Run tests: npm test"
    log ""
    log "If you need to rollback, the original structure is backed up at ../spartan-hub-backup"
}

# Run migration
main "$@"