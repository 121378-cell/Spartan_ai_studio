# =============================================================================
# RDS Module - Outputs
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

output "db_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "db_instance_identifier" {
  description = "RDS instance identifier"
  value       = aws_db_instance.main.identifier
}

output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "db_hostname" {
  description = "RDS instance hostname"
  value       = aws_db_instance.main.address
}

output "db_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "db_username" {
  description = "RDS master username"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_subnet_group_name" {
  description = "DB subnet group name"
  value       = aws_db_subnet_group.main.name
}

output "db_parameter_group_name" {
  description = "DB parameter group name"
  value       = aws_db_parameter_group.main.name
}

output "db_resource_id" {
  description = "RDS instance resource ID"
  value       = aws_db_instance.main.resource_id
}

output "db_availability_zone" {
  description = "RDS instance availability zone"
  value       = aws_db_instance.main.availability_zone
}

output "db_multi_az" {
  description = "Whether Multi-AZ is enabled"
  value       = aws_db_instance.main.multi_az
}

output "db_encryption_enabled" {
  description = "Whether storage encryption is enabled"
  value       = aws_db_instance.main.storage_encrypted
}

output "db_arn_suffix" {
  description = "RDS instance ARN suffix for policies"
  value       = aws_db_instance.main.arn_suffix
}
