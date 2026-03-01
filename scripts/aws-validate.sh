#!/bin/bash
# =============================================================================
# AWS Infrastructure Validation Script
# Spartan Hub 2.0 - Staging Environment
# =============================================================================
#
# This script validates the deployed infrastructure to ensure
# all resources are healthy and functioning correctly.
#
# Usage: ./scripts/aws-validate.sh [options]
#
# Options:
#   --verbose       Show detailed output
#   --json          Output results in JSON format
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
VERBOSE=false
JSON_OUTPUT=false

# Validation counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Results array
declare -a RESULTS=()

# =============================================================================
# Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
    RESULTS+=("{\"status\":\"pass\",\"check\":\"$1\"}")
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
    RESULTS+=("{\"status\":\"warn\",\"check\":\"$1\"}")
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
    RESULTS+=("{\"status\":\"fail\",\"check\":\"$1\"}")
}

show_help() {
    head -20 "$0" | tail -12
    exit 0
}

get_terraform_output() {
    local output_name=$1
    cd "$TERRAFORM_DIR"
    terraform output -raw "$output_name" 2>/dev/null || echo ""
}

check_terraform_state() {
    log_info "Checking Terraform state..."
    
    cd "$TERRAFORM_DIR"
    
    if [ ! -f ".terraform/terraform.tfstate" ] && [ ! -d ".terraform" ]; then
        log_error "Terraform not initialized"
        return 1
    fi
    
    # Check if state can be read
    if terraform state list &>/dev/null; then
        RESOURCE_COUNT=$(terraform state list | wc -l)
        log_success "Terraform state accessible ($RESOURCE_COUNT resources)"
    else
        log_error "Cannot read Terraform state"
        return 1
    fi
}

check_vpc() {
    log_info "Checking VPC..."
    
    VPC_ID=$(get_terraform_output "vpc_id")
    
    if [ -z "$VPC_ID" ]; then
        log_error "VPC ID not found in outputs"
        return 1
    fi
    
    # Check VPC exists
    if aws ec2 describe-vpcs --vpc-ids "$VPC_ID" &>/dev/null; then
        log_success "VPC exists: $VPC_ID"
    else
        log_error "VPC not found: $VPC_ID"
        return 1
    fi
    
    # Check subnets
    PUBLIC_SUBNETS=$(get_terraform_output "public_subnet_ids")
    PRIVATE_SUBNETS=$(get_terraform_output "private_subnet_ids")
    
    if [ -n "$PUBLIC_SUBNETS" ]; then
        log_success "Public subnets configured"
    else
        log_warning "Public subnets not found"
    fi
    
    if [ -n "$PRIVATE_SUBNETS" ]; then
        log_success "Private subnets configured"
    else
        log_warning "Private subnets not found"
    fi
    
    # Check Internet Gateway
    IGW_ID=$(get_terraform_output "internet_gateway_id")
    if [ -n "$IGW_ID" ]; then
        if aws ec2 describe-internet-gateways --internet-gateway-ids "$IGW_ID" &>/dev/null; then
            log_success "Internet Gateway exists: $IGW_ID"
        else
            log_warning "Internet Gateway not found"
        fi
    fi
    
    # Check NAT Gateway
    NAT_ID=$(get_terraform_output "nat_gateway_id")
    if [ -n "$NAT_ID" ]; then
        NAT_STATE=$(aws ec2 describe-nat-gateways --nat-gateway-ids "$NAT_ID" --query "NatGateways[0].State" --output text 2>/dev/null || echo "unknown")
        if [ "$NAT_STATE" == "available" ]; then
            log_success "NAT Gateway available: $NAT_ID"
        else
            log_warning "NAT Gateway state: $NAT_STATE"
        fi
    fi
}

