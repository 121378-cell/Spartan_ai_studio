# Plan de Remediación - Spartan Hub

Este documento proporciona pasos concretos y código de ejemplo para remediar los problemas identificados en la auditoría.

---

## 🔴 Remediación Inmediata (Problemas Críticos)

### 1. Rotar y Asegurar Secretos

#### Paso 1: Generar nuevos secretos fuertes

```bash
# Generar JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" > .env.new

# Generar SESSION_SECRET
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))" >> .env.new

# Generar contraseña de PostgreSQL
node -e "console.log('POSTGRES_PASSWORD=' + require('crypto').randomBytes(24).toString('base64'))" >> .env.new
```

#### Paso 2: Eliminar backend/.env del repositorio

```bash
cd /home/engine/project

# Eliminar del repositorio pero mantener localmente
git rm --cached backend/.env

# Asegurar que esté en .gitignore
echo "backend/.env" >> .gitignore

# Commit
git add .gitignore
git commit -m "security: Remove .env from repository and add to .gitignore"
```

#### Paso 3: Actualizar docker-compose.yml

```yaml
# docker-compose.yml
services:
  postgres-primary:
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-changeme}
      - POSTGRES_REPLICATION_PASSWORD=${POSTGRES_REPLICATION_PASSWORD:-changeme}
  
  synergycoach_backend_1:
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
```

Crear `.env.docker` con los nuevos secretos:

```bash
POSTGRES_PASSWORD=<generated_password>
POSTGRES_REPLICATION_PASSWORD=<generated_password>
JWT_SECRET=<generated_secret>
SESSION_SECRET=<generated_secret>
```

---

### 2. Actualizar Dependencias Vulnerables

```bash
cd /home/engine/project

# Actualizar jsonwebtoken
npm update jsonwebtoken

# Si persiste el problema
npm install jsonwebtoken@latest

# Verificar
npm audit

# Para pkg (si es necesario)
# Considerar alternativas como @vercel/ncc o esbuild
```

---

### 3. Implementar Validación Robusta

#### Instalar dependencia

```bash
cd /home/engine/project/backend
npm install zod
```

#### Crear archivo de schemas

```typescript
// backend/src/validation/authSchemas.ts
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .regex(/^[a-zA-Z\s-']+$/, 'Name contains invalid characters'),
  
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
      'Password must contain at least one uppercase letter, one lowercase letter, and one number')
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required')
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  quest: z.string().max(500).optional(),
  weightKg: z.number().positive().max(500).optional()
});
```

#### Crear middleware de validación

```typescript
// backend/src/middleware/validationMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { translate } from '../utils/i18nHelpers';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: translate(req, 'validationError'),
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};
```

#### Actualizar authRoutes.ts

```typescript
// backend/src/routes/authRoutes.ts
import { registerSchema, loginSchema } from '../validation/authSchemas';
import { validateRequest } from '../middleware/validationMiddleware';

// Registration endpoint con validación
router.post('/register', 
  validateRequest(registerSchema),
  async (req: Request, res: Response) => {
    // El body ya está validado y sanitizado
    const { name, email, password } = req.body;
    // ... resto del código
  }
);

// Login endpoint con validación
router.post('/login',
  validateRequest(loginSchema),
  async (req: Request, res: Response) => {
    // ... código
  }
);
```

---

### 4. Reemplazar console.log con Logger

#### Actualizar database.ts

```typescript
// backend/src/config/database.ts
import { logger } from '../utils/logger';

// Reemplazar todas las instancias:

// Línea 19
logger.info('Using SQLite database', { context: 'database', type: 'sqlite' });

// Línea 23
logger.info('Creating database directory', { context: 'database', path: dbDir });

// Línea 33
logger.info('Database directory is writable', { context: 'database', path: dbDir });

// Línea 35
logger.warn('Database directory is not writable', { context: 'database', path: dbDir });

// Línea 39
logger.info('Made database directory writable', { context: 'database', path: dbDir });

// Línea 41
logger.warn('Failed to make database directory writable', { 
  context: 'database', 
  error: chmodErr 
});

// Línea 45
logger.info('Using PostgreSQL database', { context: 'database', type: 'postgres' });

// Línea 54
logger.info('Initializing database...', { context: 'database' });

// Línea 74
logger.info('better-sqlite3 loaded successfully', { context: 'database' });

// Línea 76
logger.error('Failed to load better-sqlite3', { context: 'database', error });

// Línea 82
logger.info('Database initialization completed', { context: 'database' });

// Línea 89
logger.error('Database not initialized', { context: 'database' });

// Línea 95
logger.info('PostgreSQL schema initialization handled separately', { 
  context: 'database' 
});

// Línea 215
logger.info('Database schema initialized successfully', { context: 'database' });

// Línea 217
logger.error('Error initializing database schema', { 
  context: 'database', 
  error 
});
```

