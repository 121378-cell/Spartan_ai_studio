# INFORME DE ERRORES EN TESTS - Spartan Hub

**Fecha**: 1 de Enero de 2026  
**Total de Tests**: 359  
**Tests Fallidos**: 123  
**Tests Pasados**: 234  
**Test Suites Fallidas**: 20 de 32

---

## RESUMEN EJECUTIVO

Se encontraron **6 categorías principales de errores** en los tests:

1. **Errores de Foreign Key en SQLite** (Crítico)
2. **Inconsistencias en Mensajes de Error** (Mayor)
3. **Problemas con Timeouts** (Mayor)
4. **Transformación de Query Parameters** (Mayor)
5. **Errores de Validación de Email** (Menor)
6. **Problemas de Binding en SQLite3** (Crítico)

---

## DETALLE DE ERRORES Y SOLUCIONES

### 1. 🔴 FOREIGN KEY CONSTRAINT FAILED (Crítico)

**Archivos Afectados:**
- `backend/src/__tests__/auth.middleware.comprehensive.test.ts`
- `backend/src/__tests__/auth.security.test.ts`
- `backend/src/__tests__/load.test.ts`

**Síntoma:**
```
SqliteError: FOREIGN KEY constraint failed
  at Object.createSession (backend/src/services/sqliteDatabaseService.ts:144:11)
  at Function.create (backend/src/models/Session.ts:29:18)
```

**Causa Raíz:**
- Existe un mock de UUID (`backend/src/__mocks__/uuid.ts`) que genera IDs falsos como `mock-uuid-7`
- Cuando se intenta crear una sesión con `userId: "mock-uuid-7"`, la restricción de Foreign Key falla porque el usuario con ese ID específico sí existe en la BD
- Los tests necesitan usar UUIDs reales para que el Foreign Key funcione correctamente

**Solución:**
```typescript
// Al inicio de cada archivo de test, agregar:
jest.unmock('uuid');

import { app } from '../server';
```

**Archivos a Modificar:**
- ✅ `backend/src/__tests__/auth.middleware.comprehensive.test.ts` - **YA HECHO**
- ✅ `backend/src/__tests__/auth.security.test.ts` - **YA HECHO**
- ✅ `backend/src/__tests__/security.middleware.test.ts` - **YA HECHO**
- ❌ `backend/src/__tests__/load.test.ts` - PENDIENTE
- ❌ Otros tests que usen SessionModel - REVISAR

**Cambios Adicionales:**
- ✅ Agregar método `clearSessions()` en `sqliteDatabaseService.ts` - **YA HECHO**
- ✅ Actualizar `SessionModel.clear()` para usar `clearSessions()` - **YA HECHO**
- ✅ Actualizar `beforeEach` con `await SessionModel.clear()` - **YA HECHO**

**Estado**: 60% completado

---

### 2. 🟡 INCONSISTENCIAS EN MENSAJES DE ERROR (Mayor)

**Archivos Afectados:**
- `backend/src/__tests__/auth.middleware.comprehensive.test.ts` (línea 87, 221)
- `backend/src/__tests__/auth.security.test.ts` (línea 170)

**Síntoma:**
```
Expected substring: "Access denied"
Received string: "Invalid or expired token. Please log in again."

Expected substring: "Session expired"
Received string: "Invalid or expired session. Please log in again."
```

**Causa Raíz:**
- Los tests esperan mensajes específicos exactos, pero el middleware de autenticación genera mensajes genéricos
- No hay consistencia entre lo que el test espera y lo que el código envía

**Soluciones Posibles:**

**Opción A (Recomendada - Normalizar Mensajes en Código)**
- Actualizar `backend/src/middleware/auth.ts` para usar mensajes exactos
- Cambiar "Invalid or expired token" por "Access denied" para malformed tokens
- Cambiar "Invalid or expired session" por "Session expired"

**Opción B (Alternativa - Actualizar Tests)**
- Actualizar los tests para esperar los mensajes reales del sistema
- Más fácil pero menos correcto conceptualmente

**Implementación Recomendada (Opción A):**

Revisar `backend/src/middleware/auth.ts` y:
1. Para tokens malformados: usar mensaje "Access denied"
2. Para sesiones expiradas: usar mensaje "Session expired"
3. Para tokens inválidos pero bien formados: mantener "Invalid or expired token"

**Archivos a Modificar:**
- ❌ `backend/src/middleware/auth.ts` - PENDIENTE
- ❌ `backend/src/__tests__/auth.middleware.comprehensive.test.ts` - Posiblemente actualizar si se elige Opción B
- ❌ `backend/src/__tests__/auth.security.test.ts` - Posiblemente actualizar si se elige Opción B

