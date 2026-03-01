# =============================================================================
# Application Load Balancer Module - Main Configuration
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

# Application Load Balancer
resource "aws_lb" "main" {
  name               = var.name
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  # Enable HTTP/2
  enable_http2 = true

  # Idle timeout
  idle_timeout = var.idle_timeout

  # Drop invalid headers
  drop_invalid_header_fields = var.drop_invalid_header_fields

  # Desync mitigation
  desync_mitigation_mode = "defensive"

  # Tags
  tags = merge(var.additional_tags, {
    Name = var.name
  })
}

# Target Group - Frontend
resource "aws_lb_target_group" "frontend" {
  name     = var.frontend_target_group.name
  port     = var.frontend_target_group.port
  protocol = var.frontend_target_group.protocol
  vpc_id   = var.frontend_target_group.vpc_id

  # Health check
  health_check {
    enabled             = true
    path                = var.frontend_health_check.path
    protocol            = "HTTP"
    port                = "traffic-port"
    interval            = var.frontend_health_check.interval
    timeout             = var.frontend_health_check.timeout
    healthy_threshold   = var.frontend_health_check.healthy_threshold
    unhealthy_threshold = var.frontend_health_check.unhealthy_threshold
    matcher             = "200-399"
  }

  # Stickiness (disabled for frontend)
  stickiness {
    enabled = false
    type    = "lb_cookie"
  }

  tags = merge(var.additional_tags, {
    Name = var.frontend_target_group.name
  })
}

# Target Group - Backend
resource "aws_lb_target_group" "backend" {
  name     = var.backend_target_group.name
  port     = var.backend_target_group.port
  protocol = var.backend_target_group.protocol
  vpc_id   = var.backend_target_group.vpc_id

  # Health check
  health_check {
    enabled             = true
    path                = var.backend_health_check.path
    protocol            = "HTTP"
    port                = "traffic-port"
    interval            = var.backend_health_check.interval
    timeout             = var.backend_health_check.timeout
    healthy_threshold   = var.backend_health_check.healthy_threshold
    unhealthy_threshold = var.backend_health_check.unhealthy_threshold
    matcher             = "200-399"
  }

  # Stickiness (disabled for backend API)
  stickiness {
    enabled = false
    type    = "lb_cookie"
  }

  tags = merge(var.additional_tags, {
    Name = var.backend_target_group.name
  })
}

# Target Group Attachment - Frontend
resource "aws_lb_target_group_attachment" "frontend" {
  target_group_arn = aws_lb_target_group.frontend.arn
  target_id        = var.frontend_instance_id
  port             = var.frontend_target_group.port
}

# Target Group Attachment - Backend
resource "aws_lb_target_group_attachment" "backend" {
  target_group_arn = aws_lb_target_group.backend.arn
  target_id        = var.backend_instance_id
  port             = var.backend_target_group.port
}

# HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Listener Rule - API routes to backend
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Listener Rule - Health check
resource "aws_lb_listener_rule" "health" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 99

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  condition {
    path_pattern {
      values = ["/health"]
    }
  }
}

# CloudWatch Alarm for ALB 5XX Errors
resource "aws_cloudwatch_metric_alarm" "http_5xx" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name}-http-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.http_5xx_alarm_threshold
  alarm_description   = "ALB is returning 5XX errors"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(var.additional_tags, {
    Name = "${var.name}-http-5xx-alarm"
  })
}

# CloudWatch Alarm for ALB Target 5XX Errors
resource "aws_cloudwatch_metric_alarm" "target_5xx" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name}-target-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = var.alarm_period
  statistic           = "Sum"
  threshold           = var.target_5xx_alarm_threshold
  alarm_description   = "Target is returning 5XX errors"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(var.additional_tags, {
    Name = "${var.name}-target-5xx-alarm"
  })
}

# CloudWatch Alarm for ALB Latency
resource "aws_cloudwatch_metric_alarm" "latency" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.latency_alarm_threshold
  alarm_description   = "ALB target response time is high"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = merge(var.additional_tags, {
    Name = "${var.name}-latency-alarm"
  })
}

# CloudWatch Alarm for Unhealthy Hosts
resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  count = var.enable_alarms ? 1 : 0

  alarm_name          = "${var.name}-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = var.alarm_evaluation_periods
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = var.alarm_period
  statistic           = "Average"
  threshold           = var.unhealthy_hosts_alarm_threshold
  alarm_description   = "ALB has unhealthy targets"
  alarm_actions       = var.alarm_actions
  ok_actions          = var.alarm_actions

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.frontend.arn_suffix
  }

  tags = merge(var.additional_tags, {
    Name = "${var.name}-unhealthy-hosts-alarm"
  })
}
