# =============================================================================
# RDS Module - Variables
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

variable "identifier" {
  description = "RDS instance identifier"
  type        = string
}

variable "engine" {
  description = "Database engine"
  type        = string
  default     = "postgres"
}

variable "engine_version" {
  description = "Database engine version"
  type        = string
  default     = "15.7"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling (0 to disable)"
  type        = number
  default     = 100
}

variable "storage_type" {
  description = "Storage type"
  type        = string
  default     = "gp2"
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "username" {
  description = "Master username"
  type        = string
}

variable "password" {
  description = "Master password"
  type        = string
  sensitive   = true
}

variable "port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the DB subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 7
}

variable "backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "04:00-05:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot on deletion"
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

variable "enable_encryption" {
  description = "Enable storage encryption"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ID for encryption"
  type        = string
  default     = ""
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights"
  type        = bool
  default     = false
}

variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring"
  type        = bool
  default     = false
}

variable "enhanced_monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

variable "auto_minor_version_upgrade" {
  description = "Enable auto minor version upgrades"
  type        = bool
  default     = true
}

variable "db_parameters" {
  description = "List of database parameters"
  type = list(object({
    name  = string
    value = string
  }))
  default = [
    {
      name  = "log_statement"
      value = "all"
    },
    {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  ]
}

# Alarms
variable "enable_alarms" {
  description = "Enable CloudWatch alarms"
  type        = bool
  default     = true
}

variable "alarm_actions" {
  description = "List of SNS topic ARNs for alarm actions"
  type        = list(string)
  default     = []
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

variable "cpu_alarm_threshold" {
  description = "CPU utilization threshold for alarm"
  type        = number
  default     = 80
}

variable "storage_alarm_threshold" {
  description = "Free storage threshold for alarm in GB"
  type        = number
  default     = 5
}

variable "connections_alarm_threshold" {
  description = "Database connections threshold for alarm"
  type        = number
  default     = 80
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
