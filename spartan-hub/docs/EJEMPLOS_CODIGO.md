# EJEMPLOS DE CÓDIGO - IMPLEMENTACIÓN DE SOLUCIONES

Esta guía contiene ejemplos exactos de código para cada solución.

---

## SOLUCIÓN 1: jest.unmock('uuid')

### load.test.ts - ANTES
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { uuidv4 } from 'uuid';

describe('Load Tests', () => {
  // ... resto del código
});
```

### load.test.ts - DESPUÉS
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';

jest.unmock('uuid'); // ← AGREGAR ESTA LÍNEA

import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { uuidv4 } from 'uuid';

describe('Load Tests', () => {
  // ... resto del código
});
```

**Ubicación exacta**: Línea 1-10 del archivo  
**Síntaxis**: Debe estar ENTRE imports de @jest/globals y los imports normales  
**Impacto**: Soluciona ~30 errores FOREIGN KEY

---

## SOLUCIÓN 2: Serializar objetos JSON en load.test.ts

### Ubicación del problema - load.test.ts (línea ~240-250)

### ANTES
```typescript
// Test de carga - crear múltiples usuarios
const createLoadTestUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    return userDb.create({
      name: `Load Test User ${i}`,
      email: `loadtest${i}@example.com`,
      password: 'testpass123',
      role: 'user',
      quest: 'Test Quest',
      stats: {},                          // ❌ Objeto
      onboardingCompleted: true,
      keystoneHabits: [],                 // ❌ Array
      masterRegulationSettings: {},       // ❌ Objeto
      nutritionSettings: {},              // ❌ Objeto
      isInAutonomyPhase: false,
      weightKg: 75,
      trainingCycle: {},                  // ❌ Objeto
      lastWeeklyPlanDate: new Date().toISOString(),
      detailedProfile: {},                // ❌ Objeto
      preferences: {}                     // ❌ Objeto
    });
  });
};
```

### DESPUÉS
```typescript
// Test de carga - crear múltiples usuarios
const createLoadTestUsers = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    return userDb.create({
      name: `Load Test User ${i}`,
      email: `loadtest${i}@example.com`,
      password: 'testpass123',
      role: 'user',
      quest: 'Test Quest',
      stats: JSON.stringify({}),                          // ✅ String
      onboardingCompleted: true,
      keystoneHabits: JSON.stringify([]),                 // ✅ String
      masterRegulationSettings: JSON.stringify({}),       // ✅ String
      nutritionSettings: JSON.stringify({}),              // ✅ String
      isInAutonomyPhase: false,
      weightKg: 75,
      trainingCycle: JSON.stringify({}),                  // ✅ String
      lastWeeklyPlanDate: new Date().toISOString(),
      detailedProfile: JSON.stringify({}),                // ✅ String
      preferences: JSON.stringify({})                     // ✅ String
    });
  });
};
```

**Cambios**: 6 campos de objetos/arrays → JSON.stringify()  
**Impacto**: Soluciona ~2 errores SQLite3 binding  

---

## SOLUCIÓN 3: Agregar Timeouts

### load.test.ts - ANTES (4 cambios)
```typescript
describe('Load Tests', () => {
  describe('Health Check Load Test', () => {
    test('should handle multiple concurrent health check requests', async () => {
      const requests = Array.from({ length: CONCURRENT_REQUESTS }, () =>
        request(app).get('/health').expect(200)
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(results.every(r => r.status === 200)).toBe(true);
    });

    test('should handle multiple sequential health check requests', async () => {
      const startTime = Date.now();

      for (let i = 0; i < REQUEST_COUNT; i++) {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Concurrency Tests', () => {
    test('should handle concurrent API requests without errors', async () => {
      // ... test code
    });

    test('should handle rapid successive requests', async () => {
      // ... test code
    });
  });
});
```

### load.test.ts - DESPUÉS (4 cambios)
```typescript
describe('Load Tests', () => {
  describe('Health Check Load Test', () => {
    test('should handle multiple concurrent health check requests', async () => {
      const requests = Array.from({ length: CONCURRENT_REQUESTS }, () =>
        request(app).get('/health').expect(200)
      );

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
      expect(results.every(r => r.status === 200)).toBe(true);
    }, 30000); // ← AGREGAR AQUÍ

    test('should handle multiple sequential health check requests', async () => {
      const startTime = Date.now();

      for (let i = 0; i < REQUEST_COUNT; i++) {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    }, 30000); // ← AGREGAR AQUÍ
  });

  describe('Concurrency Tests', () => {
    test('should handle concurrent API requests without errors', async () => {
      // ... test code
    }, 30000); // ← AGREGAR AQUÍ

    test('should handle rapid successive requests', async () => {
      // ... test code
    }, 30000); // ← AGREGAR AQUÍ
  });
});
```

### auth.middleware.comprehensive.test.ts - ANTES
```typescript
describe('Security Headers and Response Handling', () => {
  it('should include security headers in all responses', async () => {
    const res = await request(app).get('/health');

    // Check for security headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
  });
});
```

### auth.middleware.comprehensive.test.ts - DESPUÉS
```typescript
describe('Security Headers and Response Handling', () => {
  it('should include security headers in all responses', async () => {
    const res = await request(app).get('/health');

    // Check for security headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
  }, 15000); // ← AGREGAR AQUÍ
});
```