check_ec2() {
    log_info "Checking EC2 instances..."
    
    # Frontend
    FRONTEND_ID=$(get_terraform_output "frontend_instance_id")
    if [ -n "$FRONTEND_ID" ]; then
        FRONTEND_STATE=$(aws ec2 describe-instances --instance-ids "$FRONTEND_ID" --query "Reservations[0].Instances[0].State.Name" --output text 2>/dev/null || echo "not-found")
        if [ "$FRONTEND_STATE" == "running" ]; then
            log_success "Frontend EC2 running: $FRONTEND_ID"
            
            # Check SSM managed instance status
            SSM_STATUS=$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$FRONTEND_ID" --query "InstanceInformationList[0].PingStatus" --output text 2>/dev/null || echo "not-connected")
            if [ "$SSM_STATUS" == "Online" ]; then
                log_success "Frontend SSM agent connected"
            else
                log_warning "Frontend SSM agent not connected: $SSM_STATUS"
            fi
        else
            log_error "Frontend EC2 state: $FRONTEND_STATE"
        fi
    else
        log_warning "Frontend instance ID not found"
    fi
    
    # Backend
    BACKEND_ID=$(get_terraform_output "backend_instance_id")
    if [ -n "$BACKEND_ID" ]; then
        BACKEND_STATE=$(aws ec2 describe-instances --instance-ids "$BACKEND_ID" --query "Reservations[0].Instances[0].State.Name" --output text 2>/dev/null || echo "not-found")
        if [ "$BACKEND_STATE" == "running" ]; then
            log_success "Backend EC2 running: $BACKEND_ID"
            
            # Check SSM managed instance status
            SSM_STATUS=$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$BACKEND_ID" --query "InstanceInformationList[0].PingStatus" --output text 2>/dev/null || echo "not-connected")
            if [ "$SSM_STATUS" == "Online" ]; then
                log_success "Backend SSM agent connected"
            else
                log_warning "Backend SSM agent not connected: $SSM_STATUS"
            fi
        else
            log_error "Backend EC2 state: $BACKEND_STATE"
        fi
    else
        log_warning "Backend instance ID not found"
    fi
}

check_rds() {
    log_info "Checking RDS PostgreSQL..."
    
    RDS_ENDPOINT=$(get_terraform_output "rds_endpoint")
    
    if [ -z "$RDS_ENDPOINT" ]; then
        log_warning "RDS endpoint not found in outputs"
        return 0
    fi
    
    # Extract instance identifier from endpoint
    RDS_IDENTIFIER=$(echo "$RDS_ENDPOINT" | cut -d':' -f1)
    
    # Check RDS instance
    RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier "$RDS_IDENTIFIER" --query "DBInstances[0].DBInstanceStatus" --output text 2>/dev/null || echo "not-found")
    
    if [ "$RDS_STATUS" == "available" ]; then
        log_success "RDS instance available: $RDS_IDENTIFIER"
        
        # Check connectivity (basic TCP check)
        RDS_PORT=$(get_terraform_output "rds_port")
        if timeout 5 bash -c "echo > /dev/tcp/$RDS_ENDPOINT" 2>/dev/null; then
            log_success "RDS port accessible"
        else
            log_warning "Cannot connect to RDS port (may be expected from outside VPC)"
        fi
    else
        log_error "RDS instance status: $RDS_STATUS"
    fi
    
    # Check automated backups
    BACKUP_RETENTION=$(aws rds describe-db-instances --db-instance-identifier "$RDS_IDENTIFIER" --query "DBInstances[0].BackupRetentionPeriod" --output text 2>/dev/null || echo "0")
    if [ "$BACKUP_RETENTION" -gt 0 ]; then
        log_success "RDS automated backups enabled (${BACKUP_RETENTION} days)"
    else
        log_warning "RDS automated backups not enabled"
    fi
}

check_elasticache() {
    log_info "Checking ElastiCache Redis..."
    
    REDIS_ENDPOINT=$(get_terraform_output "redis_primary_endpoint")
    
    if [ -z "$REDIS_ENDPOINT" ]; then
        log_warning "Redis endpoint not found in outputs"
        return 0
    fi
    
    # Get cluster ID from endpoint
    REDIS_CLUSTER=$(aws elasticache describe-cache-clusters --query "CacheClusters[?CacheNodes[0].Endpoint.Address=='$REDIS_ENDPOINT'].CacheClusterId" --output text 2>/dev/null || echo "")
    
    if [ -n "$REDIS_CLUSTER" ]; then
        REDIS_STATUS=$(aws elasticache describe-cache-clusters --cache-cluster-id "$REDIS_CLUSTER" --query "CacheClusters[0].CacheClusterStatus" --output text 2>/dev/null || echo "not-found")
        
        if [ "$REDIS_STATUS" == "available" ]; then
            log_success "Redis cluster available: $REDIS_CLUSTER"
        else
            log_error "Redis cluster status: $REDIS_STATUS"
        fi
    else
        log_warning "Redis cluster not found"
    fi
}

