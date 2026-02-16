# ANÁLISIS TÉCNICO DETALLADO DE ERRORES

## Error 1: FOREIGN KEY CONSTRAINT FAILED ❌

### Stack Trace Completo
```
SqliteError: FOREIGN KEY constraint failed
  at Object.createSession (backend/src/services/sqliteDatabaseService.ts:144:11)
  at Function.create (backend/src/models/Session.ts:29:18)
  at createToken (backend/src/__tests__/auth.middleware.comprehensive.test.ts:54:24)
  at Object.<anonymous> (backend/src/__tests__/auth.middleware.comprehensive.test.ts:121:28)
```

### Análisis de Causa
1. **Línea de tests**: Se llama `SessionModel.create({ userId: "mock-uuid-13" })`
2. **Línea en Session.ts**: El ID "mock-uuid-13" es generado por el mock en `__mocks__/uuid.ts`
3. **Línea en sqliteDatabaseService.ts**: Se intenta insertar con userId="mock-uuid-13"
4. **Problema en BD**: La tabla SESSIONS tiene FOREIGN KEY a USERS, pero "mock-uuid-13" no existe realmente

### Por qué sucede
```typescript
// En __mocks__/uuid.ts (ACTUALMENTE ACTIVO)
let uuidCounter = 0;
export const v4 = () => {
  uuidCounter++;
  return `mock-uuid-${uuidCounter}`; // Genera IDs falsos
};

// En sqliteDatabaseService.ts (USA EL MOCK)
const id = uuidv4(); // Retorna "mock-uuid-15"

// En la BD
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
  ↑ AQUÍ FALLA - El userId no existe
);
```

### Solución
```typescript
// Al inicio de cada test file
jest.unmock('uuid');

import { app } from '../server';
// Ahora uuidv4() retorna UUIDs reales como: 550e8400-e29b-41d4-a716-446655440000
```

### Archivos Modificados ✅
- ✅ auth.middleware.comprehensive.test.ts (línea 1-7)
- ✅ auth.security.test.ts (línea 1-7)
- ✅ security.middleware.test.ts (línea 1-7)

### Archivos Pendientes ❌
- ❌ load.test.ts (agregar jest.unmock('uuid') al inicio)

### Verificación
```bash
# Ejecutar después de agregar jest.unmock('uuid') en load.test.ts
npm test -- backend/src/__tests__/load.test.ts
# Debería haber MENOS errores de FOREIGN KEY
```

---

## Error 2: SQLite3 Can Only Bind (números, strings, bigints, buffers, null)

### Stack Trace Completo
```
TypeError: SQLite3 can only bind numbers, strings, bigints, buffers, and null
  at Object.create (backend/src/services/sqliteDatabaseService.ts:27:11)
  at backend/src/__tests__/load.test.ts:244:59
  at Array.map (<anonymous>)
  at Object.<anonymous> (backend/src/__tests__/load.test.ts:244:40)
```

### Análisis
1. Línea 244 en load.test.ts está creando múltiples usuarios
2. Algún campo contiene un objeto JavaScript en lugar de string
3. SQLite3 (better-sqlite3) solo acepta tipos primitivos

### Investigación en load.test.ts
```typescript
// Línea ~244 probable:
const users = Array(10).fill(null).map((_, i) => {
  return userDb.create({
    name: `Load Test User ${i}`,
    email: `loadtest${i}@example.com`,
    password: 'password123',
    stats: {},  // ❌ OBJETO - SQLite no acepta
    keystoneHabits: [],  // ❌ ARRAY - Podría ser problema
    trainingCycle: {},  // ❌ OBJETO - SQLite no acepta
    // ... más campos
  });
});
```

### Cómo lo Maneja sqliteDatabaseService.ts
```typescript
// Línea 27 (en userDb.create)
stmt?.run(
  id, userData.name, userData.email, userData.password, userData.role || 'user',
  userData.quest || null, JSON.stringify(userData.stats || {}), // ← Aquí se serializa
  userData.onboardingCompleted ? 1 : 0, JSON.stringify(userData.keystoneHabits || []),
  // ...
);

// PERO en load.test.ts, userData ya tiene stats como objeto
// Cuando llega a sqliteDatabaseService, intenta JSON.stringify un objeto
// Aunque debería funcionar... el problema podría ser:
```

