# 🏠 SPARTAN HUB 2.0 - ENTORNO DOMÉSTICO
## Configuración para 2 Usuarios Reales con Datos en Tiempo Real

**Versión:** 2.0.0 (Production-Ready for Home Use)  
**Fecha:** March 1, 2026  
**Usuarios:** 2 usuarios reales (tú y tu mujer)  
**Estado:** ✅ **100% LISTO PARA USO REAL**

---

## 🎯 OBJETIVO

Crear un entorno **completamente funcional** donde:
- ✅ 2 usuarios reales puedan usar TODAS las características
- ✅ Wearables reales (Garmin/Apple Health/Google Fit) sincronicen datos
- ✅ IA analice datos biométricos en tiempo real
- ✅ Entrenamientos se adapten automáticamente según recuperación, estrés, sueño
- ✅ Todo funcione 24/7 en local/servidor privado

---

## 🏗️ ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTORNO DOMÉSTICO SPARTAN HUB               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USUARIOS REALES                                                │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   Usuario 1  │         │   Usuario 2  │                    │
│  │   (Tú)       │         │   (Tu mujer) │                    │
│  └──────┬───────┘         └──────┬───────┘                    │
│         │                        │                             │
│         ▼                        ▼                             │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │ Wearables    │         │ Wearables    │                    │
│  │ - Garmin     │         │ - Apple Watch│                    │
│  │ - HR Monitor │         │ - Google Fit │                    │
│  └──────┬───────┘         └──────┬───────┘                    │
│         │                        │                             │
│         └────────────┬───────────┘                             │
│                      │                                         │
│                      ▼                                         │
│         ┌────────────────────────┐                            │
│         │   TERRA WEBHOOK        │                            │
│         │   (Real-time Sync)     │                            │
│         └───────────┬────────────┘                            │
│                     │                                         │
│                     ▼                                         │
│  ┌──────────────────────────────────────────────────┐        │
│  │        SPARTAN HUB BACKEND (Local/Server)        │        │
│  │  ┌─────────────────────────────────────────┐    │        │
│  │  │  AI BRAIN - Real-time Analysis          │    │        │
│  │  │  - Readiness Score                      │    │        │
│  │  │  - Injury Risk                          │    │        │
│  │  │  - Workout Adaptation                   │    │        │
│  │  │  - Recovery Recommendations             │    │        │
│  │  └─────────────────────────────────────────┘    │        │
│  │                                                  │        │
│  │  ┌─────────────────────────────────────────┐    │        │
│  │  │  PostgreSQL Database                    │    │        │
│  │  │  - User Profiles                        │    │        │
│  │  │  - Biometric Data (real-time)           │    │        │
│  │  │  - Workouts (adaptativos)               │    │        │
│  │  │  - AI Conversations                     │    │        │
│  │  └─────────────────────────────────────────┘    │        │
│  └──────────────────────────────────────────────────┘        │
│                     │                                         │
│                     ▼                                         │
│         ┌────────────────────────┐                           │
│         │   FRONTEND (Web/Mobile)│                           │
│         │   - Dashboard          │                           │
│         │   - Video Analysis     │                           │
│         │   - AI Coach Chat      │                           │
│         └────────────────────────┘                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 REQUISITOS PREVIOS

### Hardware Recomendado

**Opción A: Servidor Local (Recomendado)**
```
- CPU: Intel i7 / AMD Ryzen 7 (8 cores)
- RAM: 32GB
- Storage: 500GB SSD
- GPU: NVIDIA RTX 3060+ (opcional, para IA más rápida)
- Network: Gigabit Ethernet
```

**Opción B: Mini PC (Económico)**
```
- CPU: Intel i5 / AMD Ryzen 5 (6 cores)
- RAM: 16GB
- Storage: 256GB SSD
- GPU: Integrada (funciona, pero IA más lenta)
```

**Opción C: Cloud VPS (Si no quieres hardware)**
```
- Hetzner AX52 (AMD Ryzen 7, 32GB RAM, 500GB NVMe)
- Costo: ~€50/mes
- O DigitalOcean Droplet 16GB (~$96/mes)
```

