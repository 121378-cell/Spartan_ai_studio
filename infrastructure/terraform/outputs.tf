# =============================================================================
# Output Values
# Spartan Hub 2.0 - Staging Environment
# =============================================================================
#
# These outputs provide important information about the deployed infrastructure.
# Use `terraform output` to view these values after deployment.
#
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "nat_gateway_id" {
  description = "ID of the NAT Gateway"
  value       = module.vpc.nat_gateway_id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = module.vpc.internet_gateway_id
}

# -----------------------------------------------------------------------------
# EC2 Outputs
# -----------------------------------------------------------------------------

output "frontend_instance_id" {
  description = "ID of the Frontend EC2 instance"
  value       = module.ec2_frontend.instance_id
}

output "frontend_instance_private_ip" {
  description = "Private IP of the Frontend EC2 instance"
  value       = module.ec2_frontend.instance_private_ip
}

output "frontend_instance_public_ip" {
  description = "Public IP of the Frontend EC2 instance (if assigned)"
  value       = module.ec2_frontend.instance_public_ip
}

output "backend_instance_id" {
  description = "ID of the Backend EC2 instance"
  value       = module.ec2_backend.instance_id
}

output "backend_instance_private_ip" {
  description = "Private IP of the Backend EC2 instance"
  value       = module.ec2_backend.instance_private_ip
}

output "backend_instance_public_ip" {
  description = "Public IP of the Backend EC2 instance (if assigned)"
  value       = module.ec2_backend.instance_public_ip
}

# -----------------------------------------------------------------------------
# RDS Outputs
# -----------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_endpoint
}

output "rds_port" {
  description = "RDS instance port"
  value       = module.rds.db_port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = module.rds.db_name
}

output "rds_arn" {
  description = "ARN of the RDS instance"
  value       = module.rds.db_instance_arn
}

output "rds_hostname" {
  description = "RDS instance hostname"
  value       = module.rds.db_hostname
}

# -----------------------------------------------------------------------------
# ElastiCache Outputs
# -----------------------------------------------------------------------------

output "redis_primary_endpoint" {
  description = "Redis cluster primary endpoint"
  value       = module.redis.primary_endpoint
}

output "redis_reader_endpoint" {
  description = "Redis cluster reader endpoint"
  value       = module.redis.reader_endpoint
}

output "redis_port" {
  description = "Redis cluster port"
  value       = module.redis.port
}

output "redis_arn" {
  description = "ARN of the Redis cluster"
  value       = module.redis.cluster_arn
}

# -----------------------------------------------------------------------------
# ALB Outputs
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = module.alb.alb_arn
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = module.alb.alb_zone_id
}

output "frontend_target_group_arn" {
  description = "ARN of the Frontend Target Group"
  value       = module.alb.frontend_target_group_arn
}

output "backend_target_group_arn" {
  description = "ARN of the Backend Target Group"
  value       = module.alb.backend_target_group_arn
}

# -----------------------------------------------------------------------------
# Security Group Outputs
# -----------------------------------------------------------------------------

output "alb_security_group_id" {
  description = "ID of the ALB Security Group"
  value       = aws_security_group.alb.id
}

output "frontend_security_group_id" {
  description = "ID of the Frontend Security Group"
  value       = aws_security_group.frontend.id
}

output "backend_security_group_id" {
  description = "ID of the Backend Security Group"
  value       = aws_security_group.backend.id
}

output "rds_security_group_id" {
  description = "ID of the RDS Security Group"
  value       = aws_security_group.rds.id
}

