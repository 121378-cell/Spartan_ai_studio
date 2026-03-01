# AWS Quick Start Guide - Spartan Hub 2.0 Staging

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Estimated Setup Time:** 15 minutes

---

## Overview

This guide walks you through deploying the complete AWS infrastructure for Spartan Hub 2.0 staging environment using Terraform. By the end, you'll have a fully functional staging environment with EC2 instances, RDS PostgreSQL, ElastiCache Redis, and an Application Load Balancer.

---

## Prerequisites

### Required Software

| Tool | Version | Installation |
|------|---------|--------------|
| AWS CLI | v2.x | [aws.amazon.com/cli](https://aws.amazon.com/cli/) |
| Terraform | >= 1.6.0 | [terraform.io](https://www.terraform.io/downloads) |
| Git | Latest | [git-scm.com](https://git-scm.com/) |
| jq | Latest | [stedolan.github.io/jq](https://stedolan.github.io/jq/) |

### AWS Account Requirements

- AWS Account with administrative access
- AWS CLI configured with credentials
- Budget alerts configured (recommended)

### Verify Prerequisites

```bash
# Check AWS CLI
aws --version

# Check Terraform
terraform version

# Verify AWS credentials
aws sts get-caller-identity

# Check jq
jq --version
```

---

## Step 1: Clone Repository (1 minute)

```bash
# Navigate to projects directory
cd "C:\Proyectos"

# Clone or navigate to the repository
cd "Spartan hub 2.0 - codex - copia"
```

---

## Step 2: Configure AWS Credentials (2 minutes)

### Option A: AWS CLI Configuration

```bash
aws configure

# Enter your credentials:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: us-east-1
# Default output format: json
```

### Option B: Environment Variables

```bash
# Windows PowerShell
$env:AWS_ACCESS_KEY_ID="your-access-key"
$env:AWS_SECRET_ACCESS_KEY="your-secret-key"
$env:AWS_DEFAULT_REGION="us-east-1"

# Or add to your profile permanently
```

### Option C: IAM Role (EC2/CI/CD)

If running on EC2 or in GitHub Actions, ensure the appropriate IAM role is attached.

---

## Step 3: Create Backend Resources (3 minutes)

Terraform state is stored in S3 with DynamoDB locking. Create these first:

```bash
# Set variables
REGION="us-east-1"
S3_BUCKET="spartan-hub-terraform-state-staging"
DYNAMODB_TABLE="spartan-hub-terraform-locks-staging"

# Create S3 bucket for state
aws s3api create-bucket --bucket $S3_BUCKET --region $REGION

# Enable versioning
aws s3api put-bucket-versioning --bucket $S3_BUCKET --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption --bucket $S3_BUCKET --server-side-encryption-configuration \
  '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name $DYNAMODB_TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION

echo "Backend resources created!"
```

---

## Step 4: Configure Environment Variables (1 minute)

```bash
# Copy the example file
cp aws.env.example aws.env

# Edit with your values (use your preferred editor)
# Required values:
# - DB_PASSWORD (generate a strong password)
# - SNS_ALARM_EMAIL (optional, for alerts)

# Or set environment variables directly
export TF_VAR_db_password="YourStrongPassword123!"
export TF_VAR_sns_alarm_email="your-email@company.com"
```

---

## Step 5: Initialize Terraform (2 minutes)

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init \
  -backend-config="bucket=spartan-hub-terraform-state-staging" \
  -backend-config="key=staging/infrastructure/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=spartan-hub-terraform-locks-staging"
```

Expected output:
```
Terraform has been successfully initialized!
```

---

## Step 6: Review and Apply Plan (5 minutes)

### Review the Plan

```bash
# Create execution plan
terraform plan -out=tfplan -var="db_password=YourStrongPassword123!"
```

Review the output to ensure:
- ✅ VPC with correct CIDR blocks
- ✅ 2 public subnets, 2 private subnets
- ✅ 2 EC2 instances (t3.medium)
- ✅ 1 RDS instance (db.t3.micro)
- ✅ 1 ElastiCache cluster (cache.t3.micro)
- ✅ 1 Application Load Balancer

### Apply the Plan

```bash
# Apply changes
terraform apply -auto-approve tfplan
```

Wait for completion (~5 minutes). You'll see:
```
Apply complete! Resources: 45 added, 0 changed, 0 destroyed.
```

---

## Step 7: Verify Deployment (2 minutes)

### Get Outputs

```bash
# View all outputs
terraform output

# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "Application URL: http://$ALB_DNS"
```

### Test Health Endpoint

```bash
# Test health check
curl http://$ALB_DNS/health

# Expected response: OK
```

### Run Validation Script

```bash
# Navigate to scripts directory
cd ../../scripts

# Run validation (bash required)
./aws-validate.sh
```

Expected output:
```
==============================================
  Validation Summary
==============================================

  Passed:   15
  Warnings: 2
  Failed:   0

  Overall Status: HEALTHY
```

---

## Post-Deployment Tasks

### 1. Configure DNS (Optional)

```bash
# Get the ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create a CNAME record in your DNS provider
# staging.spartanhub.io -> $ALB_DNS
```

### 2. Request SSL Certificate

```bash
# Request ACM certificate
aws acm request-certificate \
  --domain-name staging.spartanhub.io \
  --validation-method DNS \
  --region us-east-1

# Complete DNS validation in your DNS provider
```

### 3. Deploy Application Code

```bash
# The EC2 instances are ready but empty
# Deploy your application using:
# - SSM Session Manager to connect
# - CI/CD pipeline (GitHub Actions configured)
# - Manual deployment scripts
```

### 4. Configure Database

```bash
# Get database connection info
DB_HOST=$(terraform output -raw rds_endpoint)
DB_PORT=$(terraform output -raw rds_port)

# Connect using psql (from backend instance via SSM)
psql -h $DB_HOST -p $DB_PORT -U spartan_admin -d spartan_hub
```

---

## Accessing Your Infrastructure

### Connect to EC2 via SSM

```bash
# Get instance IDs
FRONTEND_ID=$(terraform output -raw frontend_instance_id)
BACKEND_ID=$(terraform output -raw backend_instance_id)

# Connect to frontend
aws ssm start-session --target $FRONTEND_ID

# Connect to backend
aws ssm start-session --target $BACKEND_ID
```

### View CloudWatch Logs

```bash
# Frontend logs
aws logs tail /aws/spartan/staging/frontend --follow

# Backend logs
aws logs tail /aws/spartan/staging/backend --follow
```

### Access CloudWatch Dashboard

```bash
# Open in AWS Console
echo "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=spartan-hub-staging-dashboard"
```

---

## Troubleshooting

### Terraform Init Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify S3 bucket exists
aws s3api head-bucket --bucket spartan-hub-terraform-state-staging

# Check DynamoDB table
aws dynamodb describe-table --table-name spartan-hub-terraform-locks-staging
```

### Infrastructure Creation Fails

```bash
# Check CloudWatch Events
aws cloudwatch describe-alarms

# Review EC2 system logs
aws ec2 get-console-output --instance-id i-xxxxxxxxx

# Check RDS events
aws rds describe-events --source-identifier spartan-hub-staging-db
```

### Health Check Fails

```bash
# Connect to instance
aws ssm start-session --target $(terraform output -raw frontend_instance_id)

# Check Nginx status
sudo systemctl status nginx

# Check logs
sudo tail -f /var/log/nginx/error.log

# Verify health endpoint
curl http://localhost/health
```

### Cannot Connect to Database

```bash
# From backend instance, test connection
psql -h $(terraform output -raw rds_endpoint) -U spartan_admin -d spartan_hub

# Check security group rules
aws ec2 describe-security-groups --filters "Name=group-name,Values=*rds*"

# Verify RDS is accessible
aws rds describe-db-instances --db-instance-identifier spartan-hub-staging-db
```

---

## Cost Management

### View Current Costs

```bash
# Check AWS Cost Explorer (requires permissions)
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "30 days ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Set Budget Alert

```bash
# Create budget via AWS Console or CLI
# Recommended: $200/month for staging
```

### Destroy to Save Costs

```bash
# When not in use, destroy infrastructure
cd scripts
./aws-destroy.sh

# This will delete all resources
# State files are preserved in S3
```

---

## Next Steps

1. **Deploy Application Code**
   - Follow the application deployment guide
   - Configure CI/CD pipeline

2. **Configure Monitoring**
   - Set up Slack notifications
   - Configure custom CloudWatch alarms

3. **Security Hardening**
   - Enable AWS GuardDuty
   - Configure AWS WAF
   - Enable VPC Flow Logs

4. **Prepare for Production**
   - Review production checklist
   - Enable Multi-AZ for RDS
   - Configure Auto Scaling

---

## Useful Commands Reference

```bash
# Terraform commands
terraform output                    # View all outputs
terraform output -raw alb_dns_name  # Get specific output
terraform state list                # List all resources
terraform show                      # Show current state
terraform refresh                   # Refresh state from AWS

# AWS CLI shortcuts
aws ec2 describe-instances --filters "Name=tag:Project,Values=spartan-hub"
aws rds describe-db-instances --filters "Name=tag:Project,Values=spartan-hub"
aws elasticache describe-cache-clusters

# SSM Session Manager
aws ssm start-session --target $(terraform output -raw backend_instance_id)

# CloudWatch Logs
aws logs tail /aws/spartan/staging/backend --follow
```

---

## Support

| Issue | Contact |
|-------|---------|
| Infrastructure questions | platform-team@spartanhub.io |
| Security concerns | security@spartanhub.io |
| General support | support@spartanhub.io |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2026 | Infrastructure Team | Initial guide |

---

## Appendix: Complete Setup Script

For automated setup, run:

```bash
#!/bin/bash
# Quick setup script

set -e

echo "Starting Spartan Hub 2.0 Staging Setup..."

# Create backend
aws s3api create-bucket --bucket spartan-hub-terraform-state-staging --region us-east-1 || true
aws dynamodb create-table --table-name spartan-hub-terraform-locks-staging \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST --region us-east-1 || true

# Initialize and apply
cd infrastructure/terraform
terraform init -backend-config="bucket=spartan-hub-terraform-state-staging" \
  -backend-config="key=staging/infrastructure/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=spartan-hub-terraform-locks-staging"

read -p "Enter database password: " -s DB_PASSWORD
echo

terraform plan -out=tfplan -var="db_password=$DB_PASSWORD"
terraform apply -auto-approve tfplan

echo ""
echo "Setup complete!"
terraform output
```