**Estado**: 0% completado

---

### 3. ⏱️ PROBLEMAS CON TIMEOUTS (Mayor)

**Archivos Afectados:**
- `backend/src/__tests__/load.test.ts` (línea 13, 35, 160, 198)
- `backend/src/__tests__/auth.middleware.comprehensive.test.ts` (línea 269, 440 en auth.security.test.ts)

**Síntoma:**
```
thrown: "Exceeded timeout of 5000 ms for a test.
Add a timeout value to this test to increase the timeout, if this is a long-running test."
```

**Causa Raíz:**
- Los tests de carga hacen muchas solicitudes concurrentes que tardan más de 5 segundos
- Los tests de health check y security headers son tests de larga duración
- El timeout por defecto de Jest es muy corto para estos tests

**Soluciones:**

**Para load.test.ts:**
```typescript
test('should handle multiple concurrent health check requests', async () => {
  // ... test code
}, 30000); // 30 segundos timeout
```

**Para auth tests:**
```typescript
it('should include security headers in all responses', async () => {
  // ... test code
}, 15000); // 15 segundos timeout
```

**Archivos a Modificar:**
- ❌ `backend/src/__tests__/load.test.ts` - PENDIENTE
  - Línea ~13: `test('should handle multiple concurrent...', async () => {}, 30000);`
  - Línea ~35: `test('should handle multiple sequential...', async () => {}, 30000);`
  - Línea ~160: `test('should handle concurrent API...', async () => {}, 30000);`
  - Línea ~198: `test('should handle rapid successive...', async () => {}, 30000);`
- ❌ `backend/src/__tests__/auth.middleware.comprehensive.test.ts` - PENDIENTE
  - Línea ~269: `it('should include security headers...', async () => {}, 15000);`
- ❌ `backend/src/__tests__/auth.security.test.ts` - PENDIENTE
  - Línea ~440: `it('should include security headers...', async () => {}, 15000);`

**Estado**: 0% completado

---

### 4. 🔄 TRANSFORMACIÓN DE QUERY PARAMETERS (Mayor)

**Archivos Afectados:**
- `backend/src/__tests__/auth.middleware.comprehensive.test.ts` (línea 361)

**Síntoma:**
```
Expected: { "limit": 10, "page": 1 }
Received: { "limit": "10", "page": "1" }
```

**Causa Raíz:**
- El middleware de validación no está transformando los parámetros query de strings a números
- Los parámetros URL siempre llegan como strings y necesitan ser convertidos
- El middleware `validate()` no está aplicando las transformaciones definidas en el schema

**Solución:**
Revisar `backend/src/middleware/validate.ts` y asegurar que:
1. El middleware aplique transformaciones numéricas usando Zod
2. Los parámetros query se procesen como números cuando sea necesario
3. Se use `.coerce` o `.transform` en el schema Zod

**Ejemplo de Código Esperado:**
```typescript
const schema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10)
});
```

**Archivos a Modificar:**
- ❌ `backend/src/middleware/validate.ts` - PENDIENTE
- ❌ `backend/src/schemas/*.ts` - REVISAR si necesitan coerce
- ❌ `backend/src/__tests__/auth.middleware.comprehensive.test.ts` - Posiblemente revisar expectations

**Estado**: 0% completado

---

### 5. ✉️ ERRORES DE VALIDACIÓN DE EMAIL (Menor)

**Archivos Afectados:**
- `backend/src/__tests__/auth.middleware.comprehensive.test.ts` (línea 339)

**Síntoma:**
```
Expected: mockNext not to have been called
Received: mockNext was called 1 time
  1: [ValidationError: body.email: Invalid email format]
```

**Causa Raíz:**
- El test espera que la validación falle y NO llame a `next()`, pero sí lo llama
- El middleware está pasando la solicitud al siguiente middleware en lugar de rechazarla
- El email inválido no está siendo rechazado correctamente

**Solución:**
1. Revisar el middleware `validate()` en `backend/src/middleware/validate.ts`
2. Asegurar que cuando la validación falla, se retorna un error 400 y NO se llama a `next()`
3. El middleware debe terminar la respuesta en caso de error

**Ejemplo de Código Esperado:**
```typescript
export const validate = (schema: ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Validar
      const result = await schema.parseAsync({ body: req.body });
      req.validatedData = result;
      next();
    } catch (error) {
      // Retornar error, NO llamar a next()
      res.status(400).json({ error: 'Validation failed' });
      return; // Importante: retornar aquí
    }
  };
};
```