check_alb() {
    log_info "Checking Application Load Balancer..."
    
    ALB_DNS=$(get_terraform_output "alb_dns_name")
    
    if [ -z "$ALB_DNS" ]; then
        log_warning "ALB DNS name not found in outputs"
        return 0
    fi
    
    # Check ALB exists and is active
    ALB_ARN=$(get_terraform_output "alb_arn")
    if [ -n "$ALB_ARN" ]; then
        ALB_STATE=$(aws elbv2 describe-load-balancers --load-balancer-arns "$ALB_ARN" --query "LoadBalancers[0].State.Code" --output text 2>/dev/null || echo "not-found")
        
        if [ "$ALB_STATE" == "active" ]; then
            log_success "ALB active: $ALB_DNS"
        else
            log_error "ALB state: $ALB_STATE"
        fi
    fi
    
    # Check health endpoint
    log_info "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -sf "http://$ALB_DNS/health" 2>/dev/null || echo "")
    
    if [ -n "$HEALTH_RESPONSE" ]; then
        log_success "Health endpoint responding: $HEALTH_RESPONSE"
    else
        log_warning "Health endpoint not responding (may be expected during deployment)"
    fi
    
    # Check target groups
    FRONTEND_TG=$(get_terraform_output "frontend_target_group_arn")
    BACKEND_TG=$(get_terraform_output "backend_target_group_arn")
    
    if [ -n "$FRONTEND_TG" ]; then
        TG_HEALTH=$(aws elbv2 describe-target-health --target-group-arn "$FRONTEND_TG" --query "TargetHealthDescriptions[0].TargetHealth.State" --output text 2>/dev/null || echo "unknown")
        if [ "$TG_HEALTH" == "healthy" ] || [ "$TG_HEALTH" == "initial" ]; then
            log_success "Frontend target group healthy"
        else
            log_warning "Frontend target group status: $TG_HEALTH"
        fi
    fi
    
    if [ -n "$BACKEND_TG" ]; then
        TG_HEALTH=$(aws elbv2 describe-target-health --target-group-arn "$BACKEND_TG" --query "TargetHealthDescriptions[0].TargetHealth.State" --output text 2>/dev/null || echo "unknown")
        if [ "$TG_HEALTH" == "healthy" ] || [ "$TG_HEALTH" == "initial" ]; then
            log_success "Backend target group healthy"
        else
            log_warning "Backend target group status: $TG_HEALTH"
        fi
    fi
}

check_security_groups() {
    log_info "Checking security groups..."
    
    VPC_ID=$(get_terraform_output "vpc_id")
    
    if [ -z "$VPC_ID" ]; then
        log_warning "Cannot check security groups without VPC ID"
        return 0
    fi
    
    # Count security groups
    SG_COUNT=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --query "length(SecurityGroups)" --output text 2>/dev/null || echo "0")
    
    if [ "$SG_COUNT" -gt 1 ]; then
        log_success "Security groups configured ($SG_COUNT found)"
    else
        log_warning "No custom security groups found"
    fi
}

