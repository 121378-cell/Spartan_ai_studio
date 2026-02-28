# 🏗️ INFRASTRUCTURE SETUP GUIDE

**Project:** Spartan Hub 2.0  
**Version:** 2.0  
**Last Updated:** 28 de Febrero de 2026  
**Status:** ✅ **PRODUCTION-READY INFRASTRUCTURE**

---

## 📋 OVERVIEW

Spartan Hub 2.0 cuenta con una **infraestructura completa y production-ready** que incluye:

- ✅ **Docker Compose** para desarrollo y staging
- ✅ **Kubernetes manifests** para producción
- ✅ **Helm charts** para deployment gestionado
- ✅ **Monitoring stack** (Prometheus + Grafana)
- ✅ **CI/CD pipelines** en GitHub Actions
- ✅ **Backup automation** para base de datos

---

## 🎯 ARQUITECTURA DE INFRAESTRUCTURA

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ENVIRONMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐         ┌────────────────┐              │
│  │   Frontend     │         │    Backend     │              │
│  │   (Vite/React) │         │  (Express/Node)│              │
│  │   Port: 80     │◄───────►│   Port: 3001   │              │
│  └────────────────┘         └───────┬────────┘              │
│                                      │                       │
│         ┌───────────────────────────┼───────────────────┐   │
│         │                           │                   │   │
│  ┌──────▼────────┐         ┌───────▼────────┐  ┌───────▼──┐│
│  │   PostgreSQL  │         │     Redis      │  │   Qdrant ││
│  │   (Database)  │         │    (Cache)     │  │ (Vector) ││
│  │   Port: 5434  │         │   Port: 6380   │  │  Port:   ││
│  └───────────────┘         └────────────────┘  │   6333   ││
│                                                 └──────────┘│
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Monitoring Stack                         │   │
│  │  ┌──────────────┐         ┌──────────────────┐       │   │
│  │  │  Prometheus  │         │     Grafana      │       │   │
│  │  │  (Metrics)   │         │  (Dashboards)    │       │   │
│  │  └──────────────┘         └──────────────────┘       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐳 DOCKER COMPOSE (Desarrollo / Staging)

### Archivos Disponibles

| Archivo | Propósito | Puerto |
|---------|-----------|--------|
| `docker-compose.yml` | Main stack | 5173, 3001 |
| `docker-compose.monitoring.yml` | Monitoring stack | 9090, 3000 |
| `scripts/docker/docker-compose.yml` | Alternative config | - |
| `scripts/docker/docker-compose.secure.yml` | Security-hardened | - |
| `scripts/docker/docker-compose.secrets.yml` | Secrets management | - |

### Quick Start - Desarrollo

```bash
# 1. Iniciar aplicación completa
cd spartan-hub
docker-compose up --build

# Frontend: http://localhost:5173
# Backend: http://localhost:3001

# 2. Iniciar monitoring (opcional)
docker-compose -f docker-compose.monitoring.yml up -d

# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000

# 3. Ver logs
docker-compose logs -f

# 4. Detener todo
docker-compose down
```

### Servicios Incluidos

```yaml
services:
  frontend:
    image: spartan-hub-frontend:latest
    ports:
      - "5173:80"
    depends_on:
      - backend
  
  backend:
    image: spartan-hub-backend:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_TYPE=sqlite
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15-alpine
    ports:
      - "5434:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:alpine
    ports:
      - "6380:6379"
  
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
```

---

## ☸️ KUBERNETES (Producción)

### Manifiestos Disponibles

**Directorio:** `k8s/`

| Archivo | Recurso | Descripción |
|---------|---------|-------------|
| `namespace.yaml` | Namespace | spartan-hub production |
| `staging-namespace.yaml` | Namespace | spartan-hub-staging |
| `backend-deployment.yaml` | Deployment | Backend replicas |
| `backend-service.yaml` | Service | Backend service |
| `frontend-deployment.yaml` | Deployment | Frontend replicas |
| `frontend-service.yaml` | Service | Frontend service |
| `ingress.yaml` | Ingress | Routing & SSL |
| `hpa.yaml` | HorizontalPodAutoscaler | Auto-scaling |
| `configmap.yaml` | ConfigMap | Environment config |
| `prometheus-deployment.yaml` | Deployment | Metrics collection |
| `grafana-deployment.yaml` | Deployment | Dashboards |
| `redis-statefulset.yaml` | StatefulSet | Redis cluster |

