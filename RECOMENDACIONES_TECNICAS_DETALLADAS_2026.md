# RECOMENDACIONES TÉCNICAS DETALLADAS - AUDITORÍA 2026

**Fecha**: 24 de Enero 2026
**Destinatario**: Equipo Técnico de Spartan Hub

---

## 1️⃣ SEGURIDAD - RECOMENDACIONES IMPLEMENTABLES

### 1.1 CSRF Token Implementation (4 horas)

**Problema**: 
- POST/PUT/DELETE endpoints susceptibles a CSRF
- Sesiones de usuario pueden ser hijacked por sitios maliciosos

**Solución**:
```typescript
// backend/src/middleware/csrfToken.ts
import csurf from 'csurf';
import cookieParser from 'cookie-parser';

export const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// En server.ts
app.use(cookieParser());
app.use(csrfProtection);

// Endpoint para obtener token
app.get('/api/csrf-token', (req, res) => {
  res.json({ token: req.csrfToken() });
});
```

**Frontend**:
```typescript
// src/utils/csrfClient.ts
export async function getCSRFToken(): Promise<string> {
  const response = await fetch('/api/csrf-token');
  return (await response.json()).token;
}

// Agregar a axios
import axios from 'axios';
const token = await getCSRFToken();
axios.defaults.headers.common['X-CSRF-Token'] = token;
```

**Testing**:
```bash
cd backend
npm install csurf @types/csurf
# Crear backend/src/__tests__/csrf.test.ts
npm test -- csrf.test.ts
```

---

### 1.2 Secrets Management - AWS Secrets Manager (8 horas)

**Problema**: Secretos en `.env` es inseguro para producción

**Solución - Fase 1: Local Development**
```typescript
// backend/src/config/secretsManager.ts
export async function getSecret(name: string): Promise<string> {
  // En desarrollo: leer de .env
  if (process.env.NODE_ENV === 'development') {
    return process.env[name] || '';
  }
  
  // En producción: AWS Secrets Manager
  return getAWSSecret(name);
}

async function getAWSSecret(name: string): Promise<string> {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
  const command = new GetSecretValueCommand({ SecretId: name });
  const response = await client.send(command);
  return response.SecretString || '';
}
```

**Configuración AWS**:
```bash
# Crear secreto en AWS
aws secretsmanager create-secret \
  --name spartan-hub/jwt-secret \
  --secret-string "your-secret-key"

# Asignar policy IAM a EC2/Lambda
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "secretsmanager:GetSecretValue"
    ],
    "Resource": "arn:aws:secretsmanager:region:account:secret:spartan-hub/*"
  }]
}
```

**En deployment**:
```dockerfile
# Dockerfile
ENV AWS_REGION=us-east-1
# Usar IAM role attached a container
```

---

### 1.3 Database Encryption at Rest (8 horas)

**SQLite (Desarrollo)**:
```typescript
// backend/src/config/database.ts
import Database from 'better-sqlite3';

const db = new Database('./data/fitness.db');

// Habilitar encryption
const encryptionKey = process.env.DB_ENCRYPTION_KEY;
if (encryptionKey) {
  db.pragma(`key = '${encryptionKey}'`);
  db.pragma('cipher_compatibility = 4'); // SQLCipher v4
}

db.pragma('journal_mode = WAL');
```

**PostgreSQL (Producción)**:
```typescript
// Usar pgcrypto extension
CREATE EXTENSION pgcrypto;

// Campos sensibles encriptados
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  sensitive_data TEXT, -- Almacenar encriptado
  encrypted_ssn bytea -- Social Security Number
);

-- Insertar dato encriptado
INSERT INTO users (id, email, encrypted_ssn)
VALUES (
  gen_random_uuid(),
  'user@example.com',
  pgp_sym_encrypt('123-45-6789', 'encryption_key')
);

-- Desencriptar
SELECT pgp_sym_decrypt(encrypted_ssn, 'encryption_key')
FROM users WHERE id = $1;
```

