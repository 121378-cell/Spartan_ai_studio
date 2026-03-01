# Auto-Scaling Configuration - Spartan Hub 2.0
## Horizontal and Vertical Scaling Guide

**Version:** 1.0
**Last Updated:** March 1, 2026
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Scaling Architecture](#scaling-architecture)
3. [Horizontal Scaling](#horizontal-scaling)
4. [Vertical Scaling](#vertical-scaling)
5. [Docker Swarm Scaling](#docker-swarm-scaling)
6. [Kubernetes Scaling](#kubernetes-scaling)
7. [AWS Auto Scaling](#aws-auto-scaling)
8. [Resource Limits](#resource-limits)
9. [Monitoring & Triggers](#monitoring--triggers)

---

## Overview

Spartan Hub 2.0 supports multiple auto-scaling strategies to handle varying traffic loads while maintaining performance and cost efficiency.

### Scaling Goals

| Metric | Target | Scale Up | Scale Down |
|--------|--------|----------|------------|
| CPU Usage | 60% | > 70% for 5 min | < 30% for 10 min |
| Memory Usage | 70% | > 80% for 5 min | < 40% for 10 min |
| Request Rate | 1000 req/s | > 1500 for 2 min | < 500 for 5 min |
| Response Time (P95) | 500ms | > 1s for 3 min | < 300ms for 10 min |
| Queue Depth | 100 | > 500 for 2 min | < 50 for 5 min |

### Scaling Strategies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Auto-Scaling Architecture                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   Metrics   │
                              │  (Prometheus)│
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
            │  Horizontal   │ │   Vertical    │ │   Scheduled   │
            │  Pod Autoscaler│ │  Pod Autoscaler│ │   Scaling    │
            │  (HPA)        │ │  (VPA)        │ │              │
            └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                                     ▼
                          ┌───────────────────┐
                          │   Cluster Autoscaler│
                          │   (Node Scaling)   │
                          └───────────────────┘
                                     │
                                     ▼
                          ┌───────────────────┐
                          │   Load Balancer   │
                          │   (NGINX/ALB)     │
                          └───────────────────┘
```

---

## Horizontal Scaling

### When to Use Horizontal Scaling

- Traffic spikes (flash sales, marketing campaigns)
- Seasonal patterns (New Year resolutions, summer)
- Unpredictable growth
- High availability requirements

### Docker Compose Scaling

**Scale Backend Services:**

```bash
# Scale backend to 5 instances
docker-compose up -d --scale backend=5

# Scale with specific service names
docker-compose up -d --scale backend-1=1 --scale backend-2=1 --scale backend-3=1
```

**Docker Compose with Scaling:**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: spartan-hub-backend:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s
        order: start-first
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Node.js Cluster Mode

**Enable Clustering in Backend:**

```javascript
// backend/src/cluster.js
const cluster = require('cluster');
const os = require('os');
const express = require('express');

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} started`);
  console.log(`Forking ${numCPUs} workers`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exit
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Forking a new worker...');
    cluster.fork();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Primary received SIGTERM. Shutting down workers...');
    Object.values(cluster.workers).forEach(worker => {
      worker.send('shutdown');
    });
    setTimeout(() => process.exit(0), 5000);
  });

} else {
  // Worker processes
  const app = express();
  const PORT = process.env.PORT || 3001;

  // Your app routes here
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      worker: process.pid,
      memory: process.memoryUsage()
    });
  });

  app.listen(PORT, () => {
    console.log(`Worker ${process.pid} listening on port ${PORT}`);
  });
}
```

### Load Balancer Configuration for Horizontal Scaling

**NGINX Upstream Configuration:**

```nginx
upstream backend {
    least_conn;  # Least connections algorithm
    
    # Backend instances
    server backend-1:3001 weight=5 max_fails=3 fail_timeout=30s;
    server backend-2:3001 weight=5 max_fails=3 fail_timeout=30s;
    server backend-3:3001 weight=5 max_fails=3 fail_timeout=30s;
    server backend-4:3001 weight=5 max_fails=3 fail_timeout=30s;
    server backend-5:3001 weight=5 max_fails=3 fail_timeout=30s backup;
    
    # Keepalive connections
    keepalive 64;
    keepalive_requests 1000;
    keepalive_timeout 60s;
}

# Alternative: IP Hash for session persistence
upstream backend_sticky {
    ip_hash;
    server backend-1:3001;
    server backend-2:3001;
    server backend-3:3001;
}

# Alternative: Round Robin (default)
upstream backend_round_robin {
    server backend-1:3001;
    server backend-2:3001;
    server backend-3:3001;
}
```

---

## Vertical Scaling

### When to Use Vertical Scaling

- Memory-intensive operations
- CPU-bound workloads
- Database operations
- When horizontal scaling is not cost-effective

### Resource Allocation Guidelines

**Backend Service:**

| Instance Size | CPU | Memory | Max Concurrent Users |
|---------------|-----|--------|---------------------|
| Small | 0.5 core | 512MB | 100 |
| Medium | 1 core | 1GB | 500 |
| Large | 2 cores | 2GB | 2000 |
| XLarge | 4 cores | 4GB | 5000 |

**Database Service:**

| Instance Size | CPU | Memory | Storage | Max Connections |
|---------------|-----|--------|---------|-----------------|
| Small | 1 core | 2GB | 20GB | 50 |
| Medium | 2 cores | 4GB | 50GB | 100 |
| Large | 4 cores | 8GB | 100GB | 200 |
| XLarge | 8 cores | 16GB | 500GB | 500 |

### Docker Resource Limits

```yaml
# docker-compose.yml
services:
  backend:
    image: spartan-hub-backend:latest
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 8G
        reservations:
          cpus: '1.0'
          memory: 2G

  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Node.js Memory Optimization

```javascript
// backend/src/memory-config.js

// Set memory limits
const MAX_MEMORY = process.env.MAX_MEMORY || '1536M';

// Configure garbage collection
if (process.env.NODE_ENV === 'production') {
  // Expose GC for monitoring
  require('expose-gc');
}

// Memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  const heapUsed = usage.heapUsed / 1024 / 1024;
  const heapTotal = usage.heapTotal / 1024 / 1024;
  
  console.log(`Memory: ${heapUsed.toFixed(2)}MB / ${heapTotal.toFixed(2)}MB`);
  
  // Alert if memory usage is high
  if (heapUsed / heapTotal > 0.8) {
    console.warn('WARNING: High memory usage detected');
  }
}, 30000);
```

---

## Docker Swarm Scaling

### Initialize Swarm

```bash
# Initialize Docker Swarm
docker swarm init --advertise-addr <MANAGER-IP>

# Join worker nodes
docker swarm join --token <TOKEN> <MANAGER-IP>:2377
```

### Create Swarm Service

```bash
# Create service with auto-scaling
docker service create \
  --name spartan-backend \
  --replicas 3 \
  --replicas-max-per-node 2 \
  --reserve-memory 256M \
  --limit-memory 512M \
  --reserve-cpu 0.25 \
  --limit-cpu 1.0 \
  --network spartan-network \
  spartan-hub-backend:latest

# Scale service
docker service scale spartan-backend=5

# Update service with rolling update
docker service update \
  --replicas 5 \
  --update-parallelism 1 \
  --update-delay 10s \
  --update-failure-action rollback \
  spartan-backend
```

### Swarm Stack with Scaling

```yaml
# docker-stack.yml
version: '3.8'

services:
  backend:
    image: spartan-hub-backend:latest
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
        order: stop-first
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
      placement:
        constraints:
          - node.role == worker
        preferences:
          - spread: node.labels.zone
      labels:
        - "com.spartan-hub.service=backend"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - spartan-network

  frontend:
    image: spartan-hub-frontend:latest
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
    networks:
      - spartan-network

networks:
  spartan-network:
    driver: overlay
    attachable: true
```

### Deploy Swarm Stack

```bash
# Deploy stack
docker stack deploy -c docker-stack.yml spartan-hub

# Check service status
docker service ls

# Scale service
docker service scale spartan-hub_backend=5

# View service logs
docker service logs spartan-hub_backend

# Remove stack
docker stack rm spartan-hub
```

---

## Kubernetes Scaling

### Horizontal Pod Autoscaler (HPA)

```yaml
# k8s/hpa-backend.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spartan-backend-hpa
  namespace: spartan-hub
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spartan-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: 100
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
        - type: Pods
          value: 2
          periodSeconds: 30
      selectPolicy: Max
```

### Vertical Pod Autoscaler (VPA)

```yaml
# k8s/vpa-backend.yml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: spartan-backend-vpa
  namespace: spartan-hub
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spartan-backend
  updatePolicy:
    updateMode: "Auto"  # Options: Off, Initial, Auto
  resourcePolicy:
    containerPolicies:
      - containerName: backend
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 2000m
          memory: 2Gi
        controlledResources:
          - cpu
          - memory
        controlledValues: RequestsAndLimits
```

### Cluster Autoscaler

```yaml
# k8s/cluster-autoscaler.yml
apiVersion: v1
kind: ServiceAccount
metadata:
  labels:
    k8s-addon: cluster-autoscaler.addons.k8s.io
  name: cluster-autoscaler
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-autoscaler
rules:
  - apiGroups: [""]
    resources: ["events", "endpoints"]
    verbs: ["create", "patch"]
  - apiGroups: [""]
    resources: ["pods/eviction"]
    verbs: ["create"]
  - apiGroups: [""]
    resources: ["pods/status"]
    verbs: ["update"]
  - apiGroups: [""]
    resources: ["endpoints"]
    resourceNames: ["cluster-autoscaler"]
    verbs: ["get", "update"]
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["watch", "list", "get", "update"]
  - apiGroups: [""]
    resources: ["namespaces", "pods", "services", "replicationcontrollers", "persistentvolumeclaims", "persistentvolumes"]
    verbs: ["watch", "list", "get"]
---
apiVersion: autoscaling.k8s.io/v1
kind: ClusterAutoscaler
metadata:
  name: cluster-autoscaler
spec:
  scaleDown:
    enabled: true
    delayAfterAdd: 10m
    delayAfterDelete: 5m
    delayAfterFailure: 3m
    unneededTime: 10m
  resourceLimits:
    maxNodeProvisionTime: 15m
    maxNodesTotal: 10
    cores:
      min: 4
      max: 40
    memory:
      min: 8Gi
      max: 160Gi
```

### Kubernetes Deployment with Resources

```yaml
# k8s/deployment-backend.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spartan-backend
  namespace: spartan-hub
  labels:
    app: spartan-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spartan-backend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: spartan-backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3001"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: backend
          image: spartan-hub-backend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3001
              name: http
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3001"
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 10"]
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels:
                    app: spartan-backend
                topologyKey: kubernetes.io/hostname
      terminationGracePeriodSeconds: 60
```

---

## AWS Auto Scaling

### Auto Scaling Group

```json
// asg-config.json
{
  "AutoScalingGroupName": "spartan-hub-backend-asg",
  "LaunchTemplate": {
    "LaunchTemplateId": "lt-xxxxxxxxx",
    "Version": "$Latest"
  },
  "MinSize": 2,
  "MaxSize": 10,
  "DesiredCapacity": 3,
  "DefaultCooldown": 300,
  "AvailabilityZones": ["us-east-1a", "us-east-1b", "us-east-1c"],
  "HealthCheckType": "ELB",
  "HealthCheckGracePeriod": 300,
  "TargetGroupARNs": ["arn:aws:elasticloadbalancing:..."],
  "TerminationPolicies": ["OldestInstance"],
  "NewInstancesProtectedFromScaleIn": false
}
```

### Scaling Policies

**Target Tracking Policy:**

```json
// target-tracking-policy.json
{
  "TargetTrackingConfiguration": {
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 70.0
  },
  "Cooldown": 300,
  "PolicyName": "cpu-target-tracking"
}
```

**Step Scaling Policy:**

```json
// step-scaling-policy.json
{
  "AdjustmentType": "ChangeInCapacity",
  "StepAdjustments": [
    {
      "MetricIntervalLowerBound": 0,
      "MetricIntervalUpperBound": 10,
      "ScalingAdjustment": 1
    },
    {
      "MetricIntervalLowerBound": 10,
      "MetricIntervalUpperBound": 20,
      "ScalingAdjustment": 2
    },
    {
      "MetricIntervalLowerBound": 20,
      "ScalingAdjustment": 3
    }
  ],
  "Cooldown": 300,
  "PolicyName": "request-count-step-scaling"
}
```

### AWS CLI Commands

```bash
# Create Auto Scaling Group
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name spartan-hub-asg \
  --launch-template LaunchTemplateId=lt-xxxxxxxxx,Version='$Latest' \
  --min-size 2 \
  --max-size 10 \
  --desired-capacity 3 \
  --vpc-zone-identifier subnet-xxxxx,subnet-yyyyy,subnet-zzzzz \
  --target-group-arns arn:aws:elasticloadbalancing:... \
  --health-check-type ELB \
  --health-check-grace-period 300

# Create scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name spartan-hub-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration file://target-tracking-policy.json

# Update desired capacity
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name spartan-hub-asg \
  --desired-capacity 5

# Describe Auto Scaling Group
aws autoscaling describe-auto-scaling-groups \
  --auto-scaling-group-names spartan-hub-asg
```

---

## Resource Limits

### Production Resource Configuration

**Backend Service:**

```yaml
# Resource limits for backend
resources:
  requests:
    cpu: 250m      # 0.25 CPU cores
    memory: 256Mi  # 256 MB RAM
  limits:
    cpu: 1000m     # 1 CPU core
    memory: 512Mi  # 512 MB RAM
```

**Database Service:**

```yaml
# Resource limits for PostgreSQL
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 4Gi
```

**Redis Service:**

```yaml
# Resource limits for Redis
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

### Node.js Process Limits

```javascript
// backend/src/resource-limits.js

// Set max old space size
const MAX_OLD_SPACE_SIZE = process.env.MAX_OLD_SPACE_SIZE || 1024;

// Configure V8 flags
require('v8').setFlagsFromString(`--max-old-space-size=${MAX_OLD_SPACE_SIZE}`);

// Set max listeners
require('events').EventEmitter.defaultMaxListeners = 20;

// Configure connection pool
const MAX_CONNECTIONS = process.env.MAX_CONNECTIONS || 100;
const CONNECTION_TIMEOUT = process.env.CONNECTION_TIMEOUT || 30000;

module.exports = {
  MAX_OLD_SPACE_SIZE,
  MAX_CONNECTIONS,
  CONNECTION_TIMEOUT
};
```

### System Limits Configuration

```bash
# /etc/security/limits.conf for production servers

# Increase file descriptor limits
* soft nofile 65536
* hard nofile 65536

# Increase process limits
* soft nproc 65536
* hard nproc 65536

# Increase memory lock limits
* soft memlock unlimited
* hard memlock unlimited
```

```bash
# sysctl.conf optimizations
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
vm.max_map_count = 262144
```

---

## Monitoring & Triggers

### Prometheus Metrics for Scaling

```yaml
# Scaling alert rules
groups:
  - name: scaling-alerts
    rules:
      # Scale Up Trigger
      - alert: HighCPUForScaling
        expr: avg(rate(process_cpu_seconds_total{job="backend"}[5m])) > 0.7
        for: 5m
        labels:
          severity: warning
          action: scale_up
        annotations:
          summary: "High CPU - consider scaling up"
          description: "CPU usage is {{ $value | printf \"%.1f%%\" }} for 5 minutes"

      - alert: HighMemoryForScaling
        expr: avg(process_resident_memory_bytes{job="backend"}) / 1024 / 1024 / 1024 > 1.4
        for: 5m
        labels:
          severity: warning
          action: scale_up
        annotations:
          summary: "High Memory - consider scaling up"
          description: "Memory usage is {{ $value | printf \"%.2f\" }}GB for 5 minutes"

      # Scale Down Trigger
      - alert: LowCPUForScaling
        expr: avg(rate(process_cpu_seconds_total{job="backend"}[10m])) < 0.3
        for: 10m
        labels:
          severity: info
          action: scale_down
        annotations:
          summary: "Low CPU - consider scaling down"
          description: "CPU usage is {{ $value | printf \"%.1f%%\" }} for 10 minutes"
```

### Custom Scaling Script

```bash
#!/bin/bash
# scripts/auto-scale.sh

# Configuration
MIN_REPLICAS=2
MAX_REPLICAS=10
CPU_THRESHOLD=70
MEMORY_THRESHOLD=80
SCALE_UP_COOLDOWN=300
SCALE_DOWN_COOLDOWN=600

# Get current metrics
CURRENT_CPU=$(curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode "query=avg(rate(process_cpu_seconds_total{job=\"backend\"}[5m])) * 100" \
  | jq -r '.data.result[0].value[1]')

CURRENT_MEMORY=$(curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode "query=avg(process_resident_memory_bytes{job=\"backend\"}) / 1024 / 1024 / 1024 * 100 / 2" \
  | jq -r '.data.result[0].value[1]')

CURRENT_REPLICAS=$(docker service ls --filter name=spartan-backend --format "{{.Replicas}}" | cut -d'/' -f2)

# Scale up logic
if (( $(echo "$CURRENT_CPU > $CPU_THRESHOLD" | bc -l) )) || \
   (( $(echo "$CURRENT_MEMORY > $MEMORY_THRESHOLD" | bc -l) )); then
  if [ $CURRENT_REPLICAS -lt $MAX_REPLICAS ]; then
    NEW_REPLICAS=$((CURRENT_REPLICAS + 1))
    echo "Scaling up from $CURRENT_REPLICAS to $NEW_REPLICAS"
    docker service scale spartan-backend=$NEW_REPLICAS
  fi
fi

# Scale down logic
if (( $(echo "$CURRENT_CPU < 30" | bc -l) )) && \
   (( $(echo "$CURRENT_MEMORY < 40" | bc -l) )); then
  if [ $CURRENT_REPLICAS -gt $MIN_REPLICAS ]; then
    NEW_REPLICAS=$((CURRENT_REPLICAS - 1))
    echo "Scaling down from $CURRENT_REPLICAS to $NEW_REPLICAS"
    docker service scale spartan-backend=$NEW_REPLICAS
  fi
fi
```

### Scheduled Scaling

```yaml
# k8s/scheduled-scaling-cronjob.yml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-scaling
  namespace: spartan-hub
spec:
  schedule: "0 8 * * *"  # Every day at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Scale up for business hours
                  kubectl scale deployment spartan-backend --replicas=5 -n spartan-hub
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-scale-down
  namespace: spartan-hub
spec:
  schedule: "0 20 * * *"  # Every day at 8 PM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: kubectl
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Scale down for off-hours
                  kubectl scale deployment spartan-backend --replicas=2 -n spartan-hub
          restartPolicy: OnFailure
```

---

## Quick Reference

### Docker Scaling Commands

```bash
# Scale service
docker service scale SERVICE_NAME=REPLICAS

# View service status
docker service ls
docker service ps SERVICE_NAME

# Update service resources
docker service update \
  --limit-cpu 2.0 \
  --limit-memory 2G \
  SERVICE_NAME

# Rollback service
docker service rollback SERVICE_NAME
```

### Kubernetes Scaling Commands

```bash
# Scale deployment
kubectl scale deployment spartan-backend --replicas=5 -n spartan-hub

# View HPA status
kubectl get hpa -n spartan-hub

# View VPA status
kubectl get vpa -n spartan-hub

# View resource usage
kubectl top pods -n spartan-hub
kubectl top nodes

# Edit HPA
kubectl edit hpa spartan-backend-hpa -n spartan-hub
```

### AWS Scaling Commands

```bash
# Update ASG capacity
aws autoscaling update-auto-scaling-group \
  --auto-scaling-group-name spartan-hub-asg \
  --desired-capacity 5

# Execute scaling policy
aws autoscaling execute-policy \
  --auto-scaling-group-name spartan-hub-asg \
  --policy-name cpu-target-tracking

# Describe scaling activities
aws autoscaling describe-scaling-activities \
  --auto-scaling-group-name spartan-hub-asg
```

---

**Document Created:** March 1, 2026
**Next Review:** After production deployment
**Owner:** DevOps Team

---

<p align="center">
  <strong>🚀 Spartan Hub 2.0 - Auto-Scaling Configuration</strong><br>
  <em>Scale Efficiently, Perform Consistently</em>
</p>