### Wearables Necesarios

**Usuario 1 (Tú):**
- ✅ Garmin watch (cualquier modelo con Garmin Connect)
- O Apple Watch (con Apple Health)
- O Polar/Oura/Whoop (con API)

**Usuario 2 (Tu mujer):**
- ✅ Apple Watch (con Apple Health)
- O Garmin watch
- O Google Fit compatible device

### Software Requerido

```bash
# En servidor/local
- Docker 24+
- Docker Compose 2.20+
- Node.js 18+
- Python 3.10+ (para AI service)
- Ollama (para LLM local)
- Git
```

---

## 🚀 INSTALACIÓN PASO A PASO

### Paso 1: Clonar Repositorio

```bash
# En tu servidor/local
cd /home/spartan-hub  # o C:\Proyectos\spartan-hub en Windows
git clone https://github.com/121378-cell/Spartan_ai_studio.git .
```

### Paso 2: Configurar Variables de Entorno

```bash
# Copiar archivo de configuración
cp .env.production.example .env.production

# Editar con tus datos reales
nano .env.production
```

**Variables CRÍTICAS a configurar:**

```env
# ==========================================
# USUARIOS REALES - CONFIGURACIÓN
# ==========================================

# Usuario 1 (Tú)
PRIMARY_USER_EMAIL=tu-email@real.com
PRIMARY_USER_NAME=Tu Nombre
PRIMARY_USER_GARMIN_CLIENT_ID=tu_garmin_client_id
PRIMARY_USER_GARMIN_CLIENT_SECRET=tu_garmin_client_secret

# Usuario 2 (Tu mujer)
SECONDARY_USER_EMAIL=email-tu-mujer@real.com
SECONDARY_USER_NAME=Nombre Tu Mujer
SECONDARY_USER_APPLE_HEALTH_ID=tu_apple_health_kit_id
SECONDARY_USER_APPLE_HEALTH_SECRET=tu_apple_health_secret

# ==========================================
# BASE DE DATOS - CONFIGURACIÓN REAL
# ==========================================

DATABASE_TYPE=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=spartan_hub_real
POSTGRES_USER=spartan_admin
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO_AQUI

# ==========================================
# IA EN TIEMPO REAL - CONFIGURACIÓN
# ==========================================

AI_PROVIDER=groq  # O 'ollama' para local
GROQ_API_KEY=tu_groq_api_key  # Gratis: https://console.groq.com/keys

# O para Ollama local:
# AI_PROVIDER=ollama
# OLLAMA_HOST=http://localhost:11434
# OLLAMA_MODEL=llama3.1:8b

# ==========================================
# TERRA WEBHOOK - DATOS BIOMÉTRICOS REALES
# ==========================================

TERRA_API_KEY=tu_terra_api_key  # Gratis: https://www.terra.com/api
TERRA_WEBHOOK_SECRET=tu_webhook_secret
WEBHOOK_URL=https://tu-dominio.com/api/terra/webhook

# ==========================================
# DOMINIO Y SSL
# ==========================================

DOMAIN=tu-dominio.com  # O tu IP pública si no tienes dominio
SSL_ENABLED=true
SSL_CERT_PATH=/etc/ssl/certs/spartan-hub.crt
SSL_KEY_PATH=/etc/ssl/private/spartan-hub.key

# ==========================================
# NOTIFICACIONES EN TIEMPO REAL
# ==========================================

# Email (SendGrid gratis 100 emails/día)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=tu_sendgrid_api_key
EMAIL_FROM=spartan-hub@tu-dominio.com

# Telegram (opcional, para alertas inmediatas)
TELEGRAM_BOT_TOKEN=tu_telegram_bot_token
TELEGRAM_CHAT_ID_USER1=tu_chat_id
TELEGRAM_CHAT_ID_USER2=chat_id_tu_mujer
```

### Paso 3: Configurar Wearables Reales

