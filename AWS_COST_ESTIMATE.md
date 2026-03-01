# AWS Cost Estimate - Spartan Hub 2.0 Staging

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Region:** us-east-1 (N. Virginia)  
**Currency:** USD

---

## Executive Summary

This document provides a detailed cost estimate for the Spartan Hub 2.0 staging environment on AWS. The estimates are based on current AWS pricing as of March 2026 and assume 24/7 operation.

### Monthly Cost Summary

| Category | Monthly Cost |
|----------|-------------|
| Compute (EC2) | $60.80 |
| Database (RDS) | $12.41 |
| Cache (ElastiCache) | $13.14 |
| Load Balancer (ALB) | $22.99 |
| Networking (NAT, Data Transfer) | $42.85 |
| Storage (S3, EBS) | $12.60 |
| Monitoring (CloudWatch) | $10.00 |
| **Total Estimated Monthly Cost** | **$174.79** |

---

## Detailed Cost Breakdown

### 1. Compute - Amazon EC2

| Resource | Configuration | Quantity | Unit Price | Monthly Cost |
|----------|--------------|----------|------------|--------------|
| Frontend Instance | t3.medium | 1 | $0.0416/hour | $30.37 |
| Backend Instance | t3.medium | 1 | $0.0416/hour | $30.37 |
| Root Volumes (GP3) | 30 GB each | 2 | $0.08/GB-month | $4.80 |
| **EC2 Subtotal** | | | | **$65.54** |

**Instance Specifications:**
- **t3.medium:** 2 vCPUs, 4 GB RAM
- Includes CPU credits for burstable performance
- On-Demand pricing (consider Savings Plans for long-term)

**Cost Optimization Opportunities:**
- Use t3.micro or t3.small for development/testing
- Consider Spot instances for non-critical workloads (up to 70% savings)
- Implement auto-scaling to reduce instances during off-hours

---

### 2. Database - Amazon RDS PostgreSQL

| Resource | Configuration | Quantity | Unit Price | Monthly Cost |
|----------|--------------|----------|------------|--------------|
| DB Instance | db.t3.micro | 1 | $0.017/hour | $12.41 |
| Storage (GP2) | 20 GB | 1 | $0.10/GB-month | $2.00 |
| **RDS Subtotal** | | | | **$14.41** |

**Instance Specifications:**
- **db.t3.micro:** 1 vCPU, 1 GB RAM
- PostgreSQL 15.x
- Single-AZ (staging configuration)

**Cost Optimization Opportunities:**
- Use RDS Free Tier (750 hours/month of db.t2/t3.micro for 12 months)
- Reduce storage to minimum required
- Consider Aurora Serverless for variable workloads

---

### 3. Cache - Amazon ElastiCache Redis

| Resource | Configuration | Quantity | Unit Price | Monthly Cost |
|----------|--------------|----------|------------|--------------|
| Cache Node | cache.t3.micro | 1 | $0.018/hour | $13.14 |
| **ElastiCache Subtotal** | | | | **$13.14** |

**Instance Specifications:**
- **cache.t3.micro:** 1 vCPU, 0.53 GB available
- Redis 7.0
- Single node (staging configuration)

**Cost Optimization Opportunities:**
- Use cache.t2.micro if available in region
- Consider ElastiCache Serverless for variable workloads
- Evaluate if Redis is needed for staging (could use in-memory)

---

### 4. Load Balancer - Application Load Balancer

| Resource | Configuration | Quantity | Unit Price | Monthly Cost |
|----------|--------------|----------|------------|--------------|
| ALB | Application LB | 1 | $0.0225/hour | $16.43 |
| LCU | Load Balancer Capacity Units | ~20 | $0.008/LCU-hour | $1.15 |
| **ALB Subtotal** | | | | **$17.58** |

**LCU Breakdown (estimated):**
- New connections: 25/second = 1 LCU
- Active connections: 1,000 = 1 LCU
- Processed bytes: 50 GB/month = ~0.1 LCU
- Rule evaluations: 10,000/second = 1 LCU

**Cost Optimization Opportunities:**
- Use Network Load Balancer for TCP traffic (cheaper)
- Consolidate services to reduce LCU usage
- Consider CloudFront for static content (reduces ALB load)

---

### 5. Networking

