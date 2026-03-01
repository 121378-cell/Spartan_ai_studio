# =============================================================================
# ElastiCache Redis Module - Main Configuration
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

# Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-redis-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-redis-subnet-group"
  })
}

# Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis${var.engine_version}"
  name   = "${var.project_name}-${var.environment}-redis-params"

  dynamic "parameter" {
    for_each = var.redis_parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-redis-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# Redis Cluster (Cache Cluster)
resource "aws_elasticache_cluster" "main" {
  cluster_id           = var.identifier
  engine               = "redis"
  engine_version       = var.engine_version
  node_type            = var.node_type
  num_cache_nodes      = var.num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.main.name
  port                 = var.port
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = var.security_group_ids

  # Maintenance
  maintenance_window = var.maintenance_window

  # Snapshot
  snapshot_retention_limit = var.snapshot_retention_limit
  snapshot_window          = var.snapshot_window

  # Security
  auth_token               = var.auth_token != "" ? var.auth_token : null
  auth_token_update_strategy = var.auth_token != "" ? "ROTATE" : null

  # Tags
  tags = merge(var.additional_tags, {
    Name = var.identifier
  })
}

# CloudWatch Alarm for CPU
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  alarm_description   = "ElastiCache CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.id
  }

  tags = merge(var.additional_tags, {
    Name = "${var.identifier}-cpu-alarm"
  })
}

# CloudWatch Alarm for Memory
resource "aws_cloudwatch_metric_alarm" "memory" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.memory_alarm_threshold
  alarm_description   = "ElastiCache memory usage is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.id
  }

  tags = merge(var.additional_tags, {
    Name = "${var.identifier}-memory-alarm"
  })
}

# CloudWatch Alarm for Connections
resource "aws_cloudwatch_metric_alarm" "connections" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.connections_alarm_threshold
  alarm_description   = "ElastiCache connections are high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.id
  }

  tags = merge(var.additional_tags, {
    Name = "${var.identifier}-connections-alarm"
  })
}

# CloudWatch Alarm for Evictions
resource "aws_cloudwatch_metric_alarm" "evictions" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-evictions-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "Evictions"
  namespace           = "AWS/ElastiCache"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.evictions_alarm_threshold
  alarm_description   = "ElastiCache evictions are high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    CacheClusterId = aws_elasticache_cluster.main.id
  }

  tags = merge(var.additional_tags, {
    Name = "${var.identifier}-evictions-alarm"
  })
}
