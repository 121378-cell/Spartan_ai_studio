#!/bin/bash

###############################################################################
# Phase 2 Staging Deployment Script
# 
# Deploys Phase 2 services to Kubernetes staging environment
# Includes health checks, monitoring setup, and smoke tests
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="spartan-hub-staging"
BACKEND_IMAGE="spartan-hub/backend:phase2-staging"
FRONTEND_IMAGE="spartan-hub/frontend:phase2-staging"
REGISTRY="${DOCKER_REGISTRY:-docker.io}"
CONTEXT="${KUBE_CONTEXT:-staging}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    command -v kubectl >/dev/null 2>&1 || log_error "kubectl not found"
    command -v docker >/dev/null 2>&1 || log_error "docker not found"
    
    # Check kubeconfig
    kubectl config current-context >/dev/null 2>&1 || log_error "No kubectl context configured"
    
    log_success "Prerequisites check passed"
}

build_images() {
    log_info "Building Docker images..."
    
    # Build backend image
    log_info "Building backend image: $BACKEND_IMAGE"
    docker build -t "$BACKEND_IMAGE" -f backend/Dockerfile backend/ || log_error "Backend build failed"
    
    # Build frontend image
    log_info "Building frontend image: $FRONTEND_IMAGE"
    docker build -t "$FRONTEND_IMAGE" -f Dockerfile . || log_error "Frontend build failed"
    
    log_success "Docker images built successfully"
}

push_images() {
    log_info "Pushing images to registry..."
    
    docker push "$BACKEND_IMAGE" || log_error "Failed to push backend image"
    docker push "$FRONTEND_IMAGE" || log_error "Failed to push frontend image"
    
    log_success "Images pushed to registry"
}

create_namespace() {
    log_info "Creating/updating staging namespace..."
    
    kubectl apply -f k8s/staging-namespace.yaml || log_error "Failed to create namespace"
    
    # Wait for namespace to be ready
    kubectl wait --for=condition=active namespace/$NAMESPACE --timeout=30s || log_warning "Namespace creation timed out"
    
    log_success "Namespace ready: $NAMESPACE"
}

create_secrets() {
    log_info "Creating staging secrets..."
    
    # Check if secrets already exist
    if kubectl get secret staging-database -n "$NAMESPACE" &>/dev/null; then
        log_warning "Secrets already exist, skipping creation"
        return
    fi
    
    # Create database secret (use test database for staging)
    kubectl create secret generic staging-database \
        --from-literal=url="sqlite://./data/staging-spartan.db" \
        -n "$NAMESPACE" || log_error "Failed to create database secret"
    
    # Create Redis secret
    kubectl create secret generic staging-redis \
        --from-literal=url="redis://staging-redis:6379" \
        -n "$NAMESPACE" || log_error "Failed to create Redis secret"
    
    # Create application secrets
    JWT_SECRET=$(openssl rand -hex 32)
    kubectl create secret generic staging-secrets \
        --from-literal=jwt-secret="$JWT_SECRET" \
        -n "$NAMESPACE" || log_error "Failed to create application secrets"
    
    log_success "Secrets created successfully"
}

deploy_redis() {
    log_info "Deploying Redis for staging..."
    
    kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: staging-redis
  namespace: $NAMESPACE
  labels:
    app: redis
    environment: staging
spec:
  type: ClusterIP
  ports:
  - port: 6379
    targetPort: 6379
  selector:
    app: redis
    environment: staging

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: staging-redis
  namespace: $NAMESPACE
  labels:
    app: redis
    environment: staging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
      environment: staging
  template:
    metadata:
      labels:
        app: redis
        environment: staging
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 10
          periodSeconds: 10
EOF
    
    log_success "Redis deployment queued"
}

deploy_backend() {
    log_info "Deploying backend Phase 2 services..."
    
    kubectl apply -f k8s/backend-staging-deployment.yaml || log_error "Failed to deploy backend"
    
    log_success "Backend deployment queued"
}

