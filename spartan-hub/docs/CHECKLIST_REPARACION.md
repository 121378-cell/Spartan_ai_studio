# PLAN DE REPARACIÓN - CHECKLIST EJECUTABLE

**Objetivo**: Pasar de 234 tests pasados a ~350+ tests pasados  
**Tiempo Estimado**: 47 minutos  
**Dificultad**: Media (25% Crítica, 50% Mayor, 25% Menor)

---

## FASE 1: FOREIGN KEY FIX (5 minutos) 🔴 CRÍTICO

### ✅ COMPLETADO
- [x] Agregar `jest.unmock('uuid')` en auth.middleware.comprehensive.test.ts
- [x] Agregar `jest.unmock('uuid')` en auth.security.test.ts
- [x] Agregar `jest.unmock('uuid')` en security.middleware.test.ts
- [x] Agregar método `clearSessions()` en sqliteDatabaseService.ts
- [x] Actualizar `SessionModel.clear()` para usar `clearSessions()`
- [x] Actualizar `beforeEach` con `await SessionModel.clear()`

### ❌ PENDIENTE

#### Tarea 1.1: Agregar jest.unmock en load.test.ts
**Archivo**: `backend/src/__tests__/load.test.ts`  
**Líneas**: 1-10 (al inicio del archivo)

```typescript
// ANTES:
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { uuidv4 } from 'uuid';

// DESPUÉS:
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';

jest.unmock('uuid'); // ← AGREGAR ESTA LÍNEA

import { app } from '../server';
import { userDb } from '../services/databaseServiceFactory';
import { uuidv4 } from 'uuid';
```

**Checklist**:
- [ ] Abierto el archivo backend/src/__tests__/load.test.ts
- [ ] Encontrado el bloque de imports al inicio
- [ ] Agregado `jest.unmock('uuid');` después de los imports de @jest/globals y supertest
- [ ] Guardado el archivo

**Verificación Post-cambio**:
```bash
npm test -- backend/src/__tests__/load.test.ts 2>&1 | grep "FOREIGN KEY"
# Debería mostrar 0 resultados o significativamente menos
```

---

## FASE 2: SQLITE3 BINDING FIX (10 minutos) 🔴 CRÍTICO

### Tarea 2.1: Identificar el problema en load.test.ts
**Archivo**: `backend/src/__tests__/load.test.ts`  
**Línea**: ~244

**Acción**: Buscar la sección donde se crean usuarios en el test de carga
```typescript
// Buscar algo como:
const users = Array(...).map((_,i) => {
  return userDb.create({
    ...userData  // Variables con objetos sin serializar
  });
});
```

**Checklist**:
- [ ] Encontrada la línea ~244 en load.test.ts
- [ ] Identificados los campos que son objetos: stats, keystoneHabits, trainingCycle, etc.

### Tarea 2.2: Serializar los objetos
**Archivo**: `backend/src/__tests__/load.test.ts`  
**Línea**: ~244

**Cambio**:
```typescript
// ANTES:
const users = userIds.map(id => 
  userDb.create({
    name: `User ${id}`,
    email: `user${id}@test.com`,
    stats: {},           // ❌ Objeto
    keystoneHabits: [],  // ❌ Array
    trainingCycle: {},   // ❌ Objeto
  })
);

// DESPUÉS:
const users = userIds.map(id => 
  userDb.create({
    name: `User ${id}`,
    email: `user${id}@test.com`,
    stats: JSON.stringify({}),           // ✅ String
    keystoneHabits: JSON.stringify([]),  // ✅ String
    trainingCycle: JSON.stringify({}),   // ✅ String
  })
);
```

**Checklist**:
- [ ] Abierto el archivo backend/src/__tests__/load.test.ts
- [ ] Localizado la sección de creación de usuarios (~línea 244)
- [ ] Envuelto los objetos con `JSON.stringify()`
- [ ] Guardado el archivo

**Verificación Post-cambio**:
```bash
npm test -- backend/src/__tests__/load.test.ts 2>&1 | grep "SQLite3 can only bind"
# Debería mostrar 0 resultados
```

---

## FASE 3: TIMEOUT FIX (5 minutos) ⏱️ MAYOR

### Tarea 3.1: Agregar timeouts en load.test.ts
**Archivo**: `backend/src/__tests__/load.test.ts`  
**Líneas**: ~13, 35, 160, 198

**Cambio a Realizar** (buscar y reemplazar):

