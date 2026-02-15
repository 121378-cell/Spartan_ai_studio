# Phase 9 Monitoring and Alerting System

## Overview
Complete monitoring and alerting infrastructure for the Spartan Hub Phase 9 engagement and retention system.

## Components Implemented

### 1. Prometheus Monitoring
- **Configuration**: `prometheus.yml` with Phase 9 specific metrics
- **Alert Rules**: Custom alerts for engagement, churn, and system health
- **Targets**: Backend, frontend, database, and WebSocket monitoring

### 2. Alerting System
- **Alertmanager**: Multi-channel alert routing
- **Team-based routing**: Separate channels for engagement, community, retention, and SRE teams
- **Severity levels**: Critical (PagerDuty), Warning (Email/Slack), Info (Slack)

### 3. Log Aggregation
- **Loki**: Centralized log storage
- **Promtail**: Log shipping from application containers
- **Structured logging**: JSON format for easy parsing

### 4. Visualization
- **Grafana**: Dashboards for metrics visualization
- **Datasource configuration**: Prometheus, Loki, and Tempo integration
- **Provisioned dashboards**: Automatic dashboard deployment

## Key Metrics Monitored

### Engagement Metrics
- User activity rates
- Achievement unlock rates
- Challenge completion rates
- Streak maintenance metrics

### Retention Metrics
- Churn prediction scores
- User engagement scores
- Cohort retention rates
- Intervention effectiveness

### System Health
- API response times
- Database query performance
- Memory and CPU usage
- WebSocket connection health

### Community Metrics
- Post creation rates
- Comment engagement
- Follower growth
- Content moderation metrics

## Alert Categories

### Critical Alerts (PagerDuty)
- Backend service downtime
- High churn risk spikes (>10 users)
- Achievement system failures
- Database performance issues

### Warning Alerts (Slack/Email)
- Low user engagement (<0.1 activities/hour)
- High API latency (>2 seconds)
- Memory/CPU usage thresholds
- WebSocket connection issues

### Info Alerts (Slack)
- Streak breaks
- Challenge completion rates
- Community activity levels

## Team Routing

### Engagement Team
- Achievement system alerts
- Challenge completion metrics
- Streak maintenance issues

### Community Team
- Community activity levels
- Content moderation alerts
- User interaction metrics

### Retention Team
- Churn prediction alerts
- User engagement drops
- Cohort analysis anomalies

### SRE Team
- System performance issues
- Infrastructure alerts
- Database and network problems

## Deployment Instructions

### Prerequisites
```bash
# Install Docker and Docker Compose
sudo apt-get update
sudo apt-get install docker docker-compose

# Clone repository
git clone <repository-url>
cd spartan-hub/monitoring
```

### Starting the Monitoring Stack
```bash
# Start all monitoring services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Accessing Interfaces
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Loki**: http://localhost:3100

## Configuration Files

### Main Configuration Files
- `prometheus.yml`: Prometheus scraping configuration
- `alert.rules`: Custom alert definitions
- `alertmanager.yml`: Alert routing and notification configuration
- `docker-compose.yml`: Container orchestration
- `grafana-datasources.yml`: Grafana datasource setup

### Customization Points
1. **Alert Thresholds**: Modify values in `alert.rules`
2. **Notification Channels**: Update webhook URLs in `alertmanager.yml`
3. **Scraping Targets**: Adjust endpoints in `prometheus.yml`
4. **Dashboard Templates**: Add custom dashboards in `dashboards/` directory

## Best Practices Implemented

### Alert Design
- Meaningful alert names and descriptions
- Appropriate grouping and inhibition rules
- Clear runbook URLs for incident response
- Regular alert review and tuning

### Monitoring Strategy
- RED metrics (Rate, Errors, Duration) for services
- USE metrics (Utilization, Saturation, Errors) for resources
- Business metrics for engagement and retention
- Synthetic monitoring for user journeys

### Log Structure
- Structured JSON logging
- Consistent field naming
- Appropriate log levels
- Contextual metadata inclusion

## Testing and Validation

### Alert Testing
```bash
# Test alert rules
curl -X POST http://localhost:9090/-/reload

# View current alerts
curl http://localhost:9090/api/v1/alerts

# Test Alertmanager
curl -X POST http://localhost:9093/api/v1/alerts -H "Content-Type: application/json" -d '{"status": "firing", "labels": {"alertname": "TestAlert"}}'
```

### Metric Validation
```bash
# Check if metrics are being collected
curl http://localhost:9090/api/v1/targets

# Query specific metrics
curl 'http://localhost:9090/api/v1/query?query=user_activities_total'
```

## Maintenance

### Regular Tasks
- Review and tune alert thresholds monthly
- Update contact information quarterly
- Rotate credentials and API keys
- Backup configuration files

### Scaling Considerations
- Horizontal scaling for Prometheus federation
- Remote storage for long-term retention
- Load balancing for high-traffic environments
- Multi-region deployment for resilience

This monitoring system provides comprehensive observability for the Phase 9 engagement features while maintaining operational excellence and team productivity.