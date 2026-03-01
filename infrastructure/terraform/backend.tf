# =============================================================================
# Terraform Backend Configuration
# Spartan Hub 2.0 - Staging Environment
# =============================================================================
#
# This configuration uses S3 for state storage with DynamoDB for state locking.
# 
# IMPORTANT: Before running terraform init, you must manually create:
# 1. S3 bucket for state storage
# 2. DynamoDB table for state locking
#
# Run the following AWS CLI commands first:
#
#   aws s3api create-bucket --bucket spartan-hub-terraform-state-staging --region us-east-1
#
#   aws dynamodb create-table \
#     --table-name spartan-hub-terraform-locks-staging \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region us-east-1
#
# =============================================================================

terraform {
  backend "s3" {
    # Bucket name for Terraform state
    bucket = "spartan-hub-terraform-state-staging"
    
    # State file path within the bucket
    key = "staging/infrastructure/terraform.tfstate"
    
    # AWS region
    region = "us-east-1"
    
    # DynamoDB table for state locking
    dynamodb_table = "spartan-hub-terraform-locks-staging"
    
    # Enable encryption
    encrypt = true
    
    # Enable state locking
    use_dynamodb_lock = true
    
    # AWS profile (optional, uses default if not specified)
    # profile = "spartan-staging"
  }
}

# =============================================================================
# Local Backend (for development/testing only)
# Uncomment below and comment out S3 backend above for local development
# =============================================================================

# terraform {
#   backend "local" {
#     path = "terraform.tfstate"
#   }
# }
