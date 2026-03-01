# Spartan Hub 2.0 - Free Tier Variables

variable "key_name" {
  description = "SSH key pair name (leave empty for SSM)"
  type        = string
  default     = ""
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "alert_email" {
  description = "Email for billing alerts"
  type        = string
}
