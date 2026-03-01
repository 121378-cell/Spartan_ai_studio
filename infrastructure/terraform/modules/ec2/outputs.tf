# =============================================================================
# EC2 Module - Outputs
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.main.id
}

output "instance_arn" {
  description = "ARN of the EC2 instance"
  value       = aws_instance.main.arn
}

output "instance_private_ip" {
  description = "Private IP address of the instance"
  value       = aws_instance.main.private_ip
}

output "instance_public_ip" {
  description = "Public IP address of the instance (if assigned)"
  value       = aws_instance.main.public_ip
}

output "instance_availability_zone" {
  description = "Availability zone of the instance"
  value       = aws_instance.main.availability_zone
}

output "instance_state" {
  description = "Current state of the instance"
  value       = aws_instance.main.instance_state
}

output "root_volume_id" {
  description = "ID of the root EBS volume"
  value       = aws_instance.main.root_block_device[0].volume_id
}

output "additional_volume_id" {
  description = "ID of the additional EBS volume"
  value       = var.additional_volume_size > 0 ? aws_ebs_volume.additional[0].id : null
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch Log Group"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.instance[0].name : null
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch Log Group"
  value       = var.enable_cloudwatch_logs ? aws_cloudwatch_log_group.instance[0].arn : null
}

output "ssm_managed" {
  description = "Whether the instance is configured for SSM management"
  value       = var.enable_ssm_agent_config
}