| Resource | Configuration | Quantity | Unit Price | Monthly Cost |
|----------|--------------|----------|------------|--------------|
| NAT Gateway | 1 NAT GW | 1 | $0.045/hour | $32.85 |
| Data Processing | 10 GB processed | 1 | $0.045/GB | $0.45 |
| Data Transfer Out | 10 GB to internet | 1 | $0.09/GB | $0.90 |
| **Networking Subtotal** | | | | **$34.20** |

**Cost Optimization Opportunities:**
- Use single NAT Gateway (already implemented)
- Consider NAT Instances for very low traffic (manual management)
- Use VPC Endpoints for AWS services (reduces NAT traffic)
- Implement CloudFront to reduce data transfer costs

---

### 6. Storage

| Resource | Configuration | Quantity | Unit Price | Monthly Cost |
|----------|--------------|----------|------------|--------------|
| S3 Standard | Deployment artifacts | 5 GB | $0.023/GB-month | $0.12 |
| S3 Requests | GET/PUT requests | 10,000 | $0.0004/1K | $0.004 |
| EBS Snapshots | Weekly snapshots | 4 x 30 GB | $0.05/GB-month | $6.00 |
| RDS Snapshots | Daily automated | 7 x 20 GB | $0.05/GB-month | $7.00 |
| **Storage Subtotal** | | | | **$13.12** |

**Cost Optimization Opportunities:**
- Use S3 Intelligent-Tiering for infrequently accessed data
- Reduce snapshot retention period
- Use lifecycle policies to move old snapshots to Glacier

---

### 7. Monitoring - Amazon CloudWatch

| Resource | Configuration | Quantity | Unit Price | Monthly Cost |
|----------|--------------|----------|------------|--------------|
| Custom Metrics | 10 metrics | 10 | $0.30/metric-month | $3.00 |
| Alarms | 15 alarms | 15 | $0.10/alarm-month | $1.50 |
| Dashboard | 1 dashboard | 1 | $3.00/dashboard | $3.00 |
| Logs | 5 GB ingested | 5 | $0.50/GB | $2.50 |
| **CloudWatch Subtotal** | | | | **$10.00** |

**Cost Optimization Opportunities:**
- Use basic monitoring instead of detailed where possible
- Reduce log retention period
- Use metric filters instead of custom metrics where possible

---

## Free Tier Analysis

### Eligible Free Tier Resources (First 12 Months)

| Service | Free Tier Allowance | Usage | Covered |
|---------|--------------------|-------|---------|
| EC2 | 750 hours/month t2/t3.micro | 744 hours (1 instance) | ✅ Partial |
| RDS | 750 hours/month db.t2/t3.micro | 744 hours | ✅ Yes |
| S3 | 5 GB standard storage | 5 GB | ✅ Yes |
| CloudWatch | 10 custom metrics | 10 metrics | ✅ Yes |
| CloudWatch | 10 alarms | 15 alarms | ⚠️ Partial |
| ALB | 750 hours (new accounts) | 744 hours | ✅ Yes (if eligible) |

### Estimated Cost with Free Tier

| Period | Without Free Tier | With Free Tier | Savings |
|--------|------------------|----------------|---------|
| First Month | $174.79 | ~$100.00 | ~$75.00 |
| Months 2-12 | $174.79 | ~$110.00 | ~$65.00 |
| After 12 Months | $174.79 | $174.79 | $0.00 |

---

## Cost Optimization Recommendations

### Immediate Actions (High Impact)

1. **Right-size EC2 instances**
   - Current: t3.medium ($60.80/month)
   - Recommendation: Start with t3.small ($30.37/month)
   - Savings: ~$30/month

2. **Use RDS Free Tier**
   - Ensure db.t3.micro is used
   - Already configured correctly
   - Savings: Already optimized

3. **Schedule non-production hours**
   - Stop instances nights/weekends
   - Potential savings: 60% on EC2 costs
   - Savings: ~$36/month

### Medium-term Actions

4. **Implement Auto Scaling**
   - Scale down during low-traffic periods
   - Estimated savings: 20-30%

5. **Use Reserved Instances/Savings Plans**
   - 1-year Reserved Instance for t3.medium: ~$0.026/hour
   - Savings: ~37% on EC2 costs

6. **Optimize NAT Gateway usage**
   - Use VPC Endpoints for S3, DynamoDB
   - Reduces NAT data processing costs
   - Savings: ~$5-10/month

### Long-term Actions

