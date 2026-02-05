# 🛠️ PLAN DE ACCIÓN INMEDIATO - PASO A PASO

**Fecha Creación**: 5 de febrero de 2026, 19:30 UTC  
**Objetivo**: Estabilizar proyecto en 24 horas  
**Personas Necesarias**: 1-2 desarrolladores  
**Tiempo Total**: 6-8 horas de trabajo enfocado

---

## 📋 ÍNDICE RÁPIDO

1. [Fase 1: Setup (30 min)](#fase-1-setup)
2. [Fase 2: Fix TypeScript (30 min)](#fase-2-fix-typescript)
3. [Fase 3: Fix ESLint (30 min)](#fase-3-fix-eslint)
4. [Fase 4: Fix Database (2 horas)](#fase-4-fix-database)
5. [Fase 5: Validación (1 hora)](#fase-5-validacion)
6. [Fase 6: Documentar (30 min)](#fase-6-documentar)

---

## ✅ FASE 1: SETUP (30 minutos)

### 1.1 Preparación del Ambiente

```powershell
# Abrir terminal en: C:\Users\sergi\Spartan hub 2.0

# Verificar branches
cd spartan-hub
git status
# Esperado: "On branch phase-1-security, working tree clean"

# Crear branch de hotfix
git checkout -b hotfix/critical-stability-issues
# Creará rama local: hotfix/critical-stability-issues

# Verificar versión de Node
node --version
# Esperado: v18.x o superior

# Verificar npm
npm --version
# Esperado: 9.x o superior
```

### 1.2 Snapshot Pre-Fix

```powershell
# Hacer backup del estado actual
npm run test 2>&1 > pre-fix-test-results.log
npm run type-check 2>&1 > pre-fix-typecheck-results.log

# Esto documenta el estado "antes"
ls -la > pre-fix-directory-state.txt
git log --oneline -5 > pre-fix-commits.txt
```

### 1.3 Preparar Workspace

```powershell
# Limpiar node_modules si hay problemas
# (SOLO si necesario - puede tomar 10 min)
# rm -Recurse node_modules
# npm install

# Instalar herramientas si faltan
npm install -g ts-node typescript
```

---

## ✅ FASE 2: FIX TYPESCRIPT COMPILATION (30 minutos)

### 2.1 Instalar Dependencia Faltante

```powershell
# Instalar @testing-library/user-event
npm install --save-dev @testing-library/user-event@latest

# Verificar instalación
npm list @testing-library/user-event
# Esperado: ✓ instalado
```

### 2.2 Reparar VideoCapture.test.tsx

**Archivo**: `src/__tests__/components/VideoCapture.test.tsx`

```typescript
// ANTES (LÍNEA 3):
import userEvent from '@testing-library/user-event';
// AHORA OK ✅ (dependencia instalada)

// ANTES (LÍNEA 4):
import { VideoCapture } from '../../components/VideoCapture';
// PROBLEMA: Path incorrecto

// SOLUCIÓN: Cambiar a
import VideoCapture from '../../components/VideoAnalysis/VideoCapture';
// O verificar path actual del archivo

// ANTES (LÍNEA 37):
<AppContext.Provider value={mockContext}>
// mockContext falta propiedades requeridas

// SOLUCIÓN: Actualizar mock
const mockContext: AppContextType = {
  // Agregar TODAS las propiedades requeridas por AppContextType
  userProfile: { id: 'test', name: 'Test User' },
  isAuthenticated: true,
  currentPage: 'dashboard',
  routines: [],
  workoutHistory: [],
  activeSession: null,
  userStats: { level: 1, totalXP: 0 },
  // ... continuar con todas las propiedades necesarias
  // Ver AppContext.tsx para lista completa
};
```

### 2.3 Verificar Compilation

```powershell
# Ejecutar type-check
npm run type-check

# Esperado output:
# Esperado: SIN ERRORES
# ✅ (Si hay errores, revisar VideoCapture.test.tsx línea por línea)
```

**Tiempo estimado**: 20-25 minutos

---

## ✅ FASE 3: FIX ESLINT CONFIGURATION (30 minutos)

### 3.1 Revisar Frontend ESLint Config

**Archivo**: `scripts/config/.eslintrc.json`

```json
// PROBLEMA ACTUAL:
// ESLint 9.39.2 requiere import attributes en JSON config

// SOLUCIÓN: Migrar a .eslintrc.mjs

// 1. Renombrar archivo
// CD scripts/config
// ren .eslintrc.json .eslintrc.json.bak

// 2. Crear nuevo .eslintrc.mjs
```

**Crear**: `scripts/config/.eslintrc.mjs`

```javascript
export default [
  {
    files: ['**/*.{js,ts,tsx}'],
    ignores: ['node_modules', 'dist', 'coverage'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Global variables
        console: 'readonly',
        process: 'readonly'
      },
      parser: null  // Will be set per configuration
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      import: require('eslint-plugin-import'),
      security: require('eslint-plugin-security')
    },
    rules: {
      'no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      'security/detect-object-injection': 'warn'
    }
  }
];
```

### 3.2 Revisar Backend ESLint Config

**Archivo**: `backend/eslint.config.mjs`

**PROBLEMA**: Variable `ts` no definida

**SOLUCIÓN**:

```javascript
// TOP of file, agregar:
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

// NO:
// import { ts } from 'typescript-eslint';

// SÍ:
// Use plugins properly
const ts = typescriptPlugin;
```

O reemplazar todas las referencias a `ts.` con `typescriptPlugin.`

### 3.3 Verificar Linting

```powershell
# Frontend
npm run lint

# Esperado: sin errores ESLint
# Si hay warnings: OK por ahora

# Backend
cd backend
npm run lint

# Esperado: sin errores ESLint
```

**Tiempo estimado**: 25-30 minutos

---

## ✅ FASE 4: FIX DATABASE MIGRATIONS (2 horas)

### 4.1 Diagnosticar Estado Actual

```powershell
cd backend

# Verificar database integrity
npm run db:verify

# Documentar errores
npm run db:verify > migration-status.log 2>&1
```

### 4.2 Crear Migration 007 (Form Analysis)

**Crear archivo**: `backend/src/database/migrations/007-create-form-analysis-table.ts`

```typescript
import Database from 'better-sqlite3';
import { logger } from '../../utils/logger';

interface MigrationResult {
  success: boolean;
  errors: string[];
  tablesCreated: string[];
  indexesCreated: string[];
  duration: number;
}

const migrate_007_create_form_analysis_table = (db: Database.Database): MigrationResult => {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: false,
    errors: [],
    tablesCreated: [],
    indexesCreated: [],
    duration: 0
  };

  try {
    // Create form_analyses table
    db.exec(`
      CREATE TABLE IF NOT EXISTS form_analyses (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        exerciseType TEXT NOT NULL,
        videoUrl TEXT,
        videoMetadata TEXT, -- JSON
        poseData TEXT, -- JSON
        performanceScore INTEGER,
        feedback TEXT, -- JSON
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);
    result.tablesCreated.push('form_analyses');

    // Create indexes
    const indexes = [
      {
        name: 'idx_form_analyses_user_id',
        query: 'CREATE INDEX IF NOT EXISTS idx_form_analyses_user_id ON form_analyses(userId)'
      },
      {
        name: 'idx_form_analyses_exercise_type',
        query: 'CREATE INDEX IF NOT EXISTS idx_form_analyses_exercise_type ON form_analyses(exerciseType)'
      },
      {
        name: 'idx_form_analyses_created_at',
        query: 'CREATE INDEX IF NOT EXISTS idx_form_analyses_created_at ON form_analyses(createdAt DESC)'
      }
    ];

    for (const index of indexes) {
      try {
        db.exec(index.query);
        result.indexesCreated.push(index.name);
        logger.debug(`Created index: ${index.name}`, { context: 'database.migration' });
      } catch (error) {
        if (!(error instanceof Error && error.message.includes('already exists'))) {
          throw error;
        }
        logger.debug(`Index ${index.name} already exists`, { context: 'database.migration' });
      }
    }

    logger.info('Migration 007 completed successfully', {
      context: 'database.migration',
      metadata: {
        tablesCreated: result.tablesCreated,
        indexesCreated: result.indexesCreated,
        duration: `${Date.now() - startTime}ms`
      }
    });

    result.success = true;
    result.duration = Date.now() - startTime;
    return result;

  } catch (error) {
    result.success = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(errorMessage);

    logger.error('Migration 007 failed', {
      context: 'database.migration',
      metadata: { error: errorMessage }
    });

    result.duration = Date.now() - startTime;
    return result;
  }
};

export default migrate_007_create_form_analysis_table;
```

### 4.3 Corregir Migration 004 (Coach Vitalis)

**Archivo**: `backend/src/database/migrations/004-coach-vitalis-tables.ts`

**PROBLEMA**: Referencia a `userId` que no existe, debería ser `user_id`

**SOLUCIÓN**:

```typescript
// Buscar todas las instancias de:
// WRONG: userId TEXT
// RIGHT: user_id TEXT NOT NULL

// WRONG: REFERENCES coach_vitalis (userId)
// RIGHT: REFERENCES coach_vitalis (user_id)

// IMPORTANTE: Mantener consistencia con otras tablas
// que usan user_id (FOREIGN KEY a users(id))
```

**Cambios específicos**:

```sql
-- ANTES:
CREATE TABLE coaching_sessions (
  id TEXT PRIMARY KEY,
  userId TEXT,  -- ❌ INCONSISTENTE
  ...
);

-- DESPUÉS:
CREATE TABLE coaching_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,  -- ✅ CONSISTENTE
  FOREIGN KEY (user_id) REFERENCES users(id),
  ...
);
```

### 4.4 Corregir Migration 005 (Stress Level)

**Archivo**: `backend/src/database/migrations/005-add-stress-level.ts`

**PROBLEMA**: Typo en nombre de tabla

```typescript
// BEFORE:
db.exec('ALTER TABLE daily_biometric_summaries ADD COLUMN stressLevel REAL');
// ERROR: Table no existe

// AFTER:
db.exec('ALTER TABLE daily_biometrics ADD COLUMN stressLevel REAL');
// Nombre correcto basado en Migration 001
```

### 4.5 Registrar Migraciones

**Archivo**: `backend/src/database/databaseManager.ts`

Encontrar sección que carga migraciones:

```typescript
// Buscar línea con import de migrations
import migrate_001 from './migrations/001-create-biometric-tables';
import migrate_002 from './migrations/002-...';
// ...

// AGREGAR:
import migrate_007 from './migrations/007-create-form-analysis-table';

// En array de migraciones:
const migrations = [
  migrate_001,
  migrate_002,
  // ...
  migrate_007  // ← AGREGAR
];
```

### 4.6 Validar Migraciones

```powershell
# Ejecutar migraciones
npm run db:migrate

# Verificar integridad
npm run db:verify

# Esperado:
# ✅ All migrations applied
# ✅ Schema integrity: OK
# ✅ No orphaned records
```

**Tiempo estimado**: 90-120 minutos

---

## ✅ FASE 5: VALIDACIÓN COMPLETA (1 hora)

### 5.1 TypeScript Check

```powershell
# Frontend
cd ..
npm run type-check

# Esperado: no errors
# ❌ Si hay errores: revisar paso 2.2
```

### 5.2 Linting Check

```powershell
# Frontend
npm run lint

# Backend
cd backend
npm run lint

# Esperado: no errors (warnings OK)
```

### 5.3 Build Check

```powershell
# Frontend
cd ..
npm run build:frontend

# Esperado: Build successful
# ❌ Si falla: revisar output detallado

# Backend
cd backend
npm run build

# Esperado: dist/ creado, no errors
```

### 5.4 Test Check

```powershell
# Backend tests
npm test

# Esperado: tests pass con menos warnings
# Específicamente: Sin errores de Migration 004/007

# Frontend tests (si pasaban antes)
cd ..
npm run test:components
```

### 5.5 Git Status

```powershell
git status

# Esperado:
# ✅ Archivos modificados listados
# ✅ Archivos nuevos (migrations) listados
# ❌ Nada uncommitted que no sea intencional
```

**Tiempo estimado**: 45-60 minutos

---

## ✅ FASE 6: DOCUMENTACIÓN (30 minutos)

### 6.1 Crear Commit

```powershell
# Preparar cambios
git add -A

# Revisar cambios
git diff --cached

# Commit con mensaje claro
git commit -m "fix(stability): resolve critical build, lint, and database issues

- Install @testing-library/user-event dependency
- Fix VideoCapture.test.tsx imports and AppContext mock
- Migrate ESLint config to Node 18 compatible format (mjs)
- Fix backend ESLint configuration (ts variable)
- Create Migration 007: Form analysis tables
- Fix Migration 004: Coach Vitalis schema (userId → user_id)
- Fix Migration 005: Stress level column (table name typo)
- Validate all migrations pass
- All TypeScript, ESLint, and build checks now passing

Fixes: Blocked development, broken compilation, failed tests
"
```

### 6.2 Actualizar Documentación

**Archivo**: `ANALISIS_SALUD_PROYECTO_FEBRERO_2026.md`

Agregar sección al final:

```markdown
## ✅ FIXES APLICADOS (5 FEB 2026 - 20:30 UTC)

### Arreglado
- [x] TypeScript compilation errors (3 errors resolved)
- [x] ESLint configuration (Node 18 compatible)
- [x] Database Migration 007 (created)
- [x] Database Migration 004 (schema fixed)
- [x] Database Migration 005 (table name fixed)
- [x] @testing-library/user-event installed

### Validation Results
- [x] npm run type-check: ✅ PASS
- [x] npm run lint: ✅ PASS
- [x] npm run build:frontend: ✅ PASS
- [x] npm run build:backend: ✅ PASS
- [x] npm test: ✅ PASS (with noted warnings)

### Next Phase
- Development can resume
- Focus: Test coverage improvements
- Timeline: 1 week to 80%+ coverage
```

### 6.3 Crear Summary Report

**Crear archivo**: `FIXES_APPLIED_FEB5_2026.md`

```markdown
# Fixes Applied - February 5, 2026

## Summary
Fixed 3 critical issues blocking development in 6-8 hours of focused work.

## Issues Fixed
1. TypeScript compilation errors
2. ESLint configuration broken
3. Database migrations incomplete

## Changes Made
- See git commit hash: [COMMIT_HASH]
- All changes documented in commit message
- No breaking changes to existing functionality

## Validation
- All builds passing
- All linting passing
- Database integrity verified
- Tests passing (with expected warnings)

## Next Steps
- Deploy to development environment
- Resume feature development
- Increase test coverage

---
Generated: Feb 5, 2026 20:30 UTC
```

### 6.4 Push Changes

```powershell
# Review final status
git log --oneline -3
git status

# Push to origin
git push origin hotfix/critical-stability-issues

# Crear Pull Request
# (Via GitHub UI, o usando gh CLI)
gh pr create \
  --title "Fix: Critical stability issues (build, lint, database)" \
  --body "Resolves blocked development by fixing TypeScript compilation, ESLint config, and database migrations" \
  --base phase-1-security \
  --head hotfix/critical-stability-issues
```

**Tiempo estimado**: 20-30 minutos

---

## 📊 CHECKLIST FINAL

### Pre-Execution
- [ ] Leer este documento completamente
- [ ] Asegurar acceso a repositorio
- [ ] Tener terminal abierta en directorio correcto
- [ ] Backup de database actual (opcional pero recomendado)

### Fase 1 ✅
- [ ] Git branch creado
- [ ] Pre-fix snapshots documentados
- [ ] Workspace limpio

### Fase 2 ✅
- [ ] @testing-library/user-event instalado
- [ ] VideoCapture.test.tsx reparado
- [ ] npm run type-check: PASS

### Fase 3 ✅
- [ ] Frontend ESLint config actualizado
- [ ] Backend ESLint config reparado
- [ ] npm run lint: PASS en ambos

### Fase 4 ✅
- [ ] Migration 007 creado
- [ ] Migration 004 reparado
- [ ] Migration 005 reparado
- [ ] npm run db:verify: PASS

### Fase 5 ✅
- [ ] npm run type-check: PASS
- [ ] npm run lint: PASS
- [ ] npm run build:all: PASS
- [ ] npm test: PASS (or acceptable warnings)

### Fase 6 ✅
- [ ] Commit creado con mensaje claro
- [ ] Documentación actualizada
- [ ] Push completado
- [ ] PR creado (opcional)

---

## ⚠️ TROUBLESHOOTING

### Si TypeScript sigue fallando:

```powershell
# 1. Verificar instalación
npm list @testing-library/user-event

# 2. Limpiar cache
npm cache clean --force
rm -Recurse node_modules
npm install

# 3. Verificar path en import
# Buscar archivo VideoCapture.tsx real:
ls src/components/VideoAnalysis/VideoCapture.tsx
# y actualizar import en test
```

### Si ESLint sigue fallando:

```powershell
# 1. Verificar versión
npm list eslint

# 2. Si está vieja:
npm install --save-dev eslint@latest

# 3. Revisar config manually
cat scripts/config/.eslintrc.mjs

# 4. Validar JSON:
npx eslint --init
```

### Si Database falla:

```powershell
# 1. Verificar integridad
npm run db:verify

# 2. Ver logs detallados
npm run db:verify 2>&1 | more

# 3. Rollback si necesario:
# rm backend/data/spartan_hub.db
# npm run db:migrate (crea nuevo)

# 4. Restaurar desde backup:
# cp backend/data/spartan_hub.db.backup backend/data/spartan_hub.db
```

---

## 📞 SOPORTE

Si estás bloqueado:
1. ✅ Revisar section TROUBLESHOOTING arriba
2. ✅ Check git logs: `git log --oneline`
3. ✅ Compare con este documento paso a paso
4. ✅ Review error messages cuidadosamente

**Time invested**: ~2-3 horas (bien worth it para estabilidad)

---

**Plan creado**: 5 de febrero de 2026, 19:45 UTC  
**Objetivo**: Completar antes de 24 horas  
**Prioridad**: 🔴 CRÍTICA

