# =============================================================================
# CloudWatch Module - Main Configuration
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "main" {
  count = var.enable_dashboard ? 1 : 0

  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# ${titlecase(var.project_name)} ${titlecase(var.environment)} Infrastructure Dashboard"
        }
      },
      # EC2 Frontend - CPU
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Frontend EC2 - CPU Utilization"
          region = var.region
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", var.frontend_instance_id]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.cpu_threshold
              }
            ]
          }
        }
      },
      # EC2 Frontend - Memory
      {
        type   = "metric"
        x      = 8
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Frontend EC2 - Memory Utilization"
          region = var.region
          metrics = [
            ["CWAgent", "mem_used_percent", "InstanceId", var.frontend_instance_id]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.memory_threshold
              }
            ]
          }
        }
      },
      # EC2 Frontend - Disk
      {
        type   = "metric"
        x      = 16
        y      = 1
        width  = 8
        height = 6
        properties = {
          title  = "Frontend EC2 - Disk Utilization"
          region = var.region
          metrics = [
            ["CWAgent", "disk_used_percent", "InstanceId", var.frontend_instance_id, "path", "/"]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.disk_threshold
              }
            ]
          }
        }
      },
      # EC2 Backend - CPU
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "Backend EC2 - CPU Utilization"
          region = var.region
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", var.backend_instance_id]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.cpu_threshold
              }
            ]
          }
        }
      },
      # EC2 Backend - Memory
      {
        type   = "metric"
        x      = 8
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "Backend EC2 - Memory Utilization"
          region = var.region
          metrics = [
            ["CWAgent", "mem_used_percent", "InstanceId", var.backend_instance_id]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.memory_threshold
              }
            ]
          }
        }
      },
      # EC2 Backend - Disk
      {
        type   = "metric"
        x      = 16
        y      = 7
        width  = 8
        height = 6
        properties = {
          title  = "Backend EC2 - Disk Utilization"
          region = var.region
          metrics = [
            ["CWAgent", "disk_used_percent", "InstanceId", var.backend_instance_id, "path", "/"]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
          annotations = {
            horizontal = [
              {
                label = "Alarm Threshold"
                value = var.disk_threshold
              }
            ]
          }
        }
      },
      # RDS - CPU
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "RDS PostgreSQL - CPU Utilization"
          region = var.region
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_identifier]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      # RDS - Connections
      {
        type   = "metric"
        x      = 8
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "RDS PostgreSQL - Database Connections"
          region = var.region
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_identifier]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
        }
      },
      # RDS - Free Storage
      {
        type   = "metric"
        x      = 16
        y      = 13
        width  = 8
        height = 6
        properties = {
          title  = "RDS PostgreSQL - Free Storage Space"
          region = var.region
          metrics = [
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", var.rds_identifier]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
        }
      },
      # ElastiCache - CPU
      {
        type   = "metric"
        x      = 0
        y      = 19
        width  = 8
        height = 6
        properties = {
          title  = "ElastiCache Redis - CPU Utilization"
          region = var.region
          metrics = [
            ["AWS/ElastiCache", "CPUUtilization", "CacheClusterId", var.redis_identifier]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
          yAxis = {
            left = {
              min = 0
              max = 100
            }
          }
        }
      },
      # ElastiCache - Connections
      {
        type   = "metric"
        x      = 8
        y      = 19
        width  = 8
        height = 6
        properties = {
          title  = "ElastiCache Redis - Current Connections"
          region = var.region
          metrics = [
            ["AWS/ElastiCache", "CurrConnections", "CacheClusterId", var.redis_identifier]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
        }
      },
      # ElastiCache - Cache Hits/Misses
      {
        type   = "metric"
        x      = 16
        y      = 19
        width  = 8
        height = 6
        properties = {
          title  = "ElastiCache Redis - Cache Hits/Misses"
          region = var.region
          metrics = [
            ["AWS/ElastiCache", "CacheHits", "CacheClusterId", var.redis_identifier],
            ["AWS/ElastiCache", "CacheMisses", "CacheClusterId", var.redis_identifier]
          ]
          period    = 300
          stat      = "Sum"
          view      = "timeSeries"
        }
      },
      # ALB - Request Count
      {
        type   = "metric"
        x      = 0
        y      = 25
        width  = 8
        height = 6
        properties = {
          title  = "ALB - Request Count"
          region = var.region
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix]
          ]
          period    = 300
          stat      = "Sum"
          view      = "timeSeries"
        }
      },
      # ALB - Latency
      {
        type   = "metric"
        x      = 8
        y      = 25
        width  = 8
        height = 6
        properties = {
          title  = "ALB - Target Response Time"
          region = var.region
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.alb_arn_suffix]
          ]
          period    = 300
          stat      = "Average"
          view      = "timeSeries"
        }
      },
      # ALB - HTTP Codes
      {
        type   = "metric"
        x      = 16
        y      = 25
        width  = 8
        height = 6
        properties = {
          title  = "ALB - HTTP Response Codes"
          region = var.region
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_2XX_Count", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_ELB_4XX_Count", "LoadBalancer", var.alb_arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix]
          ]
          period    = 300
          stat      = "Sum"
          view      = "timeSeries"
        }
      }
    ]
  })
}