---

### 5. Crear Archivos de Secretos de Ejemplo

```bash
# Crear directorio
mkdir -p backend/secrets

# Crear archivos de ejemplo
cat > backend/secrets/api_key.txt.example << EOF
# Replace with your actual API key
your_api_key_here
EOF

cat > backend/secrets/db_password.txt.example << EOF
# Replace with your actual database password
your_database_password_here
EOF

cat > backend/secrets/ollama_api_key.txt.example << EOF
# Replace with your actual Ollama API key (if needed)
your_ollama_api_key_here
EOF

# Actualizar .gitignore
cat >> .gitignore << EOF

# Backend secrets
backend/secrets/*.txt
!backend/secrets/*.txt.example
EOF

# Crear README en secrets
cat > backend/secrets/README.md << EOF
# Secrets Configuration

This directory contains sensitive credentials for the application.

## Setup

1. Copy example files and remove \`.example\` extension:
   \`\`\`bash
   cp api_key.txt.example api_key.txt
   cp db_password.txt.example db_password.txt
   cp ollama_api_key.txt.example ollama_api_key.txt
   \`\`\`

2. Edit each file and replace with your actual credentials

3. Never commit the actual secret files (only \`.example\` files)

## Files

- \`api_key.txt\` - API key for external services
- \`db_password.txt\` - Database password
- \`ollama_api_key.txt\` - Ollama service API key
EOF
```

---

## 🟠 Remediación Alta Prioridad

### 6. Habilitar TypeScript Strict Mode

#### Actualizar tsconfig.json (root)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["node", "jest"],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // Strict mode
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "exclude": [
    "dist",
    "spartan-hub-dist",
    "spartan-hub-dist-new",
    "node_modules",
    "**/dist/**",
    "backend/**/*.js"
  ]
}
```

#### Actualizar backend/tsconfig.json

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

### 7. Eliminar Uso de 'any'

#### database.ts

```typescript
// Antes
let db: any = null;

// Después
import Database from 'better-sqlite3';

type DatabaseInstance = Database.Database | { type: 'postgres' };
let db: DatabaseInstance | null = null;
```

#### User.ts

```typescript
// Antes
metadata?: Record<string, any>;

// Después
interface ActivityMetadata {
  workoutId?: string;
  duration?: number;
  intensity?: string;
  caloriesBurned?: number;
  [key: string]: string | number | boolean | undefined;
}

metadata?: ActivityMetadata;
```

#### authRoutes.ts

```typescript
// Antes
const user = (req as any).user;

// Después (ya está definido en Express.Request)
const user = req.user;

// Si no existe, asegurar que está extendido
if (!user) {
  return res.status(401).json({ success: false, message: 'Unauthorized' });
}
```

---

### 8. Configurar Límites de Payload

```typescript
// backend/src/server.ts

// Después de las importaciones, antes de los middlewares
const MAX_JSON_SIZE = '10mb';
const MAX_URL_ENCODED_SIZE = '10mb';

// Reemplazar líneas 113-114
app.use(express.json({ 
  limit: MAX_JSON_SIZE,
  strict: true
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: MAX_URL_ENCODED_SIZE,
  parameterLimit: 10000
}));
```

---

### 9. Mejorar Configuración CORS

```typescript
// backend/src/server.ts

// Después de las importaciones
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN
].filter((origin): origin is string => Boolean(origin));

// Reemplazar configuración CORS (líneas 108-111)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from unauthorized origin', {
        context: 'cors',
        origin
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  maxAge: 600 // 10 minutes
}));
```

---

### 10. Usar UUID Consistentemente

```typescript
// backend/src/services/postgresDatabaseService.ts

// Línea 1 - Agregar import
import { v4 as uuidv4 } from 'uuid';

// Línea 146 - Reemplazar
// Antes
const id = Math.random().toString(36).substr(2, 9);

// Después
const id = uuidv4();
```

```typescript
// backend/src/models/User.ts

// Línea 1 - Agregar import si no existe
import { v4 as uuidv4 } from 'uuid';