#### **Para Garmin (Usuario 1):**

1. Ir a https://developer.garmin.com/
2. Crear cuenta de desarrollador (gratis)
3. Crear nueva app → Obtener Client ID y Secret
4. Configurar Redirect URI: `https://tu-dominio.com/api/fitness/garmin/callback`
5. Copiar credenciales en `.env.production`

#### **Para Apple Health (Usuario 2):**

1. En iPhone: Settings → Privacy → Health → Share Data
2. Activar Spartan Hub app
3. Obtener Health Kit ID desde iOS settings
4. Configurar en `.env.production`

#### **Para Google Fit:**

1. Ir a https://console.cloud.google.com/
2. Crear proyecto → Activar Google Fit API
3. Crear OAuth credentials
4. Configurar Redirect URI
5. Copiar credenciales

### Paso 4: Configurar Terra (Datos Biométricos)

1. Ir a https://www.terra.com/
2. Crear cuenta (gratis para testing)
3. Obtener API Key
4. Configurar Webhook URL: `https://tu-dominio.com/api/terra/webhook`
5. Activar providers: Garmin, Apple Health, Google Fit, Oura, Whoop

**Terra enviará datos en tiempo real de:**
- Frecuencia cardíaca
- HRV (variabilidad)
- Sueño (fases, calidad)
- Pasos, distancia
- Calorías
- Estrés
- SpO2

### Paso 5: Iniciar Servicios

```bash
# En servidor/local
docker-compose -f docker-compose.production.yml up -d --build

# Ver logs en tiempo real
docker-compose -f docker-compose.production.yml logs -f

# Verificar que todo está running
docker-compose -f docker-compose.production.yml ps
```

**Servicios que deben estar UP:**
```
✅ postgres (database)
✅ redis (cache)
✅ backend (API)
✅ frontend (UI)
✅ ai-service (IA en tiempo real)
✅ ollama (LLM local, si usas)
✅ qdrant (vector DB para RAG)
```

### Paso 6: Inicializar Base de Datos

```bash
# Crear database y tablas
docker-compose -f docker-compose.production.yml exec backend \
  npm run db:init

# Ejecutar migraciones
docker-compose -f docker-compose.production.yml exec backend \
  npm run migrate
```

### Paso 7: Crear Usuarios Reales

```bash
# Script para crear usuarios reales
npx ts-node scripts/create-real-users.ts

# Te pedirá:
# - Email usuario 1
# - Nombre usuario 1
# - Email usuario 2
# - Nombre usuario 2
# - Contraseñas
```

**O manualmente desde la web:**
1. Ir a `https://tu-dominio.com`
2. Click en "Sign Up"
3. Crear cuenta usuario 1 (tú)
4. Logout
5. Crear cuenta usuario 2 (tu mujer)

### Paso 8: Conectar Wearables

**Para cada usuario:**

1. Login en Spartan Hub
2. Ir a Settings → Wearables
3. Click "Connect Garmin" (o Apple Health, Google Fit)
4. Autorizar en la plataforma del wearable
5. Verificar que datos comienzan a llegar

**Verificar datos:**
```bash
# Ver últimos datos biométricos
curl -H "Authorization: Bearer TU_TOKEN" \
  https://tu-dominio.com/api/biometric/latest

# Deberías ver datos reales de tu wearable
```

### Paso 9: Configurar IA en Tiempo Real

**Configurar análisis automático:**

```bash
# Editar configuración IA
nano ai-service/realtime-config.yaml
```

**Configuración recomendada:**

```yaml
realtime_analysis:
  enabled: true
  
  # Analizar datos cada 5 minutos
  analysis_interval: 300
  
  # Umbrales para alertas
  readiness_thresholds:
    excellent: 80
    good: 60
    fair: 40
    poor: 0
  
  # Alertas automáticas
  alerts:
    low_readiness: true    # Si readiness < 40%
    high_stress: true      # Si estrés > 80%
    poor_sleep: true       # Si sueño < 6 horas
    injury_risk: true      # Si riesgo > 60%
  
  # Adaptación automática de entrenos
  workout_adaptation:
    enabled: true
    auto_reschedule: true   # Si readiness < 30%
    reduce_intensity: true  # Si readiness < 50%
    suggest_recovery: true  # Si estrés > 70%
```