output "redis_security_group_id" {
  description = "ID of the Redis Security Group"
  value       = aws_security_group.redis.id
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "frontend_iam_role_arn" {
  description = "ARN of the Frontend IAM Role"
  value       = aws_iam_role.frontend.arn
}

output "frontend_iam_role_name" {
  description = "Name of the Frontend IAM Role"
  value       = aws_iam_role.frontend.name
}

output "backend_iam_role_arn" {
  description = "ARN of the Backend IAM Role"
  value       = aws_iam_role.backend.arn
}

output "backend_iam_role_name" {
  description = "Name of the Backend IAM Role"
  value       = aws_iam_role.backend.name
}

output "frontend_instance_profile_arn" {
  description = "ARN of the Frontend Instance Profile"
  value       = aws_iam_instance_profile.frontend.arn
}

output "backend_instance_profile_arn" {
  description = "ARN of the Backend Instance Profile"
  value       = aws_iam_instance_profile.backend.arn
}

# -----------------------------------------------------------------------------
# CloudWatch Outputs
# -----------------------------------------------------------------------------

output "cloudwatch_dashboard_name" {
  description = "Name of the CloudWatch Dashboard"
  value       = var.enable_cloudwatch_dashboard ? module.cloudwatch.dashboard_name : null
}

output "alarm_topic_arn" {
  description = "ARN of the SNS topic for alarms"
  value       = var.enable_cloudwatch_alarms && var.sns_alarm_email != "" ? aws_sns_topic.alarms[0].arn : null
}

# -----------------------------------------------------------------------------
# SSM Parameter Outputs
# -----------------------------------------------------------------------------

output "ssm_parameter_prefix" {
  description = "Prefix for SSM parameters"
  value       = var.ssm_parameter_prefix
}

output "ssm_parameter_names" {
  description = "List of created SSM parameter names"
  value = var.enable_ssm_parameters ? [
    "${var.ssm_parameter_prefix}/database/host",
    "${var.ssm_parameter_prefix}/database/port",
    "${var.ssm_parameter_prefix}/database/name",
    "${var.ssm_parameter_prefix}/database/username",
    "${var.ssm_parameter_prefix}/database/password",
    "${var.ssm_parameter_prefix}/redis/host",
    "${var.ssm_parameter_prefix}/redis/port",
    "${var.ssm_parameter_prefix}/environment",
    "${var.ssm_parameter_prefix}/alb/dns_name"
  ] : []
}

# -----------------------------------------------------------------------------
# Connection Strings
# -----------------------------------------------------------------------------

output "database_connection_string" {
  description = "PostgreSQL connection string (password must be added)"
  value       = "postgresql://${var.db_username}:<PASSWORD>@${module.rds.db_endpoint}:${module.rds.db_port}/${var.db_name}"
  sensitive   = true
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = "redis://${module.redis.primary_endpoint}:${module.redis.port}"
}

# -----------------------------------------------------------------------------
# Access Information
# -----------------------------------------------------------------------------

output "application_url" {
  description = "URL to access the application"
  value       = "http://${module.alb.alb_dns_name}"
}

output "api_url" {
  description = "URL to access the API"
  value       = "http://${module.alb.alb_dns_name}/api"
}

output "health_check_url" {
  description = "Health check endpoint URL"
  value       = "http://${module.alb.alb_dns_name}/health"
}

# -----------------------------------------------------------------------------
# SSM Session Manager Access
# -----------------------------------------------------------------------------

output "ssm_frontend_command" {
  description = "AWS CLI command to connect to Frontend via SSM Session Manager"
  value       = "aws ssm start-session --target ${module.ec2_frontend.instance_id}"
}

output "ssm_backend_command" {
  description = "AWS CLI command to connect to Backend via SSM Session Manager"
  value       = "aws ssm start-session --target ${module.ec2_backend.instance_id}"
}

# -----------------------------------------------------------------------------
# Summary Output
# -----------------------------------------------------------------------------

output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value = {
    vpc_id                    = module.vpc.vpc_id
    frontend_instance_id      = module.ec2_frontend.instance_id
    backend_instance_id       = module.ec2_backend.instance_id
    rds_endpoint              = module.rds.db_endpoint
    redis_endpoint            = module.redis.primary_endpoint
    alb_dns_name              = module.alb.alb_dns_name
    application_url           = "http://${module.alb.alb_dns_name}"
    cloudwatch_dashboard_name = var.enable_cloudwatch_dashboard ? module.cloudwatch.dashboard_name : null
  }
}