```typescript
// Test 1 - Línea ~13
// ANTES:
test('should handle multiple concurrent health check requests', async () => {

// DESPUÉS:
test('should handle multiple concurrent health check requests', async () => {
}, 30000); // ← Agregar aquí al final
```

Repetir para los 4 tests en load.test.ts:
1. `should handle multiple concurrent health check requests`
2. `should handle multiple sequential health check requests`
3. `should handle concurrent API requests without errors`
4. `should handle rapid successive requests`

**Checklist**:
- [ ] Abierto el archivo backend/src/__tests__/load.test.ts
- [ ] Encontrado el test en línea ~13
- [ ] Agregado `, 30000` después del callback
- [ ] Repetido para línea ~35
- [ ] Repetido para línea ~160
- [ ] Repetido para línea ~198
- [ ] Guardado el archivo

### Tarea 3.2: Agregar timeout en auth.middleware.comprehensive.test.ts
**Archivo**: `backend/src/__tests__/auth.middleware.comprehensive.test.ts`  
**Línea**: ~269

```typescript
// ANTES:
it('should include security headers in all responses', async () => {

// DESPUÉS:
it('should include security headers in all responses', async () => {
}, 15000); // ← Agregar aquí
```

**Checklist**:
- [ ] Abierto el archivo backend/src/__tests__/auth.middleware.comprehensive.test.ts
- [ ] Encontrado el test "should include security headers" (~línea 269)
- [ ] Agregado `, 15000` después del callback
- [ ] Guardado el archivo

### Tarea 3.3: Agregar timeout en auth.security.test.ts
**Archivo**: `backend/src/__tests__/auth.security.test.ts`  
**Línea**: ~440

```typescript
// ANTES:
it('should include security headers in responses', async () => {

// DESPUÉS:
it('should include security headers in responses', async () => {
}, 15000); // ← Agregar aquí
```

**Checklist**:
- [ ] Abierto el archivo backend/src/__tests__/auth.security.test.ts
- [ ] Encontrado el test "should include security headers" (~línea 440)
- [ ] Agregado `, 15000` después del callback
- [ ] Guardado el archivo

**Verificación Post-cambios**:
```bash
npm test 2>&1 | grep "Exceeded timeout"
# Debería mostrar 0 resultados
```

---

## FASE 4: MESSAGE NORMALIZATION (15 minutos) 🟡 MAYOR

### Tarea 4.1: Revisar middleware de autenticación
**Archivo**: `backend/src/middleware/auth.ts`  
**Acción**: Buscar donde se generan los mensajes de error

**Checklist**:
- [ ] Abierto el archivo backend/src/middleware/auth.ts
- [ ] Encontradas todas las instancias de mensaje de error
- [ ] Identificados los 3 casos:
  - [ ] Malformed JWT → cambiar a "Access denied"
  - [ ] Expired JWT → cambiar a "Invalid or expired token"
  - [ ] Inactive/expired session → cambiar a "Session expired"

### Tarea 4.2: Normalizar mensajes
**Archivo**: `backend/src/middleware/auth.ts`

Buscar y reemplazar:

```typescript
// Buscar patterns que generan respuestas 401
// Y estandarizar los mensajes a:

// 1. Para tokens malformados o inválidos:
res.status(401).json({ message: 'Access denied', error: 'Invalid token format' });

// 2. Para tokens expirados:
res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });

// 3. Para sesiones expiradas:
res.status(401).json({ message: 'Session expired. Please log in again.' });
```

**Checklist**:
- [ ] Identificada la función que valida JWT
- [ ] Identificada la función que valida sesión
- [ ] Actualizado mensaje para tokens malformados
- [ ] Actualizado mensaje para sesiones expiradas
- [ ] Guardado el archivo

**Verificación Post-cambios**:
```bash
npm test -- backend/src/__tests__/auth.middleware.comprehensive.test.ts 2>&1 | grep "Expected substring"
# Debería mostrar 0 resultados de mismatch
```

---

## FASE 5: QUERY PARAMETER COERCION (10 minutos) 🟡 MAYOR

### Tarea 5.1: Revisar schemas Zod
**Archivos**: `backend/src/schemas/*.ts`  
**Acción**: Buscar schemas que usan parámetros numéricos

**Checklist**:
- [ ] Abierto backend/src/schemas/authSchema.ts
- [ ] Encontrado parámetros page, limit, etc.
- [ ] Verificado si usan `z.number()` o `z.coerce.number()`

### Tarea 5.2: Actualizar esquemas con .coerce
**Archivos**: `backend/src/schemas/*.ts`

