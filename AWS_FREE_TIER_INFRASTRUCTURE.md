# 🆓 AWS FREE TIER INFRASTRUCTURE
## Spartan Hub 2.0 - Staging Gratuito

**Versión:** 2.0.0 (Free Tier Optimized)  
**Fecha:** March 1, 2026  
**Costo:** **$0/mes** (Free Tier) + ~$5-10/mes (servicios básicos)

---

## 🎯 ESTRATEGIA FREE TIER

### Servicios Free Tier (12 meses gratis)

| Servicio | Configuración Free Tier | Límite |
|----------|------------------------|--------|
| **EC2** | t2.micro o t3.micro | 750 horas/mes |
| **RDS** | db.t2.micro o db.t3.micro | 750 horas/mes |
| **S3** | Standard | 5GB |
| **CloudFront** | CDN | 1TB data transfer |
| **Lambda** | Serverless | 1M requests/mes |
| **DynamoDB** | NoSQL | 25GB storage |
| **CloudWatch** | Monitoring | 10 custom metrics |
| **SNS** | Notifications | 1000 emails/mes |
| **ALB** | Load Balancer | 750 horas (solo L7) |

### Servicios Siempre Gratis

| Servicio | Configuración | Límite |
|----------|--------------|--------|
| **Lambda** | 1M requests/mes | Siempre |
| **DynamoDB** | 25GB + 25 WCU/RCU | Siempre |
| **SNS** | 1000 emails/mes | Siempre |
| **CloudWatch** | 10 metrics + 1GB logs | Siempre |
| **S3** | 5GB Standard | Primer año |

---

## 🏗️ ARQUITECTURA FREE TIER

### Opción 1: EC2 Single Instance (Recomendada para Pruebas)

```
┌─────────────────────────────────────────────────────────┐
│                    AWS us-east-1                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐     ┌─────────────┐                  │
│  │  Route 53   │────▶│   ACM SSL   │                  │
│  │  (DNS)      │     │ Certificate │                  │
│  └─────────────┘     └──────┬──────┘                  │
│                              │                         │
│                              ▼                         │
│                    ┌─────────────────┐                │
│                    │  EC2 t2.micro   │                │
│                    │  (Free Tier)    │                │
│                    │  Frontend+Back  │                │
│                    │  Ports 80, 3001 │                │
│                    └────────┬────────┘                │
│                             │                         │
│         ┌───────────────────┴───────────────────┐    │
│         │                                       │    │
│         ▼                                       ▼    │
│ ┌─────────────────┐                   ┌─────────────────┐
│ │  RDS t2.micro   │                   │ ElastiCache     │
│ │  (Free Tier)    │                   │ cache.t2.micro  │
│ │  PostgreSQL     │                   │ (Free Tier)     │
│ │  Port 5432      │                   │ Port 6379       │
│ └─────────────────┘                   └─────────────────┘
│                                                         │
│                    ┌─────────────┐                     │
│                    │  CloudWatch │                     │
│                    │  (Free)     │                     │
│                    └─────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

**Costo Mensual Estimado:**
- EC2 t2.micro: $0 (750 horas gratis)
- RDS t2.micro: $0 (750 horas gratis)
- ElastiCache cache.t2.micro: $0 (750 horas gratis)
- S3 5GB: $0 (primer año)
- CloudFront: $0 (1TB gratis)
- CloudWatch: $0 (10 metrics gratis)
- **TOTAL: ~$0-5/mes** (solo datos y dominios)

---

### Opción 2: Serverless (Siempre Gratis)

```
┌─────────────────────────────────────────────────────────┐
│                    AWS us-east-1                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐     ┌─────────────┐                  │
│  │  Route 53   │────▶│   ACM SSL   │                  │
│  │  (DNS)      │     │ Certificate │                  │
│  └─────────────┘     └──────┬──────┘                  │
│                              │                         │
│                              ▼                         │
│                    ┌─────────────────┐                │
│                    │  CloudFront     │                │
│                    │  (CDN Free)     │                │
│                    └────────┬────────┘                │
│                             │                         │
│         ┌───────────────────┴───────────────────┐    │
│         │                                       │    │
│         ▼                                       ▼    │
│ ┌─────────────────┐                   ┌─────────────────┐
│ │    Lambda       │                   │   S3 Bucket     │
│ │  (1M free/mes)  │                   │  (5GB free)     │
│ │  Backend API    │                   │  Frontend       │
│ └────────┬────────┘                   └─────────────────┘
│          │                                            │
│          ▼                                            │
│ ┌─────────────────┐                                  │
│ │   DynamoDB      │                                  │
│ │ (25GB free)     │                                  │
│ │  Database       │                                  │
│ └─────────────────┘                                  │
│                                                       │
│                    ┌─────────────┐                   │
│                    │  CloudWatch │                   │
│                    │  (Free)     │                   │
│                    └─────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