**TypeScript Helper**:
```typescript
import crypto from 'crypto';

export class EncryptionService {
  private key: Buffer;

  constructor(keyOrPassword: string) {
    // Derivar clave de 32 bytes
    this.key = crypto
      .createHash('sha256')
      .update(keyOrPassword)
      .digest();
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return [
      iv.toString('hex'),
      encrypted.toString('hex'),
      authTag.toString('hex')
    ].join(':');
  }

  decrypt(ciphertext: string): string {
    const [ivHex, encryptedHex, authTagHex] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  }
}
```

---

### 1.4 Security Headers Enhancement (2 horas)

**Actual (Helmet.js)**:
```typescript
app.use(helmet());
```

**Mejorado**:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // MUI requiere esto
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.example.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));

// Agregar additional headers
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
```

---

### 1.5 Input Validation - Mejoras (3 horas)

**Agregar validaciones faltantes**:
```typescript
// backend/src/schemas/validationSchema.ts

// Validación de archivo
export const fileUploadSchema = z.object({
  filename: z.string().max(255),
  mimetype: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  size: z.number().max(10 * 1024 * 1024) // 10MB max
});

// Validación de ubicación geográfica
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional()
});

// Validación de frecuencia cardíaca
export const heartRateSchema = z.object({
  value: z.number().min(30).max(220), // BPM
  timestamp: z.date(),
  quality: z.enum(['good', 'fair', 'poor']).optional()
});

