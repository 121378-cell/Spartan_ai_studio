# =============================================================================
# Main Infrastructure Composition
# Spartan Hub 2.0 - Staging Environment
# =============================================================================
#
# This file orchestrates all infrastructure modules to create the complete
# AWS environment for Spartan Hub 2.0 staging.
#
# =============================================================================

# -----------------------------------------------------------------------------
# Data Sources
# -----------------------------------------------------------------------------

# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = [var.ec2_ami_owner]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

# Get current AWS region
data "aws_region" "current" {}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# -----------------------------------------------------------------------------
# VPC Module
# -----------------------------------------------------------------------------

module "vpc" {
  source = "./modules/vpc"

  # General
  project_name     = var.project_name
  environment      = var.environment
  vpc_cidr         = var.vpc_cidr
  availability_zones = var.availability_zones

  # Subnets
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  # NAT Gateway
  enable_nat_gateway = var.enable_nat_gateway
  single_nat_gateway = var.single_nat_gateway

  # Tags
  additional_tags = var.additional_tags
}

# -----------------------------------------------------------------------------
# Security Groups Module (inline with resources)
# -----------------------------------------------------------------------------

# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = module.vpc.vpc_id

  # HTTP from anywhere
  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS from anywhere
  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound traffic
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-sg"
  }
}

# Frontend EC2 Security Group
resource "aws_security_group" "frontend" {
  name        = "${var.project_name}-${var.environment}-frontend-sg"
  description = "Security group for Frontend EC2 instance"
  vpc_id      = module.vpc.vpc_id

  # HTTP from ALB
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # All outbound traffic
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-frontend-sg"
  }
}

# Backend EC2 Security Group
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-${var.environment}-backend-sg"
  description = "Security group for Backend EC2 instance"
  vpc_id      = module.vpc.vpc_id

  # API port from Frontend and ALB
  ingress {
    description     = "API from Frontend"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id, aws_security_group.alb.id]
  }

  # All outbound traffic
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-sg"
  }
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-${var.environment}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  # PostgreSQL from Backend
  ingress {
    description     = "PostgreSQL from Backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # All outbound traffic
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-rds-sg"
  }
}

# Redis Security Group
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for ElastiCache Redis"
  vpc_id      = module.vpc.vpc_id

  # Redis from Backend
  ingress {
    description     = "Redis from Backend"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-sg"
  }
}

# -----------------------------------------------------------------------------
# EC2 Module - Frontend
# -----------------------------------------------------------------------------

module "ec2_frontend" {
  source = "./modules/ec2"

  # General
  project_name    = var.project_name
  environment     = var.environment
  instance_name   = "frontend"
  instance_type   = var.frontend_instance_type
  ami_id          = var.ec2_ami_id != "" ? var.ec2_ami_id : data.aws_ami.amazon_linux_2023.id

  # Network
  subnet_id        = module.vpc.private_subnet_ids[0]
  vpc_id           = module.vpc.vpc_id
  security_group_ids = [aws_security_group.frontend.id]

  # Storage
  root_volume_size = var.ec2_root_volume_size
  root_volume_type = var.ec2_root_volume_type

  # IAM
  iam_instance_profile = aws_iam_instance_profile.frontend.name

  # Monitoring
  enable_detailed_monitoring = var.enable_ec2_detailed_monitoring