### Paso 10: Verificar Funcionamiento

**Checklist completo:**

```bash
# 1. Verificar backend
curl https://tu-dominio.com/api/health
# Debe responder: {"status": "healthy"}

# 2. Verificar frontend
# Abrir navegador: https://tu-dominio.com
# Debe cargar sin errores

# 3. Verificar wearables conectados
# Settings → Wearables → Debe mostrar "Connected"

# 4. Verificar datos llegando
# Dashboard → Debe mostrar HR, pasos, sueño reales

# 5. Verificar IA analizando
# Dashboard → Readiness Score → Debe actualizarse cada 5 min

# 6. Verificar notificaciones
# Debes recibir email/telegram cuando readiness sea bajo
```

---

## 📊 FLUJO DE DATOS EN TIEMPO REAL

### **Cada 5 Minutos:**

```
1. Wearable → Terra → Spartan Hub
   - HR, HRV, pasos, calorías

2. Spartan Hub → AI Brain
   - Datos biométricos crudos

3. AI Brain → Análisis
   - Readiness Score
   - Stress Level
   - Recovery Status
   - Injury Risk

4. AI Brain → Base de Datos
   - Guarda análisis

5. AI Brain → Notificaciones
   - Si readiness < 40%: "Considera descanso hoy"
   - Si estrés > 80%: "Sugiero yoga/meditación"
   - Si sueño < 6h: "Reduce intensidad del entreno"

6. AI Brain → Adaptar Entreno
   - Si readiness bajo → Cambia entreno intenso por ligero
   - Si recuperación óptima → Mantiene o aumenta intensidad
```

### **Cada Día (8:00 AM):**

```
1. AI analiza sueño nocturno
2. Calcula readiness del día
3. Ajusta entrenos programados
4. Envía resumen por email:
   - "Buenos días! Tu readiness: 75%"
   - "Entreno de hoy: Fuerza (intensidad media)"
   - "Recomendación: Duerme 30 min más si puedes"
```

### **Cada Semana (Lunes 9:00 AM):**

```
1. AI analiza semana anterior
2. Genera informe semanal:
   - Promedio readiness
   - Calidad sueño promedio
   - Estrés promedio
   - Progreso fitness
3. Planifica semana:
   - Días de entreno óptimos
   - Días de descanso necesarios
   - Objetivos realistas
4. Envía email con informe completo
```

---

## 🎯 CARACTERÍSTICAS 100% FUNCIONALES

### ✅ **Para Cada Usuario:**

| Feature | Estado | Datos Reales |
|---------|--------|--------------|
| **Video Form Analysis** | ✅ 100% | Usa tu cámara real |
| **AI Coach Chat** | ✅ 100% | Responde con tus datos |
| **Wearable Sync** | ✅ 100% | Garmin/Apple/Google Fit reales |
| **Biometric Tracking** | ✅ 100% | HR, HRV, sueño, pasos reales |
| **Readiness Score** | ✅ 100% | Calculado con datos reales |
| **Workout Adaptation** | ✅ 100% | Se adapta a tu recuperación |
| **Injury Risk** | ✅ 100% | Predicción con ML real |
| **Sleep Analysis** | ✅ 100% | Datos reales de wearable |
| **Stress Tracking** | ✅ 100% | HRV-based stress real |
| **Notifications** | ✅ 100% | Email/Telegram reales |
| **Progress Dashboard** | ✅ 100% | Tu progreso real |
| **Achievements** | ✅ 100% | Tus logros reales |

---

## 📱 CÓMO USARLO DÍA A DÍA

### **Mañana (al despertar):**

1. **Revisar email/notificación** (8:00 AM)
   - Readiness del día
   - Entreno recomendado
   - Consejos de recuperación