**Costo Mensual Estimado:**
- Lambda: $0 (1M requests/mes siempre gratis)
- DynamoDB: $0 (25GB siempre gratis)
- S3: $0 (5GB primer año)
- CloudFront: $0 (1TB/mes primer año)
- CloudWatch: $0 (10 metrics siempre gratis)
- **TOTAL: ~$0-5/mes** (solo dominios)

---

## 🔧 CONFIGURACIÓN FREE TIER

### EC2 t2.micro (Recomendado para Pruebas)

**Especificaciones:**
- vCPU: 1
- RAM: 1GB
- Storage: 8GB EBS GP2
- Network: Low to Moderate

**User Data Script:**
```bash
#!/bin/bash
# Spartan Hub 2.0 - EC2 t2.micro Free Tier Setup

# Update system
yum update -y

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
yum install -y nginx
systemctl enable nginx
systemctl start nginx

# Create app directory
mkdir -p /var/www/spartan-hub
cd /var/www/spartan-hub

# Clone repository (or download build)
# git clone https://github.com/your-repo/spartan-hub.git

# Start application with PM2
pm2 start dist/server.js --name spartan-hub-backend
pm2 startup
pm2 save

# Configure Nginx for frontend
cat > /etc/nginx/conf.d/spartan-hub.conf << 'EOF'
server {
    listen 80;
    server_name staging.spartan-hub.com;
    
    location / {
        root /var/www/spartan-hub/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Restart Nginx
systemctl restart nginx

# Setup CloudWatch Logs
yum install -y amazon-cloudwatch-agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
```

### RDS t2.micro (Free Tier)

**Configuración:**
- Engine: PostgreSQL 15
- Instance: db.t2.micro
- Storage: 20GB GP2
- Multi-AZ: No (staging)
- Backups: 7 días
- Public Access: No

**Security Group:**
- Inbound: PostgreSQL (5432) from EC2 security group only

### ElastiCache cache.t2.micro (Free Tier)

**Configuración:**
- Engine: Redis 7.0
- Node Type: cache.t2.micro
- Nodes: 1
- Port: 6379

**Security Group:**
- Inbound: Redis (6379) from EC2 security group only

---

## 📊 COSTOS REALES ESTIMADOS

### Escenario Mínimo (Solo Free Tier)

| Concepto | Costo Mensual |
|----------|--------------|
| EC2 t2.micro (750h) | $0.00 |
| RDS t2.micro (750h) | $0.00 |
| ElastiCache t2.micro | $0.00 |
| S3 5GB | $0.00 (año 1) |
| CloudFront 1TB | $0.00 (año 1) |
| CloudWatch 10 metrics | $0.00 |
| **Subtotal** | **$0.00** |
| Dominio (.com) | ~$1.00/mes |
| Data transfer (10GB) | ~$1.00 |
| **TOTAL** | **~$2/mes** |

### Escenario Moderado (Uso Normal)

| Concepto | Costo Mensual |
|----------|--------------|
| EC2 t2.micro (exceso 100h) | $9.50 |
| RDS t2.micro (exceso 100h) | $9.50 |
| S3 10GB | $1.15 |
| CloudFront 500GB | $42.50 |
| CloudWatch 20 metrics | $5.00 |
| Data transfer (50GB) | $4.50 |
| **Subtotal** | **$72.15** |
| Dominio | ~$1.00/mes |
| **TOTAL** | **~$73/mes** |

---

## 🚀 DEPLOYMENT GRATUITO

### Paso 1: Crear VPC Free Tier

```bash
# Usar VPC por defecto (gratis)
aws ec2 describe-vpcs --filters "Name=isDefault,Values=true"
```

### Paso 2: Lanzar EC2 t2.micro

```bash
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t2.micro \
  --key-name spartan-hub-staging \
  --security-group-ids sg-xxxxx \
  --user-data file://userdata.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=spartan-hub-staging}]'
```

### Paso 3: Crear RDS t2.micro

