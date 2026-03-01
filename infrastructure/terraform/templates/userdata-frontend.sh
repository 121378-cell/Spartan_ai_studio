#!/bin/bash
# =============================================================================
# Spartan Hub 2.0 - Frontend EC2 User Data Script
# Staging Environment
# =============================================================================

set -e

# Configuration
API_URL="${api_url}"
APP_DIR="/var/www/spartan-hub"
LOG_FILE="/var/log/spartan-hub-frontend.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting frontend server setup..."

# Update system packages
log "Updating system packages..."
yum update -y

# Install Nginx
log "Installing Nginx..."
yum install -y nginx

# Install Node.js (for build tools if needed)
log "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# Install Git
log "Installing Git..."
yum install -y git

# Create application directory
log "Creating application directory..."
mkdir -p "$APP_DIR"
chown -R nginx:nginx "$APP_DIR"

# Configure Nginx
log "Configuring Nginx..."
cat > /etc/nginx/conf.d/spartan-hub.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    root /var/www/spartan-hub;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main application (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# Remove default nginx config
rm -f /etc/nginx/conf.d/default.conf

# Create health check file
log "Creating health check file..."
echo "Spartan Hub Frontend - Staging Environment" > "$APP_DIR/index.html"

# Enable and start Nginx
log "Starting Nginx..."
systemctl enable nginx
systemctl start nginx

# Verify Nginx is running
if systemctl is-active --quiet nginx; then
    log "Nginx started successfully"
else
    log "ERROR: Nginx failed to start"
    exit 1
fi

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
                        "file_path": "/var/log/nginx/access.log",
                        "log_group_name": "/aws/ec2/spartan-frontend-staging",
                        "log_stream_name": "nginx-access-{instance_id}",
                        "timestamp_format": "%d/%b/%Y:%H:%M:%S %z"
                    },
                    {
                        "file_path": "/var/log/nginx/error.log",
                        "log_group_name": "/aws/ec2/spartan-frontend-staging",
                        "log_stream_name": "nginx-error-{instance_id}"
                    },
                    {
                        "file_path": "/var/log/spartan-hub-frontend.log",
                        "log_group_name": "/aws/ec2/spartan-frontend-staging",
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

log "Frontend server setup completed successfully!"

# Output setup summary
cat << 'SUMMARY'
========================================
Spartan Hub Frontend Setup Complete
========================================
Nginx Status: Running
Application Directory: /var/www/spartan-hub
Configuration: /etc/nginx/conf.d/spartan-hub.conf
Logs: /var/log/nginx/
========================================
SUMMARY
