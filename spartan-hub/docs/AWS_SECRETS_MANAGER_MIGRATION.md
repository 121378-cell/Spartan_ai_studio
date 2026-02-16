# AWS SECRETS MANAGER MIGRATION GUIDE
## Spartan Hub Production Security Enhancement

**Version**: 1.0  
**Date**: January 29, 2026  
**Status**: Ready for Production Deployment

---

## 🎯 OBJECTIVE

Migrate hardcoded secrets and environment variables to AWS Secrets Manager for enhanced security and operational excellence in production environments.

---

## 📋 CURRENT STATE ANALYSIS

### Hardcoded Secrets Identified
1. **Database Credentials**
   - `DATABASE_URL` - PostgreSQL connection string
   - `DB_PASSWORD` - Database password
   - `DB_USER` - Database username

2. **Authentication Secrets**
   - `JWT_SECRET` - JSON Web Token signing secret
   - `JWT_REFRESH_SECRET` - Refresh token secret
   - `SESSION_SECRET` - Session encryption key

3. **API Keys**
   - `OLLAMA_API_KEY` - AI model API key
   - `GROQ_API_KEY` - Groq API key
   - `GOOGLE_FIT_KEY` - Google Fit integration key

4. **OAuth Credentials**
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

5. **Encryption Keys**
   - `DB_ENCRYPTION_KEY` - Database field encryption key

---

## 🚀 MIGRATION STRATEGY

### Phase 1: Preparation (Development)
✅ **Completed**: Secrets Manager Service implementation exists
✅ **Completed**: Local environment fallback mechanism in place

### Phase 2: AWS Setup (Production)
**Prerequisites**:
- AWS account with IAM permissions
- AWS CLI configured
- IAM role with Secrets Manager access

### Phase 3: Secret Creation
**Secret Names Structure**:
```
spartan-hub/production/database
spartan-hub/production/jwt
spartan-hub/production/api-keys
spartan-hub/production/oauth
spartan-hub/production/encryption
```

### Phase 4: Application Configuration
**Environment Variables Required**:
```bash
USE_AWS_SECRETS=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

---

## 🔧 IMPLEMENTATION DETAILS

### Existing Service Features
✅ **Dual-mode Operation**: AWS Secrets Manager or environment variables
✅ **Automatic Fallback**: Graceful degradation to env vars if AWS unavailable
✅ **Caching Mechanism**: 1-hour cache to reduce AWS API calls
✅ **Structured Logging**: Comprehensive audit trail
✅ **Error Handling**: Robust error management and recovery

### Secret Structure Examples

#### Database Secret (`spartan-hub/production/database`)
```json
{
  "databaseUrl": "postgresql://username:password@host:port/database",
  "host": "your-db-host.amazonaws.com",
  "port": 5432,
  "username": "db_username",
  "password": "secure_password",
  "database": "spartan_fitness"
}
```

#### JWT Secret (`spartan-hub/production/jwt`)
```json
{
  "jwtSecret": "super-secret-jwt-key-here",
  "refreshSecret": "different-refresh-secret-here",
  "algorithm": "HS256",
  "accessTokenExpiry": "15m",
  "refreshTokenExpiry": "7d"
}
```

#### API Keys Secret (`spartan-hub/production/api-keys`)
```json
{
  "ollamaApiKey": "ollama-api-key-here",
  "groqApiKey": "groq-api-key-here",
  "googleFitKey": "google-fit-api-key-here"
}
```

#### OAuth Secret (`spartan-hub/production/oauth`)
```json
{
  "googleClientId": "google-client-id-here",
  "googleClientSecret": "google-client-secret-here"
}
```

#### Encryption Keys Secret (`spartan-hub/production/encryption`)
```json
{
  "dbEncryptionKey": "32-byte-encryption-key-here",
  "fieldEncryptionKey": "another-32-byte-key-here"
}
```

---

## 🛠️ MIGRATION SCRIPTS

### 1. AWS Secret Creation Script
```bash
#!/bin/bash
# create-aws-secrets.sh

# Configuration
REGION="us-east-1"
SECRET_PREFIX="spartan-hub/production"

# Create database secret
aws secretsmanager create-secret \
  --name "${SECRET_PREFIX}/database" \
  --description "Spartan Hub Database Credentials" \
  --secret-string '{
    "databaseUrl": "postgresql://user:pass@host:5432/db",
    "host": "your-host",
    "port": 5432,
    "username": "your-username",
    "password": "your-password",
    "database": "spartan_fitness"
  }' \
  --region $REGION \
  --tags Key=Environment,Value=production Key=Application,Value=spartan-hub

# Create JWT secret
aws secretsmanager create-secret \
  --name "${SECRET_PREFIX}/jwt" \
  --description "Spartan Hub JWT Secrets" \
  --secret-string '{
    "jwtSecret": "your-jwt-secret-here",
    "refreshSecret": "your-refresh-secret-here"
  }' \
  --region $REGION

# Create API keys secret
aws secretsmanager create-secret \
  --name "${SECRET_PREFIX}/api-keys" \
  --description "Spartan Hub API Keys" \
  --secret-string '{
    "ollamaApiKey": "your-ollama-key",
    "groqApiKey": "your-groq-key",
    "googleFitKey": "your-google-fit-key"
  }' \
  --region $REGION

echo "✅ AWS secrets created successfully"
```

### 2. Secret Rotation Script
```bash
#!/bin/bash
# rotate-secrets.sh