// Línea 198 - Reemplazar
// Antes
id: Math.random().toString(36).substr(2, 9),

// Después
id: uuidv4(),
```

---

### 11. Proteger Endpoint /metrics

```typescript
// backend/src/server.ts

// Línea 131 - Reemplazar
// Antes
app.get('/metrics', metricsEndpoint);

// Después
app.get('/metrics', 
  apiRateLimit,
  verifyJWT,
  requireRole([ROLES.ADMIN, ROLES.REVIEWER]),
  metricsEndpoint
);
```

---

## 🟡 Remediación Media Prioridad

### 12. Implementar Sanitización HTML

```bash
cd /home/engine/project/backend
npm install sanitize-html
npm install -D @types/sanitize-html
```

```typescript
// backend/src/utils/sanitization.ts
import sanitizeHtml from 'sanitize-html';

export const sanitizeText = (text: string): string => {
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
};

export const sanitizeRichText = (text: string): string => {
  return sanitizeHtml(text, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  });
};
```

Usar en routes:

```typescript
import { sanitizeText } from '../utils/sanitization';

router.post('/register', async (req, res) => {
  const name = sanitizeText(req.body.name);
  const email = sanitizeText(req.body.email);
  // ...
});
```

---

### 13. Mejorar Health Checks

```typescript
// backend/src/controllers/healthController.ts
import { Request, Response } from 'express';
import { executeQuery } from '../config/postgresReplicaConfig';
import { isAiServiceReady } from '../utils/aiReconnectionHandler';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    aiService: HealthCheck;
    memory: HealthCheck;
    disk?: HealthCheck;
  };
}

interface HealthCheck {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  responseTime?: number;
  metadata?: Record<string, any>;
}

const checkDatabase = async (): Promise<HealthCheck> => {
  const start = Date.now();
  try {
    await executeQuery('SELECT 1', [], 'read');
    const responseTime = Date.now() - start;
    
    return {
      status: responseTime < 100 ? 'ok' : 'warning',
      responseTime,
      message: responseTime < 100 ? 'Database responsive' : 'Database slow'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Database unavailable',
      metadata: { error: (error as Error).message }
    };
  }
};

const checkAiService = async (): Promise<HealthCheck> => {
  const start = Date.now();
  try {
    const isReady = await isAiServiceReady();
    const responseTime = Date.now() - start;
    
    return {
      status: isReady ? 'ok' : 'error',
      responseTime,
      message: isReady ? 'AI service ready' : 'AI service unavailable'
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'AI service check failed',
      metadata: { error: (error as Error).message }
    };
  }
};

const checkMemory = (): HealthCheck => {
  const used = process.memoryUsage();
  const heapUsedPercent = (used.heapUsed / used.heapTotal) * 100;
  
  return {
    status: heapUsedPercent < 80 ? 'ok' : heapUsedPercent < 90 ? 'warning' : 'error',
    message: `Heap usage: ${heapUsedPercent.toFixed(2)}%`,
    metadata: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024)
    }
  };
};

export const healthCheck = async (req: Request, res: Response) => {
  const checks = {
    database: await checkDatabase(),
    aiService: await checkAiService(),
    memory: checkMemory()
  };
  
  const hasErrors = Object.values(checks).some(check => check.status === 'error');
  const hasWarnings = Object.values(checks).some(check => check.status === 'warning');
  
  const status: HealthStatus['status'] = hasErrors ? 'unhealthy' : 
                                          hasWarnings ? 'degraded' : 
                                          'healthy';
  
  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    checks
  };
  
  const statusCode = status === 'healthy' ? 200 : 
                     status === 'degraded' ? 200 : 
                     503;
  
  res.status(statusCode).json(response);
};
```

Actualizar route:

```typescript
// backend/src/routes/healthRoutes.ts
import { healthCheck } from '../controllers/healthController';

router.get('/', healthCheck);
```

---

### 14. Implementar Limpieza de Sesiones

```typescript
// backend/src/models/Session.ts

export class SessionModel {
  // ... métodos existentes