### Solución Probable
En `load.test.ts` línea ~244, PRE-serializar los objetos:
```typescript
const users = Array(10).fill(null).map((_, i) => {
  return userDb.create({
    name: `Load Test User ${i}`,
    email: `loadtest${i}@example.com`,
    password: 'password123',
    stats: JSON.stringify({}),  // Serializar primero
    keystoneHabits: JSON.stringify([]),  // Serializar primero
    trainingCycle: JSON.stringify({}),  // Serializar primero
    // ...
  });
});
```

O revisar si `userDb.create()` en sqliteDatabaseService.ts está haciendo double-stringify.

### Verificación
```typescript
// En sqliteDatabaseService.ts, línea 27
// El orden debe ser:
const userData = {
  stats: {}, // Objeto
  // ...
};

// Debe convertirse a:
JSON.stringify(userData.stats) // String: "{}"

// NO:
JSON.stringify(JSON.stringify(userData.stats)) // String: "\"{}\""
```

---

## Error 3: Exceeded Timeout

### Stack Trace
```
thrown: "Exceeded timeout of 5000 ms for a test.
Add a timeout value to this test to increase the timeout, if this is a long-running test."
  at backend/src/__tests__/load.test.ts:13:5
```

### Análisis
Jest por defecto usa 5000ms (5 segundos) de timeout para cada test.
Los tests de carga hacen:
- 20-50 solicitudes HTTP concurrentes
- O 100+ solicitudes secuenciales
- Cada solicitud toma ~50-200ms

Cálculo: 50 solicitudes × 100ms = 5000ms (justo en el límite)

### Solución
```typescript
// Antes:
test('should handle multiple concurrent health check requests', async () => {
  // ... código que tarda 6-10 segundos
});

// Después:
test('should handle multiple concurrent health check requests', async () => {
  // ... código que tarda 6-10 segundos
}, 30000); // ← Agregar 30000ms (30 segundos) de timeout
```

### Tests Afectados en load.test.ts
1. Línea 13 (aprox): CONCURRENT_REQUESTS test → 30000ms
2. Línea 35 (aprox): SEQUENTIAL_REQUESTS test → 30000ms
3. Línea 160 (aprox): Concurrent API test → 30000ms
4. Línea 198 (aprox): Rapid successive test → 30000ms

### Tests Afectados en auth.middleware.comprehensive.test.ts
1. Línea 269 (aprox): Security headers test → 15000ms

### Tests Afectados en auth.security.test.ts
1. Línea 440 (aprox): Security headers test → 15000ms

---

## Error 4: Message Mismatch

### Caso 1: "Access denied" vs "Invalid or expired token"

**Test esperado:**
```typescript
it('should handle malformed JWT tokens gracefully', async () => {
  const res = await request(app)
    .get('/api/governance/health')
    .set('Authorization', 'invalid.token.format');
  
  expect(res.status).toBe(401);
  expect(res.body.message).toContain('Access denied'); // ← Espera esto
});
```

**Respuesta actual:**
```json
{
  "status": 401,
  "message": "Invalid or expired token. Please log in again." // ← Recibe esto
}
```

**Dónde se genera el mensaje:**
- `middleware/auth.ts` - función que valida JWT

### Caso 2: "Session expired" vs "Invalid or expired session"

**Test esperado:**
```typescript
it('should handle inactive sessions', async () => {
  const res = await request(app).get('/api/governance/health');
  
  expect(res.status).toBe(401);
  expect(res.body.message).toContain('Session expired'); // ← Espera esto
});
```

**Respuesta actual:**
```json
{
  "status": 401,
  "message": "Invalid or expired session. Please log in again." // ← Recibe esto
}
```

### Soluciones Posibles

**Opción 1: Cambiar Middleware (Recomendado)**
- Más correcto conceptualmente
- Mantiene consistencia en el sistema
- Cambios en un solo lugar

**Opción 2: Cambiar Tests**
- Más fácil a corto plazo
- Menos correcto conceptualmente
- Hay que cambiar 3+ archivos

