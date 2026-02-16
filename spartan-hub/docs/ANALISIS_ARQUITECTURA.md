# Análisis de Arquitectura - Spartan Hub

**Fecha:** Diciembre 2024  
**Versión:** 1.0.0

---

## 🏗️ Vista General de la Arquitectura

### Stack Tecnológico

```
Frontend:
├── React 19.2.0
├── Vite 7.1.12
├── Material-UI 7.3.5
├── Three.js 0.180.0
└── TypeScript 5.9.3

Backend:
├── Node.js + Express 4.18
├── TypeScript 5.9.3
├── PostgreSQL 16 / SQLite
└── better-sqlite3 / pg

AI Services:
├── Python (AI microservice)
├── Ollama (gemma2:2b)
└── ONNX Runtime

Infrastructure:
├── Docker + Docker Compose
├── Nginx (Load Balancer)
├── PostgreSQL Replicas (Read)
└── Multi-instance Backend
```

---

## 🎨 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTE                              │
│                    (React + Vite)                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    NGINX (Load Balancer)                     │
│                  Round Robin / Least Conn                    │
└────────┬────────────────────────────────────────────────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Backend 1  │  │  Backend 2  │  │  Backend N  │
│  (Express)  │  │  (Express)  │  │  (Express)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  Postgres   │  │   Postgres   │  │  Postgres    │
│  PRIMARY    │──┤   Replica 1  │  │  Replica 2   │
│  (Write)    │  │   (Read)     │  │  (Read)      │
└─────────────┘  └──────────────┘  └──────────────┘
                        │
       ┌────────────────┴────────────────┐
       │                                 │
       ▼                                 ▼
┌─────────────┐                   ┌─────────────┐
│ AI Service  │                   │   Ollama    │
│ (Python)    │◄──────────────────│  (LLM API)  │
└─────────────┘                   └─────────────┘
```

---

## 📦 Estructura de Capas

### 1. Capa de Presentación (Frontend)

```
src/
├── components/        # Componentes React reutilizables
│   ├── Dashboard/
│   ├── Workout/
│   ├── Nutrition/
│   └── Profile/
├── context/          # Estado global (React Context)
│   ├── UIContext     # UI state
│   ├── UserContext   # User data
│   └── FitnessContext # Fitness data
├── hooks/            # Custom React hooks
├── services/         # API clients
└── App.tsx           # Componente principal
```

**Fortalezas:**
- ✅ Separación clara de componentes
- ✅ Uso de Context API para estado global
- ✅ Material-UI para consistencia visual

**Áreas de Mejora:**
- 🔄 Considerar React Query para cache de datos
- 🔄 Implementar lazy loading de componentes
- 🔄 Agregar Service Worker para PWA

---

### 2. Capa de Aplicación (Backend)

```
backend/src/
├── routes/           # Definición de endpoints
│   ├── authRoutes.ts
│   ├── planRoutes.ts
│   ├── aiRoutes.ts
│   └── fitnessRoutes.ts
├── controllers/      # Lógica de negocio
│   ├── authController.ts
│   ├── planController.ts
│   └── aiController.ts
├── middleware/       # Interceptores
│   ├── auth.ts
│   ├── rateLimitMiddleware.ts
│   ├── loggingMiddleware.ts
│   └── validationMiddleware.ts
├── services/         # Lógica de dominio
│   ├── databaseService.ts
│   ├── aiService.ts
│   └── cacheService.ts
├── models/           # Entidades de datos
│   ├── User.ts
│   ├── Routine.ts
│   └── Exercise.ts
└── utils/            # Utilidades
    ├── logger.ts
    ├── errorHandler.ts
    └── retryHandler.ts
```

**Fortalezas:**
- ✅ Arquitectura MVC clara
- ✅ Separación de concerns
- ✅ Middleware reutilizable
- ✅ Manejo centralizado de errores

**Áreas de Mejora:**
- 🔄 Implementar patrón Repository
- 🔄 Agregar DTOs (Data Transfer Objects)
- 🔄 Implementar validation layer más robusta

---

### 3. Capa de Persistencia

#### 3.1 Estrategia Dual de Base de Datos

**SQLite (Desarrollo/Standalone)**
```
Ventajas:
- Sin configuración
- Portátil
- Rápido para desarrollo local
- Embebido en la aplicación

Desventajas:
- No escalable horizontalmente
- Limitaciones de concurrencia
- No ideal para producción
```

**PostgreSQL (Producción)**
```
Ventajas:
- Altamente escalable
- ACID compliant
- Soporte de réplicas
- Extensiones avanzadas

Arquitectura:
- 1 Primary (Write)
- 2 Replicas (Read)
- Replicación streaming
- Connection pooling
```

**Patrón Implementado:**
```typescript
// Factory pattern para abstracción de BD
databaseServiceFactory
├── SQLite implementation
└── PostgreSQL implementation

