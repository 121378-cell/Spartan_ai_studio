# AWS Infrastructure Architecture - Spartan Hub 2.0 Staging

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Environment:** Staging  
**AWS Region:** us-east-1 (N. Virginia)

---

## Executive Summary

This document describes the complete AWS infrastructure architecture for Spartan Hub 2.0 staging environment. The infrastructure is designed using Infrastructure as Code (IaC) with Terraform, following AWS best practices for security, cost optimization, and operational excellence.

### Key Characteristics

- **Environment:** Staging (pre-production)
- **Availability:** Single-region, multi-AZ capable
- **Cost Optimization:** Right-sized instances, single NAT gateway
- **Security:** Defense in depth with multiple security layers
- **Monitoring:** Comprehensive CloudWatch monitoring and alerting

---

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                      us-east-1 Region                        │
                                    │                                                               │
                                    │  ┌─────────────────────────────────────────────────────────┐ │
                                    │  │                    VPC: 10.0.0.0/16                     │ │
                                    │  │                                                           │ │
    Internet ──────► Internet       │  │  ┌─────────────────┐  ┌─────────────────┐               │ │
                    Gateway         │  │  │  Public Subnet  │  │  Public Subnet  │               │ │
                                    │  │  │  AZ-a           │  │  AZ-b           │               │ │
                                    │  │  │  10.0.1.0/24    │  │  10.0.2.0/24    │               │ │
                                    │  │  │                 │  │                 │               │ │
                                    │  │  │  ┌───────────┐  │  │  ┌───────────┐  │               │ │
                                    │  │  │  │    ALB    │  │  │  │    NAT    │  │               │ │
                                    │  │  │  │           │  │  │  │  Gateway  │  │               │ │
                                    │  │  │  └───────────┘  │  │  └───────────┘  │               │ │
                                    │  │  │                 │  │                 │               │ │
                                    │  │  └────────┬────────┘  └────────┬────────┘               │ │
                                    │  │           │                    │                        │ │
                                    │  │  ┌─────────────────────────────────────────┐            │ │
                                    │  │  │           Private Subnet AZ-a           │            │ │
                                    │  │  │              10.0.10.0/24               │            │ │
                                    │  │  │                                         │            │ │
                                    │  │  │  ┌─────────────┐  ┌─────────────┐      │            │ │
                                    │  │  │  │   EC2       │  │    RDS      │      │            │ │
                                    │  │  │  │  Frontend   │  │  PostgreSQL │      │            │ │
                                    │  │  │  │  (t3.medium)│  │ (db.t3.micro)│     │            │ │
                                    │  │  │  └─────────────┘  └─────────────┘      │            │ │
                                    │  │  │                                         │            │ │
                                    │  │  │  ┌─────────────┐  ┌─────────────┐      │            │ │
                                    │  │  │  │   EC2       │  │   ElastiCache│     │            │ │
                                    │  │  │  │  Backend    │  │    Redis    │      │            │ │
                                    │  │  │  │  (t3.medium)│  │(cache.t3.micro)│   │            │ │
                                    │  │  │  └─────────────┘  └─────────────┘      │            │ │
                                    │  │  │                                         │            │ │
                                    │  │  └─────────────────────────────────────────┘            │ │
                                    │  │                                                           │ │
                                    │  │  ┌─────────────────────────────────────────┐            │ │
                                    │  │  │           Private Subnet AZ-b           │            │ │
                                    │  │  │              10.0.11.0/24               │            │ │
                                    │  │  │         (Reserved for scaling)          │            │ │
                                    │  │  └─────────────────────────────────────────┘            │ │
                                    │  │                                                           │ │
                                    │  └─────────────────────────────────────────────────────────┘ │
                                    │                                                               │
                                    │  ┌─────────────────┐  ┌─────────────────┐                    │
                                    │  │   CloudWatch    │  │      ACM        │                    │
                                    │  │   Monitoring    │  │   SSL/TLS Cert  │                    │
                                    │  └─────────────────┘  └─────────────────┘                    │
                                    └─────────────────────────────────────────────────────────────┘