### Quick Start - Kubernetes

```bash
# 1. Crear namespace
kubectl apply -f k8s/namespace.yaml

# 2. Aplicar configmap
kubectl apply -f k8s/configmap.yaml -n spartan-hub

# 3. Deploy backend
kubectl apply -f k8s/backend-deployment.yaml -n spartan-hub
kubectl apply -f k8s/backend-service.yaml -n spartan-hub

# 4. Deploy frontend
kubectl apply -f k8s/frontend-deployment.yaml -n spartan-hub
kubectl apply -f k8s/frontend-service.yaml -n spartan-hub

# 5. Deploy monitoring
kubectl apply -f k8s/prometheus-deployment.yaml -n spartan-hub
kubectl apply -f k8s/grafana-deployment.yaml -n spartan-hub

# 6. Deploy ingress
kubectl apply -f k8s/ingress.yaml -n spartan-hub

# 7. Ver status
kubectl get all -n spartan-hub

# 8. Ver logs
kubectl logs -f deployment/spartan-hub-backend -n spartan-hub
```

### Auto-Scaling (HPA)

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spartan-hub-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Comandos:**

```bash
# Aplicar HPA
kubectl apply -f k8s/hpa.yaml

# Ver status de auto-scaling
kubectl get hpa -n spartan-hub

# Ver métricas
kubectl top pods -n spartan-hub
```

---

## 📦 HELM CHARTS (Producción Gestionada)

### Estructura del Chart

**Directorio:** `scripts/deployment/helm/spartan-hub/`

```
spartan-hub/
├── Chart.yaml
├── values.yaml
├── values-production.yaml
├── values-staging.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── hpa.yaml
    └── _helpers.tpl
```

### Quick Start - Helm

```bash
# 1. Instalar en staging
helm upgrade --install spartan-hub-staging ./scripts/deployment/helm/spartan-hub \
  --namespace spartan-hub-staging \
  --create-namespace \
  --values ./scripts/deployment/helm/spartan-hub/values-staging.yaml \
  --set image.tag=latest \
  --wait

# 2. Instalar en producción
helm upgrade --install spartan-hub-production ./scripts/deployment/helm/spartan-hub \
  --namespace spartan-hub-production \
  --create-namespace \
  --values ./scripts/deployment/helm/spartan-hub/values-production.yaml \
  --set image.tag=v2.0.0 \
  --wait

# 3. Ver status
helm list -n spartan-hub-production

# 4. Ver historial
helm history spartan-hub-production -n spartan-hub-production

# 5. Rollback (si es necesario)
helm rollback spartan-hub-production -n spartan-hub-production
```

### Values por Ambiente

**Staging (values-staging.yaml):**
```yaml
replicaCount: 2
resources:
  limits:
    cpu: 500m
    memory: 512Mi
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
ingress:
  host: staging.spartan-hub.com
```

**Production (values-production.yaml):**
```yaml
replicaCount: 5
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 15
ingress:
  host: spartan-hub.com
```

---

## 🔄 CI/CD PIPELINE

### GitHub Actions Workflows

**Directorio:** `.github/workflows/`

| Workflow | Archivo | Trigger |
|----------|---------|---------|
| **CI Pipeline** | `ci.yml` | Push, PR |
| **Comprehensive CI/CD** | `comprehensive-cicd.yml` | Push, PR |
| **Deploy** | `deploy.yml` | Manual |
| **Production Pipeline** | `production-pipeline.yml` | Merge to main |
| **Quality Gates** | `quality.yml` | PR |
| **Code Review** | `code-review.yml` | PR |
| **K8s CI/CD** | `k8s-cicd.yml` | Push, PR |
| **PR Automated Checks** | `pr-automated-checks.yml` | PR |

### Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CODE QUALITY                                             │
│     ├─ Lint (ESLint)                                        │
│     ├─ Type Check (TypeScript)                              │
│     └─ Security Scan (Snyk, Trivy)                          │
│                                                              │
│  2. TESTING                                                  │
│     ├─ Unit Tests (Jest)                                    │
│     ├─ Integration Tests                                    │
│     ├─ E2E Tests (Cypress)                                  │
│     └─ Coverage Check (≥80%)                                │
│                                                              │
│  3. BUILD                                                    │
│     ├─ Build Frontend                                       │
│     ├─ Build Backend                                        │
│     └─ Build Docker Images                                  │
│                                                              │
│  4. DEPLOY TO STAGING                                        │
│     ├─ Deploy to staging namespace                          │
│     ├─ Smoke Tests                                          │
│     └─ Health Checks                                        │
│                                                              │
│  5. DEPLOY TO PRODUCTION (manual approval)                  │
│     ├─ Deploy to production namespace                       │
│     ├─ Health Checks                                        │
│     └─ Database Migration                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Comandos Útiles

```bash
# Trigger manual deploy (GitHub CLI)
gh workflow run deploy.yml --ref main

# Ver status del pipeline
gh run list --workflow=production-pipeline.yml

# Ver logs
gh run view <run-id> --log
```

---

## 📊 MONITORING SETUP

### Prometheus Configuration

**Archivo:** `k8s/prometheus-configmap.yaml`

```yaml
# Scrape configs
scrape_configs:
  - job_name: 'spartan-hub-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
  
  - job_name: 'spartan-hub-frontend'
    static_configs:
      - targets: ['frontend:80']
```

### Grafana Dashboards

**Dashboards Incluidos:**

1. **System Overview** (ID: 1)
   - CPU, Memory, Network usage
   - Pod status
   - Request rate

2. **Backend Performance** (ID: 2)
   - API response times
   - Error rates
   - Database query performance

3. **Frontend Performance** (ID: 3)
   - Page load times
   - Bundle sizes
   - User interactions

4. **Business Metrics** (ID: 4)
   - Active users
   - Form analysis sessions
   - Biometric syncs

### Acceder a Grafana

```bash
# Port forward (local)
kubectl port-forward service/grafana 3000:80 -n spartan-hub

# Default credentials
Username: admin
Password: admin123  # ⚠️ CAMBIAR EN PRODUCCIÓN
```

---

## 💾 DATABASE BACKUP

### Backup Automation

**Script:** `scripts/backupDatabase.js`

```bash
# Crear backup manual
npm run backup:run

# Programar backup automático
npm run backup:schedule

# Ver status de backups
npm run backup:status

# Testear backup
npm run backup:test

# Restaurar desde backup
npm run backup:restore
```

### Backup Schedule

```javascript
// Configuración por defecto
{
  frequency: 'daily',      // Diario
  time: '02:00',          // 2 AM
  retention: 7,           // 7 días
  destination: './backups'
}
```

### Comandos de Recuperación

```bash
# Listar backups disponibles
ls -lh backups/

# Restaurar backup específico
npm run backup:restore -- --file=backups/backup-2026-02-28.db

# Verificar integridad
npm run backup:verify -- --file=backups/backup-2026-02-28.db
```

---

## 🔒 SECURITY HARDENING

### Security Scans

```bash
# Docker security scan
./scripts/docker-security-scan.sh

# Quick security check
./scripts/quick-security-check.sh

# NPM audit
npm audit --audit-level high

# Snyk scan (CI/CD)
snyk test --file=package.json
```

### Secrets Management

**Archivos de secretos:**
- `.env.example` → Template
- `.env.production.example` → Production template
- `backend/secrets/` → Secret files

**Generar secrets:**

```bash
# Generar secrets para Docker
cd scripts/docker
./generate_secrets.sh

# Verificar secrets
npm run verify:secrets
```

---

## 🚀 DEPLOYMENT PROCEDURES

### Deploy a Staging

