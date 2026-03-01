# =============================================================================
# AWS Provider Configuration
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Primary AWS Provider
provider "aws" {
  region = var.aws_region

  # Default tags for all resources
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.owner_team
      CostCenter  = var.cost_center
    }
  }
}

# Alias provider for multi-region operations (future use)
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = var.owner_team
      CostCenter  = var.cost_center
    }
  }
}
