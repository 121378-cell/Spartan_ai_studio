# =============================================================================
# ElastiCache Redis Module - Outputs
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

output "cluster_id" {
  description = "ElastiCache cluster ID"
  value       = aws_elasticache_cluster.main.id
}

output "cluster_arn" {
  description = "ElastiCache cluster ARN"
  value       = aws_elasticache_cluster.main.arn
}

output "primary_endpoint" {
  description = "Primary endpoint of the Redis cluster"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "reader_endpoint" {
  description = "Reader endpoint of the Redis cluster"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_cluster.main.port
}

output "subnet_group_name" {
  description = "Subnet group name"
  value       = aws_elasticache_subnet_group.main.name
}

output "parameter_group_name" {
  description = "Parameter group name"
  value       = aws_elasticache_parameter_group.main.name
}

output "cache_node_type" {
  description = "Cache node type"
  value       = aws_elasticache_cluster.main.node_type
}

output "engine_version" {
  description = "Redis engine version"
  value       = aws_elasticache_cluster.main.engine_version
}

output "num_cache_nodes" {
  description = "Number of cache nodes"
  value       = aws_elasticache_cluster.main.num_cache_nodes
}

output "cluster_address" {
  description = "Full cluster address (host:port)"
  value       = "${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.port}"
}

output "redis_connection_string" {
  description = "Redis connection string"
  value       = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.port}"
}
