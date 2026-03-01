# =============================================================================
# ElastiCache Redis Module - Variables
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
  description = "ElastiCache cluster identifier"
  type        = string
}

variable "node_type" {
  description = "Cache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

variable "num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "subnet_ids" {
  description = "List of subnet IDs for the subnet group"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "multi_az_enabled" {
  description = "Enable Multi-AZ for Redis"
  type        = bool
  default     = false
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:05:00-sun:06:00"
}

variable "snapshot_retention_limit" {
  description = "Number of days to retain snapshots"
  type        = number
  default     = 1
}

variable "snapshot_window" {
  description = "Preferred snapshot window"
  type        = string
  default     = "03:00-04:00"
}

variable "auth_token" {
  description = "Authentication token for Redis"
  type        = string
  default     = ""
  sensitive   = true
}

variable "redis_parameters" {
  description = "List of Redis parameters"
  type = list(object({
    name  = string
    value = string
  }))
  default = [
    {
      name  = "maxmemory-policy"
      value = "allkeys-lru"
    },
    {
      name  = "timeout"
      value = "300"
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

variable "memory_alarm_threshold" {
  description = "Memory usage threshold for alarm"
  type        = number
  default     = 85
}

variable "connections_alarm_threshold" {
  description = "Connections threshold for alarm"
  type        = number
  default     = 1000
}

variable "evictions_alarm_threshold" {
  description = "Evictions threshold for alarm"
  type        = number
  default     = 100
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
