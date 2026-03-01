# =============================================================================
# VPC Module - Outputs
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "vpc_arn" {
  description = "ARN of the VPC"
  value       = aws_vpc.main.arn
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks"
  value       = aws_subnet.private[*].cidr_block
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_id" {
  description = "ID of the NAT Gateway"
  value       = var.enable_nat_gateway && var.single_nat_gateway ? aws_nat_gateway.main[0].id : null
}

output "nat_gateway_public_ip" {
  description = "Public IP of the NAT Gateway"
  value       = var.enable_nat_gateway && var.single_nat_gateway ? aws_eip.nat[0].public_ip : null
}

output "public_route_table_id" {
  description = "ID of the public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table"
  value       = aws_route_table.private.id
}

output "availability_zones" {
  description = "List of availability zones used"
  value       = var.availability_zones
}

output "flow_logs_log_group_arn" {
  description = "ARN of the CloudWatch Log Group for VPC Flow Logs"
  value       = var.enable_flow_logs ? aws_cloudwatch_log_group.flow_logs[0].arn : null
}
