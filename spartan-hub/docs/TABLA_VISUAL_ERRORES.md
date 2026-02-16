# 📊 TABLA VISUAL DE ERRORES Y SOLUCIONES

## COMPARATIVA DE DOCUMENTOS

| Documento | Tipo | Líneas | Tiempo | Mejor Para |
|-----------|------|--------|--------|-----------|
| 📄 INDICE_DOCUMENTACION.md | Índice | 400 | 5 min | Navegación principal |
| 📋 INFORME_ERRORES_TESTS.md | Completo | 800 | 20 min | Entendimiento profundo |
| ⚡ RESUMEN_ERRORES_RAPIDO.md | Resume | 300 | 5 min | Visión general |
| 🔬 ANALISIS_TECNICO_ERRORES.md | Técnico | 600 | 15 min | Stack traces |
| ✅ CHECKLIST_REPARACION.md | Ejecutable | 700 | 50 min | Implementación |
| 💻 EJEMPLOS_CODIGO.md | Código | 500 | 10 min | Copy/paste |

---

## MATRIZ DE ERRORES (CORTA)

### Error #1: FOREIGN KEY CONSTRAINT ❌

| Aspecto | Detalle |
|---------|---------|
| **Severidad** | 🔴 CRÍTICO |
| **Archivo** | `backend/src/__tests__/load.test.ts` |
| **Línea** | ~1-10 |
| **Síntoma** | `SqliteError: FOREIGN KEY constraint failed` |
| **Causa** | UUID mock genera IDs falsos ("mock-uuid-7") |
| **Solución** | Agregar `jest.unmock('uuid');` |
| **Cambios** | 1 línea |
| **Tiempo** | 2 minutos |
| **Errores Solucionados** | ~30 |
| **Estado** | ⏳ 60% (3/4 tests ya hecho) |

---

### Error #2: SQLite3 CAN ONLY BIND ❌

| Aspecto | Detalle |
|---------|---------|
| **Severidad** | 🔴 CRÍTICO |
| **Archivo** | `backend/src/__tests__/load.test.ts` |
| **Línea** | ~244 |
| **Síntoma** | `TypeError: SQLite3 can only bind numbers, strings, bigints...` |
| **Causa** | Pasando objetos/arrays sin serializar a JSON.stringify |
| **Solución** | Envolver en `JSON.stringify()` antes de pasar |
| **Cambios** | 6 líneas |
| **Tiempo** | 10 minutos |
| **Errores Solucionados** | ~2 |
| **Estado** | ❌ 0% |

---

### Error #3: EXCEEDED TIMEOUT ❌

| Aspecto | Detalle |
|---------|---------|
| **Severidad** | 🟡 MAYOR |
| **Archivo** | `load.test.ts`, `auth.*.test.ts` |
| **Líneas** | 13, 35, 160, 198, 269, 440 |
| **Síntoma** | `thrown: "Exceeded timeout of 5000 ms for a test"` |
| **Causa** | Tests de carga toman > 5 segundos |
| **Solución** | Agregar `, 30000` o `, 15000` al test callback |
| **Cambios** | 6 líneas (1 cada test) |
| **Tiempo** | 5 minutos |
| **Errores Solucionados** | ~10 |
| **Estado** | ❌ 0% |

---

### Error #4: MESSAGE MISMATCH ❌

| Aspecto | Detalle |
|---------|---------|
| **Severidad** | 🟡 MAYOR |
| **Archivo** | `backend/src/middleware/auth.ts` |
| **Líneas** | ~30 (dispersos) |
| **Síntoma** | `Expected: "Access denied"` / `Received: "Invalid or expired token"` |
| **Causa** | Inconsistencia entre mensajes esperados y generados |
| **Solución** | Normalizar mensajes en middleware/auth.ts |
| **Cambios** | 5-10 líneas de texto |
| **Tiempo** | 15 minutos |
| **Errores Solucionados** | ~5 |
| **Estado** | ❌ 0% |

---

### Error #5: QUERY PARAMETER COERCE ❌

| Aspecto | Detalle |
|---------|---------|
| **Severidad** | 🟡 MAYOR |
| **Archivo** | `schemas/*.ts`, `middleware/validate.ts` |
| **Líneas** | ~10 |
| **Síntoma** | `Expected: { page: 1, limit: 10 }` / `Received: { page: "1", limit: "10" }` |
| **Causa** | Query params llegan como strings, no se transforman a números |
| **Solución** | Usar `z.coerce.number()` en schemas Zod |
| **Cambios** | 2 líneas |
| **Tiempo** | 5 minutos |
| **Errores Solucionados** | ~2 |
| **Estado** | ❌ 0% |

---

### Error #6: EMAIL VALIDATION ❌

| Aspecto | Detalle |
|---------|---------|
| **Severidad** | 🟢 MENOR |
| **Archivo** | `backend/src/middleware/validate.ts` |
| **Líneas** | ~20 |
| **Síntoma** | `Expected: mockNext not called` / `Received: mockNext was called` |
| **Causa** | Middleware llama a next() incluso después de enviar error |
| **Solución** | Agregar `return;` después de `res.status().json()` |
| **Cambios** | 1 línea |
| **Tiempo** | 2 minutos |
| **Errores Solucionados** | ~1 |
| **Estado** | ❌ 0% |

---

## ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
┌─────────────────────────────────────────────────────┐
│ FASE 1: CRÍTICA (5 min) 🔴                          │
├─────────────────────────────────────────────────────┤
│ 1. jest.unmock en load.test.ts         → Error #1   │
│ 2. JSON.stringify en load.test.ts      → Error #2   │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ FASE 2: MAYOR (25 min) 🟡                           │
├─────────────────────────────────────────────────────┤
│ 3. Timeouts (6 tests)                 → Error #3    │
│ 4. Normalizar mensajes (auth.ts)      → Error #4    │
│ 5. Coerce en schemas                  → Error #5    │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ FASE 3: MENOR (2 min) 🟢                            │
├─────────────────────────────────────────────────────┤
│ 6. Return en validate.ts              → Error #6    │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ VERIFICACIÓN (10 min) ✅                            │
├─────────────────────────────────────────────────────┤
│ npm test 2>&1 | tail -20                            │
│ Verificar: Tests Passed >>>                         │
└─────────────────────────────────────────────────────┘
```

---

## IMPACTO POR FASE

```
Antes:
├─ Tests Pasados: 234 (65%)
├─ Tests Fallidos: 123 (35%)
└─ Suites Fallidas: 20/32

Después Fase 1:
├─ Tests Pasados: 250+ (70%)
├─ Tests Fallidos: 100- (30%)
└─ Suites Fallidas: 15/32

Después Fase 2:
├─ Tests Pasados: 320+ (89%)
├─ Tests Fallidos: 20- (5%)
└─ Suites Fallidas: 2-5/32

Después Fase 3:
├─ Tests Pasados: 330+ (92%)
├─ Tests Fallidos: 10- (2%)
└─ Suites Fallidas: 0-2/32

FINAL: 97%+ Tests Pasando ✅
```

---

## ARCHIVOS A MODIFICAR

```
📁 backend/src/
│
├── 📁 __tests__/
│   ├── ✅ auth.middleware.comprehensive.test.ts  (60% done)
│   ├── ✅ auth.security.test.ts                  (60% done)
│   ├── ✅ security.middleware.test.ts            (100% done)
│   └── ❌ load.test.ts                           (0% - PRIORIDAD 1)
│
├── 📁 middleware/
│   ├── ❌ auth.ts                                (0% - PRIORIDAD 2)
│   └── ❌ validate.ts                            (0% - PRIORIDAD 3)
│
├── 📁 services/
│   ├── ✅ sqliteDatabaseService.ts               (100% done)
│   └── → databaseServiceFactory.ts              (revisar)
│
├── 📁 models/
│   └── ✅ Session.ts                             (100% done)
│
└── 📁 schemas/
    └── ❌ *.ts                                   (0% - PRIORIDAD 2)
```

---

## CHECKLIST DE CAMBIOS

### Cambios COMPLETADOS ✅
- [x] jest.unmock('uuid') en auth.middleware.comprehensive.test.ts (línea 4)
- [x] jest.unmock('uuid') en auth.security.test.ts (línea 4)
- [x] jest.unmock('uuid') en security.middleware.test.ts (línea 4)
- [x] Agregar clearSessions() en sqliteDatabaseService.ts
- [x] Actualizar SessionModel.clear() método
- [x] Actualizar beforeEach async en tests

### Cambios PENDIENTES ❌

**INMEDIATO (Fase 1)**
- [ ] jest.unmock('uuid') en load.test.ts (línea 1-10)
- [ ] JSON.stringify en load.test.ts (línea ~244, 6 campos)

**SIGUIENTE (Fase 2)**
- [ ] Timeout `, 30000` en load.test.ts (4 tests)
- [ ] Timeout `, 15000` en auth.middleware.comprehensive.test.ts (1 test)
- [ ] Timeout `, 15000` en auth.security.test.ts (1 test)
- [ ] Normalizar mensajes en auth.ts (~10 líneas)
- [ ] Agregar .coerce en schemas/*.ts (2 líneas)

**FINALMENTE (Fase 3)**
- [ ] Agregar `return;` en validate.ts (~1 línea)

---

## INDICADORES DE PROGRESO

### Por Porcentaje Completado
```
[████████████░░░░░░░░] 60% - Cambios completados
[████░░░░░░░░░░░░░░░░] 20% - En progreso
[░░░░░░░░░░░░░░░░░░░░] 20% - No iniciado
```

### Por Errores Solucionados
```
[████████████░░░░░░░░] 60% - ~30 errores FOREIGN KEY (60%)
[░░░░░░░░░░░░░░░░░░░░]  0% - ~50 errores otros tipos (0%)
```

### Por Tiempo Invertido
```
[████████░░░░░░░░░░░░] 17% - 8 minutos / 47 minutos
[████████████░░░░░░░░] 25% - 12 minutos / 47 minutos (estimado)
```

---

## REFERENCIA DE COMANDOS

```bash
# ⚡ Tests rápidos
npm test -- backend/src/__tests__/load.test.ts

# 📊 Ver resumen
npm test 2>&1 | grep -E "Tests:|Suites:|PASS|FAIL"

# 🔍 Buscar error específico
npm test 2>&1 | grep "FOREIGN KEY"
npm test 2>&1 | grep "Exceeded timeout"

# 🚀 Test completo
npm test

# 💾 Ver cambios
git diff
git status
```

---

## TIEMPO ESTIMADO TOTAL

```
Fase 1 (Crítica)    →  5 minutos   🔴
Fase 2 (Mayor)      → 25 minutos   🟡
Fase 3 (Menor)      →  2 minutos   🟢
Verificación        → 10 minutos   ✅
────────────────────────────────────
TOTAL               → 42 minutos
```

---

## ⭐ TIPS RÁPIDOS

1. **Leer primero**: RESUMEN_ERRORES_RAPIDO.md (5 min)
2. **Implementar**: Seguir CHECKLIST_REPARACION.md (50 min)
3. **Consultar**: EJEMPLOS_CODIGO.md cuando sea necesario
4. **Verificar**: Comandos en ANALISIS_TECNICO_ERRORES.md
5. **Documentar**: Cambios en git commit

---

**Siguiente documento**: Abre `CHECKLIST_REPARACION.md` para empezar 🚀
