#!/bin/bash
# =============================================================================
# Spartan Hub 2.0 - Backend EC2 User Data Script
# Staging Environment
# =============================================================================

set -e

# Configuration
DB_HOST="${db_host}"
REDIS_HOST="${redis_host}"
ENVIRONMENT="${environment}"
APP_DIR="/var/www/spartan-hub-api"
APP_USER="spartan-app"
LOG_FILE="/var/log/spartan-hub-backend.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting backend server setup..."

# Update system packages
log "Updating system packages..."
yum update -y

# Install Node.js
log "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Install Git
log "Installing Git..."
yum install -y git

# Install PM2 globally
log "Installing PM2..."
npm install -g pm2

# Install system dependencies
log "Installing system dependencies..."
yum install -y \
    python3 \
    make \
    gcc-c++ \
    openssl-devel \
    postgresql-devel

# Create application user
log "Creating application user..."
useradd -r -s /bin/false "$APP_USER"

# Create application directory
log "Creating application directory..."
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 755 "$APP_DIR"

# Create logs directory
mkdir -p /var/log/spartan-hub
chown -R "$APP_USER:$APP_USER" /var/log/spartan-hub

# Create environment file
log "Creating environment configuration..."
cat > "$APP_DIR/.env" << ENV_EOF
NODE_ENV=$ENVIRONMENT
PORT=3001

# Database Configuration
DATABASE_HOST=$DB_HOST
DATABASE_PORT=5432
DATABASE_NAME=spartan_hub_staging
DATABASE_USER=spartan_staging
# DATABASE_PASSWORD should be retrieved from AWS Secrets Manager

# Redis Configuration
REDIS_HOST=$REDIS_HOST
REDIS_PORT=6379

# Application
API_URL=https://staging.spartan-hub.com/api
FRONTEND_URL=https://staging.spartan-hub.com

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/spartan-hub/api.log
ENV_EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# Create PM2 ecosystem configuration
log "Creating PM2 configuration..."
cat > "$APP_DIR/ecosystem.config.js" << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'spartan-hub-api',
    script: './dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'staging',
      PORT: 3001
    },
    error_file: '/var/log/spartan-hub/api-error.log',
    out_file: '/var/log/spartan-hub/api-out.log',
    log_file: '/var/log/spartan-hub/api-combined.log',
    time: true,
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 4000
  }]
};
PM2_EOF

chown "$APP_USER:$APP_USER" "$APP_DIR/ecosystem.config.js"

# Create health check script
log "Creating health check script..."
cat > "$APP_DIR/health-check.sh" << 'HEALTH_EOF'
#!/bin/bash
# Health check script for Spartan Hub API

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)

if [ "$RESPONSE" -eq 200 ]; then
    echo "Health check passed"
    exit 0
else
    echo "Health check failed with status $RESPONSE"
    exit 1
fi
HEALTH_EOF

chmod +x "$APP_DIR/health-check.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/health-check.sh"

# Create systemd service for PM2
log "Creating systemd service..."
cat > /etc/systemd/system/spartan-hub-api.service << 'SYSTEMD_EOF'
[Unit]
Description=Spartan Hub API Server
Documentation=https://spartan-hub.com
After=network.target

[Service]
Type=forking
User=spartan-app
Group=spartan-app
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=staging
WorkingDirectory=/var/www/spartan-hub-api
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload spartan-hub-api
ExecStop=/usr/bin/pm2 stop spartan-hub-api
Restart=on-failure
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# Reload systemd and enable service
log "Enabling systemd service..."
systemctl daemon-reload
systemctl enable spartan-hub-api

# Install CloudWatch agent
log "Installing CloudWatch agent..."
yum install -y amazon-cloudwatch-agent

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
                        "file_path": "/var/log/spartan-hub/api.log",
                        "log_group_name": "/aws/ec2/spartan-backend-staging",
                        "log_stream_name": "api-{instance_id}"
                    },
                    {
                        "file_path": "/var/log/spartan-hub/api-error.log",
                        "log_group_name": "/aws/ec2/spartan-backend-staging",
                        "log_stream_name": "api-error-{instance_id}"
                    },
                    {
                        "file_path": "/var/log/spartan-hub-backend.log",
                        "log_group_name": "/aws/ec2/spartan-backend-staging",
                        "log_stream_name": "setup-{instance_id}"
                    }
                ]
            }
        }
    },
    "metrics": {
        "metrics_collected": {
            "cpu": {
                "measurement": ["cpu_usage_idle", "cpu_usage_user", "cpu_usage_system"],
                "totalcpu": true
            },
            "disk": {
                "measurement": ["used_percent"],
                "resources": ["/"]
            },
            "mem": {
                "measurement": ["mem_used_percent"]
            },
            "net": {
                "measurement": ["bytes_sent", "bytes_recv"]
            }
        }
    }
}
CW_EOF

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

# Configure log rotation
log "Configuring log rotation..."
cat > /etc/logrotate.d/spartan-hub << 'LOGROTATE_EOF'
/var/log/spartan-hub/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 spartan-app spartan-app
    sharedscripts
    postrotate
        /usr/bin/pm2 reload spartan-hub-api --silent || true
    endscript
}
LOGROTATE_EOF

# Create deployment script
log "Creating deployment script..."
cat > "$APP_DIR/deploy.sh" << 'DEPLOY_EOF'
#!/bin/bash
# Deployment script for Spartan Hub API

set -e

APP_DIR="/var/www/spartan-hub-api"
APP_USER="spartan-app"

echo "Starting deployment..."

# Pull latest code (if using git)
# cd "$APP_DIR"
# git pull origin main

# Install dependencies
cd "$APP_DIR"
npm ci --production

# Build application
npm run build

# Run database migrations
npm run migrate

# Restart application
pm2 reload spartan-hub-api

echo "Deployment completed!"
DEPLOY_EOF

chmod +x "$APP_DIR/deploy.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/deploy.sh"

# Configure firewall (if firewalld is running)
if systemctl is-active --quiet firewalld; then
    log "Configuring firewall..."
    firewall-cmd --permanent --add-port=3001/tcp
    firewall-cmd --reload
fi

log "Backend server setup completed successfully!"

# Output setup summary
cat << 'SUMMARY'
========================================
Spartan Hub Backend Setup Complete
========================================
Node.js Version: $(node --version)
PM2 Version: $(pm2 --version)
Application Directory: /var/www/spartan-hub-api
Systemd Service: spartan-hub-api
Logs: /var/log/spartan-hub/
========================================

Next Steps:
1. Deploy application code to $APP_DIR
2. Configure database credentials in AWS Secrets Manager
3. Run: systemctl start spartan-hub-api
4. Verify: curl http://localhost:3001/api/health

SUMMARY
