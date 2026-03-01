# AWS Infrastructure Architecture
## Spartan Hub 2.0 - Staging Environment

**Document Version:** 1.0  
**Last Updated:** March 1, 2026  
**Environment:** Staging  
**Region:** us-east-1 (N. Virginia)

---

## Executive Summary

This document describes the complete AWS infrastructure architecture for deploying Spartan Hub 2.0 to the staging environment. The architecture follows AWS Well-Architected Framework principles, focusing on operational excellence, security, reliability, performance efficiency, and cost optimization.

---

## 1. Architecture Overview

### 1.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AWS us-east-1 (N. Virginia)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐          ┌──────────────────┐                     │
│  │   Route 53       │─────────▶│   ACM Certificate │                     │
│  │   (DNS Service)  │          │   (SSL/TLS)       │                     │
│  │   staging.       │          │   staging.        │                     │
│  │   spartan-hub.com│          │   spartan-hub.com │                     │
│  └──────────────────┘          └─────────┬────────┘                     │
│                                          │                               │
│                                          ▼                               │
│                              ┌───────────────────────┐                  │
│                              │  Application Load      │                  │
│                              │  Balancer (ALB)        │                  │
│                              │  - Port 80 (HTTP)      │                  │
│                              │  - Port 443 (HTTPS)    │                  │
│                              │  - Public Subnets      │                  │
│                              └───────────┬───────────┘                  │
│                                          │                               │
│         ┌────────────────────────────────┼────────────────────────┐     │
│         │                                │                        │     │
│         ▼                                ▼                        ▼     │
│  ┌─────────────────┐           ┌─────────────────┐                 │     │
│  │  Public Subnet  │           │  Public Subnet  │                 │     │
│  │  us-east-1a     │           │  us-east-1b     │                 │     │
│  │  10.0.1.0/24    │           │  10.0.2.0/24    │                 │     │
│  └────────┬────────┘           └────────┬────────┘                 │     │
│           │                             │                           │     │
│           ▼                             ▼                           │     │
│  ┌─────────────────────────────────────────────────┐               │     │
│  │              NAT Gateway                        │               │     │
│  │              (Single for cost optimization)     │               │     │
│  └─────────────────────────────────────────────────┘               │     │
│                                          │                           │     │
│         ┌────────────────────────────────┼────────────────────────┐   │     │
│         │                                │                        │   │     │
│         ▼                                ▼                        ▼   │     │
│  ┌─────────────────┐           ┌─────────────────┐                │   │     │
│  │  Private Subnet │           │  Private Subnet │                │   │     │
│  │  us-east-1a     │           │  us-east-1b     │                │   │     │
│  │  10.0.10.0/24   │           │  10.0.20.0/24   │                │   │     │
│  └────────┬────────┘           └────────┬────────┘                │   │     │
│           │                             │                          │   │     │
│           │         ┌───────────────────┴───────────────────┐      │   │     │
│           │         │                                       │      │   │     │
│           ▼         ▼                                       ▼      │   │     │
│  ┌─────────────────────┐                         ┌───────────────────┐ │
│  │   EC2 Instances     │                         │   EC2 Instances   │ │
│  │   (Application)     │                         │   (Application)   │ │
│  │                     │                         │                   │ │
│  │  ┌───────────────┐  │                         │  ┌─────────────┐  │ │
│  │  │   Frontend    │  │                         │  │   Backend   │  │ │
│  │  │   Nginx       │  │                         │  │   Node.js   │  │ │
│  │  │   Port 80     │  │                         │  │   Port 3001 │  │ │
│  │  │   t3.medium   │  │                         │  │   t3.medium │  │ │
│  │  └───────────────┘  │                         │  └─────────────┘  │ │
│  └──────────┬──────────┘                         └─────────┬─────────┘ │
│             │                                              │           │
│             └──────────────────┬───────────────────────────┘           │
│                                │                                       │
│              ┌─────────────────┴─────────────────┐                    │
│              │                                   │                    │
│              ▼                                   ▼                    │
│     ┌─────────────────┐               ┌─────────────────┐            │
│     │  RDS PostgreSQL │               │  ElastiCache    │            │
│     │  (Primary DB)   │               │  Redis          │            │
│     │                 │               │  (Cache/Session)│            │
│     │  db.t3.micro    │               │  cache.t3.micro │            │
│     │  Port 5432      │               │  Port 6379      │            │
│     │  Private Subnet │               │  Private Subnet │            │
│     │  Multi-AZ       │               │  Single Node    │            │
│     └─────────────────┘               └─────────────────┘            │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                     CloudWatch                                  │   │
│  │  - Metrics Collection    - Alarms & Notifications              │   │
│  │  - Log Aggregation       - Custom Dashboards                   │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐       │
│  │   CloudTrail    │  │   AWS Config    │  │   Secrets       │       │
│  │   (Audit Logs)  │  │   (Compliance)  │  │   Manager       │       │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Summary

