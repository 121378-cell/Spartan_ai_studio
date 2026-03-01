# =============================================================================
# Application Load Balancer Module - Outputs
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

output "alb_id" {
  description = "ID of the Application Load Balancer"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ARN suffix of the Application Load Balancer"
  value       = aws_lb.main.arn_suffix
}

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_name" {
  description = "Name of the Application Load Balancer"
  value       = aws_lb.main.name
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "frontend_target_group_id" {
  description = "ID of the Frontend Target Group"
  value       = aws_lb_target_group.frontend.id
}

output "frontend_target_group_arn" {
  description = "ARN of the Frontend Target Group"
  value       = aws_lb_target_group.frontend.arn
}

output "frontend_target_group_arn_suffix" {
  description = "ARN suffix of the Frontend Target Group"
  value       = aws_lb_target_group.frontend.arn_suffix
}

output "backend_target_group_id" {
  description = "ID of the Backend Target Group"
  value       = aws_lb_target_group.backend.id
}

output "backend_target_group_arn" {
  description = "ARN of the Backend Target Group"
  value       = aws_lb_target_group.backend.arn
}

output "backend_target_group_arn_suffix" {
  description = "ARN suffix of the Backend Target Group"
  value       = aws_lb_target_group.backend.arn_suffix
}

output "api_listener_rule_arn" {
  description = "ARN of the API listener rule"
  value       = aws_lb_listener_rule.api.arn
}

output "health_listener_rule_arn" {
  description = "ARN of the health check listener rule"
  value       = aws_lb_listener_rule.health.arn
}

output "alb_url" {
  description = "URL of the Application Load Balancer"
  value       = "http://${aws_lb.main.dns_name}"
}

output "alb_url_https" {
  description = "HTTPS URL of the Application Load Balancer"
  value       = "https://${aws_lb.main.dns_name}"
}