```bash
# Opción 1: Kubernetes
kubectl apply -f k8s/staging-namespace.yaml
kubectl apply -f k8s/backend-staging-deployment.yaml -n spartan-hub-staging

# Opción 2: Helm
helm upgrade --install spartan-hub-staging ./scripts/deployment/helm/spartan-hub \
  --namespace spartan-hub-staging \
  --values ./scripts/deployment/helm/spartan-hub/values-staging.yaml

# Opción 3: Docker Compose
docker-compose -f docker-compose.staging.yml up -d
```

### Deploy a Production

```bash
# 1. Build and push images
docker build -t spartan-hub-frontend:latest ./spartan-hub
docker build -t spartan-hub-backend:latest ./spartan-hub/backend
docker push spartan-hub-frontend:latest
docker push spartan-hub-backend:latest

# 2. Deploy with Helm (recommended)
helm upgrade --install spartan-hub-production ./scripts/deployment/helm/spartan-hub \
  --namespace spartan-hub-production \
  --values ./scripts/deployment/helm/spartan-hub/values-production.yaml \
  --set image.tag=latest \
  --wait --timeout=10m

# 3. Run database migration
kubectl exec deployment/spartan-hub-backend -n spartan-hub-production -- npm run migrate

# 4. Verify deployment
kubectl rollout status deployment/spartan-hub-backend -n spartan-hub-production
kubectl rollout status deployment/spartan-hub-frontend -n spartan-hub-production

# 5. Run smoke tests
curl -f https://spartan-hub.com/api/health
curl -f https://spartan-hub.com/
```

### Rollback Procedure

```bash
# Helm rollback
helm rollback spartan-hub-production -n spartan-hub-production

# Kubernetes rollback
kubectl rollout undo deployment/spartan-hub-backend -n spartan-hub-production

# Verify rollback
kubectl rollout status deployment/spartan-hub-backend -n spartan-hub-production
```

---

## 📋 CHECKLIST DE PRODUCCIÓN

### Pre-Deployment

```
□ Todos los tests pasando (npm test)
□ Security scan sin vulnerabilidades críticas
□ Docker images builded y pusheadas
□ Secrets configurados en el ambiente
□ Database backup creado
□ Rollback procedure documentado
```

### Deployment

```
□ Deploy a staging completado
□ Smoke tests pasando en staging
□ Aprobación de stakeholders obtenida
□ Deploy a producción iniciado
□ Health checks pasando
□ Database migration ejecutada
□ Monitoring verificado
```

### Post-Deployment

```
□ Verificar métricas de negocio
□ Monitorear error rates (<1%)
□ Verificar performance (p99 <500ms)
□ Actualizar documentación
□ Notificar a stakeholders
□ Programar post-mortem review
```

---

## 🆘 TROUBLESHOOTING

### Problemas Comunes

#### Pod no inicia

```bash
# Ver logs
kubectl logs deployment/spartan-hub-backend -n spartan-hub

# Describir pod
kubectl describe pod <pod-name> -n spartan-hub

# Ver eventos
kubectl get events -n spartan-hub --sort-by='.lastTimestamp'
```

#### Database connection failed

```bash
# Verificar secret
kubectl get secret postgres-credentials -n spartan-hub -o yaml

# Testear conexión
kubectl run postgres-test --image=postgres:15-alpine -it --rm \
  --env="PGPASSWORD=<password>" \
  -- psql -h postgres -U postgres -d spartan_db
```

#### High memory usage

```bash
# Ver top pods
kubectl top pods -n spartan-hub

# Ajustar limits
kubectl edit deployment/spartan-hub-backend -n spartan-hub

# Restart pod
kubectl delete pod <pod-name> -n spartan-hub
```

---

## 📞 SOPORTE

### Recursos Adicionales

- **GitHub Issues:** https://github.com/spartan-hub/spartan-hub/issues
- **Documentation:** `docs/INDEX.md`
- **Runbooks:** `scripts/deployment/runbooks/`

### Contactos de Emergencia

| Rol | Contacto |
|-----|----------|
| DevOps Lead | devops@spartan-hub.com |
| Backend Lead | backend@spartan-hub.com |
| Security Lead | security@spartan-hub.com |

---

**Última Actualización:** 28 de Febrero de 2026  
**Versión:** 2.0  
**Estado:** ✅ **PRODUCTION-READY**