### auth.security.test.ts - ANTES
```typescript
describe('Security Header Tests', () => {
  it('should include security headers in responses', async () => {
    const res = await request(app).get('/health');

    // Check for security headers added by helmet
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });
});
```

### auth.security.test.ts - DESPUÉS
```typescript
describe('Security Header Tests', () => {
  it('should include security headers in responses', async () => {
    const res = await request(app).get('/health');

    // Check for security headers added by helmet
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  }, 15000); // ← AGREGAR AQUÍ
});
```

**Cambios**: 6 tests × 1 línea cada uno  
**Impacto**: Soluciona ~6 errores TIMEOUT  

---

## SOLUCIÓN 4: Normalizar Mensajes de Error

### middleware/auth.ts - ESTRUCTURA ACTUAL

```typescript
// Buscar funciones como:
export const verifyJWT = (token: string) => {
  try {
    // ... validation
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      // Token malformado
      return { valid: false, message: 'Invalid or expired token. Please log in again.' };
    }
    if (error.name === 'TokenExpiredError') {
      // Token expirado
      return { valid: false, message: 'Invalid or expired token. Please log in again.' };
    }
  }
};
```

### middleware/auth.ts - DESPUÉS DE CAMBIOS

```typescript
export const verifyJWT = (token: string) => {
  try {
    // ... validation
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      // Token malformado - devolver "Access denied"
      return { valid: false, message: 'Access denied', error: 'Invalid token format' };
    }
    if (error.name === 'TokenExpiredError') {
      // Token expirado - devolver "Invalid or expired token"
      return { valid: false, message: 'Invalid or expired token. Please log in again.' };
    }
  }
};

export const verifySession = (sessionData: any) => {
  if (!sessionData) {
    // Sesión no existe
    return { valid: false, message: 'Session expired. Please log in again.' };
  }
  if (new Date(sessionData.expiresAt) < new Date()) {
    // Sesión expirada
    return { valid: false, message: 'Session expired. Please log in again.' };
  }
  if (!sessionData.isActive) {
    // Sesión inactiva
    return { valid: false, message: 'Session expired. Please log in again.' };
  }
  return { valid: true };
};
```

**Cambios**: ~5-10 líneas de textos de mensajes  
**Impacto**: Soluciona ~5 errores MESSAGE MISMATCH  

---

## SOLUCIÓN 5: Query Parameter Coercion con Zod

### schemas/authSchema.ts - ANTES
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
});

export const querySchema = z.object({
  page: z.number(),
  limit: z.number()
});
```

### schemas/authSchema.ts - DESPUÉS
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
});

export const querySchema = z.object({
  page: z.coerce.number().default(1),    // ← Agregar .coerce
  limit: z.coerce.number().default(10)   // ← Agregar .coerce
});
```

### middleware/validate.ts - COMPLETO

```typescript
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Combinar body, params, query para validar
      const dataToValidate = {
        body: req.body || {},
        params: req.params || {},
        query: req.query || {}
      };

      // Parsear con schema
      const validatedData = await schema.parseAsync(dataToValidate);

      // Guardar datos validados
      req.validatedData = validatedData;

      // Llamar a next()
      next();
    } catch (error) {
      // En caso de error, responder con 400
      return res.status(400).json({
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      // NO LLAMAR A next() aquí
    }
  };
};
```

**Cambios**: 2 líneas (agregar .coerce en schema)  
**Impacto**: Soluciona ~1-2 errores QUERY PARAMETER  

---

## SOLUCIÓN 6: Email Validation - Return en Catch

### middleware/validate.ts - ANTES
```typescript
export const validate = (schema: ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      next();  // ❌ AQUÍ está el problema - siempre se llama
    }
  };
};
```

### middleware/validate.ts - DESPUÉS
```typescript
export const validate = (schema: ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      res.status(400).json({
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      return;  // ✅ AGREGADO - No continuar la ejecución
    }
  };
};
```

**Cambio**: 1 línea (agregar `return;`)  
**Impacto**: Soluciona ~1 error EMAIL VALIDATION  

---

## RESUMEN DE CAMBIOS POR ARCHIVO

| Archivo | Cambios | Líneas | Tiempo |
|---------|---------|--------|--------|
| load.test.ts | jest.unmock + JSON.stringify + timeouts | 9 | 10 min |
| auth.middleware.comprehensive.test.ts | jest.unmock (YA HECHO) + timeout | 1 | 2 min |
| auth.security.test.ts | jest.unmock (YA HECHO) + timeout | 1 | 2 min |
| security.middleware.test.ts | jest.unmock (YA HECHO) | 0 | 0 min |
| middleware/auth.ts | Normalizar mensajes | 5-10 | 10 min |
| middleware/validate.ts | Agregar return + coerce review | 1-2 | 5 min |
| schemas/*.ts | Agregar .coerce | 2+ | 5 min |

**TOTAL**: ~34 líneas, ~34 minutos

---

## COMANDOS DE VERIFICACIÓN

```bash
# Después de cada cambio
npm test -- <archivo> 2>&1 | grep -E "(PASS|FAIL|✓|✕|passed|failed)"

# Verificar FOREIGN KEY
npm test 2>&1 | grep -i "foreign key"

# Verificar TIMEOUT
npm test 2>&1 | grep -i "timeout"

# Verificar MESSAGE
npm test 2>&1 | grep -i "expected substring"

# Test completo
npm test
```
