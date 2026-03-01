#!/bin/bash
# =============================================================================
# AWS Infrastructure Setup Script
# Spartan Hub 2.0 - Staging Environment
# =============================================================================
#
# This script initializes and applies the Terraform infrastructure
# for the Spartan Hub 2.0 staging environment.
#
# Usage: ./scripts/aws-setup.sh [options]
#
# Options:
#   --init-only     Only initialize Terraform (don't apply)
#   --plan-only     Initialize and plan (don't apply)
#   --auto-approve  Apply without confirmation
#   --destroy       Destroy the infrastructure
#   --help          Show this help message
#
# Prerequisites:
#   - AWS CLI configured with appropriate credentials
#   - Terraform >= 1.6.0 installed
#   - S3 bucket and DynamoDB table for state backend created
#
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"

# Default options
INIT_ONLY=false
PLAN_ONLY=false
AUTO_APPROVE=false
DESTROY=false

# =============================================================================
# Functions
# =============================================================================

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

show_help() {
    head -30 "$0" | tail -20
    exit 0
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check Terraform version
    TF_VERSION=$(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | head -1 | awk '{print $2}')
    log_info "Terraform version: $TF_VERSION"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
        exit 1
    fi
    
    AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    AWS_REGION=$(aws configure get region)
    log_info "AWS Account: $AWS_ACCOUNT"
    log_info "AWS Region: ${AWS_REGION:-us-east-1}"
    
    log_success "Prerequisites check passed"
}

create_backend_resources() {
    log_info "Creating Terraform backend resources..."
    
    S3_BUCKET="spartan-hub-terraform-state-staging"
    DYNAMODB_TABLE="spartan-hub-terraform-locks-staging"
    AWS_REGION="${AWS_REGION:-us-east-1}"
    
    # Create S3 bucket if it doesn't exist
    if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
        log_info "Creating S3 bucket: $S3_BUCKET"
        if [ "$AWS_REGION" == "us-east-1" ]; then
            aws s3api create-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION"
        else
            aws s3api create-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" \
                --create-bucket-configuration LocationConstraint="$AWS_REGION"
        fi
        
        # Enable versioning
        aws s3api put-bucket-versioning --bucket "$S3_BUCKET" --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption --bucket "$S3_BUCKET" --server-side-encryption-configuration \
            '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'
        
        log_success "S3 bucket created: $S3_BUCKET"
    else
        log_info "S3 bucket already exists: $S3_BUCKET"
    fi
    
    # Create DynamoDB table if it doesn't exist
    if ! aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION" &>/dev/null; then
        log_info "Creating DynamoDB table: $DYNAMODB_TABLE"
        aws dynamodb create-table \
            --table-name "$DYNAMODB_TABLE" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --billing-mode PAY_PER_REQUEST \
            --region "$AWS_REGION"
        
        log_success "DynamoDB table created: $DYNAMODB_TABLE"
    else
        log_info "DynamoDB table already exists: $DYNAMODB_TABLE"
    fi
}

initialize_terraform() {
    log_info "Initializing Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    terraform init \
        -backend-config="bucket=spartan-hub-terraform-state-staging" \
        -backend-config="key=staging/infrastructure/terraform.tfstate" \
        -backend-config="region=us-east-1" \
        -backend-config="dynamodb_table=spartan-hub-terraform-locks-staging" \
        -reconfigure
    
    log_success "Terraform initialized"
}

plan_terraform() {
    log_info "Planning Terraform changes..."
    
    cd "$TERRAFORM_DIR"
    
    terraform plan -out=tfplan -input=false
    
    log_success "Terraform plan created: tfplan"
    
    # Show plan summary
    echo ""
    log_info "Plan summary:"
    terraform show -no-color tfplan | grep -E "^(Plan:|Changes:)" || true
}

apply_terraform() {
    log_info "Applying Terraform configuration..."
    
    cd "$TERRAFORM_DIR"
    
    if [ "$AUTO_APPROVE" = true ]; then
        terraform apply -auto-approve -input=false tfplan
    else
        read -p "Do you want to apply these changes? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            terraform apply -input=false tfplan
        else
            log_warning "Apply cancelled by user"
            exit 0
        fi
    fi
    
    log_success "Terraform apply completed"
}

show_outputs() {
    log_info "Fetching Terraform outputs..."
    
    cd "$TERRAFORM_DIR"
    
    echo ""
    echo "=============================================="
    echo "  Infrastructure Deployment Complete!"
    echo "=============================================="
    echo ""
    
    terraform output -no-color
    
    echo ""
    log_success "Infrastructure is ready!"
}

validate_deployment() {
    log_info "Validating deployment..."
    
    cd "$TERRAFORM_DIR"
    
    # Get outputs
    ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "")
    
    if [ -n "$ALB_DNS" ]; then
        log_info "Testing ALB health endpoint..."
        
        # Test health endpoint
        if curl -sf "http://$ALB_DNS/health" &>/dev/null; then
            log_success "Health check passed: http://$ALB_DNS/health"
        else
            log_warning "Health check failed (this may be expected during initial deployment)"
        fi
        
        echo ""
        log_info "Application URLs:"
        echo "  Frontend: http://$ALB_DNS"
        echo "  API:      http://$ALB_DNS/api"
        echo "  Health:   http://$ALB_DNS/health"
    fi
}

# =============================================================================
# Main Script
# =============================================================================

main() {
    echo "=============================================="
    echo "  Spartan Hub 2.0 - AWS Infrastructure Setup"
    echo "  Staging Environment"
    echo "=============================================="
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --init-only)
                INIT_ONLY=true
                shift
                ;;
            --plan-only)
                PLAN_ONLY=true
                shift
                ;;
            --auto-approve)
                AUTO_APPROVE=true
                shift
                ;;
            --destroy)
                DESTROY=true
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                ;;
        esac
    done
    
    # Check prerequisites
    check_prerequisites
    
    # Create backend resources
    create_backend_resources
    
    # Initialize Terraform
    initialize_terraform
    
    # Handle destroy
    if [ "$DESTROY" = true ]; then
        log_warning "Destroy mode - this will delete all infrastructure!"
        read -p "Are you sure you want to destroy the infrastructure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            cd "$TERRAFORM_DIR"
            terraform destroy -auto-approve
            log_success "Infrastructure destroyed"
        else
            log_warning "Destroy cancelled"
        fi
        exit 0
    fi
    
    # Plan Terraform
    plan_terraform
    
    # Exit if plan only
    if [ "$PLAN_ONLY" = true ]; then
        log_info "Plan only mode - exiting"
        exit 0
    fi
    
    # Exit if init only
    if [ "$INIT_ONLY" = true ]; then
        log_info "Init only mode - exiting"
        exit 0
    fi
    
    # Apply Terraform
    apply_terraform
    
    # Show outputs
    show_outputs
    
    # Validate deployment
    validate_deployment
    
    echo ""
    echo "=============================================="
    echo "  Next Steps:"
    echo "=============================================="
    echo ""
    echo "1. Configure your application with the outputs above"
    echo "2. Deploy your application code to the EC2 instances"
    echo "3. Run database migrations"
    echo "4. Verify all health checks pass"
    echo ""
    echo "Useful commands:"
    echo "  terraform output              - View all outputs"
    echo "  terraform state list          - List all resources"
    echo "  ./scripts/aws-validate.sh     - Validate infrastructure"
    echo "  ./scripts/aws-destroy.sh      - Destroy infrastructure"
    echo ""
}

# Run main function
main "$@"