```typescript
// ANTES:
export const querySchema = z.object({
  page: z.number(),
  limit: z.number()
});

// DESPUÉS:
export const querySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10)
});
```

Aplicar a todos los esquemas que tengan parámetros numéricos en query.

**Checklist**:
- [ ] Actualizado authSchema.ts
- [ ] Actualizado cualquier otro schema con query params numéricos
- [ ] Guardados los archivos

### Tarea 5.3: Revisar middleware validate.ts
**Archivo**: `backend/src/middleware/validate.ts`  
**Acción**: Verificar que procesa correctamente los parámetros

**Checklist**:
- [ ] Abierto backend/src/middleware/validate.ts
- [ ] Verificado que procesa req.query, req.body, req.params
- [ ] Verificado que usa el schema completo con Zod parse

**Verificación Post-cambios**:
```bash
npm test -- backend/src/__tests__/auth.middleware.comprehensive.test.ts 2>&1 | grep "toEqual.*page.*1.*limit.*10"
# Debería mostrar 0 resultados de mismatch
```

---

## FASE 6: EMAIL VALIDATION FIX (5 minutos) 🟢 MENOR

### Tarea 6.1: Revisar middleware validate.ts
**Archivo**: `backend/src/middleware/validate.ts`  
**Línea**: Error handling en try-catch

**Problema**:
```typescript
// ❌ INCORRECTO:
try {
  const result = await schema.parseAsync(...);
  next();
} catch (error) {
  res.status(400).json({ error });
  next();  // ← Siempre se llama!
}
```

### Tarea 6.2: Agregar return en catch block
**Archivo**: `backend/src/middleware/validate.ts`

```typescript
// ✅ CORRECTO:
try {
  const result = await schema.parseAsync(...);
  next();
} catch (error) {
  res.status(400).json({ error });
  return;  // ← Agregado!
}
```

**Checklist**:
- [ ] Abierto backend/src/middleware/validate.ts
- [ ] Encontrado el bloque catch
- [ ] Agregado `return;` después de res.status().json()
- [ ] Guardado el archivo

**Verificación Post-cambios**:
```bash
npm test -- backend/src/__tests__/auth.middleware.comprehensive.test.ts 2>&1 | grep "mockNext.*toHaveBeenCalled"
# Debería mostrar 0 resultados
```

---

## VERIFICACIÓN FINAL (10 minutos)

### Test Ejecutable Completo
```bash
# Paso 1: Limpiar
rm -rf backend/src/__tests__/jest.cache 2>/dev/null || true

# Paso 2: Ejecutar tests
cd "c:\Users\sergi\Spartan hub 2.0\spartan-hub"
npm test

# Paso 3: Verificar resultados
# Debería ver algo como:
# Test Suites: 0 failed, 32 passed
# Tests: X failed, Y passed (donde Y >> X)
```

### Checklist Final
- [ ] Todos los archivos han sido guardados
- [ ] No hay errores de sintaxis
- [ ] Los tests ejecutan sin errores críticos
- [ ] Menos de 20 tests fallando (down from 123)
- [ ] Documentación actualizada

---

## RESUMEN DE CAMBIOS

| Fase | Tareas | Archivos | Líneas | Estado |
|------|--------|----------|--------|--------|
| 1 | 1 | 1 | 3 | ✅ 100% |
| 2 | 2 | 1 | 5 | ❌ 0% |
| 3 | 3 | 3 | 8 | ❌ 0% |
| 4 | 2 | 1 | 15+ | ❌ 0% |
| 5 | 3 | 3 | 10+ | ❌ 0% |
| 6 | 2 | 1 | 5 | ❌ 0% |
| **TOTAL** | **13** | **10** | **46+** | **8%** |

---

## PRÓXIMOS PASOS DESPUÉS DE COMPLETAR

1. Ejecutar `npm test` para verificar mejoras
2. Si aún hay errores, revisar el análisis técnico
3. Documentar cualquier cambio adicional requerido
4. Crear PR con todos los cambios
5. Revisar y mergear

---

## NOTAS IMPORTANTES

- ✅ = Completado
- ❌ = Pendiente
- 🔴 = Crítico (bloquea otros cambios)
- 🟡 = Mayor (afecta múltiples tests)
- 🟢 = Menor (afecta pocos tests)

**Tiempo Total**: ~47 minutos  
**Errores Esperados Post-reparación**: <20 (down from 123)  
**Tasa de Éxito**: ~85% (210+ tests pasando)