| Component | Service | Instance Type | Purpose |
|-----------|---------|---------------|---------|
| Frontend Server | EC2 | t3.medium | Nginx web server, React SPA |
| Backend Server | EC2 | t3.medium | Node.js API server |
| Database | RDS PostgreSQL | db.t3.micro | Primary data store |
| Cache | ElastiCache Redis | cache.t3.micro | Session storage, caching |
| Load Balancer | ALB | N/A | Traffic distribution, SSL termination |
| DNS | Route 53 | N/A | Domain management |
| Monitoring | CloudWatch | N/A | Metrics, logs, alarms |

---

## 2. VPC Configuration

### 2.1 Network Design

```
VPC: spartan-hub-staging-vpc
CIDR: 10.0.0.0/16
Region: us-east-1
```

### 2.2 Subnet Layout

| Subnet Name | CIDR Block | AZ | Type | Purpose |
|-------------|------------|-----|------|---------|
| public-subnet-1a | 10.0.1.0/24 | us-east-1a | Public | ALB, NAT Gateway |
| public-subnet-1b | 10.0.2.0/24 | us-east-1b | Public | ALB (HA) |
| private-app-1a | 10.0.10.0/24 | us-east-1a | Private | EC2 instances |
| private-app-1b | 10.0.20.0/24 | us-east-1b | Private | EC2 instances (HA) |
| private-db-1a | 10.0.30.0/24 | us-east-1a | Private | RDS, ElastiCache |
| private-db-1b | 10.0.40.0/24 | us-east-1b | Private | RDS standby |

### 2.3 Route Tables

**Public Route Table:**
```
Destination        Target
─────────────────────────────────
10.0.0.0/16        local
0.0.0.0/0          Internet Gateway (igw-xxxxxxxx)
```

**Private Route Table:**
```
Destination        Target
─────────────────────────────────
10.0.0.0/16        local
0.0.0.0/0          NAT Gateway (nat-xxxxxxxx)
```

### 2.4 Internet Gateway

- **Name:** spartan-hub-staging-igw
- **Purpose:** Provide internet access to public subnets
- **Attached to:** spartan-hub-staging-vpc

### 2.5 NAT Gateway

- **Name:** spartan-hub-staging-nat
- **Type:** Single NAT Gateway (cost-optimized for staging)
- **Placement:** public-subnet-1a
- **Purpose:** Allow private instances to access internet for updates

---

## 3. Compute Resources (EC2)

### 3.1 Instance Configuration

#### Frontend EC2 Instance

| Property | Value |
|----------|-------|
| Instance Type | t3.medium |
| AMI | Amazon Linux 2023 |
| vCPUs | 2 |
| Memory | 4 GB |
| Storage | 20 GB GP3 EBS |
| Network | Up to 5 Gbps |
| Security Group | sg-frontend-staging |

#### Backend EC2 Instance

| Property | Value |
|----------|-------|
| Instance Type | t3.medium |
| AMI | Amazon Linux 2023 |
| vCPUs | 2 |
| Memory | 4 GB |
| Storage | 20 GB GP3 EBS |
| Network | Up to 5 Gbps |
| Security Group | sg-backend-staging |

### 3.2 IAM Role

**Role Name:** spartan-hub-ec2-role-staging

**Attached Policies:**
- `AmazonSSMManagedInstanceCore` - SSM Session Manager access
- `CloudWatchAgentServerPolicy` - CloudWatch agent permissions
- `SecretsManagerReadWrite` - Access to secrets (scoped)

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

### 3.3 User Data Scripts

#### Frontend User Data
```bash
#!/bin/bash
yum update -y
yum install -y nginx

# Install Node.js for build tools
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Configure nginx
cat > /etc/nginx/conf.d/spartan-hub.conf << 'EOF'
server {
    listen 80;
    server_name staging.spartan-hub.com;
    root /var/www/spartan-hub;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

systemctl enable nginx
systemctl start nginx
```

#### Backend User Data
```bash
#!/bin/bash
yum update -y

# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Install PM2
npm install -g pm2

# Create app user
useradd -r -s /bin/false spartan-app
mkdir -p /var/www/spartan-hub
chown spartan-app:spartan-app /var/www/spartan-hub
```

---

## 4. Database (RDS PostgreSQL)