```

---

## VPC Design

### Network Configuration

| Component | CIDR Block | Description |
|-----------|------------|-------------|
| VPC | 10.0.0.0/16 | Main network (65,536 IPs) |
| Public Subnet AZ-a | 10.0.1.0/24 | ALB, NAT Gateway (256 IPs) |
| Public Subnet AZ-b | 10.0.2.0/24 | Reserved for HA (256 IPs) |
| Private Subnet AZ-a | 10.0.10.0/24 | Application resources (256 IPs) |
| Private Subnet AZ-b | 10.0.11.0/24 | Reserved for scaling (256 IPs) |

### Routing Strategy

**Public Subnets:**
- Route to Internet Gateway for outbound traffic
- Hosts ALB (inbound) and NAT Gateway (outbound for private subnets)

**Private Subnets:**
- Default route to NAT Gateway for outbound internet access
- Local routes for VPC-internal communication
- No direct internet access (security by design)

### Internet Connectivity

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Internet   │────►│  Internet Gateway │────►│ Public Subnet │
└──────────────┘     └──────────────────┘     └──────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │  NAT Gateway │
                                              └──────────────┘
                                                      │
                                                      ▼
                                              ┌──────────────┐
                                              │Private Subnet│
                                              └──────────────┘
```

---

## Compute Resources

### EC2 Instances

#### Frontend Server

| Property | Value |
|----------|-------|
| Instance Type | t3.medium |
| vCPUs | 2 |
| Memory | 4 GB |
| Storage | 30 GB GP3 |
| AMI | Amazon Linux 2023 |
| Placement | Private Subnet AZ-a |
| IAM Role | spartan-frontend-role |

**Purpose:** Serves the compiled frontend application (React/Vite build) via Nginx.

**User Data Script:**
- Install Nginx
- Configure SSL termination
- Deploy frontend build artifacts
- Configure health check endpoint

#### Backend Server

| Property | Value |
|----------|-------|
| Instance Type | t3.medium |
| vCPUs | 2 |
| Memory | 4 GB |
| Storage | 30 GB GP3 |
| AMI | Amazon Linux 2023 |
| Placement | Private Subnet AZ-a |
| IAM Role | spartan-backend-role |

**Purpose:** Runs the compiled backend API server (Node.js/Express).

**User Data Script:**
- Install Node.js 20.x
- Install PM2 for process management
- Deploy backend build artifacts
- Configure environment variables from SSM Parameter Store
- Run database migrations on startup

### Auto Scaling (Future Enhancement)

Current staging setup uses fixed instances. Production will implement:
- Auto Scaling Groups with min=2, max=6
- Target tracking on CPU (70%)
- Scheduled scaling for peak hours

---

## Database Architecture

### Amazon RDS PostgreSQL

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 15 |
| Instance Class | db.t3.micro |
| Storage | 20 GB GP2 |
| Multi-AZ | false (staging) |
| Backup Retention | 7 days |
| Maintenance Window | Sun 04:00-05:00 UTC |
| Placement | Private Subnet |

**Configuration Details:**
- **Parameter Group:** Custom with logging enabled
- **Option Group:** Default PostgreSQL
- **Security:** SSL required, IAM authentication enabled
- **Monitoring:** Enhanced monitoring (60s interval)

**Connection String Format:**
```
postgresql://${DB_USERNAME}:${DB_PASSWORD}@${RDS_ENDPOINT}:${DB_PORT}/${DB_NAME}
```

### Database Security

- Security group allows only EC2 backend security group
- Encryption at rest using AWS KMS
- Encryption in transit (SSL/TLS)
- Automated backups with point-in-time recovery
- No public access

---

## Cache Architecture