// Estrategia de lectura/escritura
executeQuery(query, params, 'read')   → Replica
executeQuery(query, params, 'write')  → Primary
```

**Fortalezas:**
- ✅ Flexibilidad entre SQLite y PostgreSQL
- ✅ Separación read/write
- ✅ Queries parametrizadas (anti SQL-injection)
- ✅ Factory pattern para abstracción

**Áreas de Mejora:**
- 🔄 Implementar migration system robusto
- 🔄 Agregar connection pooling configurable
- 🔄 Monitoring de queries lentas
- 🔄 Implementar caching layer (Redis)

---

### 4. Capa de Servicios AI

```
AI Services/
├── ai-microservice/      # Python FastAPI
│   ├── predict_alert     # Risk classification
│   ├── generate_plan     # Workout generation
│   └── health_check      # Service status
├── Ollama/               # LLM inference
│   └── gemma2:2b         # Model
└── AI/ (Legacy)          # ONNX models
    └── governance/
```

**Arquitectura de AI:**
```
Request Flow:
Backend → AI Service → Ollama → Response
   ↓
Fallback Logic:
   ↓
Rule-based System (si AI falla)
```

**Fortalezas:**
- ✅ Microservicio independiente
- ✅ Fallback a reglas si AI falla
- ✅ Health checks implementados
- ✅ Retry logic con backoff

**Áreas de Mejora:**
- 🔄 Agregar modelo caching
- 🔄 Queue system para requests pesadas
- 🔄 A/B testing de modelos
- 🔄 Model versioning

---

## 🔄 Flujos de Datos Críticos

### 1. Autenticación

```
Cliente
  │
  ├─→ POST /auth/register { name, email, password }
  │     │
  │     ├─→ Validación input
  │     ├─→ Hash password (bcrypt)
  │     ├─→ Crear usuario en BD
  │     ├─→ Generar JWT
  │     ├─→ Crear sesión
  │     └─→ Setear httpOnly cookie
  │
  └─→ POST /auth/login { email, password }
        │
        ├─→ Validar credenciales
        ├─→ Verificar password
        ├─→ Generar JWT
        ├─→ Crear sesión
        └─→ Setear httpOnly cookie
```

### 2. Predicción de Riesgo (AI)

```
Cliente
  │
  └─→ POST /ai/alert/:userId
        │
        ├─→ Rate limiting (20 req/15min)
        │
        ├─→ Obtener datos usuario
        │
        ├─→ Preparar input AI
        │     {
        │       recovery_score,
        │       habit_adherence,
        │       stress_level,
        │       sleep_quality,
        │       workout_frequency
        │     }
        │
        ├─→ Llamar AI Service
        │     │
        │     ├─→ Retry logic (3 intentos)
        │     │
        │     └─→ POST /predict_alert
        │           │
        │           └─→ Ollama inference
        │
        ├─→ Fallback si falla
        │     │
        │     └─→ Lógica basada en reglas
        │
        └─→ Retornar predicción
              { alerta_roja: boolean }
```

### 3. Generación de Plan

```
Cliente
  │
  └─→ POST /plan/asignar
        │
        ├─→ Autenticación JWT
        │
        ├─→ Validar input
        │
        ├─→ Obtener perfil usuario
        │
        ├─→ Consultar AI para generación
        │
        ├─→ Crear rutina en BD
        │
        ├─→ Asignar a usuario
        │
        └─→ Registrar actividad
```

---

## 🔐 Seguridad en Capas

### Capa 1: Network (Nginx)

```
- Rate limiting global
- SSL/TLS termination
- DDoS protection básico
- Request filtering
```

### Capa 2: Application (Express)

```
- Helmet (security headers)
- CORS configurado
- Rate limiting por endpoint
- JWT validation
- Session management
- Input validation
```

### Capa 3: Data (PostgreSQL)

```
- Queries parametrizadas
- Connection con credenciales
- Replicación encriptada
- Backup automático (recomendado)
```

### Capa 4: Runtime (Docker)

```
- Contenedores aislados
- Read-only filesystem
- Resource limits (CPU/RAM)
- Secrets management
- Network isolation
```

---

## 📊 Patrones de Diseño Identificados

### 1. Factory Pattern
```typescript
// databaseServiceFactory.ts
export const userDb = createDatabaseService('user');
export const routineDb = createDatabaseService('routine');
```
**Uso:** Abstracción de SQLite vs PostgreSQL

### 2. Singleton Pattern
```typescript
// logger.ts
export const logger = new Logger();
```
**Uso:** Instancia única de logger, cache, alertService

### 3. Middleware Pattern
```typescript
app.use(globalRateLimit);
app.use(requestLogger);
app.use(metricsCollector);
```
**Uso:** Pipeline de procesamiento de requests

### 4. Strategy Pattern
```typescript
// postgresReplicaConfig.ts
const strategies = {
  'round-robin': roundRobinStrategy,
  'random': randomStrategy,
  'least-connections': leastConnectionsStrategy
};
```
**Uso:** Selección de réplica de lectura

### 5. Observer Pattern
```typescript
// cacheEventService.ts
eventEmitter.on('cache:invalidate', handler);
```
**Uso:** Cache invalidation events

---

## 🎯 Escalabilidad

### Horizontal Scaling

```
Componentes escalables:
✅ Backend (multi-instance ready)
✅ PostgreSQL (read replicas)
✅ AI Service (stateless)
⚠️  Nginx (single instance)