### 4.1 Configuration

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 15 |
| Instance Class | db.t3.micro |
| Storage | 20 GB GP2 |
| Multi-AZ | No (staging) |
| Auto Minor Version Upgrade | Yes |
| Backup Retention | 7 days |
| Backup Window | 03:00-04:00 UTC |
| Maintenance Window | Sun 04:00-05:00 UTC |

### 4.2 Network

- **Subnet Group:** spartan-hub-staging-db-subnet-group
- **VPC Security Group:** sg-rds-staging
- **Port:** 5432
- **Publicly Accessible:** No

### 4.3 Parameters

```
max_connections: 100
shared_buffers: 128MB
effective_cache_size: 384MB
work_mem: 4MB
maintenance_work_mem: 16MB
```

### 4.4 Credentials

- **Master Username:** spartan_staging (stored in Secrets Manager)
- **Database Name:** spartan_hub_staging
- **Password:** Managed by AWS Secrets Manager

---

## 5. Cache (ElastiCache Redis)

### 5.1 Configuration

| Property | Value |
|----------|-------|
| Engine | Redis 7.0 |
| Node Type | cache.t3.micro |
| Num Nodes | 1 |
| Port | 6379 |
| Multi-AZ | No (staging) |

### 5.2 Network

- **Subnet Group:** spartan-hub-staging-redis-subnet-group
- **Security Group:** sg-redis-staging
- **Publicly Accessible:** No

### 5.3 Parameters

```
maxmemory: 400mb
maxmemory-policy: allkeys-lru
timeout: 300
tcp-keepalive: 60
```

---

## 6. Application Load Balancer

### 6.1 Configuration

| Property | Value |
|----------|-------|
| Type | Application Load Balancer |
| Scheme | Internet-facing |
| IP Address Type | IPv4 |
| Security Groups | sg-alb-staging |

### 6.2 Listeners

| Listener | Port | Protocol | Action |
|----------|------|----------|--------|
| HTTP | 80 | HTTP | Redirect to HTTPS (443) |
| HTTPS | 443 | HTTPS | Forward to target group |

### 6.3 Target Groups

#### Frontend Target Group
- **Name:** tg-frontend-staging
- **Protocol:** HTTP
- **Port:** 80
- **Health Check Path:** /
- **Health Check Interval:** 30 seconds
- **Healthy Threshold:** 2
- **Unhealthy Threshold:** 3

#### Backend Target Group
- **Name:** tg-backend-staging
- **Protocol:** HTTP
- **Port:** 3001
- **Health Check Path:** /api/health
- **Health Check Interval:** 30 seconds
- **Healthy Threshold:** 2
- **Unhealthy Threshold:** 3

### 6.4 SSL/TLS Certificate

- **Provider:** AWS Certificate Manager (ACM)
- **Domain:** staging.spartan-hub.com
- **SAN:** *.staging.spartan-hub.com
- **Validation:** DNS (Route 53)

---

## 7. Security Configuration

### 7.1 Security Groups

#### ALB Security Group (sg-alb-staging)

| Type | Protocol | Port Range | Source |
|------|----------|------------|--------|
| Inbound | TCP | 80 | 0.0.0.0/0 |
| Inbound | TCP | 443 | 0.0.0.0/0 |
| Outbound | All | All | 10.0.0.0/16 |

#### Frontend Security Group (sg-frontend-staging)

| Type | Protocol | Port Range | Source |
|------|----------|------------|--------|
| Inbound | TCP | 80 | sg-alb-staging |
| Inbound | TCP | 22 | 10.0.0.0/16 (bastion/SSM) |
| Outbound | All | All | 10.0.0.0/16 |

#### Backend Security Group (sg-backend-staging)

| Type | Protocol | Port Range | Source |
|------|----------|------------|--------|
| Inbound | TCP | 3001 | sg-frontend-staging |
| Inbound | TCP | 3001 | sg-alb-staging |
| Inbound | TCP | 22 | 10.0.0.0/16 (bastion/SSM) |
| Outbound | All | All | 10.0.0.0/16 |

#### RDS Security Group (sg-rds-staging)

| Type | Protocol | Port Range | Source |
|------|----------|------------|--------|
| Inbound | TCP | 5432 | sg-backend-staging |
| Outbound | All | All | 10.0.0.0/16 |

#### Redis Security Group (sg-redis-staging)

| Type | Protocol | Port Range | Source |
|------|----------|------------|--------|
| Inbound | TCP | 6379 | sg-backend-staging |
| Outbound | All | All | 10.0.0.0/16 |

### 7.2 Network ACLs

Default NACLs are used for staging environment. Production should implement custom NACLs.