### Amazon ElastiCache Redis

| Property | Value |
|----------|-------|
| Engine | Redis 7.0 |
| Node Type | cache.t3.micro |
| Num Nodes | 1 (cluster mode disabled) |
| Placement | Private Subnet |
| Multi-AZ | false (staging) |

**Use Cases:**
- Session storage
- API response caching
- Rate limiting counters
- Real-time feature flags

**Configuration:**
- Automatic failover: disabled (staging)
- Snapshot retention: 1 day
- Maintenance window: Sun 05:00-06:00 UTC

---

## Load Balancer Configuration

### Application Load Balancer (ALB)

| Property | Value |
|----------|-------|
| Type | Application Load Balancer |
| Scheme | Internet-facing |
| Subnets | Public Subnet AZ-a, AZ-b |
| Security Groups | alb-sg |

### Listeners

| Listener | Port | Protocol | Action |
|----------|------|----------|--------|
| HTTP | 80 | HTTP | Redirect to HTTPS (301) |
| HTTPS | 443 | HTTPS | Forward to target groups |

### Target Groups

| Target Group | Port | Protocol | Health Check Path |
|--------------|------|----------|-------------------|
| frontend-tg | 80 | HTTP | /health |
| backend-tg | 3000 | HTTP | /api/health |

### SSL/TLS Configuration

- Certificate managed by AWS ACM
- Domain: staging.spartanhub.io (example)
- Minimum TLS version: 1.2
- Security policy: ELBSecurityPolicy-TLS13-1-2-2021-06

---

## Security Architecture

