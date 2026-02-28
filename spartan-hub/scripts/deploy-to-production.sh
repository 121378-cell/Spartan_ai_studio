#!/bin/bash

###############################################################################
# Spartan Hub 2.0 - Production Deployment Script
# Version: 2.0
# Date: March 2, 2026
# 
# Usage: ./deploy-to-production.sh [OPTIONS]
#
# Options:
#   --version, -v     Version to deploy (default: latest)
#   --dry-run, -d     Dry run (no actual deployment)
#   --skip-tests      Skip pre-deployment tests
#   --rollback, -r    Rollback to previous version
#   --help, -h        Show this help message
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE_PROD="spartan-hub-production"
NAMESPACE_FRONTEND="spartan-hub-frontend"
HELM_CHART_PATH="./scripts/deployment/helm/spartan-hub"
IMAGE_TAG="${VERSION:-latest}"
DRY_RUN=false
SKIP_TESTS=false
ROLLBACK=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version|-v)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --dry-run|-d)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --rollback|-r)
            ROLLBACK=true
            shift
            ;;
        --help|-h)
            head -20 "$0" | tail -15
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Helper functions
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        log_error "helm is not installed"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "aws CLI is not installed"
        exit 1
    fi
    
    # Check connection to cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

run_pre_deployment_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Skipping pre-deployment tests"
        return
    fi
    
    log_info "Running pre-deployment tests..."
    
    # Run E2E tests
    log_info "Running E2E tests..."
    if ! npm run test:e2e -- --env=staging; then
        log_error "E2E tests failed"
        exit 1
    fi
    
    # Run smoke tests
    log_info "Running smoke tests..."
    if ! npm run test:smoke -- --env=staging; then
        log_error "Smoke tests failed"
        exit 1
    fi
    
    log_success "All tests passed"
}

create_backup() {
    log_info "Creating production backup..."
    
    # Database backup
    if ! npm run backup:create -- --env=production; then
        log_error "Failed to create database backup"
        exit 1
    fi
    
    # Verify backup
    if ! npm run backup:verify -- --env=production; then
        log_error "Failed to verify backup"
        exit 1
    fi
    
    log_success "Backup created successfully"
}

deploy_backend() {
    log_info "Deploying backend (version: $IMAGE_TAG)..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy backend"
        return
    fi
    
    # Deploy with Helm
    if ! helm upgrade --install spartan-hub-backend \
        "$HELM_CHART_PATH" \
        --namespace "$NAMESPACE_PROD" \
        --set image.tag="$IMAGE_TAG" \
        --set replicaCount=5 \
        --set resources.limits.cpu=1000m \
        --set resources.limits.memory=1Gi \
        --wait --timeout=10m; then
        log_error "Backend deployment failed"
        exit 1
    fi
    
    # Wait for rollout
    log_info "Waiting for backend rollout..."
    if ! kubectl rollout status deployment/spartan-hub-backend -n "$NAMESPACE_PROD" --timeout=300s; then
        log_error "Backend rollout failed"
        exit 1
    fi
    
    log_success "Backend deployed successfully"
}

run_migrations() {
    log_info "Running database migrations..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run migrations"
        return
    fi
    
    # Execute migrations
    if ! kubectl exec deployment/spartan-hub-backend -n "$NAMESPACE_PROD" -- \
        npm run migrate; then
        log_error "Database migrations failed"
        exit 1
    fi
    
    log_success "Migrations completed successfully"
}

deploy_frontend() {
    log_info "Deploying frontend (version: $IMAGE_TAG)..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would deploy frontend"
        return
    fi
    
    # Build frontend
    log_info "Building frontend..."
    if ! npm run build:frontend; then
        log_error "Frontend build failed"
        exit 1
    fi
    
    # Upload to CDN
    log_info "Uploading to CDN..."
    if ! aws s3 sync dist/ s3://spartan-hub-cdn/ \
        --cache-control "public, max-age=31536000, immutable"; then
        log_error "CDN upload failed"
        exit 1
    fi
    
    # Invalidate CDN cache
    log_info "Invalidating CDN cache..."
    if ! aws cloudfront create-invalidation \
        --distribution-id "$CDN_DISTRIBUTION_ID" \
        --paths "/*"; then
        log_warning "CDN invalidation failed (non-blocking)"
    fi
    
    # Deploy with Helm
    if ! helm upgrade --install spartan-hub-frontend \
        "$HELM_CHART_PATH/frontend" \
        --namespace "$NAMESPACE_FRONTEND" \
        --set image.tag="$IMAGE_TAG" \
        --wait --timeout=10m; then
        log_error "Frontend deployment failed"
        exit 1
    fi
    
    # Wait for rollout
    log_info "Waiting for frontend rollout..."
    if ! kubectl rollout status deployment/spartan-hub-frontend -n "$NAMESPACE_FRONTEND" --timeout=300s; then
        log_error "Frontend rollout failed"
        exit 1
    fi
    
    log_success "Frontend deployed successfully"
}