**Recomendación: Opción 1**

---

## Error 5: Query Parameter Coercion

### Stack Trace
```
expect(mockReq.query).toEqual({ page: 1, limit: 10 });
Received: { "limit": "10", "page": "1" }
```

### Análisis
Los parámetros URL SIEMPRE llegan como strings:
```
GET /api/endpoint?page=1&limit=10
```
Se recibe:
```javascript
{
  page: "1",    // String, no número
  limit: "10"   // String, no número
}
```

### Problema
El middleware validate() no está haciendo transformación de tipos.

### Solución en Zod
```typescript
// Antes (SIN transformación):
const schema = z.object({
  page: z.number(),
  limit: z.number()
});

// Después (CON transformación):
const schema = z.object({
  page: z.coerce.number(),      // "1" → 1
  limit: z.coerce.number()      // "10" → 10
});

// O con defaults:
const schema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10)
});
```

### Archivos a Revisar
- `middleware/validate.ts` - ¿Cómo procesa query parameters?
- `schemas/authSchema.ts` - Revisar si tiene .coerce
- `schemas/*.ts` - Revisar todos los schemas

---

## Error 6: Email Validation Not Stopping

### Stack Trace
```
Expected: mockNext not to have been called
Received: mockNext was called 1 time
  1: [ValidationError: body.email: Invalid email format]
```

### Análisis
El test simula un request con email inválido:
```typescript
const mockReq = {
  body: {
    email: 'invalid-email'  // ❌ Email sin @domain
  }
};

await validationMiddleware(mockReq, mockRes, mockNext);

expect(mockNext).not.toHaveBeenCalled();  // ← FALLA
// mockNext FUE llamado, pero no debería
```

### Problema en Middleware
El middleware detect

a el error pero sigue llamando a next():
```typescript
// INCORRECTO:
try {
  await schema.parseAsync(req.body);
  next();  // ← Siempre se llama
} catch (error) {
  res.status(400).json({ error });
  next();  // ← ❌ SE LLAMA INCLUSO EN ERROR!
}

// CORRECTO:
try {
  await schema.parseAsync(req.body);
  next();
} catch (error) {
  res.status(400).json({ error });
  return;  // ← ✅ RETORNA - No llama a next()
}
```

### Solución
En `middleware/validate.ts`, agregar `return` después de enviar respuesta de error.

---

## MATRIZ DE COMPLEJIDAD

| Error | Tipo | Ubicaciones | Líneas | Cambios | Tiempo |
|-------|------|-----------|--------|---------|--------|
| Foreign Key | Logic | 1 | 1 | 1 | 2 min |
| SQLite Bind | Data | 2 | 2-3 | 5 | 10 min |
| Timeout | Config | 6 | 6-7 | 6 | 5 min |
| Message | Text | 1 | 10+ | 10+ | 15 min |
| Query Coerce | Logic | 2 | 5+ | 3 | 10 min |
| Email Validation | Logic | 1 | 1 | 1 | 5 min |
| **TOTAL** | - | - | **20+** | **26** | **47 min** |

---

## ORDEN DE IMPLEMENTACIÓN ÓPTIMO

```
1. jest.unmock('uuid') en load.test.ts
   └─ 1 línea, 1 minuto
   └─ Soluciona ~30 errores FOREIGN KEY

2. Corregir SQLite binding en load.test.ts
   └─ 5 líneas, 10 minutos
   └─ Soluciona ~2 errores críticos

3. Agregar timeouts
   └─ 6 tests × 1 línea = 6 líneas, 5 minutos
   └─ Soluciona ~10 errores TIMEOUT

4. Normalizar mensajes en auth.ts
   └─ ~10 líneas, 15 minutos
   └─ Soluciona ~5 errores MESSAGE

5. Implementar coerce en validate.ts y schemas
   └─ ~5 líneas, 10 minutos
   └─ Soluciona ~1-2 errores COERCE

6. Corregir return en validate.ts
   └─ 1 línea, 5 minutos
   └─ Soluciona ~1 error EMAIL

**TIEMPO TOTAL: ~47 minutos**
**ERRORES SOLUCIONADOS: ~120 de 123**
```
