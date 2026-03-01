# =============================================================================
# EC2 Module - Variables
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

variable "instance_name" {
  description = "Name identifier for the instance (e.g., frontend, backend)"
  type        = string
}

variable "ami_id" {
  description = "AMI ID for the EC2 instance"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "subnet_id" {
  description = "Subnet ID for the instance"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID (for reference)"
  type        = string
}

variable "security_group_ids" {
  description = "List of security group IDs"
  type        = list(string)
}

variable "iam_instance_profile" {
  description = "IAM instance profile name"
  type        = string
  default     = ""
}

variable "root_volume_size" {
  description = "Size of the root volume in GB"
  type        = number
  default     = 30
}

variable "root_volume_type" {
  description = "Type of the root volume"
  type        = string
  default     = "gp3"
}

variable "additional_volume_size" {
  description = "Size of additional EBS volume (0 to disable)"
  type        = number
  default     = 0
}

variable "additional_volume_type" {
  description = "Type of additional EBS volume"
  type        = string
  default     = "gp3"
}

variable "enable_encryption" {
  description = "Enable EBS encryption"
  type        = bool
  default     = true
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "enable_cloudwatch_logs" {
  description = "Create CloudWatch Log Group for instance"
  type        = bool
  default     = true
}

variable "cloudwatch_logs_retention_days" {
  description = "Retention period for CloudWatch Logs"
  type        = number
  default     = 14
}

variable "enable_ssm_agent_config" {
  description = "Configure SSM agent via SSM Association"
  type        = bool
  default     = true
}

variable "user_data" {
  description = "User data script (base64 encoded)"
  type        = string
  default     = ""
}

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