run_post_deployment_checks() {
    log_info "Running post-deployment checks..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would run post-deployment checks"
        return
    fi
    
    # Health check
    log_info "Checking API health..."
    if ! curl -f https://api.spartan-hub.com/health; then
        log_error "API health check failed"
        exit 1
    fi
    
    # Frontend check
    log_info "Checking frontend..."
    if ! curl -f https://spartan-hub.com/; then
        log_error "Frontend check failed"
        exit 1
    fi
    
    # Run smoke tests
    log_info "Running smoke tests..."
    if ! npm run test:smoke -- --env=production; then
        log_error "Smoke tests failed"
        exit 1
    fi
    
    # Monitor for 5 minutes
    log_info "Monitoring for 5 minutes..."
    sleep 300
    
    # Check error rates
    log_info "Checking error rates..."
    ERROR_RATE=$(curl -s http://prometheus:9090/api/v1/query \
        --data-urlencode "query=sum(rate(http_requests_total{status_code=~\"5..\"}[5m]))" | \
        jq '.data.result[0].value[1] | tonumber')
    
    if (( $(echo "$ERROR_RATE > 0.01" | bc -l) )); then
        log_error "Error rate too high: $ERROR_RATE"
        exit 1
    fi
    
    log_success "All post-deployment checks passed"
}

rollback() {
    log_warning "Initiating rollback..."
    
    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would rollback deployment"
        return
    fi
    
    # Rollback backend
    log_info "Rolling back backend..."
    if ! helm rollback spartan-hub-backend -n "$NAMESPACE_PROD"; then
        log_error "Backend rollback failed"
        exit 1
    fi
    
    # Rollback frontend
    log_info "Rolling back frontend..."
    if ! helm rollback spartan-hub-frontend -n "$NAMESPACE_FRONTEND"; then
        log_error "Frontend rollback failed"
        exit 1
    fi
    
    # Wait for rollouts
    kubectl rollout status deployment/spartan-hub-backend -n "$NAMESPACE_PROD"
    kubectl rollout status deployment/spartan-hub-frontend -n "$NAMESPACE_FRONTEND"
    
    log_success "Rollback completed successfully"
}

main() {
    log_info "========================================="
    log_info "Spartan Hub 2.0 - Production Deployment"
    log_info "========================================="
    log_info "Version: $IMAGE_TAG"
    log_info "Dry Run: $DRY_RUN"
    log_info "Skip Tests: $SKIP_TESTS"
    log_info "Rollback: $ROLLBACK"
    log_info "========================================="
    
    check_prerequisites
    
    if [ "$ROLLBACK" = true ]; then
        rollback
        exit 0
    fi
    
    run_pre_deployment_tests
    create_backup
    deploy_backend
    run_migrations
    deploy_frontend
    run_post_deployment_checks
    
    log_success "========================================="
    log_success "Deployment completed successfully!"
    log_success "Version: $IMAGE_TAG"
    log_success "========================================="
    
    # Notify team
    log_info "Sending notification to Slack..."
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"✅ Production Deployment Successful\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Version\", \"value\": \"$IMAGE_TAG\", \"short\": true},
                    {\"title\": \"Environment\", \"value\": \"Production\", \"short\": true},
                    {\"title\": \"Deployed By\", \"value\": \"$(whoami)\", \"short\": true},
                    {\"title\": \"Time\", \"value\": \"$(date)\", \"short\": false}
                ]
            }]
        }" || log_warning "Failed to send Slack notification"
}

# Run main function
main
