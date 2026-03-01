# =============================================================================
# CloudWatch Module - Outputs
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

output "dashboard_name" {
  description = "Name of the CloudWatch dashboard"
  value       = var.enable_dashboard ? aws_cloudwatch_dashboard.main[0].dashboard_name : null
}

output "dashboard_arn" {
  description = "ARN of the CloudWatch dashboard"
  value       = var.enable_dashboard ? aws_cloudwatch_dashboard.main[0].dashboard_arn : null
}

output "alarm_arns" {
  description = "List of CloudWatch alarm ARNs"
  value = compact([
    var.enable_alarms ? aws_cloudwatch_metric_alarm.frontend_cpu[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.frontend_memory[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.frontend_disk[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.backend_cpu[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.backend_memory[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.backend_disk[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.rds_cpu[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.rds_connections[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.rds_storage[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.redis_cpu[0].arn : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.redis_connections[0].arn : null
  ])
}

output "alarm_names" {
  description = "List of CloudWatch alarm names"
  value = compact([
    var.enable_alarms ? aws_cloudwatch_metric_alarm.frontend_cpu[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.frontend_memory[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.frontend_disk[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.backend_cpu[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.backend_memory[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.backend_disk[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.rds_cpu[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.rds_connections[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.rds_storage[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.redis_cpu[0].alarm_name : null,
    var.enable_alarms ? aws_cloudwatch_metric_alarm.redis_connections[0].alarm_name : null
  ])
}

output "frontend_log_group_name" {
  description = "Name of the Frontend CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.frontend.name
}

output "frontend_log_group_arn" {
  description = "ARN of the Frontend CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.frontend.arn
}

output "backend_log_group_name" {
  description = "Name of the Backend CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.backend.name
}

output "backend_log_group_arn" {
  description = "ARN of the Backend CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.backend.arn
}

output "alb_log_group_name" {
  description = "Name of the ALB CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.alb.name
}

output "alb_log_group_arn" {
  description = "ARN of the ALB CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.alb.arn
}

output "log_group_names" {
  description = "List of all CloudWatch Log Group names"
  value = [
    aws_cloudwatch_log_group.frontend.name,
    aws_cloudwatch_log_group.backend.name,
    aws_cloudwatch_log_group.alb.name
  ]
}