7. **Consider serverless alternatives**
   - AWS Lambda + API Gateway instead of EC2
   - Aurora Serverless instead of RDS
   - Pay-per-use pricing for variable workloads

8. **Implement cost allocation tags**
   - Track costs by team, project, environment
   - Enable cost anomaly detection

---

## Cost Monitoring

### Recommended CloudWatch Alarms

| Alarm | Threshold | Purpose |
|-------|-----------|---------|
| EstimatedCharges > $200 | Monthly spend | Budget alert |
| EstimatedCharges > $150 | Monthly spend | Warning alert |
| NAT Gateway Bytes > 50GB | Monthly | Data transfer monitoring |

### AWS Cost Explorer Queries

Create these saved queries in Cost Explorer:

1. **Daily Spend by Service**
   - Group by: Service
   - Filter: Tag:Environment = staging
   - Granularity: Daily

2. **Weekly Trend**
   - Group by: Date
   - Filter: Tag:Project = spartan-hub
   - Granularity: Weekly

3. **Resource-level Costs**
   - Group by: Usage Type
   - Filter: Tag:Environment = staging
   - Granularity: Monthly

---

## Budget Configuration

### Recommended AWS Budget

```json
{
  "BudgetName": "spartan-hub-staging-monthly",
  "BudgetLimit": {
    "Amount": "200",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {
    "TagKeyValue": [
      "user:Project$spartan-hub",
      "user:Environment$staging"
    ]
  },
  "Notifications": [
    {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 80,
      "ThresholdType": "PERCENTAGE",
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "platform-team@spartanhub.io"}]
    },
    {
      "NotificationType": "ACTUAL",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE",
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "platform-team@spartanhub.io"}]
    },
    {
      "NotificationType": "FORECASTED",
      "ComparisonOperator": "GREATER_THAN",
      "Threshold": 100,
      "ThresholdType": "PERCENTAGE",
      "Subscribers": [{"SubscriptionType": "EMAIL", "Address": "platform-team@spartanhub.io"}]
    }
  ]
}
```

---

## Cost Comparison: Staging vs Production

| Component | Staging | Production | Difference |
|-----------|---------|------------|------------|
| EC2 Instances | 2x t3.medium | 4x t3.large | +$182/month |
| RDS | db.t3.micro (Single-AZ) | db.t3.small (Multi-AZ) | +$85/month |
| ElastiCache | cache.t3.micro (1 node) | cache.t3.small (2 nodes) | +$52/month |
| ALB | 1 ALB | 2 ALB (for DR) | +$17/month |
| NAT Gateway | 1 | 2 (for HA) | +$33/month |
| **Total** | **~$175/month** | **~$550/month** | **+$375/month** |

---

## Appendix: Pricing Reference

### EC2 Pricing (us-east-1, Linux, On-Demand)

| Instance Type | vCPUs | Memory | Hourly Price | Monthly Price |
|--------------|-------|--------|--------------|---------------|
| t3.micro | 2 | 1 GB | $0.0104 | $7.59 |
| t3.small | 2 | 2 GB | $0.0208 | $15.18 |
| t3.medium | 2 | 4 GB | $0.0416 | $30.37 |
| t3.large | 2 | 8 GB | $0.0832 | $60.74 |

### RDS Pricing (us-east-1, PostgreSQL, On-Demand)

| Instance Type | vCPUs | Memory | Hourly Price | Monthly Price |
|--------------|-------|--------|--------------|---------------|
| db.t3.micro | 1 | 1 GB | $0.017 | $12.41 |
| db.t3.small | 1 | 2 GB | $0.034 | $24.82 |
| db.t3.medium | 2 | 4 GB | $0.068 | $49.64 |

### ElastiCache Pricing (us-east-1, Redis)

| Node Type | vCPUs | Memory | Hourly Price | Monthly Price |
|-----------|-------|--------|--------------|---------------|
| cache.t3.micro | 1 | 0.53 GB | $0.018 | $13.14 |
| cache.t3.small | 1 | 1.3 GB | $0.036 | $26.28 |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 2026 | Infrastructure Team | Initial cost estimate |

---

## Disclaimer

- Prices are estimates based on AWS public pricing as of March 2026
- Actual costs may vary based on usage patterns
- AWS may change pricing without notice
- Always verify current pricing on aws.amazon.com/pricing
- Taxes and other charges not included