### 7.3 Encryption

| Resource | Encryption | Key Management |
|----------|------------|----------------|
| EBS Volumes | AES-256 | AWS Managed Keys |
| RDS Storage | AES-256 | AWS Managed Keys |
| RDS Backups | AES-256 | AWS Managed Keys |
| ElastiCache | In-transit TLS | AWS Managed Certificates |
| ALB | TLS 1.2+ | ACM Certificates |
| S3 | AES-256 | AWS Managed Keys |

---

## 8. DNS Configuration (Route 53)

### 8.1 Hosted Zone

- **Domain:** spartan-hub.com
- **Type:** Public
- **Region:** Global

### 8.2 DNS Records

| Record | Type | Value | TTL |
|--------|------|-------|-----|
| staging.spartan-hub.com | A | Alias to ALB | 60 |
| staging-api.spartan-hub.com | CNAME | staging.spartan-hub.com | 60 |
| _[validation].staging.spartan-hub.com | CNAME | ACM validation | 60 |

---

## 9. Monitoring & Logging

### 9.1 CloudWatch Metrics

| Resource | Metrics |
|----------|---------|
| EC2 | CPUUtilization, NetworkIn, NetworkOut, StatusCheckFailed |
| RDS | CPUUtilization, FreeStorageSpace, DatabaseConnections, ReadLatency |
| ElastiCache | CPUUtilization, CurrConnections, Evictions, CacheHits |
| ALB | RequestCount, TargetResponseTime, HTTPCode_Target_5XX_Count |

### 9.2 CloudWatch Alarms

| Alarm | Metric | Threshold | Action |
|-------|--------|-----------|--------|
| HighCPU-EC2 | CPUUtilization > 80% | 5 minutes | SNS Notification |
| LowStorage-RDS | FreeStorageSpace < 5GB | 5 minutes | SNS Notification |
| HighConnections-RDS | DatabaseConnections > 80 | 5 minutes | SNS Notification |
| HighErrorRate-ALB | HTTPCode_Target_5XX_Count > 10 | 5 minutes | SNS Notification |
| EC2StatusCheck | StatusCheckFailed > 0 | 5 minutes | SNS Notification |

### 9.3 Log Aggregation

| Source | Log Group | Retention |
|--------|-----------|-----------|
| Frontend EC2 | /aws/ec2/spartan-frontend-staging | 30 days |
| Backend EC2 | /aws/ec2/spartan-backend-staging | 30 days |
| RDS | /aws/rds/spartan-hub-staging | 30 days |
| ALB | /aws/elb/spartan-hub-staging-alb | 30 days |

### 9.4 CloudWatch Dashboard

**Dashboard Name:** spartan-hub-staging-overview

**Widgets:**
1. EC2 CPU Utilization (both instances)
2. RDS CPU and Connections
3. ElastiCache Hits/Evictions
4. ALB Request Count and Latency
5. Health Check Status
6. Disk Usage

---

## 10. High Availability & Disaster Recovery

### 10.1 High Availability

| Component | HA Strategy |
|-----------|-------------|
| ALB | Multi-AZ (2 subnets) |
| EC2 | Auto Recovery via CloudWatch |
| RDS | Multi-AZ option available |
| Redis | Single node (staging) |
| VPC | Multi-AZ subnets |

### 10.2 Backup Strategy

| Resource | Backup Method | Retention | RPO | RTO |
|----------|---------------|-----------|-----|-----|
| RDS | Automated Snapshots | 7 days | 24 hours | 1 hour |
| EC2 | AMI (weekly) | 4 weeks | 1 week | 2 hours |
| S3 | Versioning + Lifecycle | Indefinite | N/A | N/A |

### 10.3 Recovery Procedures

**EC2 Instance Failure:**
1. CloudWatch alarm triggers
2. SNS notification sent
3. Auto Recovery replaces instance
4. User data reconfigures instance
5. ALB health check passes

**RDS Failure:**
1. Automated failover (if Multi-AZ)
2. Restore from snapshot
3. Update connection strings
4. Verify application connectivity

---

## 11. Cost Optimization

### 11.1 Current Configuration Cost

| Service | Monthly Cost |
|---------|-------------|
| EC2 (2x t3.medium) | $60.48 |
| RDS (db.t3.micro) | $15.33 |
| ElastiCache (cache.t3.micro) | $15.33 |
| ALB | $16.79 |
| NAT Gateway | $34.74 |
| CloudWatch | $10.00 |
| Data Transfer | $10.00 (estimated) |
| **Total** | **~$162.67/month** |

### 11.2 Optimization Recommendations