### Defense in Depth Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 7: Application                  │
│              (Input validation, auth, rate limiting)     │
├─────────────────────────────────────────────────────────┤
│                    Layer 6: Load Balancer                │
│              (SSL termination, WAF, DDoS protection)     │
├─────────────────────────────────────────────────────────┤
│                    Layer 5: Security Groups              │
│              (Stateful firewall rules)                   │
├─────────────────────────────────────────────────────────┤
│                    Layer 4: Network ACLs                 │
│              (Stateless subnet filtering)                │
├─────────────────────────────────────────────────────────┤
│                    Layer 3: VPC Isolation                │
│              (Private subnets, no public IPs)            │
├─────────────────────────────────────────────────────────┤
│                    Layer 2: IAM Roles                    │
│              (Least privilege access)                    │
├─────────────────────────────────────────────────────────┤
│                    Layer 1: Encryption                   │
│              (KMS, TLS, secrets management)              │
└─────────────────────────────────────────────────────────┘
```

### Security Groups

#### ALB Security Group (alb-sg)

| Direction | Protocol | Port | Source/Destination |
|-----------|----------|------|-------------------|
| Inbound | TCP | 80 | 0.0.0.0/0 |
| Inbound | TCP | 443 | 0.0.0.0/0 |
| Outbound | TCP | 80 | sg-frontend |
| Outbound | TCP | 3000 | sg-backend |

#### Frontend Security Group (sg-frontend)

| Direction | Protocol | Port | Source/Destination |
|-----------|----------|------|-------------------|
| Inbound | TCP | 80 | sg-alb |
| Outbound | TCP | 443 | sg-alb |
| Outbound | TCP | 3000 | sg-backend |
| Outbound | TCP | 5432 | sg-rds |
| Outbound | TCP | 6379 | sg-redis |

#### Backend Security Group (sg-backend)

| Direction | Protocol | Port | Source/Destination |
|-----------|----------|------|-------------------|
| Inbound | TCP | 3000 | sg-frontend, sg-alb |
| Outbound | TCP | 5432 | sg-rds |
| Outbound | TCP | 6379 | sg-redis |
| Outbound | TCP | 443 | 0.0.0.0/0 (AWS APIs) |

#### RDS Security Group (sg-rds)

| Direction | Protocol | Port | Source/Destination |
|-----------|----------|------|-------------------|
| Inbound | TCP | 5432 | sg-backend |
| Outbound | All | All | sg-backend |

#### Redis Security Group (sg-redis)

| Direction | Protocol | Port | Source/Destination |
|-----------|----------|------|-------------------|
| Inbound | TCP | 6379 | sg-backend |
| Outbound | All | All | sg-backend |

### IAM Roles and Policies

#### EC2 Instance Roles

**spartan-frontend-role:**
- S3 read access to deployment bucket
- SSM Parameter Store read (specific paths)
- CloudWatch Logs write
- X-Ray daemon access

**spartan-backend-role:**
- S3 read access to deployment bucket
- SSM Parameter Store read (specific paths)
- CloudWatch Logs write
- RDS connect (via IAM auth)
- ElastiCache connect
- X-Ray daemon access
- Secrets Manager read

#### Policy Documents

See `AWS_SECURITY.md` for complete IAM policy documents.

---

## Monitoring and Observability

### CloudWatch Metrics

**EC2 Metrics (collected every 5 minutes):**
- CPUUtilization
- NetworkIn/NetworkOut
- DiskReadOps/DiskWriteOps
- StatusCheckFailed

**RDS Metrics:**
- CPUUtilization
- FreeableMemory
- DatabaseConnections
- ReadLatency/WriteLatency
- FreeStorageSpace

**ElastiCache Metrics:**
- CPUUtilization
- CurrConnections
- CacheHits/CacheMisses
- Evictions

### CloudWatch Alarms

| Alarm Name | Metric | Threshold | Action |
|------------|--------|-----------|--------|
| frontend-cpu-high | CPUUtilization | >80% for 5min | SNS notification |
| frontend-memory-high | MemoryUtilization | >85% for 5min | SNS notification |
| frontend-disk-high | DiskSpaceUtilization | >80% for 5min | SNS notification |
| backend-cpu-high | CPUUtilization | >80% for 5min | SNS notification |
| backend-memory-high | MemoryUtilization | >85% for 5min | SNS notification |
| rds-cpu-high | CPUUtilization | >80% for 5min | SNS notification |
| rds-connections-high | DatabaseConnections | >80% max | SNS notification |
| rds-storage-low | FreeStorageSpace | <5GB | SNS notification |
| redis-connections-high | CurrConnections | >80% max | SNS notification |

### CloudWatch Dashboard

**Spartan Hub Staging Dashboard includes:**
- EC2 CPU/Memory/Disk utilization (both instances)
- RDS connections, CPU, storage
- ElastiCache connections, hit rate
- ALB request count, latency, HTTP codes
- System health status

### Logging Strategy

**Application Logs:**
- Frontend: Nginx access/error logs → CloudWatch Logs
- Backend: Application logs → CloudWatch Logs

**Log Retention:**
- Development/Staging: 14 days
- Production: 90 days

**Log Groups:**
- `/aws/spartan/staging/frontend`
- `/aws/spartan/staging/backend`
- `/aws/rds/instance/spartan-staging-db`

---

## High Availability and Disaster Recovery

### Current Staging HA Strategy

| Component | HA Configuration |
|-----------|-----------------|
| ALB | Multi-AZ (2 subnets) |
| EC2 | Single instance (cost optimization) |
| RDS | Single-AZ (staging) |
| ElastiCache | Single node (staging) |

### RTO/RPO Targets (Staging)

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 24 hours |

### Backup Strategy

| Resource | Backup Method | Frequency | Retention |
|----------|--------------|-----------|-----------|
| RDS | Automated snapshots | Daily | 7 days |
| RDS | Manual snapshot | Before deployments | 30 days |
| ElastiCache | Snapshot | Daily | 1 day |
| EC2 | AMI | Weekly | 4 weeks |
| S3 | Versioning | Continuous | Indefinite |

### Disaster Recovery Procedures

1. **EC2 Failure:**
   - Terraform recreates instance from latest AMI
   - User data script reconfigures application
   - Estimated recovery: 15 minutes

2. **RDS Failure:**
   - Restore from latest automated snapshot
   - Update connection strings in SSM Parameter Store
   - Estimated recovery: 30 minutes

3. **Complete Region Failure:**
   - Infrastructure as Code enables rapid redeployment
   - Restore RDS from cross-region snapshot (if configured)
   - Estimated recovery: 2 hours

---

## Cost Optimization

### Current Monthly Estimate (Staging)

| Service | Configuration | Monthly Cost (USD) |
|---------|--------------|-------------------|
| EC2 | 2x t3.medium | ~$60.80 |
| RDS | db.t3.micro | ~$12.41 |
| ElastiCache | cache.t3.micro | ~$13.14 |
| ALB | 1 ALB + LCU | ~$22.99 |
| NAT Gateway | 1 NAT | ~$32.85 |
| S3 | Storage + requests | ~$5.00 |
| CloudWatch | Logs + monitoring | ~$10.00 |
| Data Transfer | Estimated | ~$10.00 |
| **Total** | | **~$167.19** |

### Cost Optimization Strategies Applied

1. **Right-sized instances:** t3.medium for staging (not production size)
2. **Single NAT Gateway:** Shared across all private subnets
3. **No Multi-AZ for databases:** Staging doesn't require HA
4. **GP3 storage:** Better price/performance than GP2
5. **Reserved capacity:** Consider Reserved Instances for long-term staging

### Free Tier Considerations

Some services may qualify for AWS Free Tier:
- EC2: 750 hours/month of t2/t3.micro (12 months)
- RDS: 750 hours/month of db.t2/t3.micro (12 months)
- S3: 5GB standard storage (12 months)
- CloudWatch: 10 custom metrics, 10 alarms (always free)

---

## Tags and Resource Organization

### Mandatory Tags

All resources are tagged with:

| Tag Key | Value | Description |
|---------|-------|-------------|
| Project | spartan-hub | Project identifier |
| Environment | staging | Environment name |
| ManagedBy | terraform | Infrastructure management tool |
| Owner | platform-team | Responsible team |
| CostCenter | engineering | Cost allocation |

### Tag Propagation

Tags are automatically propagated to:
- EBS volumes attached to EC2
- RDS automated snapshots
- CloudWatch log groups
- Network interfaces

---

## Network Access Control

### Network ACLs (Default)

Using default NACLs with allow-all rules. For enhanced security, custom NACLs can be implemented:

**Public Subnet NACL:**
| Rule # | Type | Protocol | Port Range | Source/Dest | Allow/Deny |
|--------|------|----------|------------|-------------|------------|
| 100 | HTTP | TCP | 80 | 0.0.0.0/0 | ALLOW |
| 110 | HTTPS | TCP | 443 | 0.0.0.0/0 | ALLOW |
| 120 | Ephemeral | TCP | 1024-65535 | 0.0.0.0/0 | ALLOW |
| * | All | All | All | 0.0.0.0/0 | DENY |

**Private Subnet NACL:**
| Rule # | Type | Protocol | Port Range | Source/Dest | Allow/Deny |
|--------|------|----------|------------|-------------|------------|
| 100 | PostgreSQL | TCP | 5432 | 10.0.0.0/16 | ALLOW |
| 110 | Redis | TCP | 6379 | 10.0.0.0/16 | ALLOW |
| 120 | Ephemeral | TCP | 1024-65535 | 0.0.0.0/0 | ALLOW |
| * | All | All | All | 0.0.0.0/0 | DENY |

---

## Integration Points

### External Services

| Service | Integration | Purpose |
|---------|-------------|---------|
| GitHub | OIDC + Webhooks | CI/CD authentication |
| Slack | SNS → Slack webhook | Alert notifications |
| AWS ACM | Certificate management | SSL/TLS certificates |
| AWS SSM | Parameter Store | Configuration management |
| AWS Secrets Manager | Secrets storage | Database credentials |

### Internal Endpoints

| Service | Internal DNS | Port |
|---------|-------------|------|
| Frontend | frontend.staging.internal | 80 |
| Backend | backend.staging.internal | 3000 |
| RDS | spartan-staging-db.xxx.us-east-1.rds.amazonaws.com | 5432 |
| Redis | spartan-staging-redis.xxx.cache.amazonaws.com | 6379 |

---

## Compliance and Governance

### AWS Config Rules

The following Config rules are recommended for compliance monitoring:

1. **ec2-instance-managed-by-systems-manager** - EC2 instances managed by SSM
2. **rds-storage-encrypted** - RDS encryption at rest
3. **cloudwatch-log-group-encrypted** - CloudWatch Logs encryption
4. **alb-http-to-https-redirection-check** - HTTP to HTTPS redirect
5. **security-group-no-unrestricted-ingress** - No 0.0.0.0/0 on sensitive ports

### AWS CloudTrail

All API calls are logged to CloudTrail:
- Management events: Read/Write
- Data events: S3 object-level
- Log file validation: Enabled
- Log file encryption: Enabled (KMS)

---

## Future Enhancements

### Phase 1 (Post-Staging Validation)

- [ ] Enable RDS Multi-AZ
- [ ] Enable ElastiCache Multi-AZ
- [ ] Implement Auto Scaling for EC2
- [ ] Add WAF to ALB
- [ ] Enable GuardDuty

### Phase 2 (Production Readiness)

- [ ] Cross-region disaster recovery
- [ ] Blue/Green deployment pipeline
- [ ] Performance testing infrastructure
- [ ] Chaos engineering setup
- [ ] Cost anomaly detection

---

## Support and Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Platform Lead | platform-lead@spartanhub.io | Infrastructure decisions |
| DevOps Engineer | devops@spartanhub.io | Day-to-day operations |
| Security Team | security@spartanhub.io | Security reviews |
| On-Call | oncall@spartanhub.io | Incident response |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2026 | Infrastructure Team | Initial document |

---

## Appendix A: Terraform Module Reference

| Module | Path | Purpose |
|--------|------|---------|
| VPC | `infrastructure/terraform/modules/vpc` | Network infrastructure |
| EC2 | `infrastructure/terraform/modules/ec2` | Compute instances |
| RDS | `infrastructure/terraform/modules/rds` | PostgreSQL database |
| Redis | `infrastructure/terraform/modules/redis` | Redis cache cluster |
| ALB | `infrastructure/terraform/modules/alb` | Load balancer |
| CloudWatch | `infrastructure/terraform/modules/cloudwatch` | Monitoring |

## Appendix B: CIDR Block Summary

| Resource | CIDR | Available IPs | Usage |
|----------|------|---------------|-------|
| VPC | 10.0.0.0/16 | 65,536 | Total network |
| Public Subnet AZ-a | 10.0.1.0/24 | 256 | ALB, NAT |
| Public Subnet AZ-b | 10.0.2.0/24 | 256 | Reserved |
| Private Subnet AZ-a | 10.0.10.0/24 | 256 | EC2, RDS, Redis |
| Private Subnet AZ-b | 10.0.11.0/24 | 256 | Reserved |

## Appendix C: Port Reference

| Service | Port | Protocol | Direction |
|---------|------|----------|-----------|
| HTTP | 80 | TCP | Inbound (ALB) |
| HTTPS | 443 | TCP | Inbound (ALB) |
| Nginx | 80 | TCP | Internal (Frontend) |
| Backend API | 3000 | TCP | Internal |
| PostgreSQL | 5432 | TCP | Internal (RDS) |
| Redis | 6379 | TCP | Internal |
| SSH | 22 | TCP | SSM Session Manager |