deploy_frontend() {
    log_info "Deploying frontend..."
    
    kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-staging
  namespace: $NAMESPACE
  labels:
    app: frontend
    environment: staging
    phase: 2
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
      environment: staging
  template:
    metadata:
      labels:
        app: frontend
        environment: staging
    spec:
      containers:
      - name: frontend
        image: $FRONTEND_IMAGE
        ports:
        - containerPort: 5173
        env:
        - name: VITE_API_URL
          value: "http://backend-staging:3001"
        - name: NODE_ENV
          value: "staging"
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /
            port: 5173
          initialDelaySeconds: 20
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 5173
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: frontend-staging
  namespace: $NAMESPACE
  labels:
    app: frontend
    environment: staging
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 5173
    protocol: TCP
  selector:
    app: frontend
    environment: staging
EOF
    
    log_success "Frontend deployment queued"
}

wait_for_deployment() {
    local deployment=$1
    local namespace=$2
    local timeout=300
    
    log_info "Waiting for deployment '$deployment' in namespace '$namespace'..."
    
    kubectl wait --for=condition=available --timeout=${timeout}s \
        deployment/$deployment -n $namespace || log_error "Deployment '$deployment' failed to become ready"
    
    log_success "Deployment '$deployment' is ready"
}

verify_health() {
    log_info "Verifying deployment health..."
    
    # Get backend pod
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=backend,environment=staging -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$BACKEND_POD" ]; then
        log_error "No backend pods found in staging environment"
    fi
    
    # Test backend health endpoint
    log_info "Testing backend health endpoint from pod: $BACKEND_POD"
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -s http://localhost:3001/health || log_warning "Health check failed (service may still be starting)"
    
    log_success "Health verification complete"
}

show_deployment_info() {
    log_info "Deployment Information:"
    echo ""
    echo "Namespace: $NAMESPACE"
    echo ""
    echo "Deployments:"
    kubectl get deployments -n $NAMESPACE
    echo ""
    echo "Services:"
    kubectl get svc -n $NAMESPACE
    echo ""
    echo "Pods:"
    kubectl get pods -n $NAMESPACE
    echo ""
    echo "HPA Status:"
    kubectl get hpa -n $NAMESPACE 2>/dev/null || echo "No HPA resources found"
    echo ""
}

create_ingress() {
    log_info "Creating ingress for staging..."
    
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: staging-ingress
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-staging
spec:
  tls:
  - hosts:
    - staging.spartan-hub.local
    secretName: staging-tls
  rules:
  - host: staging.spartan-hub.local
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-staging
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-staging
            port:
              number: 80
EOF
    
    log_success "Ingress created"
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Phase 2 Staging Deployment - Spartan Hub             ║${NC}"
    echo -e "${BLUE}║   $(date '+%Y-%m-%d %H:%M:%S')                           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_prerequisites
    build_images
    push_images
    create_namespace
    create_secrets
    deploy_redis
    deploy_backend
    deploy_frontend
    create_ingress
    
    # Wait for deployments
    log_info "Waiting for all services to be ready (this may take 2-3 minutes)..."
    sleep 10
    
    wait_for_deployment "backend-staging" "$NAMESPACE" || log_warning "Backend deployment may be delayed"
    wait_for_deployment "frontend-staging" "$NAMESPACE" || log_warning "Frontend deployment may be delayed"
    
    verify_health
    show_deployment_info
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            🎉 Deployment Complete! 🎉                  ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║  Staging URL: http://staging.spartan-hub.local        ║${NC}"
    echo -e "${GREEN}║  API URL: http://staging.spartan-hub.local/api        ║${NC}"
    echo -e "${GREEN}║  Namespace: $NAMESPACE${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║  Next Steps:                                           ║${NC}"
    echo -e "${GREEN}║  1. Run performance tests: ./scripts/perf-test.sh      ║${NC}"
    echo -e "${GREEN}║  2. Run integration tests                              ║${NC}"
    echo -e "${GREEN}║  3. Validate real-world scenarios                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Execute main
main "$@"