# CloudWatch Alarms - EC2 Frontend
resource "aws_cloudwatch_metric_alarm" "frontend_cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-frontend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = var.period
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "Frontend EC2 CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    InstanceId = var.frontend_instance_id
  }

  tags = var.additional_tags
}

resource "aws_cloudwatch_metric_alarm" "frontend_memory" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-frontend-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = var.period
  statistic           = "Average"
  threshold           = var.memory_threshold
  alarm_description   = "Frontend EC2 memory utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    InstanceId = var.frontend_instance_id
  }

  tags = var.additional_tags
}

resource "aws_cloudwatch_metric_alarm" "frontend_disk" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-frontend-disk-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  period              = var.period
  statistic           = "Average"
  threshold           = var.disk_threshold
  alarm_description   = "Frontend EC2 disk utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    InstanceId = var.frontend_instance_id
    path       = "/"
  }

  tags = var.additional_tags
}

# CloudWatch Alarms - EC2 Backend
resource "aws_cloudwatch_metric_alarm" "backend_cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-backend-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = var.period
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "Backend EC2 CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    InstanceId = var.backend_instance_id
  }

  tags = var.additional_tags
}

resource "aws_cloudwatch_metric_alarm" "backend_memory" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-backend-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = var.period
  statistic           = "Average"
  threshold           = var.memory_threshold
  alarm_description   = "Backend EC2 memory utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    InstanceId = var.backend_instance_id
  }

  tags = var.additional_tags
}

resource "aws_cloudwatch_metric_alarm" "backend_disk" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-backend-disk-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "disk_used_percent"
  namespace           = "CWAgent"
  period              = var.period
  statistic           = "Average"
  threshold           = var.disk_threshold
  alarm_description   = "Backend EC2 disk utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    InstanceId = var.backend_instance_id
    path       = "/"
  }

  tags = var.additional_tags
}

# CloudWatch Alarms - RDS
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = var.period
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "RDS CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = var.rds_identifier
  }

  tags = var.additional_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-rds-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = var.period
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS database connections are high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = var.rds_identifier
  }

  tags = var.additional_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = var.period
  statistic           = "Average"
  threshold           = 5 * 1024 * 1024 * 1024 # 5 GB in bytes
  alarm_description   = "RDS free storage space is low"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    DBInstanceIdentifier = var.rds_identifier
  }

  tags = var.additional_tags
}

# CloudWatch Alarms - ElastiCache
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = var.period
  statistic           = "Average"
  threshold           = var.cpu_threshold
  alarm_description   = "ElastiCache CPU utilization is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    CacheClusterId = var.redis_identifier
  }

  tags = var.additional_tags
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.project_name}-${var.environment}-redis-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.evaluation_periods
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = var.period
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "ElastiCache connections are high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    CacheClusterId = var.redis_identifier
  }

  tags = var.additional_tags
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/aws/spartan/staging/frontend"
  retention_in_days = 14

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-frontend-logs"
  })
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/aws/spartan/staging/backend"
  retention_in_days = 14

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-backend-logs"
  })
}

resource "aws_cloudwatch_log_group" "alb" {
  name              = "/aws/spartan/staging/alb"
  retention_in_days = 14

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-alb-logs"
  })
}