Recomendaciones:
- Load balancer externo (AWS ELB, CloudFlare)
- Redis para sesiones compartidas
- CDN para assets estáticos
```

### Vertical Scaling

```
Límites de recursos configurados:
- Backend: 0.5 CPU, 1GB RAM
- Postgres: 0.5 CPU, 512MB RAM
- AI Service: 1 CPU, 2GB RAM
- Ollama: Requiere GPU para mejor performance
```

### Performance Estimado

```
Configuración actual:
- 2 backend instances
- 2 read replicas
- Nginx load balancer

Capacidad estimada:
- ~1000 req/min (con rate limiting)
- ~100 concurrent users
- Latencia media: <200ms (sin AI)
- Latencia media: <2s (con AI)
```

---

## 🔍 Observabilidad

### Logging

```
Sistema implementado:
✅ Winston logger
✅ Structured logging (JSON)
✅ Log levels (debug, info, warn, error)
✅ Contexto en logs
✅ Error stack traces

Faltante:
❌ Centralización (ELK, Splunk)
❌ Log rotation automática
❌ Alertas basadas en logs
```

### Monitoring

```
Implementado:
✅ Health checks
✅ Métricas básicas (metricsMiddleware)
✅ Rate limit tracking

Faltante:
❌ APM (Application Performance Monitoring)
❌ Distributed tracing
❌ Real-time dashboards
❌ Custom business metrics
```

### Alerting

```
Implementado:
✅ Alert service básico
✅ Critical error detection
✅ Rate limit alerts

Faltante:
❌ PagerDuty/OpsGenie integration
❌ Slack/Email notifications
❌ On-call rotation
❌ Incident management
```

---

## 📈 Recomendaciones de Arquitectura

### Corto Plazo (1-2 meses)

1. **Redis para Caching**
   ```
   - Sesiones compartidas entre instances
   - Cache de queries frecuentes
   - Rate limiting distribuido
   ```

2. **Message Queue (RabbitMQ/SQS)**
   ```
   - Procesar AI requests asíncronamente
   - Desacoplar servicios
   - Retry automático
   ```

3. **API Gateway**
   ```
   - Kong o AWS API Gateway
   - Centralizar autenticación
   - Rate limiting global
   - API versioning
   ```

### Medio Plazo (3-6 meses)

1. **Microservicios Adicionales**
   ```
   - Auth Service (separado)
   - Notification Service
   - Analytics Service
   ```

2. **Event-Driven Architecture**
   ```
   - Event bus (Kafka/EventBridge)
   - CQRS pattern
   - Event sourcing para audit
   ```

3. **GraphQL Layer**
   ```
   - Apollo Server
   - Unified API interface
   - Optimized queries
   ```

### Largo Plazo (6-12 meses)

1. **Cloud-Native**
   ```
   - Kubernetes orchestration
   - Service mesh (Istio)
   - Auto-scaling
   - Multi-region deployment
   ```

2. **Data Lake**
   ```
   - Analytics warehouse
   - ML training pipeline
   - Business intelligence
   ```

3. **Mobile Backend**
   ```
   - BFF (Backend for Frontend)
   - Push notifications
   - Offline sync
   ```

---

## 🎓 Conclusiones de Arquitectura

### Fortalezas Principales

1. **Arquitectura en capas bien definida**
2. **Separación de concerns efectiva**
3. **Patrones de diseño apropiados**
4. **Infraestructura containerizada**
5. **Estrategia dual de BD (SQLite/PostgreSQL)**

### Limitaciones Actuales

1. **Falta de caching distribuido**
2. **No hay message queue**
3. **Observabilidad limitada**
4. **Single point of failure (Nginx)**
5. **No hay disaster recovery plan**

### Score de Madurez Arquitectónica

```
Modularidad:        8/10 ⭐⭐⭐⭐⭐⭐⭐⭐
Escalabilidad:      6/10 ⭐⭐⭐⭐⭐⭐
Resiliencia:        7/10 ⭐⭐⭐⭐⭐⭐⭐
Observabilidad:     5/10 ⭐⭐⭐⭐⭐
Seguridad:          6/10 ⭐⭐⭐⭐⭐⭐
Mantenibilidad:     7/10 ⭐⭐⭐⭐⭐⭐⭐
Documentación:      5/10 ⭐⭐⭐⭐⭐
──────────────────────────────
PROMEDIO:          6.3/10
```

---

## 📚 Referencias y Recursos

- [12-Factor App](https://12factor.net/)
- [Microservices Patterns](https://microservices.io/patterns/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Google SRE Book](https://sre.google/books/)

---

**Fin del Análisis de Arquitectura**
