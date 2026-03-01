# Quick Start - AWS Free Tier

**Setup time:** 15 minutes  
**Cost:** ~$2-5/mes (Free Tier)

## Prerequisites

- AWS account (< 12 months for Free Tier)
- AWS CLI configured
- Terraform installed

## Quick Deploy

```bash
# 1. Navigate to Terraform directory
cd infrastructure/terraform-free-tier

# 2. Initialize Terraform
terraform init

# 3. Create terraform.tfvars
cat > terraform.tfvars << EOF
db_password   = "SecurePassword123!"
alert_email   = "your-email@example.com"
EOF

# 4. Plan infrastructure
terraform plan -out=tfplan

# 5. Apply infrastructure
terraform apply tfplan
```

## Connect to EC2

```bash
# SSH (if you have key pair)
ssh -i your-key.pem ec2-user@$(terraform output -raw ec2_public_ip)

# Or use SSM Session Manager (no SSH key needed)
aws ssm start-session --target $(terraform output -raw ec2_instance_id)
```

## Deploy Application

```bash
# SSH to EC2
ssh ec2-user@$(terraform output -raw ec2_public_ip)

# Install application
cd /var/www/spartan-hub
git clone <your-repo> .
npm install
npm run build
pm2 start dist/server.js --name spartan-hub
```

## Destroy (Cleanup)

```bash
terraform destroy -auto-approve
```

## Cost Monitoring

```bash
# View current costs
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "1 month ago" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```