  # User data
  user_data = base64encode(<<-EOF
              #!/bin/bash
              set -e
              
              # Update system
              dnf update -y
              
              # Install Nginx
              dnf install -y nginx
              
              # Create application directory
              mkdir -p /var/www/spartan-hub
              
              # Create health check endpoint
              mkdir -p /usr/share/nginx/html
              echo "OK" > /usr/share/nginx/html/health
              
              # Configure Nginx
              cat > /etc/nginx/conf.d/spartan-hub.conf << 'NGINX_EOF'
              server {
                  listen 80;
                  server_name _;
                  root /var/www/spartan-hub;
                  index index.html;
              
                  location / {
                      try_files $uri $uri/ /index.html;
                  }
              
                  location /health {
                      access_log off;
                      return 200 "OK\n";
                      add_header Content-Type text/plain;
                  }
              
                  location /api {
                      proxy_pass http://localhost:3000;
                      proxy_http_version 1.1;
                      proxy_set_header Upgrade $http_upgrade;
                      proxy_set_header Connection 'upgrade';
                      proxy_set_header Host $host;
                      proxy_set_header X-Real-IP $remote_addr;
                      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                      proxy_set_header X-Forwarded-Proto $scheme;
                      proxy_cache_bypass $http_upgrade;
                  }
              }
              NGINX_EOF
              
              # Enable and start Nginx
              systemctl enable nginx
              systemctl start nginx
              
              # Configure log rotation
              cat > /etc/logrotate.d/nginx-spartan << 'LOGROTATE_EOF'
              /var/log/nginx/*.log {
                  daily
                  missingok
                  rotate 14
                  compress
                  delaycompress
                  notifempty
                  create 0640 nginx nginx
                  sharedscripts
                  postrotate
                      [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
                  endscript
              }
              LOGROTATE_EOF
              
              echo "Frontend setup completed at $(date)" >> /var/log/spartan-setup.log
              EOF
  )

  additional_tags = var.additional_tags
}

# -----------------------------------------------------------------------------
# EC2 Module - Backend
# -----------------------------------------------------------------------------

module "ec2_backend" {
  source = "./modules/ec2"

  # General
  project_name    = var.project_name
  environment     = var.environment
  instance_name   = "backend"
  instance_type   = var.backend_instance_type
  ami_id          = var.ec2_ami_id != "" ? var.ec2_ami_id : data.aws_ami.amazon_linux_2023.id

  # Network
  subnet_id        = module.vpc.private_subnet_ids[0]
  vpc_id           = module.vpc.vpc_id
  security_group_ids = [aws_security_group.backend.id]

  # Storage
  root_volume_size = var.ec2_root_volume_size
  root_volume_type = var.ec2_root_volume_type

  # IAM
  iam_instance_profile = aws_iam_instance_profile.backend.name

  # Monitoring
  enable_detailed_monitoring = var.enable_ec2_detailed_monitoring

  # User data
  user_data = base64encode(<<-EOF
              #!/bin/bash
              set -e
              
              # Update system
              dnf update -y
              
              # Install Node.js 20.x
              curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
              dnf install -y nodejs
              
              # Install PM2 globally
              npm install -g pm2
              
              # Create application directory
              mkdir -p /opt/spartan-hub
              cd /opt/spartan-hub
              
              # Create health check script
              cat > /opt/spartan-hub/health-check.sh << 'HEALTH_EOF'
              #!/bin/bash
              curl -f http://localhost:3000/api/health || exit 1
              HEALTH_EOF
              chmod +x /opt/spartan-hub/health-check.sh
              
              # Create PM2 ecosystem config
              cat > /opt/spartan-hub/ecosystem.config.js << 'PM2_EOF'
              module.exports = {
                apps: [{
                  name: 'spartan-backend',
                  script: './server.js',
                  instances: 2,
                  exec_mode: 'cluster',
                  env: {
                    NODE_ENV: 'staging',
                    PORT: 3000
                  },
                  error_file: '/var/log/spartan-hub/error.log',
                  out_file: '/var/log/spartan-hub/out.log',
                  log_file: '/var/log/spartan-hub/combined.log',
                  time: true
                }]
              };
              PM2_EOF
              
              # Create log directory
              mkdir -p /var/log/spartan-hub
              
              # Install CloudWatch agent for logs
              dnf install -y amazon-cloudwatch-agent
              
              # Configure CloudWatch agent
              cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CW_EOF'
              {
                "agent": {
                  "run_as_user": "root"
                },
                "logs": {
                  "logs_collected": {
                    "files": {
                      "collect_list": [
                        {
                          "file_path": "/var/log/spartan-hub/combined.log",
                          "log_group_name": "/aws/spartan/staging/backend",
                          "log_stream_name": "{instance_id}/application"
                        },
                        {
                          "file_path": "/var/log/spartan-hub/error.log",
                          "log_group_name": "/aws/spartan/staging/backend",
                          "log_stream_name": "{instance_id}/error"
                        }
                      ]
                    }
                  }
                }
              }
              CW_EOF
              
              # Start CloudWatch agent
              /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
              
              # Configure log rotation
              cat > /etc/logrotate.d/spartan-hub << 'LOGROTATE_EOF'
              /var/log/spartan-hub/*.log {
                  daily
                  missingok
                  rotate 14
                  compress
                  delaycompress
                  notifempty
                  create 0640 root root
                  postrotate
                      pm2 reload spartan-backend --silent || true
                  endscript
              }
              LOGROTATE_EOF
              
              echo "Backend setup completed at $(date)" >> /var/log/spartan-setup.log
              EOF
  )

  additional_tags = var.additional_tags
}

# -----------------------------------------------------------------------------
# RDS Module
# -----------------------------------------------------------------------------

module "rds" {
  source = "./modules/rds"

  # General
  project_name           = var.project_name
  environment            = var.environment
  identifier             = "${var.project_name}-${var.environment}-db"

  # Network
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnet_ids
  security_group_ids     = [aws_security_group.rds.id]

  # Database
  engine                 = "postgres"
  engine_version         = var.rds_engine_version
  instance_class         = var.rds_instance_class
  allocated_storage      = var.rds_allocated_storage
  storage_type           = var.rds_storage_type
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  multi_az               = var.rds_multi_az

  # Backup
  backup_retention_period = var.rds_backup_retention_period
  backup_window           = var.rds_backup_window
  maintenance_window      = var.rds_maintenance_window

  # Security
  skip_final_snapshot     = var.rds_skip_final_snapshot
  deletion_protection     = var.rds_deletion_protection
  enable_enhanced_monitoring = var.rds_enhanced_monitoring_interval > 0
  enhanced_monitoring_interval = var.rds_enhanced_monitoring_interval

  # Encryption
  enable_encryption = var.enable_encryption

  additional_tags = var.additional_tags
}

# -----------------------------------------------------------------------------
# ElastiCache Redis Module
# -----------------------------------------------------------------------------

module "redis" {
  source = "./modules/redis"

  # General
  project_name    = var.project_name
  environment     = var.environment
  identifier      = "${var.project_name}-${var.environment}-redis"

  # Network
  subnet_ids      = module.vpc.private_subnet_ids
  security_group_ids = [aws_security_group.redis.id]

  # Cache
  node_type       = var.redis_node_type
  engine_version  = var.redis_engine_version
  num_cache_nodes = var.redis_num_cache_nodes
  port            = var.redis_port

  # Backup
  snapshot_retention_limit = var.redis_snapshot_retention_limit
  maintenance_window       = var.redis_maintenance_window

  # HA
  multi_az_enabled = var.redis_multi_az_enabled

  additional_tags = var.additional_tags
}

# -----------------------------------------------------------------------------
# Application Load Balancer Module
# -----------------------------------------------------------------------------

module "alb" {
  source = "./modules/alb"

  # General
  project_name    = var.project_name
  environment     = var.environment
  name            = var.alb_name

  # Network
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnet_ids
  security_group_ids = [aws_security_group.alb.id]

  # ALB Configuration
  idle_timeout    = var.alb_idle_timeout
  drop_invalid_header_fields = var.alb_drop_invalid_header_fields

  # SSL
  ssl_certificate_arn = var.ssl_certificate_arn
  domain_name         = var.domain_name

  # Target Groups
  frontend_target_group = {
    name     = "${var.project_name}-${var.environment}-frontend-tg"
    port     = 80
    protocol = "HTTP"
    vpc_id   = module.vpc.vpc_id
  }

  backend_target_group = {
    name     = "${var.project_name}-${var.environment}-backend-tg"
    port     = 3000
    protocol = "HTTP"
    vpc_id   = module.vpc.vpc_id
  }

  # Health Checks
  frontend_health_check = {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  backend_health_check = {
    path                = "/api/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  # Instances
  frontend_instance_id = module.ec2_frontend.instance_id
  backend_instance_id  = module.ec2_backend.instance_id

  additional_tags = var.additional_tags
}

# -----------------------------------------------------------------------------
# CloudWatch Module
# -----------------------------------------------------------------------------

module "cloudwatch" {
  source = "./modules/cloudwatch"

  # General
  project_name    = var.project_name
  environment     = var.environment

  # Alarms
  enable_alarms   = var.enable_cloudwatch_alarms
  enable_dashboard = var.enable_cloudwatch_dashboard

  # Thresholds
  cpu_threshold    = var.cpu_alarm_threshold
  memory_threshold = var.memory_alarm_threshold
  disk_threshold   = var.disk_alarm_threshold

  # Alarm Configuration
  evaluation_periods = var.alarm_evaluation_periods
  period             = var.alarm_period

  # Resources
  frontend_instance_id = module.ec2_frontend.instance_id
  backend_instance_id  = module.ec2_backend.instance_id
  rds_identifier       = module.rds.db_instance_identifier
  redis_identifier     = module.redis.cluster_id
  alb_arn_suffix       = module.alb.alb_arn_suffix

  # Notifications
  sns_alarm_email = var.sns_alarm_email

  additional_tags = var.additional_tags
}

# -----------------------------------------------------------------------------
# IAM Roles and Instance Profiles
# -----------------------------------------------------------------------------

# Frontend IAM Role
resource "aws_iam_role" "frontend" {
  name = "${var.project_name}-${var.environment}-frontend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-frontend-role"
  }
}

# Frontend IAM Policy
resource "aws_iam_role_policy" "frontend" {
  name = "${var.project_name}-${var.environment}-frontend-policy"
  role = aws_iam_role.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/spartan/staging/frontend:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_prefix}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "SpartanHub"
          }
        }
      }
    ]
  })
}

# Frontend Instance Profile
resource "aws_iam_instance_profile" "frontend" {
  name = "${var.project_name}-${var.environment}-frontend-profile"
  role = aws_iam_role.frontend.name

  tags = {
    Name = "${var.project_name}-${var.environment}-frontend-profile"
  }
}

# Backend IAM Role
resource "aws_iam_role" "backend" {
  name = "${var.project_name}-${var.environment}-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-role"
  }
}

# Backend IAM Policy
resource "aws_iam_role_policy" "backend" {
  name = "${var.project_name}-${var.environment}-backend-policy"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/spartan/staging/backend:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_parameter_prefix}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:${var.project_name}/${var.environment}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "SpartanHub"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "elasticache:DescribeCacheClusters"
        ]
        Resource = "*"
      }
    ]
  })
}

# Backend Instance Profile
resource "aws_iam_instance_profile" "backend" {
  name = "${var.project_name}-${var.environment}-backend-profile"
  role = aws_iam_role.backend.name

  tags = {
    Name = "${var.project_name}-${var.environment}-backend-profile"
  }
}

# -----------------------------------------------------------------------------
# SSM Parameters
# -----------------------------------------------------------------------------

resource "aws_ssm_parameter" "db_host" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/database/host"
  type  = "String"
  value = module.rds.db_endpoint
  description = "RDS PostgreSQL endpoint"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-host"
  }
}

resource "aws_ssm_parameter" "db_port" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/database/port"
  type  = "String"
  value = module.rds.db_port
  description = "RDS PostgreSQL port"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-port"
  }
}

resource "aws_ssm_parameter" "db_name" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/database/name"
  type  = "String"
  value = var.db_name
  description = "RDS PostgreSQL database name"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-name"
  }
}

resource "aws_ssm_parameter" "db_username" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/database/username"
  type  = "SecureString"
  value = var.db_username
  description = "RDS PostgreSQL username"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-username"
  }
}

resource "aws_ssm_parameter" "db_password" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/database/password"
  type  = "SecureString"
  value = var.db_password
  description = "RDS PostgreSQL password"

  tags = {
    Name = "${var.project_name}-${var.environment}-db-password"
  }
}

resource "aws_ssm_parameter" "redis_host" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/redis/host"
  type  = "String"
  value = module.redis.primary_endpoint
  description = "ElastiCache Redis endpoint"

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-host"
  }
}

resource "aws_ssm_parameter" "redis_port" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/redis/port"
  type  = "String"
  value = tostring(var.redis_port)
  description = "ElastiCache Redis port"

  tags = {
    Name = "${var.project_name}-${var.environment}-redis-port"
  }
}

resource "aws_ssm_parameter" "environment" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/environment"
  type  = "String"
  value = var.environment
  description = "Environment name"

  tags = {
    Name = "${var.project_name}-${var.environment}-env"
  }
}

resource "aws_ssm_parameter" "alb_dns" {
  count = var.enable_ssm_parameters ? 1 : 0

  name  = "${var.ssm_parameter_prefix}/alb/dns_name"
  type  = "String"
  value = module.alb.alb_dns_name
  description = "ALB DNS name"

  tags = {
    Name = "${var.project_name}-${var.environment}-alb-dns"
  }
}

# -----------------------------------------------------------------------------
# SNS Topic for Alarms
# -----------------------------------------------------------------------------

resource "aws_sns_topic" "alarms" {
  count = var.enable_cloudwatch_alarms && var.sns_alarm_email != "" ? 1 : 0

  name = "${var.project_name}-${var.environment}-alarms"

  tags = {
    Name = "${var.project_name}-${var.environment}-alarms"
  }
}

resource "aws_sns_topic_subscription" "email" {
  count = var.enable_cloudwatch_alarms && var.sns_alarm_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.sns_alarm_email
}