// Agregar a middleware de validación
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (req.file) {
    const validation = fileUploadSchema.safeParse(req.file);
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid file upload',
        details: validation.error
      });
    }
  }
  next();
};
```

---

## 2️⃣ PERFORMANCE - RECOMENDACIONES IMPLEMENTABLES

### 2.1 Frontend Bundle Optimization (6 horas)

**Análisis actual**:
```bash
cd spartan-hub
npm run build
# Resultado: build/dist/index.js (~2.5MB)
```

**Optimizaciones**:

**1. Code Splitting**
```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'mui-vendor': ['@mui/material', '@emotion/react'],
          'three-vendor': ['three'],
          'utils': ['uuid', 'axios']
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
};
```

**2. Lazy Loading de Rutas**
```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const ML = lazy(() => import('./pages/ML'));

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/ml/*" element={<ML />} />
      </Routes>
    </Suspense>
  );
}
```

**3. Image Optimization**
```typescript
// src/components/OptimizedImage.tsx
export function OptimizedImage({ src, alt }: Props) {
  return (
    <picture>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <source srcSet={`${src}.jpg`} type="image/jpeg" />
      <img 
        src={`${src}.jpg`} 
        alt={alt}
        loading="lazy"
        decoding="async"
        width={800}
        height={600}
      />
    </picture>
  );
}
```

**Resultado esperado**:
```
ANTES:  2.5MB gzipped
DESPUÉS: 600-800KB gzipped
Mejora: ~65% reducción
```

---

### 2.2 Backend Query Optimization (4 horas)

**1. Index Analysis**
```sql
-- SQLite
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_biometric_user_date ON biometric_data(user_id, created_at DESC);
CREATE INDEX idx_activity_user_date ON activity(user_id, activity_date DESC);
CREATE INDEX idx_predictions_user_date ON ml_predictions(user_id, created_at DESC);

-- PostgreSQL
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_biometric_user_date ON biometric_data(user_id, created_at DESC);
```

**2. Query Optimization**
```typescript
// ANTES (N+1 query problem)
const users = await db.prepare('SELECT * FROM users').all();
for (const user of users) {
  user.biometrics = await db.prepare(
    'SELECT * FROM biometric_data WHERE user_id = ?'
  ).all(user.id); // ← Query por cada usuario!
}

// DESPUÉS (Join)
const usersWithBiometrics = await db.prepare(`
  SELECT 
    u.*,
    COUNT(bd.id) as biometric_count,
    MAX(bd.created_at) as last_biometric
  FROM users u
  LEFT JOIN biometric_data bd ON u.id = bd.user_id
  GROUP BY u.id
`).all();
```

**3. Connection Pooling**
```typescript
// backend/src/config/postgresConfig.ts
import { Pool } from 'pg';

export const pool = new Pool({
  max: 20,           // Max connections
  min: 5,            // Min connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  maxUses: 7200      // Recycle after 7200 uses
});
```

**Resultado esperado**:
```
ANTES:  300-500ms query time
DESPUÉS: 50-150ms query time
Mejora: ~70% reducción
```

---

### 2.3 Caching Strategy (4 horas)

**Redis Caching**:
```typescript
// backend/src/services/cacheService.ts
import redis from 'redis';

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600) {
    await client.setEx(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string) {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }
}

// Uso en servicios
export const biometricService = {
  async getBiometrics(userId: string, days: number = 30) {
    const cacheKey = `biometrics:${userId}:${days}`;
    
    // Intentar obtener del cache
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    // Si no, obtener de BD
    const data = await db.prepare(`
      SELECT * FROM biometric_data 
      WHERE user_id = ? AND created_at > datetime('now', '-' || ? || ' days')
    `).all(userId, days);

    // Guardar en cache (1 hora)
    await cacheService.set(cacheKey, data, 3600);
    return data;
  }
};
```

---

## 3️⃣ TESTING - MEJORAS

### 3.1 Mejorar Test Coverage (8 horas)

**Targets faltantes**:
```
Profile Routes:        ⚠️ 40% → Target 90%
Settings Routes:       ⚠️ 30% → Target 90%
ML Routes (Phase 4.3): ⚠️ 20% → Target 90%
Utils & Helpers:       ⚠️ 50% → Target 95%
```

**Template de test**:
```typescript
// backend/src/__tests__/profile.test.ts
import request from 'supertest';
import { app } from '../server';
import { UserModel } from '../models/User';

describe('Profile Routes', () => {
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup
    const user = await UserModel.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashed_password'
    });
    userId = user.id;
    
    // Mock JWT token
    authToken = generateTestToken(userId);
  });

  describe('GET /api/user/profile', () => {
    it('should return user profile', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(userId);
    });

    it('should not return sensitive data', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/user/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update profile', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          bio: 'Fitness enthusiast'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.firstName).toBe('John');
    });

    it('should sanitize input', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: '<script>alert("xss")</script>'
        });

      expect(response.status).toBe(200);
      expect(response.body.user.bio).not.toContain('<script>');
    });
  });
});
```

---

### 3.2 Performance Testing (4 horas)

```typescript
// backend/src/__tests__/performance.test.ts
describe('Performance Tests', () => {
  it('should return biometrics within 200ms', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/biometric/data')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ days: 30 });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should handle 100 concurrent requests', async () => {
    const promises = Array(100).fill(null).map(() =>
      request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
    );

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200).length;
    
    expect(successCount).toBeGreaterThan(95); // 95% success rate
  });
});
```

---

## 4️⃣ DEVOPS - RECOMENDACIONES

### 4.1 GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Unit tests
        run: npm test
      
      - name: Integration tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

### 4.2 Dockerfile Optimizado

```dockerfile
# Dockerfile.prod (Producción)
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar solo packages necesarios
RUN apk add --no-cache python3 make g++ node-gyp

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Stage 2: Producción
FROM node:18-alpine

WORKDIR /app

# Seguridad: crear usuario no-root
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copiar solo lo necesario
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json .

# Cambiar a usuario no-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => { if (r.statusCode !== 200) throw new Error(); })"

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

---

## 5️⃣ DOCUMENTACIÓN - MEJORAS RECOMENDADAS

### 5.1 API Documentation - Swagger

```typescript
// backend/src/config/swagger.config.ts
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Spartan Hub API',
    version: '1.0.0',
    description: 'Fitness coaching application with AI integration'
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Development' },
    { url: 'https://api.spartan-hub.com', description: 'Production' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  }
};

export const swaggerSpec = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts'
  ]
});

// Endpoint para Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Críticas (Semana 1)
- [ ] Vulnerabilidades de dependencias resueltas
- [ ] CSRF tokens implementados
- [ ] Dockerfile validado y optimizado

### Altas (Semana 2-3)
- [ ] Secrets migrados a AWS Secrets Manager
- [ ] Database encryption implementada
- [ ] E2E tests completados
- [ ] CI/CD pipeline configurado

### Medias (Semana 4+)
- [ ] Bundle optimization completada
- [ ] Query optimization y indexing
- [ ] Redis caching implementado
- [ ] ML model documentation

---

**Documento preparado**: 24 de Enero 2026  
**Implementación estimada**: 40-50 horas  
**Equipo requerido**: 2-3 desarrolladores senior

