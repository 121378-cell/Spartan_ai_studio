# PLAN DE ACCIÓN - AUDITORÍA SPARTAN HUB 2026

**Fecha**: 24 de Enero 2026
**Prioridad**: CRÍTICA → ALTA → MEDIA
**Responsable**: Equipo de Desarrollo
**Duración Estimada**: 3 semanas

---

## 🔴 TAREAS CRÍTICAS (ESTA SEMANA)

### TAREA 1: Resolver Vulnerabilidades de Dependencias
**Status**: 🔴 NO INICIADO
**Prioridad**: CRÍTICA
**Tiempo Estimado**: 2 horas
**Impacto**: Elimina 6 vulnerabilidades altas

#### Procedimiento

```bash
# Paso 1: Auditar estado actual
cd backend
npm audit --audit-level=high

# Paso 2: Corregir vulnerabilidades menores
npm audit fix

# Paso 3: Corregir vulnerabilidades breaking (tar/sqlite3)
npm audit fix --force

# Paso 4: Ejecutar tests completos
npm run build
npm test
npm run test:coverage

# Paso 5: Verificar no hay nuevos errores
npm run lint
npm run type-check
```

#### Checklist
- [ ] Ejecutado `npm audit fix`
- [ ] Ejecutado `npm audit fix --force`
- [ ] Todos los tests pasan
- [ ] Verificado no hay regresiones
- [ ] Commit creado: "fix: resolve dependency vulnerabilities"

#### Cambios Esperados
```
ANTES: 6 high severity vulnerabilities
DESPUÉS: 0 vulnerabilities
```

---

### TAREA 2: Implementar CSRF Protection
**Status**: 🔴 NO INICIADO
**Prioridad**: CRÍTICA
**Tiempo Estimado**: 4 horas
**Impacto**: Previene CSRF attacks

#### Descripción
Cross-Site Request Forgery (CSRF) es un vector de ataque donde usuarios autenticados son engañados para ejecutar acciones no deseadas. Actualmente el proyecto tiene CORS pero no CSRF tokens explícitos.

#### Implementación

**1. Instalar dependencia**
```bash
cd backend
npm install csurf
npm install --save-dev @types/csurf
```

**2. Crear middleware CSRF**
```typescript
// backend/src/middleware/csrfProtection.ts
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hora
  }
});

export const csrfErrorHandler = (err: any, req: any, res: any, next: any) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  res.status(403).json({ 
    success: false, 
    message: 'CSRF validation failed' 
  });
};
```

**3. Integrar en server.ts**
```typescript
import { csrfProtection, csrfErrorHandler } from './middleware/csrfProtection';

// Después de cookieParser
app.use(cookieParser());
app.use(csrfProtection);

// Después de otros middlewares
app.use(csrfErrorHandler);
```

**4. Actualizar endpoints de lectura para devolver token**
```typescript
// Nuevo endpoint para obtener CSRF token
app.get('/api/csrf-token', (req: Request, res: Response) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

**5. Actualizar rutas protegidas**
```typescript
// Rutas POST/PUT/DELETE necesitan validación CSRF
app.post('/api/user', csrfProtection, (req: Request, res: Response) => {
  // Token validado automáticamente
});
```

**6. Frontend - Obtener y enviar token**
```typescript
// src/utils/apiClient.ts
export const getCSRFToken = async (): Promise<string> => {
  const response = await fetch('/api/csrf-token');
  const { csrfToken } = await response.json();
  return csrfToken;
};

