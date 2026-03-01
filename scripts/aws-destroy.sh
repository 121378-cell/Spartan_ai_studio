#!/bin/bash
# =============================================================================
# AWS Infrastructure Destroy Script
# Spartan Hub 2.0 - Staging Environment
# =============================================================================
#
# This script destroys the Terraform infrastructure for the
# Spartan Hub 2.0 staging environment.
#
# WARNING: This will delete all infrastructure resources!
#
# Usage: ./scripts/aws-destroy.sh [options]
#
# Options:
#   --force         Skip confirmation prompt
#   --keep-state    Don't delete state files from S3
#   --help          Show this help message
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
FORCE=false
KEEP_STATE=false

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
    head -25 "$0" | tail -15
    exit 0
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed."
        exit 1
    fi
    
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

confirm_destroy() {
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo ""
    log_warning "=================================================="
    log_warning "  WARNING: This will DESTROY all infrastructure!"
    log_warning "=================================================="
    echo ""
    echo "The following resources will be deleted:"
    echo "  - VPC and all networking resources"
    echo "  - EC2 instances (Frontend and Backend)"
    echo "  - RDS PostgreSQL database"
    echo "  - ElastiCache Redis cluster"
    echo "  - Application Load Balancer"
    echo "  - CloudWatch dashboards and alarms"
    echo "  - IAM roles and policies"
    echo "  - SSM parameters"
    echo ""
    echo "This action CANNOT be undone!"
    echo ""
    
    read -p "Type 'destroy' to confirm: " confirm
    if [ "$confirm" != "destroy" ]; then
        log_warning "Destroy cancelled"
        exit 0
    fi
}

create_final_backup() {
    log_info "Creating final backup of Terraform state..."
    
    cd "$TERRAFORM_DIR"
    
    # Get current timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    # Export current state
    if terraform state pull > "terraform-state-backup-${TIMESTAMP}.json" 2>/dev/null; then
        log_success "State backup created: terraform-state-backup-${TIMESTAMP}.json"
    else
        log_warning "Could not create state backup"
    fi
    
    # Export outputs
    if terraform output -json > "terraform-outputs-backup-${TIMESTAMP}.json" 2>/dev/null; then
        log_success "Outputs backup created: terraform-outputs-backup-${TIMESTAMP}.json"
    else
        log_warning "Could not create outputs backup"
    fi
}

destroy_terraform() {
    log_info "Destroying Terraform infrastructure..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize if needed
    if [ ! -d ".terraform" ]; then
        log_info "Initializing Terraform..."
        terraform init -backend-config="bucket=spartan-hub-terraform-state-staging" \
            -backend-config="key=staging/infrastructure/terraform.tfstate" \
            -backend-config="region=us-east-1" \
            -backend-config="dynamodb_table=spartan-hub-terraform-locks-staging"
    fi
    
    # Destroy resources
    terraform destroy -auto-approve -input=false
    
    log_success "Terraform destroy completed"
}

delete_state_files() {
    if [ "$KEEP_STATE" = true ]; then
        log_info "Keeping state files in S3 (--keep-state specified)"
        return 0
    fi
    
    log_info "Deleting state files from S3..."
    
    S3_BUCKET="spartan-hub-terraform-state-staging"
    STATE_KEY="staging/infrastructure/terraform.tfstate"
    
    # Delete state file versions
    aws s3 rm "s3://${S3_BUCKET}/${STATE_KEY}" --recursive 2>/dev/null || true
    
    # Delete lock
    aws dynamodb delete-item \
        --table-name "spartan-hub-terraform-locks-staging" \
        --key '{"LockID": {"S": "spartan-hub-terraform-state-staging/staging/infrastructure/terraform.tfstate-md5"}}' \
        --region us-east-1 2>/dev/null || true
    
    log_success "State files deleted"
}

