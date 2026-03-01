# AWS Security Documentation - Spartan Hub 2.0 Staging

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Environment:** Staging  
**Classification:** Internal

---

## Executive Summary

This document outlines the security architecture, configurations, and best practices implemented for the Spartan Hub 2.0 staging environment on AWS. The security design follows the AWS Well-Architected Framework security pillar and implements defense-in-depth principles.

---

## Security Architecture Overview

### Defense in Depth Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Layer 7: Application                      │
│    • Input validation    • Authentication    • Authorization    │
│    • Rate limiting       • Session management • Audit logging   │
├─────────────────────────────────────────────────────────────────┤
│                        Layer 6: Load Balancer                    │
│    • SSL/TLS termination  • WAF rules    • DDoS protection      │
│    • HTTP to HTTPS redirect    • Security headers              │
├─────────────────────────────────────────────────────────────────┤
│                        Layer 5: Security Groups                  │
│    • Stateful firewall rules    • Least privilege access        │
│    • Service isolation    • Port restrictions                   │
├─────────────────────────────────────────────────────────────────┤
│                        Layer 4: Network ACLs                     │
│    • Stateless subnet filtering    • IP-based rules            │
├─────────────────────────────────────────────────────────────────┤
│                        Layer 3: VPC Isolation                    │
│    • Private subnets    • No public IPs    • VPC Flow Logs     │
├─────────────────────────────────────────────────────────────────┤
│                        Layer 2: IAM & Identity                   │
│    • Least privilege    • Role-based access    • MFA           │
│    • Temporary credentials    • No long-term keys on EC2       │
├─────────────────────────────────────────────────────────────────┤
│                        Layer 1: Encryption                       │
│    • Data at rest (KMS)    • Data in transit (TLS)            │
│    • Secrets management    • Certificate management            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Identity and Access Management (IAM)

### IAM Roles

#### Frontend EC2 Role

