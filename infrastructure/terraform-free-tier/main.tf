# Spartan Hub 2.0 - Free Tier Infrastructure
# Optimized for AWS Free Tier (12 months free + always free)

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "spartan-hub-terraform-state"
    key    = "free-tier/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Project     = "Spartan Hub 2.0"
      Environment = "staging"
      ManagedBy   = "terraform"
      FreeTier    = "true"
    }
  }
}

# Use default VPC (free)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "availability-zone"
    values = ["us-east-1a"]
  }
}

# EC2 t2.micro (750 hours/month free)
resource "aws_instance" "staging" {
  ami                    = "ami-0c55b159cbfafe1f0" # Amazon Linux 2023
  instance_type          = "t2.micro"  # Free tier eligible
  subnet_id              = data.aws_subnets.public.ids[0]
  vpc_security_group_ids = [aws_security_group.staging.id]
  key_name              = var.key_name != "" ? var.key_name : null
  
  root_block_device {
    volume_type = "gp2"
    volume_size = 8  # 8GB free tier
    encrypted   = true
  }
  
  # Auto-stop nights and weekends (save 70%)
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y nodejs npm nginx
              npm install -g pm2
              systemctl enable nginx
              systemctl start nginx
              EOF
  
  tags = {
    Name = "spartan-hub-staging"
  }
  
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
}

# RDS t2.micro (750 hours/month free)
resource "aws_db_instance" "staging" {
  identifier = "spartan-hub-staging"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t2.micro"  # Free tier eligible
  
  allocated_storage     = 20  # 20GB free tier
  max_allocated_storage = 20  # Prevent auto-scaling costs
  storage_type          = "gp2"
  
  db_name  = "spartan_hub_staging"
  username = "spartan_staging"
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.staging.name
  
  backup_retention_period = 7  # 7 days free
  multi_az               = false  # Not free
  
  publicly_accessible = false
  storage_encrypted   = true
  
  # Stop instance nights/weekends (save 70%)
  # Use AWS Instance Scheduler or Lambda
  
  tags = {
    Name = "spartan-hub-staging-db"
  }
}

# ElastiCache t2.micro (750 hours/month free)
resource "aws_elasticache_cluster" "staging" {
  cluster_id           = "spartan-hub-staging-redis"
  engine              = "redis"
  node_type           = "cache.t2.micro"  # Free tier eligible
  num_cache_nodes     = 1
  parameter_group_name = "default.redis7"
  port                = 6379
  
  security_group_ids = [aws_security_group.redis.id]
  subnet_group_name  = aws_elasticache_subnet_group.staging.name
  
  tags = {
    Name = "spartan-hub-staging-redis"
  }
}

# ACM SSL Certificate (free)
resource "aws_acm_certificate" "staging" {
  domain_name       = "staging.spartan-hub.com"
  validation_method = "DNS"
  
  subject_alternative_names = [
    "*.staging.spartan-hub.com"
  ]
  
  lifecycle {
    create_before_destroy = true
  }
}

# Security Groups
resource "aws_security_group" "staging" {
  name        = "spartan-hub-staging"
  description = "Security group for Spartan Hub staging (Free Tier)"
  vpc_id      = data.aws_vpc.default.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Restrict to your IP in production
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "spartan-hub-staging-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "spartan-hub-staging-rds"
  description = "Security group for RDS (Free Tier)"
  vpc_id      = data.aws_vpc.default.id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.staging.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "spartan-hub-staging-rds-sg"
  }
}

resource "aws_security_group" "redis" {
  name        = "spartan-hub-staging-redis"
  description = "Security group for Redis (Free Tier)"
  vpc_id      = data.aws_vpc.default.id
  
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.staging.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "spartan-hub-staging-redis-sg"
  }
}

# Subnet Groups
resource "aws_db_subnet_group" "staging" {
  name       = "spartan-hub-staging"
  subnet_ids = data.aws_subnets.public.ids
  
  tags = {
    Name = "spartan-hub-staging-db-subnet"
  }
}

resource "aws_elasticache_subnet_group" "staging" {
  name       = "spartan-hub-staging"
  subnet_ids = data.aws_subnets.public.ids
}

# CloudWatch Alarms (Free tier: 10 metrics)
resource "aws_cloudwatch_metric_alarm" "ec2_cpu" {
  alarm_name          = "spartan-hub-staging-ec2-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "EC2 CPU utilization > 80%"
  
  dimensions = {
    InstanceId = aws_instance.staging.id
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "spartan-hub-staging-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "RDS CPU utilization > 80%"
  
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.staging.id
  }
}

# SNS Topic for Alerts (Free: 1000 emails/month)
resource "aws_sns_topic" "alerts" {
  name = "spartan-hub-staging-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# Budget Alert (Free)
resource "aws_budgets_budget" "staging" {
  name              = "spartan-hub-staging-budget"
  budget_type       = "COST"
  limit_amount      = "5"  # Alert at $5
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.alert_email]
  }
}

# Outputs
output "ec2_public_ip" {
  description = "Public IP of EC2 instance"
  value       = aws_instance.staging.public_ip
}

output "ec2_public_dns" {
  description = "Public DNS of EC2 instance"
  value       = aws_instance.staging.public_dns
}

output "rds_endpoint" {
  description = "RDS connection endpoint"
  value       = aws_db_instance.staging.endpoint
}

output "redis_endpoint" {
  description = "Redis connection endpoint"
  value       = "${aws_elasticache_cluster.staging.cache_nodes[0].address}:${aws_elasticache_cluster.staging.port}"
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost (Free Tier)"
  value       = "$2-5/month (domain + data transfer)"
}
