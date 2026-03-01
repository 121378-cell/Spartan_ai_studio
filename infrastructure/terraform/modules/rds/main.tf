# =============================================================================
# RDS PostgreSQL Module - Main Configuration
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-db-subnet-group"
  })
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name   = "${var.project_name}-${var.environment}-pg-params"
  family = "postgres${var.engine_version}"

  dynamic "parameter" {
    for_each = var.db_parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-pg-params"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = var.identifier

  # Engine
  engine               = var.engine
  engine_version       = var.engine_version
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  storage_type         = var.storage_type
  max_allocated_storage = var.max_allocated_storage

  # Database
  db_name  = var.db_name
  username = var.username
  password = var.password
  port     = var.port

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids
  publicly_accessible    = false
  multi_az               = var.multi_az

  # Backup
  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  maintenance_window      = var.maintenance_window

  # Security
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.identifier}-final-snapshot"
  deletion_protection       = var.deletion_protection
  copy_tags_to_snapshot     = true

  # Monitoring
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = var.enable_performance_insights ? 7 : null
  enabled_cloudwatch_logs_exports       = var.enable_performance_insights ? ["postgresql"] : []
  monitoring_interval                   = var.enable_enhanced_monitoring ? var.enhanced_monitoring_interval : 0
  monitoring_role_arn                   = var.enable_enhanced_monitoring ? aws_iam_role.rds_monitoring[0].arn : null

  # Encryption
  storage_encrypted = var.enable_encryption
  kms_key_id        = var.enable_encryption && var.kms_key_id != "" ? var.kms_key_id : null

  # Auto Minor Version Upgrade
  auto_minor_version_upgrade = var.auto_minor_version_upgrade

  # Tags
  tags = merge(var.additional_tags, {
    Name = var.identifier
  })

  lifecycle {
    prevent_destroy = false
  }
}

# IAM Role for Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  name = "${var.project_name}-${var.environment}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-rds-monitoring-role"
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  count = var.enable_enhanced_monitoring ? 1 : 0

  role       = aws_iam_role.rds_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# CloudWatch Alarm for RDS CPU
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.cpu_alarm_threshold
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = merge(var.additional_tags, {
    Name = "${var.identifier}-cpu-alarm"
  })
}

# CloudWatch Alarm for RDS Free Storage
resource "aws_cloudwatch_metric_alarm" "storage" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.storage_alarm_threshold * 1024 * 1024 * 1024 # Convert GB to bytes
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = merge(var.additional_tags, {
    Name = "${var.identifier}-storage-alarm"
  })
}

# CloudWatch Alarm for RDS Connections
resource "aws_cloudwatch_metric_alarm" "connections" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.identifier}-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.connections_alarm_threshold
  alarm_description   = "RDS database connections are high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }

  tags = merge(var.additional_tags, {
    Name = "${var.identifier}-connections-alarm"
  })
}
