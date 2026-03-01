# =============================================================================
# CloudWatch Module - Variables
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "enable_dashboard" {
  description = "Enable CloudWatch dashboard"
  type        = bool
  default     = true
}

variable "cpu_threshold" {
  description = "CPU utilization threshold for alarms"
  type        = number
  default     = 80
}

variable "memory_threshold" {
  description = "Memory utilization threshold for alarms"
  type        = number
  default     = 85
}

variable "disk_threshold" {
  description = "Disk utilization threshold for alarms"
  type        = number
  default     = 80
}

variable "evaluation_periods" {
  description = "Number of periods to evaluate for alarm"
  type        = number
  default     = 2
}

variable "period" {
  description = "Period in seconds for alarm evaluation"
  type        = number
  default     = 300
}

variable "alarm_actions" {
  description = "List of SNS topic ARNs for alarm actions"
  type        = list(string)
  default     = []
}

variable "frontend_instance_id" {
  description = "Frontend EC2 instance ID"
  type        = string
}

variable "backend_instance_id" {
  description = "Backend EC2 instance ID"
  type        = string
}

variable "rds_identifier" {
  description = "RDS instance identifier"
  type        = string
}

variable "redis_identifier" {
  description = "ElastiCache cluster identifier"
  type        = string
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix"
  type        = string
}

variable "sns_alarm_email" {
  description = "Email address for SNS alarm notifications"
  type        = string
  default     = ""
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