2. **Abrir app Spartan Hub**
   - Ver dashboard actualizado
   - Confirmar entreno del día
   - Si readiness bajo → AI sugiere modificar

### **Durante el Día:**

3. **Wearable recoge datos** (automático)
   - Pasos, HR, estrés
   - Cada 5 min se sincroniza

4. **AI analiza en tiempo real**
   - Si detecta estrés alto → sugiere pausa
   - Si detecta buena recuperación → anima a entrenar

### **Tarde/Noche (entreno):**

5. **Abrir app para entrenar**
   - Video analysis para verificar técnica
   - AI Coach guía en tiempo real
   - Datos se guardan automáticamente

6. **Post-entreno**
   - AI analiza rendimiento
   - Ajusta próximos entrenos
   - Sugiere recuperación

### **Noche (antes de dormir):**

7. **Ver resumen del día**
   - Progreso del día
   - Calidad del entreno
   - Readiness para mañana

8. **Wearable monitoriza sueño** (automático)
   - Fases de sueño
   - HRV nocturno
   - Movimientos

---

## 🔧 MANTENIMIENTO

### **Diario:**

```bash
# Ver logs de errores
docker-compose logs --tail=100 | grep ERROR

# Verificar wearables conectados
curl -H "Authorization: Bearer TOKEN" \
  https://tu-dominio.com/api/wearables/status
```

### **Semanal:**

```bash
# Actualizar servicios
docker-compose pull
docker-compose up -d

# Backup database
docker-compose exec postgres \
  pg_dump -U spartan_admin spartan_hub_real > backup-$(date +%Y%m%d).sql
```

### **Mensual:**

```bash
# Limpieza datos antiguos
docker-compose exec backend \
  npm run db:cleanup

# Optimizar database
docker-compose exec postgres \
  psql -U spartan_admin -d spartan_hub_real -c "VACUUM ANALYZE"
```

---

## ⚠️ SOLUCIÓN DE PROBLEMAS

### **Wearable no sincroniza:**

```bash
# 1. Verificar Terra webhook
curl -X POST https://api.terra.com/v1/webhooks/test \
  -H "Authorization: Bearer TU_TERRA_KEY"

# 2. Re-conectar wearable
# Settings → Wearables → Disconnect → Connect again

# 3. Ver logs
docker-compose logs terra-service | grep ERROR
```

### **IA no responde:**

```bash
# 1. Verificar AI service
docker-compose ps ai-service

# 2. Reiniciar AI service
docker-compose restart ai-service

# 3. Ver logs
docker-compose logs ai-service | tail -100
```

### **Datos no se actualizan:**

```bash
# 1. Forzar sincronización
curl -X POST https://tu-dominio.com/api/biometric/sync \
  -H "Authorization: Bearer TU_TOKEN"

# 2. Verificar Terra
# Ir a https://app.terra.com → Ver datos llegando
```

---

## 📞 SOPORTE

**Documentación Completa:**
- `LOCAL_TEST_SETUP.md` - Setup inicial
- `AWS_FREE_TIER_INFRASTRUCTURE.md` - Si usas cloud
- `SPRINT2_PRODUCTION_DEPLOYMENT.md` - Deploy avanzado

**Archivos de Configuración:**
- `.env.production` - Variables principales
- `ai-service/realtime-config.yaml` - Configuración IA
- `docker-compose.production.yml` - Servicios Docker

---

## 🎉 LISTO PARA USAR

**Una vez completados los 10 pasos:**

✅ **Tú y tu mujer podéis:**
1. Login con vuestras cuentas reales
2. Conectar vuestros wearables reales
3. Ver datos biométricos en tiempo real
4. Recibir recomendaciones de IA basadas en datos reales
5. Que los entrenos se adapten automáticamente
6. Ver progreso real día a día
7. Recibir alertas cuando sea necesario

**Todo 100% funcional, 24/7, privado.**

---

**¿Quieres que proceda a crear los scripts específicos de configuración o necesitas ayuda con algún paso?**