// Agregar a headers
axios.defaults.headers.post['X-CSRF-Token'] = csrfToken;
axios.defaults.headers.put['X-CSRF-Token'] = csrfToken;
axios.defaults.headers.delete['X-CSRF-Token'] = csrfToken;
```

#### Testing
```typescript
// backend/src/__tests__/csrf.test.ts
describe('CSRF Protection', () => {
  it('should return CSRF token', async () => {
    const response = await request(app).get('/api/csrf-token');
    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toBeDefined();
  });

  it('should reject requests without CSRF token', async () => {
    const response = await request(app)
      .post('/api/user')
      .send({ name: 'Test' });
    expect(response.status).toBe(403);
  });

  it('should accept requests with valid CSRF token', async () => {
    const tokenRes = await request(app).get('/api/csrf-token');
    const csrfToken = tokenRes.body.csrfToken;
    
    const response = await request(app)
      .post('/api/user')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Test' });
    expect(response.status).not.toBe(403);
  });
});
```

#### Checklist
- [ ] Instaladas dependencias (csurf, @types/csurf)
- [ ] Middleware CSRF creado
- [ ] Integrado en server.ts
- [ ] Endpoint /api/csrf-token implementado
- [ ] Frontend actualizado para enviar token
- [ ] Tests CSRF escritos y pasando
- [ ] Documentación actualizada
- [ ] Commit: "feat: implement CSRF protection"

---

### TAREA 3: Validar Seguridad de Dockerfile
**Status**: 🔴 NO INICIADO
**Prioridad**: CRÍTICA
**Tiempo Estimado**: 1 hora
**Impacto**: Producción segura

#### Procedimiento

**1. Revisar Dockerfile actual**
```bash
cat backend/Dockerfile
```

**2. Crear checklist de seguridad**
- [ ] Base image es oficial y actualizada
- [ ] No se corre como root
- [ ] Multi-stage build implementado
- [ ] Secrets no están hardcodeados
- [ ] Permisos de archivo apropiados
- [ ] Health check configurado
- [ ] Recursos limitados (memory, CPU)

**3. Mejorar Dockerfile si es necesario**
```dockerfile
# backend/Dockerfile - Mejorado
FROM node:18-alpine AS builder

# No instalar paquetes innecesarios
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copiar solo package files primero (cache layer)
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY src ./src
COPY tsconfig.json ./

# Compilar
RUN npm run build

# Stage 2: Producción
FROM node:18-alpine

WORKDIR /app

# Crear user no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copiar solo necesario del builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Cambiar a usuario no-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

#### Checklist
- [ ] Dockerfile revisado
- [ ] Mejoras de seguridad aplicadas
- [ ] Multi-stage build confirmado
- [ ] User no-root implementado
- [ ] Health check configurado
- [ ] Construido y testeado localmente
- [ ] docker-compose actualizado si necesario
- [ ] Commit: "chore: harden Dockerfile security"

---

## 🟠 TAREAS ALTAS (PRÓXIMAS 2 SEMANAS)

### TAREA 4: Migrar Secretos a Vault
**Status**: 🔴 NO INICIADO
**Prioridad**: ALTA
**Tiempo Estimado**: 8 horas
**Impacto**: Seguridad de producción

#### Opciones

**Opción A: AWS Secrets Manager** (Recomendado si en AWS)
```bash
npm install aws-sdk
# Modificar backend/src/utils/secrets.ts
```

**Opción B: Azure Key Vault** (Recomendado si en Azure)
```bash
npm install @azure/identity @azure/keyvault-secrets
```

**Opción C: HashiCorp Vault** (Agnóstico de cloud)
```bash
npm install node-vault
```

#### Implementación (AWS Secrets Manager)

```typescript
// backend/src/config/secretsManager.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

export async function getSecret(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    return response.SecretString || '';
  } catch (error) {
    logger.error('Error retrieving secret', { context: 'secretsManager', metadata: { error } });
    throw error;
  }
}
```

#### Checklist
- [ ] Proveedor de secretos seleccionado
- [ ] Dependencias instaladas
- [ ] Secretos migrados a vault
- [ ] Config actualizada
- [ ] Tests escritos
- [ ] Documentación actualizada
- [ ] CI/CD actualizado con permisos

---

### TAREA 5: Completar Tests E2E
**Status**: 🟡 PARCIAL
**Prioridad**: ALTA
**Tiempo Estimado**: 12 horas
**Impacto**: Confiabilidad del sistema

#### Estrategia

**Rutas a cubrir**:
```
✅ /api/auth/*
✅ /api/fitness/*
✅ /api/ml/injury-prediction
⚠️ /api/ml/training-recommendations (Falta)
⚠️ /api/ml/performance-forecast (Falta)
⚠️ /api/user/profile (Falta)
⚠️ /api/user/settings (Falta)
```

**Cobertura objetivo**: 90%+

#### Implementación

```typescript
// backend/src/__tests__/e2e/training-recommendations.test.ts
describe('Training Recommendations E2E', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Setup: crear usuario y obtener token
  });

  describe('POST /api/ml/training-recommendations', () => {
    it('should return training recommendations', async () => {
      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          fitnessLevel: 'intermediate',
          goals: ['strength', 'endurance'],
          availableHoursPerWeek: 5
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });
  });

  describe('Security', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/ml/training-recommendations')
        .send({});
      expect(response.status).toBe(401);
    });
  });
});
```

