#!/bin/bash
# Deploy script for Spartan Hub to Kubernetes

set -e

echo "🚀 Deploying Spartan Hub to Kubernetes..."

# Create namespace
echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Apply configurations
echo "Applying ConfigMaps..."
kubectl apply -f k8s/configmap.yaml

# Deploy Redis
echo "Deploying Redis Cluster..."
kubectl apply -f k8s/redis-service.yaml
kubectl apply -f k8s/redis-statefulset.yaml

# Deploy backend
echo "Deploying Backend..."
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-deployment.yaml

# Deploy frontend
echo "Deploying Frontend..."
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy monitoring
echo "Deploying Monitoring Stack..."
kubectl apply -f k8s/prometheus-configmap.yaml
kubectl apply -f k8s/prometheus-deployment.yaml
kubectl apply -f k8s/grafana-service.yaml
kubectl apply -f k8s/grafana-deployment.yaml

# Apply HPA
echo "Applying Horizontal Pod Autoscaler..."
kubectl apply -f k8s/hpa.yaml

# Apply Ingress
echo "Applying Ingress..."
kubectl apply -f k8s/ingress.yaml

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with:"
echo "  kubectl get pods -n spartan-hub"
echo "  kubectl get svc -n spartan-hub"
echo ""
echo "🌐 Access Grafana at: http://grafana.spartan-hub.com"