delete_rds_snapshots() {
    log_info "Cleaning up RDS snapshots..."
    
    # Delete manual snapshots (automated ones are deleted with the instance)
    SNAPSHOTS=$(aws rds describe-db-snapshots \
        --snapshot-type manual \
        --query "DBSnapshots[?contains(DBSnapshotIdentifier, 'spartan-hub-staging')].DBSnapshotIdentifier" \
        --output text 2>/dev/null || echo "")
    
    for snapshot in $SNAPSHOTS; do
        if [ -n "$snapshot" ]; then
            log_info "Deleting RDS snapshot: $snapshot"
            aws rds delete-db-snapshot --db-snapshot-identifier "$snapshot" 2>/dev/null || true
        fi
    done
    
    log_success "RDS snapshots cleaned up"
}

delete_elasticache_snapshots() {
    log_info "Cleaning up ElastiCache snapshots..."
    
    # Delete manual snapshots
    SNAPSHOTS=$(aws elasticache describe-cache-cluster-snapshots \
        --snapshot-source manual \
        --query "Snapshots[?contains(SnapshotName, 'spartan-hub-staging')].SnapshotName" \
        --output text 2>/dev/null || echo "")
    
    for snapshot in $SNAPSHOTS; do
        if [ -n "$snapshot" ]; then
            log_info "Deleting ElastiCache snapshot: $snapshot"
            aws elasticache delete-snapshot --snapshot-name "$snapshot" 2>/dev/null || true
        fi
    done
    
    log_success "ElastiCache snapshots cleaned up"
}

delete_security_groups() {
    log_info "Cleaning up security groups..."
    
    # Get VPC ID from any remaining resources
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Project,Values=spartan-hub" "Name=tag:Environment,Values=staging" \
        --query "Vpcs[0].VpcId" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
        # Delete security groups
        SG_IDS=$(aws ec2 describe-security-groups \
            --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Project,Values=spartan-hub" \
            --query "SecurityGroups[?GroupName!='default'].GroupId" \
            --output text 2>/dev/null || echo "")
        
        for sg_id in $SG_IDS; do
            if [ -n "$sg_id" ]; then
                log_info "Deleting security group: $sg_id"
                aws ec2 delete-security-group --group-id "$sg_id" 2>/dev/null || true
            fi
        done
    fi
    
    log_success "Security groups cleaned up"
}

verify_destruction() {
    log_info "Verifying infrastructure destruction..."
    
    # Check for remaining resources
    REMAINING=$(aws resourcegroupstaggingapi get-resources \
        --tag-filters "Key=Project,Values=spartan-hub" "Key=Environment,Values=staging" \
        --query "ResourceTagMappingList[*].ResourceARN" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$REMAINING" ] && [ "$REMAINING" != "None" ]; then
        log_warning "Some resources may still exist:"
        echo "$REMAINING" | tr '\t' '\n'
    else
        log_success "No Spartan Hub staging resources found"
    fi
}

# =============================================================================
# Main Script
# =============================================================================

main() {
    echo "=============================================="
    echo "  Spartan Hub 2.0 - Infrastructure Destroy"
    echo "  Staging Environment"
    echo "=============================================="
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE=true
                shift
                ;;
            --keep-state)
                KEEP_STATE=true
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
    
    # Confirm destruction
    confirm_destroy
    
    # Create backup
    create_final_backup
    
    # Delete snapshots
    delete_rds_snapshots
    delete_elasticache_snapshots
    
    # Destroy Terraform resources
    destroy_terraform
    
    # Clean up remaining resources
    delete_security_groups
    
    # Delete state files
    delete_state_files
    
    # Verify destruction
    verify_destruction
    
    echo ""
    echo "=============================================="
    echo "  Destruction Complete!"
    echo "=============================================="
    echo ""
    log_success "All Spartan Hub 2.0 staging infrastructure has been destroyed."
    echo ""
    echo "Backup files created:"
    ls -la "$TERRAFORM_DIR"/terraform-*backup-*.json 2>/dev/null || echo "  (no backups found)"
    echo ""
    log_info "To recreate the infrastructure, run: ./scripts/aws-setup.sh"
}

# Run main function
main "$@"
