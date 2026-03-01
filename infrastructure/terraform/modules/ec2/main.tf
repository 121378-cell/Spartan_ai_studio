# =============================================================================
# EC2 Module - Main Configuration
# Spartan Hub 2.0 - Staging Environment
# =============================================================================

# EC2 Instance
resource "aws_instance" "main" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = var.security_group_ids
  iam_instance_profile   = var.iam_instance_profile

  # Root volume
  root_block_device {
    volume_type           = var.root_volume_type
    volume_size           = var.root_volume_size
    delete_on_termination = true
    encrypted             = var.enable_encryption
    tags = merge(var.additional_tags, {
      Name = "${var.project_name}-${var.environment}-${var.instance_name}-root"
    })
  }

  # Metadata options (IMDSv2)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  # Monitoring
  monitoring = var.enable_detailed_monitoring

  # User data
  user_data = var.user_data

  # Tags
  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-${var.instance_name}"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# EBS Volume for additional storage (optional)
resource "aws_ebs_volume" "additional" {
  count = var.additional_volume_size > 0 ? 1 : 0

  availability_zone = "${data.aws_region.current.name}${data.aws_availability_zones.available.names[0]}"
  size              = var.additional_volume_size
  type              = var.additional_volume_type
  encrypted         = var.enable_encryption

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-${var.instance_name}-data"
  })
}

# EBS Volume Attachment
resource "aws_volume_attachment" "additional" {
  count = var.additional_volume_size > 0 ? 1 : 0

  device_name = "/dev/sdh"
  volume_id   = aws_ebs_volume.additional[0].id
  instance_id = aws_instance.main.id
}

# CloudWatch Log Group for instance logs
resource "aws_cloudwatch_log_group" "instance" {
  count = var.enable_cloudwatch_logs ? 1 : 0

  name              = "/aws/spartan/${var.environment}/${var.instance_name}"
  retention_in_days = var.cloudwatch_logs_retention_days

  tags = merge(var.additional_tags, {
    Name = "${var.project_name}-${var.environment}-${var.instance_name}-logs"
  })
}

# SSM Association for managed instance configuration
resource "aws_ssm_association" "cloudwatch" {
  count = var.enable_ssm_agent_config ? 1 : 0

  name = "AmazonCloudWatch-ManageAgent"

  targets {
    key    = "InstanceIds"
    values = [aws_instance.main.id]
  }

  parameters = {
    mode = "overwrite"
  }
}

# Data sources for region and AZ
data "aws_region" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}