#### Checklist
- [ ] Rutas E2E identificadas
- [ ] Tests escritos para cada ruta
- [ ] Coverage >= 90%
- [ ] CI/CD actualizado
- [ ] Documentación actualizada

---

### TAREA 6: Implementar Database Encryption
**Status**: 🔴 NO INICIADO
**Prioridad**: ALTA
**Tiempo Estimado**: 8 horas
**Impacto**: Protección de datos

#### Niveles de Encriptación

**1. Encryption at Rest (SQLite)**
```typescript
// backend/src/config/database.ts
// Usar better-sqlite3 con PRAGMA key
const db = new Database('./data/fitness.db');
db.pragma('key = "encryption_password"'); // Usar desde environment
```

**2. Encryption at Transit**
```typescript
// Usar HTTPS en producción (en load balancer)
// TLS para conexión PostgreSQL
```

**3. Campos Sensibles Encriptados**
```typescript
// Encriptar: contraseñas (ya con bcrypt), tokens, datos médicos
import crypto from 'crypto';

export function encryptField(value: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + encrypted.toString('hex') + ':' + authTag.toString('hex');
}
```

#### Checklist
- [ ] Estrategia de encriptación documentada
- [ ] PRAGMA key configurado (SQLite)
- [ ] Campos sensibles identificados
- [ ] Encriptación implementada
- [ ] Tests validados
- [ ] Performance benchmarked

---

## 🟡 TAREAS MEDIAS (PRÓXIMOS 4 SEMANAS)

### TAREA 7: Setup CI/CD Pipeline
**Status**: 🔴 NO INICIADO
**Prioridad**: MEDIA
**Tiempo Estimado**: 16 horas
**Impacto**: Automatización y calidad

#### GitHub Actions Workflow

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Type checking
        run: npm run type-check
      
      - name: Run tests
        run: npm test
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Security audit
        run: npm audit --audit-level=moderate

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - name: Build
        run: npm run build:all
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # Configurar deployment aquí
          echo "Deploying to production..."
```

#### Checklist
- [ ] GitHub Actions configurado
- [ ] Secrets registrados en GitHub
- [ ] Workflow testeado
- [ ] Badges agregados al README
- [ ] Documentación actualizada

---

### TAREA 8: Performance Optimization
**Status**: 🟡 PARCIAL
**Prioridad**: MEDIA
**Tiempo Estimado**: 20 horas
**Impacto**: Experiencia del usuario

#### Áreas de Optimización

**Frontend**
```
1. Code Splitting
   - Lazy load rutas
   - Lazy load componentes pesados

2. Image Optimization
   - Usar WebP con fallback
   - Responsive images

3. Bundle Analysis
   - Reducir tamaño de bundle
   - Tree shaking

4. Caching
   - Service workers
   - Cache headers
```

**Backend**
```
1. Database Query Optimization
   - Indexing
   - Query analysis
   - Connection pooling

2. API Response Optimization
   - Pagination
   - Selective field queries
   - Compression

3. Caching Layer
   - Redis caching
   - HTTP caching headers
```

#### Checklist
- [ ] Análisis de performance realizado
- [ ] Bottlenecks identificados
- [ ] Optimizaciones implementadas
- [ ] Benchmarks configurados
- [ ] Tests de performance agregados

---

### TAREA 9: ML Documentation
**Status**: 🟡 PARCIAL
**Prioridad**: MEDIA
**Tiempo Estimado**: 12 horas
**Impacto**: Mantenibilidad

#### Documentación Requerida

```
1. Model Card
   - Descripción del modelo
   - Performance metrics
   - Limitaciones
   - Usos esperados

2. Feature Documentation
   - Descripción de cada feature
   - Rango de valores
   - Importancia

3. Training Process
   - Dataset
   - Algoritmo
   - Hyperparameters
   - Validation strategy

4. Deployment Guide
   - Modelo serving
   - Performance requirements
   - Monitoring
```

#### Archivo de Ejemplo
```markdown
# Injury Prediction Model Card

## Model Description
- Tipo: Random Forest Classifier
- Features: 36 engineered features
- Output: Risk score (0-100), confidence

