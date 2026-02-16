#!/bin/bash

# AWS Secrets Manager Migration Script for Spartan Hub
# Automates the migration from environment variables to AWS Secrets Manager

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

# Configuration
REGION=${AWS_REGION:-"us-east-1"}
SECRET_PREFIX="spartan-hub/production"
PROFILE=${AWS_PROFILE:-"default"}

# Validate AWS CLI installation
validate_aws_cli() {
    log "Validating AWS CLI installation..."
    
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed"
        log "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
        exit 1
    fi
    
    # Validate AWS credentials
    if ! aws sts get-caller-identity --profile "$PROFILE" &> /dev/null; then
        log_error "AWS credentials not configured or invalid"
        log "Please configure AWS CLI: aws configure"
        exit 1
    fi
    
    log_success "AWS CLI validated successfully"
}

# Create database secret
create_database_secret() {
    log "Creating database secret..."
    
    # Prompt for database credentials
    read -p "Database Host: " db_host
    read -p "Database Port (5432): " db_port
    db_port=${db_port:-5432}
    read -p "Database Name (spartan_fitness): " db_name
    db_name=${db_name:-spartan_fitness}
    read -p "Database Username: " db_user
    read -s -p "Database Password: " db_password
    echo
    
    # Create secret string
    secret_string=$(jq -n \
        --arg host "$db_host" \
        --arg port "$db_port" \
        --arg database "$db_name" \
        --arg username "$db_user" \
        --arg password "$db_password" \
        '{
            host: $host,
            port: ($port | tonumber),
            database: $database,
            username: $username,
            password: $password,
            databaseUrl: "postgresql://\($username):\($password)@\($host):\($port)/\($database)"
        }')
    
    # Create the secret
    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/database" \
        --description "Spartan Hub Database Credentials" \
        --secret-string "$secret_string" \
        --region "$REGION" \
        --profile "$PROFILE" \
        --tags Key=Environment,Value=production Key=Application,Value=spartan-hub Key=Type,Value=database
    
    log_success "Database secret created successfully"
}

# Create JWT secret
create_jwt_secret() {
    log "Creating JWT secret..."
    
    # Generate secure JWT secrets
    jwt_secret=$(openssl rand -hex 32)
    refresh_secret=$(openssl rand -hex 32)
    
    # Create secret string
    secret_string=$(jq -n \
        --arg jwtSecret "$jwt_secret" \
        --arg refreshSecret "$refresh_secret" \
        '{
            jwtSecret: $jwtSecret,
            refreshSecret: $refreshSecret,
            algorithm: "HS256",
            accessTokenExpiry: "15m",
            refreshTokenExpiry: "7d"
        }')
    
    # Create the secret
    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/jwt" \
        --description "Spartan Hub JWT Secrets" \
        --secret-string "$secret_string" \
        --region "$REGION" \
        --profile "$PROFILE" \
        --tags Key=Environment,Value=production Key=Application,Value=spartan-hub Key=Type,Value=authentication
    
    log_success "JWT secret created successfully"
    log "JWT Secret: $jwt_secret"
    log "Refresh Secret: $refresh_secret"
    log_warn "Save these secrets securely - they won't be displayed again!"
}

# Create API keys secret
create_api_keys_secret() {
    log "Creating API keys secret..."
    
    # Prompt for API keys
    read -s -p "Ollama API Key (optional): " ollama_key
    echo
    read -s -p "Groq API Key (optional): " groq_key
    echo
    read -s -p "Google Fit API Key (optional): " google_fit_key
    echo
    
    # Create secret string
    secret_string=$(jq -n \
        --arg ollama "$ollama_key" \
        --arg groq "$groq_key" \
        --arg googleFit "$google_fit_key" \
        '{
            ollamaApiKey: $ollama,
            groqApiKey: $groq,
            googleFitKey: $googleFit
        }')
    
    # Create the secret
    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/api-keys" \
        --description "Spartan Hub API Keys" \
        --secret-string "$secret_string" \
        --region "$REGION" \
        --profile "$PROFILE" \
        --tags Key=Environment,Value=production Key=Application,Value=spartan-hub Key=Type,Value=api-keys
    
    log_success "API keys secret created successfully"
}

# Create OAuth secret
create_oauth_secret() {
    log "Creating OAuth secret..."
    
    # Prompt for OAuth credentials
    read -p "Google Client ID (optional): " google_client_id
    read -s -p "Google Client Secret (optional): " google_client_secret
    echo
    
    # Create secret string
    secret_string=$(jq -n \
        --arg clientId "$google_client_id" \
        --arg clientSecret "$google_client_secret" \
        '{
            googleClientId: $clientId,
            googleClientSecret: $clientSecret
        }')
    
    # Create the secret
    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/oauth" \
        --description "Spartan Hub OAuth Credentials" \
        --secret-string "$secret_string" \
        --region "$REGION" \
        --profile "$PROFILE" \
        --tags Key=Environment,Value=production Key=Application,Value=spartan-hub Key=Type,Value=oauth
    
    log_success "OAuth secret created successfully"
}