  static async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    
    if (process.env.DATABASE_TYPE === 'postgres') {
      const result = await executeQuery(
        'DELETE FROM sessions WHERE expires_at < $1',
        [now.toISOString()],
        'write'
      );
      return result.rowCount || 0;
    } else {
      const db = getDatabase();
      const stmt = db.prepare('DELETE FROM sessions WHERE expiresAt < ?');
      const info = stmt.run(now.toISOString());
      return info.changes;
    }
  }

  static async deleteInactiveSessions(daysInactive: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    if (process.env.DATABASE_TYPE === 'postgres') {
      const result = await executeQuery(
        'DELETE FROM sessions WHERE last_activity_at < $1 AND is_active = 0',
        [cutoffDate.toISOString()],
        'write'
      );
      return result.rowCount || 0;
    } else {
      const db = getDatabase();
      const stmt = db.prepare(
        'DELETE FROM sessions WHERE lastActivityAt < ? AND isActive = 0'
      );
      const info = stmt.run(cutoffDate.toISOString());
      return info.changes;
    }
  }
}
```

```typescript
// backend/src/services/sessionCleanupService.ts
import { SessionModel } from '../models/Session';
import { logger } from '../utils/logger';

class SessionCleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  start() {
    logger.info('Starting session cleanup service', { 
      context: 'sessionCleanup' 
    });

    // Run immediately
    this.cleanup();

    // Run every 24 hours
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped session cleanup service', { 
        context: 'sessionCleanup' 
      });
    }
  }

  private async cleanup() {
    try {
      const expiredCount = await SessionModel.deleteExpiredSessions();
      const inactiveCount = await SessionModel.deleteInactiveSessions(30);

      logger.info('Session cleanup completed', {
        context: 'sessionCleanup',
        metadata: {
          expiredSessions: expiredCount,
          inactiveSessions: inactiveCount,
          totalCleaned: expiredCount + inactiveCount
        }
      });
    } catch (error) {
      logger.error('Session cleanup failed', {
        context: 'sessionCleanup',
        metadata: { error }
      });
    }
  }
}

export const sessionCleanupService = new SessionCleanupService();
```

Agregar al server.ts:

```typescript
// backend/src/server.ts
import { sessionCleanupService } from './services/sessionCleanupService';

export const startServer = () => {
  const server = app.listen(PORT, () => {
    logger.startup({
      context: 'serverStart',
      message: `🚀 Server running on port ${PORT}`,
      metadata: { port: PORT, environment: process.env.NODE_ENV, pid: process.pid }
    });

    // Start session cleanup service
    sessionCleanupService.start();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully', { context: 'shutdown' });
    sessionCleanupService.stop();
    server.close(() => {
      logger.info('Server closed', { context: 'shutdown' });
      process.exit(0);
    });
  });

  return server;
};
```

---

## 🟢 Mejoras de Baja Prioridad

### 15. Agregar Compresión HTTP

```bash
cd /home/engine/project/backend
npm install compression
npm install -D @types/compression
```

```typescript
// backend/src/server.ts
import compression from 'compression';

// Agregar después de helmet, antes de cors
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));
```

---

### 16. Mejorar Headers de Seguridad

```typescript
// backend/src/server.ts

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { 
    policy: 'strict-origin-when-cross-origin' 
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  frameguard: { action: 'deny' }
}));
```

---

## 📋 Checklist de Implementación

### Crítico
- [ ] Rotar todos los secretos
- [ ] Eliminar backend/.env del repositorio
- [ ] Actualizar dependencias vulnerables
- [ ] Implementar validación con Zod
- [ ] Reemplazar console.log con logger
- [ ] Crear archivos de secretos de ejemplo

### Alta Prioridad
- [ ] Habilitar TypeScript strict mode
- [ ] Eliminar tipos 'any'
- [ ] Configurar límites de payload
- [ ] Mejorar configuración CORS
- [ ] Usar UUID consistentemente
- [ ] Proteger endpoint /metrics

### Media Prioridad
- [ ] Implementar sanitización HTML
- [ ] Mejorar health checks
- [ ] Implementar limpieza de sesiones
- [ ] Agregar tests de integración
- [ ] Documentación OpenAPI

### Baja Prioridad
- [ ] Agregar compresión HTTP
- [ ] Mejorar headers de seguridad
- [ ] Implementar APM
- [ ] Configurar backups automáticos

---

## 🧪 Testing de Remediación

Después de cada cambio, ejecutar:

```bash
# Backend tests
cd backend
npm test

# Type checking
npm run build

# Linting
npm run lint

# Audit
npm audit
```

---

## 📝 Notas Finales

- Probar cada cambio en ambiente de desarrollo antes de producción
- Documentar todos los cambios realizados
- Actualizar el README con nuevas instrucciones
- Comunicar cambios al equipo
- Realizar backup antes de cambios críticos

---

**Última actualización:** Diciembre 2024