```bash
aws rds create-db-instance \
  --db-instance-identifier spartan-hub-staging \
  --db-instance-class db.t2.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username spartan_staging \
  --master-user-password secure_password \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name spartan-staging-subnet \
  --backup-retention-period 7 \
  --no-multi-az
```

### Paso 4: Crear ElastiCache t2.micro

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id spartan-hub-staging-redis \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.t2.micro \
  --num-cache-nodes 1 \
  --cache-subnet-group-name spartan-staging-subnet \
  --security-group-ids sg-xxxxx
```

### Paso 5: Configurar ACM SSL (Gratis)

```bash
aws acm request-certificate \
  --domain-name staging.spartan-hub.com \
  --validation-method DNS \
  --subject-alternative-names *.staging.spartan-hub.com
```

---

## 💡 OPTIMIZACIONES DE COSTO

### 1. Auto-Start/Stop (Ahorra 70%)

**Script para apagar nights/weekends:**

```bash
# Stop EC2 at 8 PM (Mon-Fri)
0 20 * * 1-5 aws ec2 stop-instances --instance-ids i-xxxxx

# Start EC2 at 8 AM (Mon-Fri)
0 12 * * 1-5 aws ec2 start-instances --instance-ids i-xxxxx
```

**Ahorro:** ~$60/mes → ~$18/mes

### 2. Usar Spot Instances (Ahorra 90%)

```bash
aws ec2 request-spot-instances \
  --spot-price "0.005" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification file://spot-spec.json
```

**Ahorro:** ~$60/mes → ~$6/mes

### 3. Usar DynamoDB (Siempre Gratis)

En lugar de RDS:
- 25GB storage gratis
- 25 WCU/RCU gratis
- Siempre gratis (no solo 12 meses)

### 4. Usar Lambda (Siempre Gratis)

En lugar de EC2:
- 1M requests/mes gratis
- 400,000 GB-segundos gratis
- Siempre gratis

---

## 📋 CHECKLIST FREE TIER

### Antes de Deploy

- [ ] Verificar elegibilidad Free Tier (cuenta nueva <12 meses)
- [ ] Configurar billing alerts
- [ ] Establecer budget máximo ($5/mes)
- [ ] Habilitar Cost Explorer

### Durante Deploy

- [ ] Usar solo instancias t2.micro o t3.micro
- [ ] No habilitar Multi-AZ
- [ ] Usar storage mínimo (20GB)
- [ ] Configurar auto-stop nights/weekends

### Después de Deploy

- [ ] Revisar Cost Explorer diariamente
- [ ] Configurar alarmas de costo (> $5)
- [ ] Apagar recursos no usados
- [ ] Revisar recomendaciones de Trusted Advisor

---

## ⚠️ ADVERTENCIAS

### Límites Free Tier

1. **750 horas/mes por servicio**
   - EC2: 750 horas = 1 instancia todo el mes
   - RDS: 750 horas = 1 instancia todo el mes
   - Si excedes, pagas horas extra

2. **Storage limitado**
   - RDS: 20GB incluidos
   - S3: 5GB primer año
   - Si excedes, pagas GB extra

3. **Data transfer**
   - 100GB outbound gratis/mes
   - Si excedes, pagas $0.09/GB

### Mejores Prácticas

1. **Configurar billing alerts** inmediatamente
2. **Usar tags** en todos los recursos
3. **Revisar costos** semanalmente
4. **Apagar** recursos no usados
5. **Usar auto-stop** para staging

---

## 🎯 RECOMENDACIÓN FINAL

### Para Modo Prueba (Gratis)

**Opción A: EC2 Single t2.micro** (Recomendada)
- 1 instancia EC2 t2.micro (frontend + backend)
- RDS t2.micro PostgreSQL
- ElastiCache t2.micro Redis
- **Costo:** ~$2-5/mes (dominio + data transfer)

**Opción B: Serverless** (Más complejo, siempre gratis)
- Lambda para backend
- S3 + CloudFront para frontend
- DynamoDB para database
- **Costo:** ~$1-2/mes (solo dominio)

### Mi Recomendación

**Usa Opción A (EC2 t2.micro)** porque:
- ✅ Más simple de configurar
- ✅ Mismo código que producción
- ✅ Fácil debugging
- ✅ ~$2-5/mes es aceptable para pruebas
- ✅ Puedes escalar a producción fácilmente

---

**¿Quieres que reconfigure toda la infraestructura Terraform para usar solo Free Tier?**