SECRET_NAME=$1
NEW_VALUE=$2
REGION="us-east-1"

if [ -z "$SECRET_NAME" ] || [ -z "$NEW_VALUE" ]; then
  echo "Usage: $0 <secret-name> <new-value>"
  exit 1
fi

# Update the secret
aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --secret-string "$NEW_VALUE" \
  --region $REGION

echo "✅ Secret $SECRET_NAME rotated successfully"
```

### 3. Validation Script
```bash
#!/bin/bash
# validate-secrets.sh

REGION="us-east-1"
SECRET_PREFIX="spartan-hub/production"

echo "🔍 Validating AWS Secrets Manager setup..."

# Check if secrets exist
SECRETS=("database" "jwt" "api-keys" "oauth" "encryption")

for secret in "${SECRETS[@]}"; do
  SECRET_NAME="${SECRET_PREFIX}/${secret}"
  
  if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" --region $REGION &>/dev/null; then
    echo "✅ $SECRET_NAME exists"
  else
    echo "❌ $SECRET_NAME missing"
  fi
done

# Test secret retrieval
echo "🧪 Testing secret retrieval..."
node -e "
  const { getSecret } = require('./backend/dist/services/secretsManagerService');
  
  async function testSecrets() {
    try {
      const dbSecret = await getSecret('database-secret');
      console.log('✅ Database secret accessible');
      
      const jwtSecret = await getSecret('jwt-secret');
      console.log('✅ JWT secret accessible');
      
      const apiKeys = await getSecret('api-keys');
      console.log('✅ API keys accessible');
    } catch (error) {
      console.error('❌ Secret access failed:', error.message);
      process.exit(1);
    }
  }
  
  testSecrets();
"

echo "✅ Secrets validation completed"
```

---

## 📊 MONITORING AND ALERTING

### Key Metrics to Monitor
1. **Secret Access Count**: Track frequency of secret retrievals
2. **Cache Hit Ratio**: Measure effectiveness of caching
3. **Error Rates**: Monitor failed secret access attempts
4. **Latency**: Measure secret retrieval performance

### Alerting Configuration
```yaml
alerts:
  - name: "Secret Access Failure"
    condition: "secrets.access.errors > 5 in 5 minutes"
    severity: "HIGH"
    
  - name: "High Cache Miss Rate"
    condition: "secrets.cache.miss_rate > 50%"
    severity: "MEDIUM"
    
  - name: "Slow Secret Retrieval"
    condition: "secrets.retrieval.latency > 1000ms"
    severity: "LOW"
```

---

## 🔒 SECURITY BEST PRACTICES

### IAM Role Configuration
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:spartan-hub/production/*"
      ]
    }
  ]
}
```

### Secret Rotation Policy
- **JWT Secrets**: Rotate monthly
- **API Keys**: Rotate quarterly
- **Database Passwords**: Rotate biannually
- **Encryption Keys**: Rotate annually with re-encryption

### Audit Trail Requirements
- Log all secret access attempts
- Monitor for unusual access patterns
- Alert on unauthorized access attempts
- Maintain 90-day audit retention

---

## 🎯 DEPLOYMENT CHECKLIST

### Pre-Migration
- [ ] Create AWS IAM role with Secrets Manager permissions
- [ ] Set up AWS CLI with appropriate credentials
- [ ] Create required secrets in AWS Secrets Manager
- [ ] Test secrets access from development environment
- [ ] Validate fallback mechanism works with environment variables

### Migration Day
- [ ] Update application configuration to use AWS secrets
- [ ] Deploy updated application to staging environment
- [ ] Validate all secrets are accessible in staging
- [ ] Run comprehensive integration tests
- [ ] Deploy to production during low-traffic period

### Post-Migration
- [ ] Monitor application logs for secret access issues
- [ ] Verify all services are functioning correctly
- [ ] Remove hardcoded secrets from code repositories
- [ ] Update documentation and runbooks
- [ ] Set up regular secret rotation schedule

---

## 🆘 TROUBLESHOOTING

### Common Issues

1. **Permission Denied**
   ```
   Error: AccessDeniedException
   Solution: Verify IAM role permissions and secret ARNs
   ```

2. **Secret Not Found**
   ```
   Error: ResourceNotFoundException
   Solution: Check secret name and region configuration
   ```

3. **Network Connectivity**
   ```
   Error: Timeout connecting to AWS
   Solution: Check VPC endpoints or NAT gateway configuration
   ```

4. **Cache Issues**
   ```
   Error: Stale secret data
   Solution: Clear cache manually or wait for TTL expiration
   ```

### Emergency Procedures

1. **Immediate Fallback**: Set `USE_AWS_SECRETS=false` to revert to environment variables
2. **Secret Recovery**: Use AWS Console to retrieve current secret values
3. **Incident Response**: Follow security incident response protocol for suspected compromise

---

## 📈 SUCCESS METRICS

### Security Improvements
- ✅ **Zero hardcoded secrets** in production code
- ✅ **Centralized secret management** with AWS Secrets Manager
- ✅ **Automated secret rotation** capability
- ✅ **Audit trail** for all secret access
- ✅ **Fine-grained access control** through IAM

### Operational Benefits
- ✅ **Reduced deployment friction** for secret updates
- ✅ **Improved incident response** for security events
- ✅ **Simplified compliance** reporting
- ✅ **Enhanced developer productivity** through standardized processes

---

This migration enhances Spartan Hub's security posture while maintaining operational excellence and providing a foundation for future scaling.