1. **Use Spot Instances** for non-critical workloads (save up to 70%)
2. **Reserved Instances** for long-term staging (save up to 40%)
3. **Single NAT Gateway** (already implemented for staging)
4. **Right-size instances** based on actual usage
5. **S3 Intelligent Tiering** for infrequently accessed data
6. **CloudWatch Logs retention** policies (already set to 30 days)

---

## 12. Tags & Resource Organization

### 12.1 Standard Tags

All resources are tagged with:

| Tag Key | Value |
|---------|-------|
| Project | Spartan Hub 2.0 |
| Environment | staging |
| ManagedBy | terraform |
| Owner | [Team Name] |
| CostCenter | [Cost Center] |

### 12.2 Resource Naming Convention

```
spartan-hub-{component}-{environment}-{region}
```

Examples:
- `spartan-hub-vpc-staging-us-east-1`
- `spartan-hub-ec2-frontend-staging`
- `spartan-hub-rds-staging`

---

## 13. Access Management

### 13.1 IAM Users

| User/Role | Permissions | Purpose |
|-----------|-------------|---------|
| spartan-hub-deployer | EC2, S3, ECS, ECR | CI/CD deployments |
| spartan-hub-developer | Read-only + SSM | Development access |
| spartan-hub-admin | Full access | Infrastructure management |

### 13.2 EC2 Access

- **Method:** AWS Systems Manager Session Manager (no SSH keys)
- **Policy:** AmazonSSMManagedInstanceCore
- **Audit:** CloudTrail logs all sessions

### 13.3 Database Access

- **Method:** IAM Database Authentication (recommended)
- **Alternative:** Secrets Manager credentials
- **Audit:** RDS Audit Logs to CloudWatch

---

## 14. Deployment Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CI/CD Pipeline                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │  Code   │───▶│  Build  │───▶│  Test   │───▶│ Deploy  │     │
│  │  Commit │    │  &      │    │  (104   │    │  to     │     │
│  │  (Git)  │    │  Package│    │  tests) │    │  Staging│     │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘     │
│                                                  │              │
│                                                  ▼              │
│                                        ┌─────────────────┐     │
│                                        │  Terraform      │     │
│                                        │  Apply          │     │
│                                        └────────┬────────┘     │
│                                                 │              │
│                    ┌────────────────────────────┼──────┐       │
│                    │                            │      │       │
│                    ▼                            ▼      ▼       │
│           ┌─────────────────┐         ┌─────────────────┐     │
│           │  Frontend EC2   │         │  Backend EC2    │     │
│           │  - Nginx        │         │  - Node.js      │     │
│           │  - React SPA    │         │  - Express API  │     │
│           └─────────────────┘         └─────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15. Troubleshooting Guide

### 15.1 Common Issues

| Issue | Possible Cause | Resolution |
|-------|----------------|------------|
| 502 Bad Gateway | Backend not responding | Check backend EC2 status, PM2 process |
| Connection Timeout | Security Group misconfiguration | Verify SG rules for ports 80, 3001, 5432, 6379 |
| Database Connection Failed | RDS not accessible | Check RDS SG, subnet group, credentials |
| High Latency | Resource exhaustion | Check CloudWatch metrics, scale if needed |

### 15.2 Diagnostic Commands

```bash
# Check EC2 status
aws ec2 describe-instance-status --instance-ids i-xxxxxxxx

# Check RDS status
aws rds describe-db-instances --db-instance-identifier spartan-hub-staging

# Check ALB health
aws elbv2 describe-target-health --target-group-arn arn:aws:...

# Connect via SSM
aws ssm start-session --target i-xxxxxxxx
```

---

## 16. Appendix

### 16.1 AWS Service Limits

| Service | Default Limit | Current Usage |
|---------|---------------|---------------|
| EC2 Instances | 20 per region | 2 |
| RDS Instances | 40 per region | 1 |
| ElastiCache Clusters | 20 per region | 1 |
| ALBs | 50 per region | 1 |
| NAT Gateways | 5 per AZ | 1 |

### 16.2 Reference Architecture

This architecture is based on:
- AWS Well-Architected Framework
- AWS Three-Tier Web Application Architecture
- AWS Startup Architecture

### 16.3 Related Documentation

- [AWS_COST_ESTIMATION.md](./AWS_COST_ESTIMATION.md)
- [AWS_SECURITY_CONFIG.md](./AWS_SECURITY_CONFIG.md)
- [AWS_MONITORING_SETUP.md](./AWS_MONITORING_SETUP.md)
- [infrastructure/terraform/](./infrastructure/terraform/)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 1, 2026 | Infrastructure Team | Initial release |