# Create encryption keys secret
create_encryption_secret() {
    log "Creating encryption keys secret..."
    
    # Generate secure encryption keys
    db_encryption_key=$(openssl rand -hex 32)
    field_encryption_key=$(openssl rand -hex 32)
    
    # Create secret string
    secret_string=$(jq -n \
        --arg dbKey "$db_encryption_key" \
        --arg fieldKey "$field_encryption_key" \
        '{
            dbEncryptionKey: $dbKey,
            fieldEncryptionKey: $fieldKey
        }')
    
    # Create the secret
    aws secretsmanager create-secret \
        --name "${SECRET_PREFIX}/encryption" \
        --description "Spartan Hub Encryption Keys" \
        --secret-string "$secret_string" \
        --region "$REGION" \
        --profile "$PROFILE" \
        --tags Key=Environment,Value=production Key=Application,Value=spartan-hub Key=Type,Value=encryption
    
    log_success "Encryption keys secret created successfully"
    log "DB Encryption Key: $db_encryption_key"
    log "Field Encryption Key: $field_encryption_key"
    log_warn "Save these keys securely - they won't be displayed again!"
}

# Validate created secrets
validate_secrets() {
    log "Validating created secrets..."
    
    local secrets=("database" "jwt" "api-keys" "oauth" "encryption")
    local missing_secrets=()
    
    for secret in "${secrets[@]}"; do
        secret_name="${SECRET_PREFIX}/${secret}"
        if aws secretsmanager describe-secret \
           --secret-id "$secret_name" \
           --region "$REGION" \
           --profile "$PROFILE" &> /dev/null; then
            log_success "Secret $secret_name exists"
        else
            log_error "Secret $secret_name missing"
            missing_secrets+=("$secret_name")
        fi
    done
    
    if [ ${#missing_secrets[@]} -eq 0 ]; then
        log_success "All secrets created successfully!"
        return 0
    else
        log_error "Missing secrets: ${missing_secrets[*]}"
        return 1
    fi
}

# Test secret access
test_secret_access() {
    log "Testing secret access..."
    
    # Test using the secrets manager service
    cd backend
    npm run build
    
    # Run test script
    node -e "
        const { getSecret } = require('./dist/services/secretsManagerService');
        
        async function testAccess() {
            try {
                console.log('Testing database secret...');
                await getSecret('database-secret');
                console.log('✅ Database secret accessible');
                
                console.log('Testing JWT secret...');
                await getSecret('jwt-secret');
                console.log('✅ JWT secret accessible');
                
                console.log('Testing API keys...');
                await getSecret('api-keys');
                console.log('✅ API keys accessible');
                
                console.log('✅ All secrets accessible');
            } catch (error) {
                console.error('❌ Secret access failed:', error.message);
                process.exit(1);
            }
        }
        
        testAccess();
    "
    
    cd ..
    log_success "Secret access test completed"
}

# Generate environment configuration
generate_env_config() {
    log "Generating environment configuration..."
    
    local env_file=".env.production"
    
    cat > "$env_file" << EOF
# Spartan Hub Production Environment Configuration
# Generated by AWS Secrets Manager Migration Script
# Date: $(date)

# AWS Configuration
USE_AWS_SECRETS=true
AWS_REGION=$REGION
AWS_PROFILE=$PROFILE

# Application Configuration
NODE_ENV=production
PORT=3001

# Feature Flags
ENABLE_DATABASE_ENCRYPTION=true
ENABLE_CACHE=true
ENABLE_LOGGING=true

# Monitoring
LOG_LEVEL=info
METRICS_ENABLED=true

# Security
RATE_LIMITING_ENABLED=true
CSRF_PROTECTION_ENABLED=true
EOF

    log_success "Environment configuration generated: $env_file"
    log "Review and customize this file before deployment"
}

# Main migration function
run_migration() {
    log_header "Spartan Hub AWS Secrets Manager Migration"
    log "Region: $REGION"
    log "Profile: $PROFILE"
    log "Secret Prefix: $SECRET_PREFIX"
    echo
    
    # Validate prerequisites
    validate_aws_cli
    
    # Create secrets interactively
    create_database_secret
    create_jwt_secret
    create_api_keys_secret
    create_oauth_secret
    create_encryption_secret
    
    # Validate and test
    if validate_secrets; then
        test_secret_access
        generate_env_config
        
        log_header "Migration Complete!"
        log_success "✅ All secrets have been successfully migrated to AWS Secrets Manager"
        log ""
        log "Next steps:"
        log "1. Review the generated .env.production file"
        log "2. Update your deployment configuration to use AWS secrets"
        log "3. Test the application in staging environment"
        log "4. Deploy to production"
        log ""
        log_warn "Remember to remove hardcoded secrets from your codebase and version control"
    else
        log_error "Migration failed - please check the errors above"
        exit 1
    fi
}

# Show help
show_help() {
    echo "Spartan Hub AWS Secrets Manager Migration Script"
    echo "================================================"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --region REGION     AWS region (default: us-east-1)"
    echo "  --profile PROFILE   AWS profile (default: default)"
    echo "  --prefix PREFIX     Secret name prefix (default: spartan-hub/production)"
    echo "  --help             Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  AWS_REGION         AWS region override"
    echo "  AWS_PROFILE        AWS profile override"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --region us-west-2 --profile production"
    echo "  $0 --prefix myapp/secrets"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --profile)
            PROFILE="$2"
            shift 2
            ;;
        --prefix)
            SECRET_PREFIX="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run the migration
run_migration