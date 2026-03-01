# =============================================================================
# Input Variables
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "secondary_region" {
  description = "Secondary AWS region for disaster recovery (future use)"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Name of the project for resource tagging"
  type        = string
  default     = "spartan-hub"
}

variable "environment" {
  description = "Environment name (staging, production, etc.)"
  type        = string
  default     = "staging"
}

variable "owner_team" {
  description = "Team responsible for this infrastructure"
  type        = string
  default     = "platform-team"
}

variable "cost_center" {
  description = "Cost center for billing allocation"
  type        = string
  default     = "engineering"
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "List of CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "List of CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "enable_nat_gateway" {
  description = "Whether to create a NAT Gateway for private subnet internet access"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for cost optimization (vs one per AZ)"
  type        = bool
  default     = true
}

# -----------------------------------------------------------------------------
# EC2 Configuration
# -----------------------------------------------------------------------------

variable "frontend_instance_type" {
  description = "EC2 instance type for frontend server"
  type        = string
  default     = "t3.medium"
}

variable "backend_instance_type" {
  description = "EC2 instance type for backend server"
  type        = string
  default     = "t3.medium"
}

variable "ec2_ami_id" {
  description = "AMI ID for EC2 instances (Amazon Linux 2023)"
  type        = string
  default     = ""
}

variable "ec2_ami_owner" {
  description = "AWS account ID that owns the AMI (amazon for AWS official AMIs)"
  type        = string
  default     = "amazon"
}

variable "ec2_root_volume_size" {
  description = "Size of the root EBS volume in GB"
  type        = number
  default     = 30
}

variable "ec2_root_volume_type" {
  description = "Type of the root EBS volume (gp2, gp3, io1, io2)"
  type        = string
  default     = "gp3"
}

variable "enable_ec2_detailed_monitoring" {
  description = "Enable detailed monitoring for EC2 instances"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# RDS PostgreSQL Configuration
# -----------------------------------------------------------------------------

variable "rds_instance_class" {
  description = "RDS instance class for PostgreSQL"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.7"
}

variable "rds_allocated_storage" {
  description = "Allocated storage for RDS in GB"
  type        = number
  default     = 20
}

variable "rds_storage_type" {
  description = "Storage type for RDS (gp2, gp3, io1)"
  type        = string
  default     = "gp2"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = false
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}

variable "rds_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "04:00-05:00"
}

variable "rds_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "rds_skip_final_snapshot" {
  description = "Skip final snapshot when deleting RDS instance"
  type        = bool
  default     = false
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection for RDS instance"
  type        = bool
  default     = false
}

variable "rds_enhanced_monitoring_interval" {
  description = "Interval in seconds for enhanced monitoring (0 to disable)"
  type        = number
  default     = 60
}

variable "db_name" {
  description = "Name of the database to create"
  type        = string
  default     = "spartan_hub"
}

variable "db_username" {
  description = "Master username for RDS"
  type        = string
  default     = "spartan_admin"
}

variable "db_password" {
  description = "Master password for RDS (sensitive)"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# ElastiCache Redis Configuration
# -----------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the cluster"
  type        = number
  default     = 1
}

variable "redis_port" {
  description = "Port for Redis"
  type        = number
  default     = 6379
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 1
}

variable "redis_maintenance_window" {
  description = "Preferred maintenance window (UTC)"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "redis_multi_az_enabled" {
  description = "Enable Multi-AZ for Redis"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# Application Load Balancer Configuration
# -----------------------------------------------------------------------------

variable "alb_name" {
  description = "Name of the Application Load Balancer"
  type        = string
  default     = "spartan-hub-staging-alb"
}

variable "alb_idle_timeout" {
  description = "Idle timeout for ALB connections in seconds"
  type        = number
  default     = 60
}

variable "alb_drop_invalid_header_fields" {
  description = "Enable dropping invalid header fields"
  type        = bool
  default     = true
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate from ACM"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}

variable "enable_alb_waf" {
  description = "Enable AWS WAF for the ALB"
  type        = bool
  default     = false
}

# -----------------------------------------------------------------------------
# CloudWatch Configuration
# -----------------------------------------------------------------------------

variable "enable_cloudwatch_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "enable_cloudwatch_dashboard" {
  description = "Enable CloudWatch dashboard"
  type        = bool
  default     = true
}

variable "cpu_alarm_threshold" {
  description = "CPU utilization threshold for alarms (percentage)"
  type        = number
  default     = 80
}

variable "memory_alarm_threshold" {
  description = "Memory utilization threshold for alarms (percentage)"
  type        = number
  default     = 85
}

variable "disk_alarm_threshold" {
  description = "Disk utilization threshold for alarms (percentage)"
  type        = number
  default     = 80
}

variable "alarm_evaluation_periods" {
  description = "Number of periods to evaluate for alarm"
  type        = number
  default     = 2
}

variable "alarm_period" {
  description = "Period in seconds for alarm evaluation"
  type        = number
  default     = 300
}

variable "sns_alarm_email" {
  description = "Email address for alarm notifications"
  type        = string
  default     = ""
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# -----------------------------------------------------------------------------
# SSM Parameter Store Configuration
# -----------------------------------------------------------------------------

variable "enable_ssm_parameters" {
  description = "Create SSM parameters for application configuration"
  type        = bool
  default     = true
}

variable "ssm_parameter_prefix" {
  description = "Prefix for SSM parameters"
  type        = string
  default     = "/spartan-hub/staging"
}

# -----------------------------------------------------------------------------
# Security Configuration
# -----------------------------------------------------------------------------

variable "enable_encryption" {
  description = "Enable encryption for all supported resources"
  type        = bool
  default     = true
}

variable "kms_key_deletion_window" {
  description = "KMS key deletion window in days"
  type        = number
  default     = 30
}

variable "allowed_ssh_cidr_blocks" {
  description = "CIDR blocks allowed for SSH access (use SSM instead)"
  type        = list(string)
  default     = []
}

# -----------------------------------------------------------------------------
# Cost Allocation Tags
# -----------------------------------------------------------------------------

variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