## Performance
- Accuracy: 85%
- Precision: 0.87
- Recall: 0.83
- F1-score: 0.85

## Limitations
- Requiere al menos 30 días de datos
- Performance degrada con datos incompletos

## Training Data
- Período: 2023-2024
- Muestras: 10,000+
- Features engineered: 36
```

#### Checklist
- [ ] Model cards creados
- [ ] Features documentadas
- [ ] Training process documentado
- [ ] Deployment guide escrito
- [ ] Archivos en /docs/ml

---

## 📊 TIMELINE DE EJECUCIÓN

```
SEMANA 1 (24-31 Enero)
├─ LUNES: Tarea 1 (Dependencias)
├─ MARTES: Tarea 2 (CSRF) - Parte 1
├─ MIÉRCOLES: Tarea 2 (CSRF) - Parte 2 + Testing
├─ JUEVES: Tarea 3 (Dockerfile)
└─ VIERNES: Verificación y commit

SEMANA 2 (31 Enero - 7 Febrero)
├─ Tarea 4 (Secretos) - Análisis
├─ Tarea 5 (E2E Tests) - Primeros tests
├─ Tarea 6 (Encryption) - Design
└─ Sprint Review

SEMANA 3 (7-14 Febrero)
├─ Tarea 4 (Secretos) - Implementación
├─ Tarea 5 (E2E Tests) - Completar
├─ Tarea 6 (Encryption) - Implementar
├─ Tarea 7 (CI/CD) - Setup
└─ Sprint Review

SEMANA 4+ (Futuro)
├─ Tarea 8 (Performance)
├─ Tarea 9 (ML Documentation)
├─ Tareas Medias
└─ Backlog Técnico
```

---

## 👥 ASIGNACIÓN DE RECURSOS

| Tarea | Dev | Tiempo | Sprint |
|-------|-----|--------|--------|
| 1. Dependencias | Junior | 2h | W1 |
| 2. CSRF | Senior | 4h | W1 |
| 3. Dockerfile | DevOps | 1h | W1 |
| 4. Secretos | Senior | 8h | W2-3 |
| 5. E2E Tests | QA | 12h | W2-3 |
| 6. Encryption | Senior | 8h | W3 |
| 7. CI/CD | DevOps | 16h | W3 |
| 8. Performance | Full-stack | 20h | W4+ |
| 9. ML Docs | ML Dev | 12h | W4+ |

---

## ✅ DEFINICIÓN DE "HECHO"

Una tarea se considera completa cuando:

1. ✅ Código implementado
2. ✅ Tests escritos (>80% coverage)
3. ✅ Tests pasan (0 fallos)
4. ✅ Documentación actualizada
5. ✅ Commit realizado con mensaje descriptivo
6. ✅ PR abierto con descripción
7. ✅ Code review pasado
8. ✅ Merged a main/develop

---

## 📈 MÉTRICAS DE ÉXITO

Al completar este plan:

```
ANTES:
- Vulnerabilidades: 6 altas
- CSRF Protection: ❌
- Secretos Management: ❌ (hardcoded)
- Test Coverage: 80%
- CI/CD: ❌ (no automatizado)

DESPUÉS:
- Vulnerabilidades: 0
- CSRF Protection: ✅
- Secretos Management: ✅ (vault)
- Test Coverage: 90%+
- CI/CD: ✅ (automatizado)
- Performance: +20-30%
- Documentation: +50%
```

---

## 🚨 RIESGOS Y MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|-----------|
| Regresión en tests | MEDIA | ALTO | Ejecutar suite completa |
| Downtime en prod | BAJA | CRÍTICO | Usar feature flags |
| Cambio breaking | BAJA | MEDIO | Versionamiento API |
| Performance degradation | MEDIA | MEDIO | Benchmarking |
| Secretos expuestos | BAJA | CRÍTICO | Auditoría de logs |

---

## 📞 ESCALACIÓN

Si se encuentran problemas:

1. 🔴 CRÍTICO: Notificar inmediatamente al Tech Lead
2. 🟠 ALTO: Notificar en daily standup
3. 🟡 MEDIO: Documentar en PR comments
4. 🟢 BAJO: Agregar a backlog

---

**Plan creado**: 24 de Enero 2026
**Responsable General**: Tech Lead
**Próxima Revisión**: Viernes 31 de Enero