**Role Name:** `spartan-hub-staging-frontend-role`

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Attached Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/spartan/staging/frontend:*"
    },
    {
      "Sid": "SSMParameters",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/spartan-hub/staging/*"
    },
    {
      "Sid": "XRay",
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "SpartanHub"
        }
      }
    }
  ]
}
```

#### Backend EC2 Role

**Role Name:** `spartan-hub-staging-backend-role`

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Attached Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/spartan/staging/backend:*"
    },
    {
      "Sid": "SSMParameters",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/spartan-hub/staging/*"
    },
    {
      "Sid": "SecretsManager",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:spartan-hub/staging/*"
    },
    {
      "Sid": "XRay",
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudWatchMetrics",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "SpartanHub"
        }
      }
    },
    {
      "Sid": "ElastiCacheDescribe",
      "Effect": "Allow",
      "Action": [
        "elasticache:DescribeCacheClusters"
      ],
      "Resource": "*"
    }
  ]
}
```

### GitHub Actions OIDC Role

**Role Name:** `spartan-hub-github-actions-role`

**Trust Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:ORGANIZATION/spartan-hub:*"
        }
      }
    }
  ]
}
```

**Attached Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TerraformState",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::spartan-hub-terraform-state-staging",
        "arn:aws:s3:::spartan-hub-terraform-state-staging/*"
      ]
    },
    {
      "Sid": "DynamoDBLocking",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/spartan-hub-terraform-locks-staging"
    },
    {
      "Sid": "EC2Deployment",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ssm:SendCommand",
        "ssm:GetCommandInvocation"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3Deployment",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::spartan-hub-deployments-staging",
        "arn:aws:s3:::spartan-hub-deployments-staging/*"
      ]
    },
    {
      "Sid": "SSMParameters",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/spartan-hub/staging/*"
    },
    {
      "Sid": "ELBv2",
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeTargetGroups",
        "elasticloadbalancing:DescribeTargetHealth"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Network Security

### Security Groups

#### ALB Security Group

| Direction | Protocol | Port | Source/Destination | Description |
|-----------|----------|------|-------------------|-------------|
| Inbound | TCP | 80 | 0.0.0.0/0 | HTTP from internet |
| Inbound | TCP | 443 | 0.0.0.0/0 | HTTPS from internet |
| Outbound | TCP | 80 | sg-frontend | HTTP to frontend |
| Outbound | TCP | 3000 | sg-backend | API to backend |

#### Frontend Security Group

| Direction | Protocol | Port | Source/Destination | Description |
|-----------|----------|------|-------------------|-------------|
| Inbound | TCP | 80 | sg-alb | HTTP from ALB |
| Outbound | TCP | 443 | 0.0.0.0/0 | HTTPS for updates |
| Outbound | TCP | 3000 | sg-backend | API calls to backend |
| Outbound | TCP | 5432 | sg-rds | Database queries |
| Outbound | TCP | 6379 | sg-redis | Cache access |

#### Backend Security Group

| Direction | Protocol | Port | Source/Destination | Description |
|-----------|----------|------|-------------------|-------------|
| Inbound | TCP | 3000 | sg-frontend, sg-alb | API from frontend/ALB |
| Outbound | TCP | 5432 | sg-rds | Database connections |
| Outbound | TCP | 6379 | sg-redis | Cache connections |
| Outbound | TCP | 443 | 0.0.0.0/0 | AWS API calls |

#### RDS Security Group

| Direction | Protocol | Port | Source/Destination | Description |
|-----------|----------|------|-------------------|-------------|
| Inbound | TCP | 5432 | sg-backend | PostgreSQL from backend |
| Outbound | All | All | sg-backend | Response traffic |

#### Redis Security Group

| Direction | Protocol | Port | Source/Destination | Description |
|-----------|----------|------|-------------------|-------------|
| Inbound | TCP | 6379 | sg-backend | Redis from backend |

### Network ACLs

Default NACLs are used. For enhanced security, consider implementing custom NACLs:

**Public Subnet NACL:**
| Rule # | Type | Protocol | Port | Source | Allow/Deny |
|--------|------|----------|------|--------|------------|
| 100 | HTTP | TCP | 80 | 0.0.0.0/0 | ALLOW |
| 110 | HTTPS | TCP | 443 | 0.0.0.0/0 | ALLOW |
| 120 | Ephemeral | TCP | 1024-65535 | 0.0.0.0/0 | ALLOW |
| * | All | All | All | 0.0.0.0/0 | DENY |

**Private Subnet NACL:**
| Rule # | Type | Protocol | Port | Source | Allow/Deny |
|--------|------|----------|------|--------|------------|
| 100 | PostgreSQL | TCP | 5432 | 10.0.0.0/16 | ALLOW |
| 110 | Redis | TCP | 6379 | 10.0.0.0/16 | ALLOW |
| 120 | Ephemeral | TCP | 1024-65535 | 0.0.0.0/0 | ALLOW |
| * | All | All | All | 0.0.0.0/0 | DENY |

### VPC Flow Logs

VPC Flow Logs are configured to capture all network traffic for security analysis and troubleshooting.

- **Destination:** CloudWatch Logs
- **Traffic Type:** ALL
- **Retention:** 14 days
- **Log Group:** `/aws/vpc/spartan-hub-staging-flow-logs`

---

## Data Protection

### Encryption at Rest

| Resource | Encryption | Key Type |
|----------|------------|----------|
| EBS Volumes | Enabled | AWS Managed Key |
| RDS Storage | Enabled | AWS Managed Key |
| ElastiCache | Enabled (Redis AUTH) | Token-based |
| S3 Buckets | Enabled | AES-256 |
| CloudWatch Logs | Enabled | AWS Managed Key |

### Encryption in Transit

| Connection | Protocol | TLS Version |
|------------|----------|-------------|
| Client → ALB | HTTPS | TLS 1.2+ |
| ALB → EC2 | HTTP (internal) | N/A |
| EC2 → RDS | PostgreSQL SSL | TLS 1.2+ |
| EC2 → Redis | Redis Protocol | AUTH token |
| EC2 → AWS APIs | HTTPS | TLS 1.2+ |

### SSL/TLS Configuration

**ALB Security Policy:** `ELBSecurityPolicy-TLS13-1-2-2021-06`

**Supported Protocols:**
- TLS 1.3
- TLS 1.2

**Cipher Suites:**
- TLS_AES_128_GCM_SHA256
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- ECDHE-ECDSA-AES_128_GCM_SHA256
- ECDHE-RSA-AES_128_GCM_SHA256

---

## Secrets Management

### SSM Parameter Store

Parameters are stored with the following hierarchy:

```
/spartan-hub/staging/
├── database/
│   ├── host (String)
│   ├── port (String)
│   ├── name (String)
│   ├── username (SecureString)
│   └── password (SecureString)
├── redis/
│   ├── host (String)
│   └── port (String)
├── environment (String)
└── alb/
    └── dns_name (String)
```

### Secrets Manager (Optional)

For enhanced security, consider migrating to AWS Secrets Manager:

- Automatic rotation support
- Fine-grained access control
- Cross-region replication
- Integration with RDS

### Access Control

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/spartan-hub/staging/*"
    }
  ]
}
```

---

## Access Management

### SSH Access

SSH access is **disabled** for security. Use AWS Systems Manager Session Manager instead:

```bash
# Connect to frontend instance
aws ssm start-session --target i-xxxxxxxxxxxxxxxxx

# Connect to backend instance
aws ssm start-session --target i-yyyyyyyyyyyyyyyyy
```

### Session Manager Requirements

1. SSM Agent installed on EC2 instances (Amazon Linux 2023 includes it)
2. IAM instance profile with `AmazonSSMManagedInstanceCore` policy
3. Outbound HTTPS (443) access to SSM endpoints

### Console Access

- Root account: MFA enabled, access keys removed
- IAM users: MFA required for console access
- Programmatic access: Use IAM roles, not access keys

---

## Monitoring and Logging

### CloudWatch Logs

| Log Group | Retention | Purpose |
|-----------|-----------|---------|
| /aws/spartan/staging/frontend | 14 days | Nginx access/error logs |
| /aws/spartan/staging/backend | 14 days | Application logs |
| /aws/spartan/staging/alb | 14 days | ALB access logs |
| /aws/vpc/spartan-hub-staging-flow-logs | 14 days | VPC Flow Logs |

### CloudWatch Alarms

| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| frontend-cpu-high | CPUUtilization | >80% | SNS notification |
| frontend-memory-high | mem_used_percent | >85% | SNS notification |
| frontend-disk-high | disk_used_percent | >80% | SNS notification |
| backend-cpu-high | CPUUtilization | >80% | SNS notification |
| backend-memory-high | mem_used_percent | >85% | SNS notification |
| rds-cpu-high | CPUUtilization | >80% | SNS notification |
| rds-connections-high | DatabaseConnections | >80 | SNS notification |
| redis-cpu-high | CPUUtilization | >80% | SNS notification |
| redis-connections-high | CurrConnections | >1000 | SNS notification |

### AWS CloudTrail

All API activity is logged:

- **Management Events:** Read/Write
- **Data Events:** S3 object-level
- **Log File Validation:** Enabled
- **Encryption:** Enabled (KMS)
- **Retention:** 90 days

---

## Compliance Checklist

### AWS Foundational Security Best Practices

| Control | Status | Notes |
|---------|--------|-------|
| IAM policies should not allow full administrative privileges | ✅ | Least privilege implemented |
| IAM root user access key should not exist | ✅ | Root keys removed |
| MFA should be enabled for IAM users | ✅ | MFA required |
| Security groups should not allow unrestricted ingress | ✅ | Restricted to specific sources |
| EBS volumes should be encrypted | ✅ | Encryption enabled |
| RDS instances should have encryption enabled | ✅ | Encryption enabled |
| S3 buckets should have server-side encryption | ✅ | AES-256 enabled |
| VPC Flow Logs should be enabled | ⚠️ | Optional for staging |

### CIS AWS Foundations Benchmark

| Control | Status | Notes |
|---------|--------|-------|
| 1.1 - Maintain current contact details | ✅ | Account contacts updated |
| 1.2 - Ensure security contact information is registered | ✅ | Security contact registered |
| 1.3 - Ensure security questions are registered | ✅ | Security questions set |
| 1.4 - Ensure no root account access key exists | ✅ | Root keys removed |
| 1.5 - Ensure MFA is enabled for root account | ✅ | Root MFA enabled |
| 1.6 - Ensure hardware MFA for root account | ⚠️ | Virtual MFA (upgrade recommended) |
| 1.7 - Eliminate root account usage | ✅ | Root not used for operations |
| 1.8 - Ensure IAM password policy requires minimum length | ✅ | 14 characters minimum |
| 1.9 - Ensure IAM password policy prevents reuse | ✅ | 24 passwords remembered |
| 1.10 - Ensure multi-factor authentication for console access | ✅ | MFA required |
| 1.11 - Do not setup access keys during initial user setup | ✅ | No access keys for users |
| 1.12 - Ensure credentials unused for 45 days are disabled | ✅ | Credential report monitored |
| 1.13 - Ensure only one active access key per user | ✅ | Single key policy |
| 1.14 - Ensure access keys are rotated every 90 days | ✅ | Key rotation policy |
| 1.15 - Ensure IAM users receive permissions only through groups | ✅ | Group-based permissions |
| 1.16 - Ensure IAM policies with admin privileges are not attached | ✅ | No admin policies |
| 1.17 - Ensure a support role has been created | ✅ | Support role exists |
| 1.18 - Ensure IAM instance roles are used for EC2 | ✅ | Instance roles used |
| 1.19 - Ensure all S3 buckets encrypt objects | ✅ | Default encryption enabled |
| 1.20 - Ensure CloudTrail is enabled in all regions | ✅ | Multi-region trail |
| 1.21 - Ensure CloudTrail log file validation is enabled | ✅ | Validation enabled |
| 1.22 - Ensure CloudTrail S3 bucket is not publicly accessible | ✅ | Bucket policy restricts access |
| 1.23 - Ensure CloudTrail S3 bucket has server-side encryption | ✅ | SSE enabled |
| 2.1.1 - Ensure EBS volume encryption is enabled | ✅ | Encryption enabled |
| 2.1.2 - Ensure RDS instances have encryption enabled | ✅ | Encryption enabled |
| 2.1.3 - Ensure EFS is encrypted | N/A | EFS not used |
| 2.2.1 - Ensure VPC flow logging is enabled | ⚠️ | Optional for staging |
| 2.3.1 - Ensure GuardDuty is enabled | ⚠️ | Recommended for production |
| 2.3.2 - Ensure GuardDuty findings are resolved | ⚠️ | GuardDuty not enabled |
| 3.1 - Ensure CloudWatch alarms exist for metric filters | ✅ | Alarms configured |
| 4.1 - Ensure no security groups allow ingress from 0.0.0.0/0 to port 22 | ✅ | SSH disabled |
| 4.2 - Ensure no security groups allow ingress from 0.0.0.0/0 to port 3389 | ✅ | RDP not used |
| 4.3 - Ensure VPC default security group is restrictive | ⚠️ | Default SG allows internal |
| 4.4 - Ensure routing tables for VPCs have restricted routes | ✅ | Proper routing configured |

---

## Security Best Practices

### EC2 Security

1. **Use Amazon Linux 2023** - Latest security patches included
2. **IMDSv2 Required** - Prevent SSRF attacks
3. **No SSH Keys** - Use Session Manager instead
4. **Minimal Packages** - Only install required software
5. **Regular Updates** - Automated patching via SSM

### RDS Security

1. **No Public Access** - Private subnet only
2. **SSL Required** - Enforce encrypted connections
3. **IAM Authentication** - Consider for production
4. **Automated Backups** - 7-day retention
5. **Security Groups** - Restrict to backend only

### Application Security

1. **Input Validation** - Validate all user input
2. **Output Encoding** - Prevent XSS attacks
3. **Parameterized Queries** - Prevent SQL injection
4. **Rate Limiting** - Prevent abuse
5. **Security Headers** - CSP, HSTS, X-Frame-Options

---

## Incident Response

### Security Incident Procedures

1. **Detection**
   - CloudWatch alarms trigger
   - GuardDuty findings (production)
   - Application logs indicate anomaly

2. **Containment**
   - Isolate affected instance via security group
   - Preserve evidence (snapshots, logs)
   - Document timeline

3. **Investigation**
   - Review CloudTrail logs
   - Analyze VPC Flow Logs
   - Check application logs

4. **Recovery**
   - Restore from known good state
   - Apply security patches
   - Update security controls

5. **Lessons Learned**
   - Document incident
   - Update runbooks
   - Implement preventive measures

### Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| Security Team | security@spartanhub.io | 24/7 |
| Platform Team | platform-team@spartanhub.io | Business hours |
| On-Call | oncall@spartanhub.io | 24/7 |

---

## Security Testing

### Recommended Tests

1. **Vulnerability Scanning**
   - Run AWS Inspector (production)
   - Regular dependency scanning
   - Container image scanning

2. **Penetration Testing**
   - Annual third-party pentest
   - Pre-production security review
   - AWS notification required

3. **Security Configuration Review**
   - Quarterly IAM policy review
   - Security group audit
   - Encryption verification

### AWS Security Tools

| Tool | Purpose | Status |
|------|---------|--------|
| AWS GuardDuty | Threat detection | ⚠️ Recommended |
| AWS Inspector | Vulnerability scanning | ⚠️ Recommended |
| AWS Security Hub | Security posture | ⚠️ Recommended |
| AWS Config | Configuration compliance | ⚠️ Recommended |
| AWS WAF | Web application firewall | ⚠️ Optional |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2026 | Security Team | Initial document |

---

## Appendix: Security Group Terraform Reference

```hcl
# ALB Security Group
resource "aws_security_group" "alb" {
  name        = "spartan-hub-staging-alb-sg"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Frontend Security Group
resource "aws_security_group" "frontend" {
  name        = "spartan-hub-staging-frontend-sg"
  description = "Security group for Frontend"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Backend Security Group
resource "aws_security_group" "backend" {
  name        = "spartan-hub-staging-backend-sg"
  description = "Security group for Backend"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "API from Frontend/ALB"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.frontend.id, aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```