check_cloudwatch() {
    log_info "Checking CloudWatch..."
    
    DASHBOARD_NAME=$(get_terraform_output "cloudwatch_dashboard_name")
    
    if [ -n "$DASHBOARD_NAME" ]; then
        if aws cloudwatch get-dashboard --dashboard-name "$DASHBOARD_NAME" &>/dev/null; then
            log_success "CloudWatch dashboard exists: $DASHBOARD_NAME"
        else
            log_warning "CloudWatch dashboard not found"
        fi
    else
        log_warning "CloudWatch dashboard name not found"
    fi
    
    # Check log groups
    LOG_GROUPS=$(aws logs describe-log-groups --log-group-name-prefix "/aws/spartan/staging" --query "length(logGroups)" --output text 2>/dev/null || echo "0")
    
    if [ "$LOG_GROUPS" -gt 0 ]; then
        log_success "CloudWatch log groups configured ($LOG_GROUPS found)"
    else
        log_warning "No CloudWatch log groups found"
    fi
}

check_ssm_parameters() {
    log_info "Checking SSM Parameters..."
    
    PARAM_PREFIX=$(get_terraform_output "ssm_parameter_prefix")
    
    if [ -n "$PARAM_PREFIX" ]; then
        PARAM_COUNT=$(aws ssm get-parameters-by-path --path "$PARAM_PREFIX" --query "length(Parameters)" --output text 2>/dev/null || echo "0")
        
        if [ "$PARAM_COUNT" -gt 0 ]; then
            log_success "SSM parameters configured ($PARAM_COUNT found)"
        else
            log_warning "No SSM parameters found"
        fi
    else
        log_warning "SSM parameter prefix not found"
    fi
}

check_iam_roles() {
    log_info "Checking IAM roles..."
    
    FRONTEND_ROLE=$(get_terraform_output "frontend_iam_role_name")
    BACKEND_ROLE=$(get_terraform_output "backend_iam_role_name")
    
    if [ -n "$FRONTEND_ROLE" ]; then
        if aws iam get-role --role-name "$FRONTEND_ROLE" &>/dev/null; then
            log_success "Frontend IAM role exists: $FRONTEND_ROLE"
        else
            log_warning "Frontend IAM role not found"
        fi
    fi
    
    if [ -n "$BACKEND_ROLE" ]; then
        if aws iam get-role --role-name "$BACKEND_ROLE" &>/dev/null; then
            log_success "Backend IAM role exists: $BACKEND_ROLE"
        else
            log_warning "Backend IAM role not found"
        fi
    fi
}

print_summary() {
    echo ""
    echo "=============================================="
    echo "  Validation Summary"
    echo "=============================================="
    echo ""
    echo -e "  ${GREEN}Passed:${NC}   $PASS_COUNT"
    echo -e "  ${YELLOW}Warnings:${NC} $WARN_COUNT"
    echo -e "  ${RED}Failed:${NC}   $FAIL_COUNT"
    echo ""
    
    TOTAL=$((PASS_COUNT + FAIL_COUNT + WARN_COUNT))
    
    if [ "$FAIL_COUNT" -eq 0 ]; then
        echo -e "  ${GREEN}Overall Status: HEALTHY${NC}"
        return 0
    else
        echo -e "  ${RED}Overall Status: ISSUES DETECTED${NC}"
        return 1
    fi
}

print_json_output() {
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"summary\": {"
    echo "    \"passed\": $PASS_COUNT,"
    echo "    \"warnings\": $WARN_COUNT,"
    echo "    \"failed\": $FAIL_COUNT"
    echo "  },"
    echo "  \"results\": ["
    
    local first=true
    for result in "${RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        echo -n "    $result"
    done
    
    echo ""
    echo "  ]"
    echo "}"
}

# =============================================================================
# Main Script
# =============================================================================

main() {
    echo "=============================================="
    echo "  Spartan Hub 2.0 - Infrastructure Validation"
    echo "  Staging Environment"
    echo "=============================================="
    echo ""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --help|-h)
                show_help
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                ;;
        esac
    done
    
    # Run checks
    check_terraform_state
    echo ""
    check_vpc
    echo ""
    check_ec2
    echo ""
    check_rds
    echo ""
    check_elasticache
    echo ""
    check_alb
    echo ""
    check_security_groups
    echo ""
    check_cloudwatch
    echo ""
    check_ssm_parameters
    echo ""
    check_iam_roles
    
    # Print summary
    if [ "$JSON_OUTPUT" = true ]; then
        print_json_output
    else
        print_summary
    fi
}

# Run main function
main "$@"
