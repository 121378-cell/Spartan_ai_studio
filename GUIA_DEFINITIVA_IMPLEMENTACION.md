# 📘 GUÍA DEFINITIVA DE IMPLEMENTACIÓN - SPARTAN HUB 2.0
## Implementación 100% Real para 2 Usuarios con Datos Biométricos en Tiempo Real

**Versión:** 2.0.0 (Production-Ready)  
**Fecha:** March 1, 2026  
**Tiempo de Implementación:** 45-60 minutos  
**Usuarios:** 2 usuarios reales (tú y tu mujer)  
**Estado:** ✅ **100% LISTO PARA USO REAL**

---

## 📋 ÍNDICE

1. [Preparación del Sistema](#1-preparación-del-sistema)
2. [Configuración de Variables de Entorno](#2-configuración-de-variables-de-entorno)
3. [Configuración de Wearables Reales](#3-configuración-de-wearables-reales)
4. [Configuración de Terra (Datos en Tiempo Real)](#4-configuración-de-terra-datos-en-tiempo-real)
5. [Configuración de IA en Tiempo Real](#5-configuración-de-ia-en-tiempo-real)
6. [Configuración de Notificaciones](#6-configuración-de-notificaciones)
7. [Implementación y Arranque](#7-implementación-y-arranque)
8. [Creación de Usuarios Reales](#8-creación-de-usuarios-reales)
9. [Conexión de Wearables](#9-conexión-de-wearables)
10. [Verificación del Sistema](#10-verificación-del-sistema)
11. [Sistema de Registro de Errores y Bugs](#11-sistema-de-registro-de-errores-y-bugs)
12. [Mantenimiento y Soporte](#12-mantenimiento-y-soporte)

---

## 1. PREPARACIÓN DEL SISTEMA

### 1.1 Verificar Requisitos Previos

**En Windows (PowerShell como Administrador):**

```powershell
# Verificar Docker
docker --version
# Debe mostrar: Docker version 24.x.x

# Verificar Node.js
node --version
# Debe mostrar: v18.x.x o superior

# Verificar npm
npm --version
# Debe mostrar: 9.x.x o superior

# Verificar Git
git --version
# Debe mostrar: git version 2.x.x
```

**Si falta algo, instalar:**

```powershell
# Instalar Docker Desktop
winget install Docker.DockerDesktop

# Instalar Node.js 18 LTS
winget install OpenJS.NodeJS.LTS

# Instalar Git
winget install Git.Git
```

### 1.2 Clonar Repositorio

```powershell
# Crear directorio
mkdir C:\Proyectos\Spartan-Hub
cd C:\Proyectos\Spartan-Hub

# Clonar repositorio
git clone https://github.com/121378-cell/Spartan_ai_studio.git .

# Verificar archivos
dir
# Debes ver: docker-compose.local-test.yml, scripts/, backend/, spartan-hub/
```

### 1.3 Instalar Dependencias

```powershell
# Frontend
cd spartan-hub
npm install

# Backend
cd backend
npm install

# Volver al root
cd ..
```

---

## 2. CONFIGURACIÓN DE VARIABLES DE ENTORNO

### 2.1 Copiar Archivo de Configuración

```powershell
# Copiar configuración doméstica
copy .env.production.domestic .env.production
```

### 2.2 Editar Variables CRÍTICAS

```powershell
# Abrir con Notepad
notepad .env.production
```

**Sección 1: Usuarios Reales (CAMBIAR ESTO)**

```env
# Usuario 1 (Tú) - CAMBIAR
PRIMARY_USER_EMAIL=tu-email@real.com
PRIMARY_USER_NAME=Tu Nombre Real
PRIMARY_USER_PASSWORD=TuContraseña123!

# Usuario 2 (Tu mujer) - CAMBIAR
SECONDARY_USER_EMAIL=email-tu-mujer@real.com
SECONDARY_USER_NAME=Nombre Real Tu Mujer
SECONDARY_USER_PASSWORD=Contraseña123!
```

**Sección 2: IA (CAMBIAR ESTO)**

```env
# Groq API - Gratis: https://console.groq.com/keys
AI_PROVIDER=groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # TU KEY REAL AQUÍ
```

**Sección 3: Email (OPCIONAL pero RECOMENDADO)**

```env
# SendGrid - Gratis 100 emails/día: https://sendgrid.com/
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # TU KEY REAL AQUÍ
EMAIL_FROM=spartan-hub@tu-dominio.com
```

**Guardar y cerrar** (Ctrl+G, Alt+F4)

### 2.3 Generar Secrets Criptográficos

```powershell
# Generar JWT_SECRET (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar output y pegar en .env.production

# Generar SESSION_SECRET (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar output y pegar en .env.production
```

**En .env.production:**

```env
JWT_SECRET=copia-aqui-el-primer-hash-generado
SESSION_SECRET=copia-aqui-el-segundo-hash-generado
```

---

## 3. CONFIGURACIÓN DE WEARABLES REALES

### 3.1 Garmin Connect (Para Usuario 1)

**Paso 1: Crear App en Garmin Developer**

1. Ir a https://developer.garmin.com/
2. Click en "Sign In" (crear cuenta si no tienes)
3. Ir a "Apps" → "Create New App"
4. Rellenar:
   - **App Name:** Spartan Hub Home
   - **Description:** Fitness tracking for home use
   - **Website:** http://localhost:5173
   - **Redirect URI:** http://localhost:3001/api/fitness/garmin/callback

**Paso 2: Obtener Credenciales**

5. Click "Create"
6. Copiar:
   - **Client ID:** (ej: A1B2C3D4E5)
   - **Client Secret:** (ej: xxxxxxxxxxxxxxxxxxxx)

**Paso 3: Configurar en .env.production**

```env
# Garmin (Usuario 1)
GARMIN_CLIENT_ID=A1B2C3D4E5  # PEGA TU CLIENT ID REAL
GARMIN_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx  # PEGA TU SECRET REAL
GARMIN_REDIRECT_URI=http://localhost:3001/api/fitness/garmin/callback
```

### 3.2 Apple Health (Para Usuario 2)

**Nota:** Apple Health requiere app iOS. Para testing, usar Google Fit o sincronización manual.

**Opción A: Google Fit (Recomendado para testing)**

1. Ir a https://console.cloud.google.com/
2. Crear nuevo proyecto: "Spartan Hub Home"
3. Activar Google Fit API
4. Crear OAuth 2.0 Credentials
5. Redirect URI: `http://localhost:3001/api/fitness/google/callback`
6. Copiar Client ID y Secret
7. Pegar en `.env.production`

```env
# Google Fit (Usuario 2)
GOOGLE_CLIENT_ID=tu_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/fitness/google/callback
```

---

## 4. CONFIGURACIÓN DE TERRA (DATOS EN TIEMPO REAL)

### 4.1 Crear Cuenta en Terra

1. Ir a https://www.terra.com/
2. Click "Get Started" → "Sign Up"
3. Email corporativo o personal
4. Verificar email

### 4.2 Obtener API Key

1. Login en https://app.terra.com/
2. Settings → API Keys
3. Click "Create API Key"
4. Nombre: "Spartan Hub Home"
5. Copiar API Key (ej: `sk_test_xxxxxxxxxxxxxxxxxx`)

### 4.3 Configurar Webhook

1. En Terra Dashboard → Webhooks
2. Click "Add Webhook"
3. **URL:** `http://tu-ip-publica.com/api/terra/webhook`
   - Si es local: usar ngrok (ver sección 4.5)
4. **Secret:** Generar uno aleatorio
5. Activar eventos: `user.created`, `daily_data.updated`

### 4.4 Configurar en .env.production

```env
# Terra API
TERRA_API_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx  # TU API KEY REAL
TERRA_WEBHOOK_SECRET=tu_webhook_secret_generado  # EL QUE CREASTE EN TERRA
WEBHOOK_URL=http://tu-ip-publica.com/api/terra/webhook  # TU IP O NGROK

# Qué datos sincronizar
TERRA_SYNC_HRV=true
TERRA_SYNC_HEART_RATE=true
TERRA_SYNC_SLEEP=true
TERRA_SYNC_STEPS=true
TERRA_SYNC_STRESS=true
TERRA_SYNC_SPO2=true

# Frecuencia (segundos)
TERRA_SYNC_INTERVAL=300  # 5 minutos
```

### 4.5 Ngrok (Para Webhooks en Local)

**Si estás en local sin IP pública:**

```powershell
# Instalar ngrok
winget install ngrok.ngrok

# Iniciar ngrok (en otra terminal)
ngrok http 3001

# Copiar URL que genera (ej: https://xxxx-xxxx.ngrok.io)
# Usar esa URL en WEBHOOK_URL
```

---

## 5. CONFIGURACIÓN DE IA EN TIEMPO REAL

### 5.1 Configurar AI Service

```powershell
# Editar configuración de IA
notepad ai-service\realtime-config.yaml
```

**Configuración recomendada para 2 usuarios:**

```yaml
realtime_analysis:
  enabled: true
  analysis_interval: 300  # 5 minutos
  
readiness_score:
  enabled: true
  update_interval: 300

workout_adaptation:
  enabled: true
  auto_reschedule: true
  reduce_intensity: true

notifications:
  enabled: true
  daily_summary:
    enabled: true
    time: "08:00"
  alerts:
    low_readiness:
      enabled: true
      threshold: 40
    high_stress:
      enabled: true
      threshold: 80
```

**Guardar y cerrar**

### 5.2 Verificar Groq API Key

```powershell
# Testear Groq API
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer TU_GROQ_API_KEY_AQUI"

# Debe responder con lista de modelos
```

---

## 6. CONFIGURACIÓN DE NOTIFICACIONES

### 6.1 Email (SendGrid)

**Paso 1: Crear Cuenta en SendGrid**

1. Ir a https://sendgrid.com/
2. Sign Up (gratis, 100 emails/día)
3. Verificar email

**Paso 2: Crear API Key**

1. Settings → API Keys
2. Create API Key
3. Nombre: "Spartan Hub"
4. Permissions: Full Access
5. Copiar API Key

**Paso 3: Configurar en .env.production**

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # TU API KEY
EMAIL_FROM=spartan-hub@tu-dominio.com
EMAIL_FROM_NAME=Spartan Hub
```

### 6.2 Telegram (Opcional, para Alertas Inmediatas)

**Paso 1: Crear Bot**

1. En Telegram: @BotFather
2. `/newbot`
3. Nombre: Spartan Hub Alerts
4. Username: spartan_hub_bot
5. Copiar Token

**Paso 2: Obtener Chat ID**

1. En Telegram: @userinfobot
2. Start
3. Copiar Chat ID

**Paso 3: Configurar en .env.production**

```env
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=xxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID_USER1=123456789  # Tu chat ID
TELEGRAM_CHAT_ID_USER2=987654321  # Chat ID de tu mujer
```

---

## 7. IMPLEMENTACIÓN Y ARRANQUE

### 7.1 Iniciar Servicios con Docker

```powershell
# En PowerShell como Administrador
cd C:\Proyectos\Spartan-Hub

# Iniciar todos los servicios
docker-compose -f docker-compose.local-test.yml up -d --build

# Ver estado
docker-compose -f docker-compose.local-test.yml ps
```

**Debe mostrar:**

```
NAME                    STATUS         PORTS
postgres                Up (healthy)   5432/tcp
redis                   Up (healthy)   6379/tcp
qdrant                  Up             6333/tcp
ollama                  Up             11434/tcp
ai-service              Up             8000/tcp
backend                 Up             3001/tcp
frontend                Up             5173/tcp
mock-terra              Up             8080/tcp
mediapipe               Up             8001/tcp
```

### 7.2 Verificar Logs

```powershell
# Ver logs en tiempo real
docker-compose -f docker-compose.local-test.yml logs -f

# Ver logs de un servicio específico
docker-compose -f docker-compose.local-test.yml logs -f backend
```

**Presionar Ctrl+C para salir**

### 7.3 Esperar a que Todo Esté Listo

```powershell
# Esperar 60 segundos
Start-Sleep -Seconds 60

# Verificar health
curl http://localhost:3001/api/health
# Debe responder: {"status":"healthy"}
```

---

## 8. CREACIÓN DE USUARIOS REALES

### 8.1 Ejecutar Script de Creación

```powershell
# Crear usuarios reales
npx ts-node scripts\create-real-users.ts
```

**Debe mostrar:**

```
🚀 Spartan Hub 2.0 - Creating Real Users...

📊 Connecting to database...
✅ Connected to database

👤 Creating User 1...
   Email: tu-email@real.com
   Name: Tu Nombre
✅ User 1 created successfully

👤 Creating User 2...
   Email: email-tu-mujer@real.com
   Name: Nombre Tu Mujer
✅ User 2 created successfully

═══════════════════════════════════════════════════════
✅ REAL USERS CREATED SUCCESSFULLY
═══════════════════════════════════════════════════════

📋 LOGIN CREDENTIALS:

┌─────────────────────────────────────────────────────┐
│ USER 1 (Tú)                                         │
├─────────────────────────────────────────────────────┤
│ Email:    tu-email@real.com                         │
│ Password: TuPassword123!                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ USER 2 (Tu mujer)                                   │
├─────────────────────────────────────────────────────┤
│ Email:    email-tu-mujer@real.com                   │
│ Password: Password123!                              │
└─────────────────────────────────────────────────────┘
```

**¡ANOTAR CREDENCIALES!**

---

## 9. CONEXIÓN DE WEARABLES

### 9.1 Login Usuario 1 (Tú)

1. Abrir navegador: http://localhost:5173
2. Login con tus credenciales
3. Ir a Settings → Wearables
4. Click "Connect Garmin"
5. Autorizar en Garmin
6. Redirige de vuelta a Spartan Hub
7. Verificar: "Garmin Connected ✅"

### 9.2 Login Usuario 2 (Tu mujer)

1. Logout (Usuario 1)
2. Login con credenciales de tu mujer
3. Ir a Settings → Wearables
4. Click "Connect Google Fit" (o Apple Health)
5. Autorizar
6. Redirige de vuelta
7. Verificar: "Google Fit Connected ✅"

### 9.3 Verificar Datos Llegando

**Dashboard debe mostrar:**

- ✅ Frecuencia cardíaca (si el wearable la envía)
- ✅ Pasos de hoy
- ✅ Sueño de anoche (cuando duermas)
- ✅ Readiness Score (se calcula con los datos)

---

## 10. VERIFICACIÓN DEL SISTEMA

### 10.1 Checklist Completo

```powershell
# 1. Backend health
curl http://localhost:3001/api/health
# ✅ {"status":"healthy"}

# 2. Frontend
# Abrir http://localhost:5173
# ✅ Carga sin errores

# 3. Base de datos
docker-compose -f docker-compose.local-test.yml exec postgres \
  psql -U spartan_admin -d spartan_hub_real -c "SELECT COUNT(*) FROM users;"
# ✅ Debe mostrar 2 usuarios

# 4. Redis
docker-compose -f docker-compose.local-test.yml exec redis redis-cli ping
# ✅ PONG

# 5. AI Service
curl http://localhost:8000/api/health
# ✅ {"status":"healthy"}

# 6. Wearables conectados
# Dashboard → Settings → Wearables
# ✅ Debe mostrar "Connected"
```

### 10.2 Test de Flujo Completo

**Usuario 1:**

1. ✅ Login
2. ✅ Ver dashboard con datos
3. ✅ Iniciar video analysis
4. ✅ Chatear con AI Coach
5. ✅ Ver wearables conectados

**Usuario 2:**

1. ✅ Login (con otras credenciales)
2. ✅ Ver dashboard diferente
3. ✅ Ver sus propios datos

---

## 11. SISTEMA DE REGISTRO DE ERRORES Y BUGS

### 11.1 Configurar Error Tracking

**Se ha implementado un sistema completo de logging:**

```powershell
# Los logs se guardan en:
.\logs\production.log

# Ver logs en tiempo real
Get-Content .\logs\production.log -Wait -Tail 100
```

### 11.2 Niveles de Logging

El sistema registra:

| Nivel | Qué Registra | Ejemplo |
|-------|--------------|---------|
| **ERROR** | Errores críticos | DB connection failed, API error |
| **WARN** | Advertencias | High memory usage, slow query |
| **INFO** | Información general | User login, workout completed |
| **DEBUG** | Debug detallado | API request/response |

### 11.3 Bug Tracker Integrado

**Configurar GitHub Issues para Bug Tracking:**

```powershell
# Crear script para reportar bugs automáticamente
notepad scripts\report-bug.ps1
```

**Contenido:**

```powershell
# Spartan Hub Bug Reporter
# Usage: .\scripts\report-bug.ps1 "Description del bug"

param(
    [string]$description
)

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$bugReport = @"
{
  "timestamp": "$timestamp",
  "description": "$description",
  "environment": "home-production",
  "users_affected": 2,
  "severity": "medium",
  "status": "open"
}
"@

# Guardar en archivo de bugs
$bugReport | Out-File -FilePath ".\bugs\bug-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -Encoding utf8

Write-Host "✅ Bug reportado: $description"
Write-Host "📁 Guardado en: .\bugs\bug-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
```

### 11.4 Error Reporting Automático

**Configurar notificación de errores críticos:**

```env
# En .env.production
ERROR_REPORTING_ENABLED=true
ERROR_REPORT_EMAIL=tu-email@real.com
ERROR_REPORT_THRESHOLD=5  # Notificar después de 5 errores iguales
ERROR_REPORT_INCLUDE_STACKTRACE=true
```

### 11.5 Dashboard de Errores

**Ver errores en tiempo real:**

```powershell
# Script para ver errores agrupados
notepad scripts\view-errors.ps1
```

**Contenido:**

```powershell
# Ver últimos 50 errores
Get-Content .\logs\production.log | Select-String "ERROR" | Select-Object -Last 50

# Agrupar errores por tipo
Get-Content .\logs\production.log | Select-String "ERROR" | 
  Group-Object | Sort-Object Count -Descending | 
  Select-Object Count, Name | Format-Table
```

### 11.6 Bug Files Estructurados

**Cada bug se guarda como:**

```json
{
  "id": "BUG-20260301-001",
  "timestamp": "2026-03-01 14:30:00",
  "description": "AI Coach no responde cuando readiness < 30",
  "severity": "high",
  "affected_feature": "AI Coach",
  "steps_to_reproduce": [
    "1. Login con usuario 1",
    "2. Esperar a que readiness sea < 30",
    "3. Intentar chatear con AI Coach",
    "4. No responde"
  ],
  "expected_behavior": "AI Coach debe responder incluso con readiness bajo",
  "actual_behavior": "AI Coach no responde, timeout después de 30s",
  "logs": "Ver logs/production.log líneas 1234-1250",
  "status": "open",
  "assigned_to": "",
  "priority": "P1"
}
```

### 11.7 Reporte Automático a GitHub Issues

**Configurar integración con GitHub:**

```powershell
# Script para crear GitHub Issue automáticamente
notepad scripts\create-github-issue.ps1
```

**Contenido:**

```powershell
param(
    [string]$bugFile
)

$bug = Get-Content $bugFile | ConvertFrom-Json

$issueBody = @"
## Bug Report

**Timestamp:** $($bug.timestamp)
**Severity:** $($bug.severity)
**Affected Feature:** $($bug.affected_feature)

### Description
$($bug.description)

### Steps to Reproduce
$($bug.steps_to_reproduce -join "`n")

### Expected Behavior
$($bug.expected_behavior)

### Actual Behavior
$($bug.actual_behavior)

### Logs
$($bug.logs)

---
*Automatically generated from Spartan Hub Bug Tracker*
"@

# Crear issue con gh CLI
gh issue create `
  --title "BUG: $($bug.description)" `
  --body "$issueBody" `
  --label "bug" `
  --label "priority-$(if($bug.severity -eq 'high'){'high'}else{'medium'})"

Write-Host "✅ GitHub Issue created"
```

---

## 12. MANTENIMIENTO Y SOPORTE

### 12.1 Mantenimiento Diario

```powershell
# Ver errores del día
Get-Content .\logs\production.log | Select-String "ERROR" | 
  Where-Object { $_ -match (Get-Date -Format "yyyy-MM-dd") }

# Verificar servicios
docker-compose -f docker-compose.local-test.yml ps

# Verificar espacio en disco
Get-PSDrive C | Select-Object Used, Free
```

### 12.2 Mantenimiento Semanal

```powershell
# Actualizar servicios
docker-compose -f docker-compose.local-test.yml pull
docker-compose -f docker-compose.local-test.yml down
docker-compose -f docker-compose.local-test.yml up -d

# Backup database
docker-compose -f docker-compose.local-test.yml exec postgres \
  pg_dump -U spartan_admin spartan_hub_real > backups\backup-$(Get-Date -Format 'yyyyMMdd').sql

# Limpiar logs antiguos (más de 7 días)
Get-ChildItem .\logs\*.log | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item
```

### 12.3 Mantenimiento Mensual

```powershell
# Optimizar database
docker-compose -f docker-compose.local-test.yml exec postgres \
  psql -U spartan_admin -d spartan_hub_real -c "VACUUM ANALYZE"

# Revisar bugs abiertos
dir .\bugs\*.json | ForEach-Object {
    $bug = Get-Content $_ | ConvertFrom-Json
    Write-Host "BUG: $($bug.description) - Status: $($bug.status)"
}

# Revisar rendimiento
docker-compose -f docker-compose.local-test.yml stats --no-stream
```

### 12.4 Soporte y Contacto

**Documentación:**

- `ENTORNO_DOMESTICO_REAL.md` - Guía completa
- `LOCAL_TEST_SETUP.md` - Setup inicial
- `AWS_FREE_TIER_INFRASTRUCTURE.md` - Si usas cloud

**Archivos de Configuración:**

- `.env.production` - Variables principales
- `ai-service/realtime-config.yaml` - Configuración IA
- `docker-compose.local-test.yml` - Servicios Docker

**Logs:**

- `.\logs\production.log` - Logs de la aplicación
- `.\bugs\` - Bugs reportados
- `.\backups\` - Backups de database

---

## 🎉 ¡SISTEMA 100% OPERATIVO!

### Checklist Final

- [ ] ✅ Servicios Docker running
- [ ] ✅ Usuarios creados
- [ ] ✅ Wearables conectados
- [ ] ✅ Datos biométricos llegando
- [ ] ✅ IA analizando en tiempo real
- [ ] ✅ Notificaciones configuradas
- [ ] ✅ Sistema de bugs configurado
- [ ] ✅ Logs funcionando

### Uso Diario

**Mañana:**
- 📧 Email automático con readiness del día
- 📱 Abrir app → Ver dashboard actualizado

**Durante el día:**
- ⌚ Wearable recoge datos automáticamente
- 🔄 IA analiza cada 5 minutos
- 📊 Dashboard se actualiza solo

**Tarde (entreno):**
- 🎥 Video analysis para verificar técnica
- 🤖 AI Coach guía en tiempo real

**Noche:**
- 😴 Wearable monitoriza sueño
- 📊 IA analiza calidad de sueño

---

**📞 ¿Problemas? Revisa:**

1. `.\logs\production.log` - Errores
2. `.\bugs\` - Bugs reportados
3. `docker-compose logs -f` - Logs en tiempo real

**✅ ¡Disfrutad de Spartan Hub 2.0!**
