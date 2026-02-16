#!/usr/bin/env bash
# Start Monitoring Stack Script
# Brings up Prometheus, Grafana, and related monitoring services

set -e

echo "🚀 Starting Spartan Hub Monitoring Stack..."

# Create necessary directories
mkdir -p ./logs/backend
mkdir -p ./logs/frontend
mkdir -p ./monitoring/grafana/datasources
mkdir -p ./monitoring/grafana/dashboards

# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

echo "✅ Monitoring stack started!"
echo ""
echo "📊 Access the dashboards:"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana: http://localhost:3001 (admin/spartan123)"
echo "   Node Exporter: http://localhost:9100"
echo "   Loki: http://localhost:3100"

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service status
echo ""
echo "📋 Service Status:"
docker-compose -f docker-compose.monitoring.yml ps

echo ""
echo "🔧 Next steps:"
echo "   1. Configure your application to expose /metrics endpoint"
echo "   2. Update Prometheus config with your app's endpoint"
echo "   3. Access Grafana and import the Spartan Hub dashboard"
echo "   4. Set up alerts for critical metrics"