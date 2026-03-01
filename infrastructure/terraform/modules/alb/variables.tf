# =============================================================================
# Application Load Balancer Module - Variables
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

variable "name" {
  description = "Name of the Application Load Balancer"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ALB"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "idle_timeout" {
  description = "Idle timeout for ALB connections"
  type        = number
  default     = 60
}

variable "drop_invalid_header_fields" {
  description = "Drop invalid header fields"
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

variable "frontend_target_group" {
  description = "Frontend target group configuration"
  type = object({
    name     = string
    port     = number
    protocol = string
    vpc_id   = string
  })
}

variable "backend_target_group" {
  description = "Backend target group configuration"
  type = object({
    name     = string
    port     = number
    protocol = string
    vpc_id   = string
  })
}

variable "frontend_health_check" {
  description = "Frontend health check configuration"
  type = object({
    path                = string
    interval            = number
    timeout             = number
    healthy_threshold   = number
    unhealthy_threshold = number
  })
  default = {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

variable "backend_health_check" {
  description = "Backend health check configuration"
  type = object({
    path                = string
    interval            = number
    timeout             = number
    healthy_threshold   = number
    unhealthy_threshold = number
  })
  default = {
    path                = "/api/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

variable "frontend_instance_id" {
  description = "Frontend EC2 instance ID"
  type        = string
}

variable "backend_instance_id" {
  description = "Backend EC2 instance ID"
  type        = string
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

variable "http_5xx_alarm_threshold" {
  description = "HTTP 5XX errors threshold for alarm"
  type        = number
  default     = 10
}

variable "target_5xx_alarm_threshold" {
  description = "Target 5XX errors threshold for alarm"
  type        = number
  default     = 10
}

variable "latency_alarm_threshold" {
  description = "Response time threshold for alarm in seconds"
  type        = number
  default     = 5
}

variable "unhealthy_hosts_alarm_threshold" {
  description = "Unhealthy hosts threshold for alarm"
  type        = number
  default     = 0
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