**Archivos a Modificar:**
- ❌ `backend/src/middleware/validate.ts` - PENDIENTE
- ❌ `backend/src/__tests__/auth.middleware.comprehensive.test.ts` - Posiblemente actualizar si se requiere

**Estado**: 0% completado

---

### 6. 📦 ERRORES DE BINDING EN SQLITE3 (Crítico)

**Archivos Afectados:**
- `backend/src/__tests__/load.test.ts` (línea 27)

**Síntoma:**
```
TypeError: SQLite3 can only bind numbers, strings, bigints, buffers, and null
  at Object.create (backend/src/services/sqliteDatabaseService.ts:27:11)
  at backend/src/__tests__/load.test.ts:244:59
```

**Causa Raíz:**
- Se está intentando pasar un objeto o tipo incompatible a SQLite3
- El método `stmt.run()` recibe parámetros que no son strings, números, bigints, buffers o null
- Probablemente un objeto JSON u otro tipo de dato que necesita serialización

**Solución:**
Revisar la llamada en el test en línea ~244 de `load.test.ts`:
```typescript
// Probable causa:
userData.stats = {};  // Objeto se pasa directamente
userData.trainingCycle = {};  // Objeto se pasa directamente

// Solución:
userData.stats = JSON.stringify({});  // Serializar antes
userData.trainingCycle = JSON.stringify({});  // Serializar antes
```

O revisar `sqliteDatabaseService.ts` línea 27 para asegurar que todos los valores se serialicen correctamente.

**Archivos a Modificar:**
- ❌ `backend/src/services/sqliteDatabaseService.ts` - REVISAR línea 27
- ❌ `backend/src/__tests__/load.test.ts` - REVISAR línea 244

**Estado**: 0% completado

---

## MATRIZ DE PRIORIDADES

| Prioridad | Error | Impacto | Esfuerzo | Estado |
|-----------|-------|--------|----------|--------|
| 1 | FOREIGN KEY Constraint | 🔴 Bloquea tests | 🟢 Bajo | ⏳ 60% |
| 2 | SQLite3 Binding Error | 🔴 Bloquea tests | 🟡 Medio | ⏳ 0% |
| 3 | Timeouts | 🟡 Hace tests lentos | 🟢 Muy Bajo | ⏳ 0% |
| 4 | Mensaje de Error | 🟡 Falla test | 🟡 Medio | ⏳ 0% |
| 5 | Query Parameters | 🟡 Falla test | 🟡 Medio | ⏳ 0% |
| 6 | Email Validation | 🟢 Falla test | 🟡 Medio | ⏳ 0% |

---

## PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Crítica (AHORA)
1. ✅ Completar `jest.unmock('uuid')` en load.test.ts
2. ❌ Corregir SQLite3 binding error en load.test.ts (línea 244)
3. ✅ Asegurar limpieza de sesiones entre tests

### Fase 2: Mayor (SIGUIENTE)
4. ❌ Corregir timeouts agregando valores específicos a tests
5. ❌ Normalizar mensajes de error en middleware/auth.ts
6. ❌ Implementar transformación de query parameters en validate.ts

### Fase 3: Menor (DESPUÉS)
7. ❌ Revisar y corregir validación de email

---

## ARCHIVOS CLAVE A REVISAR

```
backend/src/
├── middleware/
│   ├── auth.ts ❌ Revisar mensajes de error
│   └── validate.ts ❌ Revisar transformación y manejo de errores
├── services/
│   └── sqliteDatabaseService.ts ✅ PARCIALMENTE HECHO
├── models/
│   └── Session.ts ✅ PARCIALMENTE HECHO
└── __tests__/
    ├── auth.middleware.comprehensive.test.ts ✅ PARCIALMENTE HECHO
    ├── auth.security.test.ts ✅ PARCIALMENTE HECHO
    ├── security.middleware.test.ts ✅ PARCIALMENTE HECHO
    └── load.test.ts ❌ PENDIENTE
```

---

## PRÓXIMOS PASOS

Una vez aprobado este informe, procederé a:

1. **Agregar jest.unmock('uuid')** en load.test.ts
2. **Corregir SQLite3 binding** en load.test.ts
3. **Aumentar timeouts** en todos los tests afectados
4. **Revisar y corregir** middleware de auth y validate
5. **Re-ejecutar tests** para verificar mejoras
6. **Iterar** hasta que todos los tests pasen
