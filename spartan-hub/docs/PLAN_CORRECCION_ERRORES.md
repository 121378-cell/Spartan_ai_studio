# PLAN DE CORRECCIÓN DE ERRORES - SPARTAN HUB 2.0

## 🎯 OBJETIVO
Corregir todos los errores detectados y asegurar que el sistema funcione perfectamente sin crear nuevos errores.

## 📋 PLAN DE ACCIÓN DETALLADO

### FASE 1: ERRORES CRÍTICOS (Prioridad Máxima)

#### 1.1 Corregir Foreign Key Constraint Failed
**Problema**: Mock de UUID genera IDs falsos que no existen en BD real
**Solución**: Desactivar mock de UUID en tests que usen base de datos real

**Archivos a modificar**:
- `backend/src/__tests__/auth.middleware.comprehensive.test.ts`
- `backend/src/__tests__/auth.security.test.ts`
- `backend/src/__tests__/security.middleware.test.ts`
- `backend/src/__tests__/load.test.ts`

**Cambios**:
```typescript
// Al inicio de cada archivo de test
jest.unmock('uuid');
```

#### 1.2 Configurar Redis correctamente
**Problema**: Redis deshabilitado pero sistema intenta usarlo
**Solución**: Implementar fallback robusto o configurar Redis

**Archivos a modificar**:
- `backend/src/config/redisConfig.ts`
- `backend/src/services/rateLimitService.ts`

**Cambios**:
```typescript
// Implementar fallback en memoria más robusto
const createRedisClient = () => {
  try {
    const client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    client.on('error', (err) => {
      console.warn('Redis client error, falling back to memory store:', err);
      return createMemoryStore(); // Implementar store en memoria
    });
    return client;
  } catch (error) {
    console.warn('Redis not available, using memory store');
    return createMemoryStore();
  }
};
```

#### 1.3 Verificar AI Service
**Problema**: Servicio de IA no configurado o no disponible
**Solución**: Verificar configuración y endpoints

**Archivos a modificar**:
- `backend/src/services/aiService.ts`
- `backend/src/config/aiConfig.ts`

**Cambios**:
```typescript
// Implementar verificación de health check más robusta
const checkHealth = async () => {
  try {
    const response = await fetch(`${config.endpoint}/health`, {
      timeout: 5000,
      retries: 2
    });
    return response.ok;
  } catch (error) {
    console.warn('AI service health check failed:', error);
    return false;
  }
};
```

### FASE 2: ERRORES MAYORES (Prioridad Alta)

#### 2.1 Aumentar timeouts en tests
**Problema**: Tests fallan por timeouts
**Solución**: Configurar timeouts adecuados

**Archivos a modificar**:
- `backend/src/__tests__/load.test.ts`
- `backend/src/__tests__/auth.middleware.comprehensive.test.ts`
- `backend/src/__tests__/auth.security.test.ts`

**Cambios**:
```typescript
test('should handle multiple concurrent requests', async () => {
  // ... test code
}, 30000); // 30 segundos para tests de carga

test('should include security headers', async () => {
  // ... test code  
}, 15000); // 15 segundos para tests de seguridad
```

#### 2.2 Corregir validación de input
**Problema**: Middleware no rechaza emails malformados
**Solución**: Implementar validación robusta

**Archivos a modificar**:
- `backend/src/middleware/validate.ts`
- `backend/src/schemas/*.ts`

**Cambios**:
```typescript
export const validate = (schema: ZodSchema) => {
  return async (req: any, res: any, next: any) => {
    try {
      const result = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      req.validatedData = result;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};
```

#### 2.3 Implementar transformación de query parameters
**Problema**: Parámetros no se convierten de string a número
**Solución**: Aplicar coerción de tipos en schemas

**Archivos a modificar**:
- `backend/src/schemas/querySchema.ts`

**Cambios**:
```typescript
export const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sort: z.enum(['asc', 'desc']).default('asc')
});
```

### FASE 3: ERRORES MENORES (Prioridad Media)

#### 3.1 Resolver errores TypeScript frontend
**Problema**: Tipos no definidos, propiedades undefined
**Solución**: Definir tipos adecuados y manejar null checks

**Archivos a modificar**:
- `components/App.tsx`
- `components/HologramViewer.tsx`
- `components/modals/SmartRoutineModal.tsx`

**Cambios**:
```typescript
// Definir tipos adecuados
interface ModalPayload {
  id?: string;
  name?: string;
  data?: any;
}

interface AppContextType {
  hideModal: () => void;
  addRoutine: (routine: Routine) => void;
  showToast: (message: string) => void;
  userProfile: UserProfile | null;
}

// Manejar null checks
const modalPayload = modal.payload || {};
const context = useContext(AppContext) || {
  hideModal: () => {},
  addRoutine: () => {},
  showToast: () => {},
  userProfile: null
};
```

#### 3.2 Corregir SQLite3 binding errors
**Problema**: Objetos pasados directamente a SQLite3
**Solución**: Serializar objetos JSON antes de guardar

**Archivos a modificar**:
- `backend/src/services/sqliteDatabaseService.ts`

**Cambios**:
```typescript
// Asegurar serialización de objetos JSON
const serializeData = (data: any): string => {
  if (typeof data === 'string') return data;
  if (data === null || data === undefined) return '';
  return JSON.stringify(data);
};

// En métodos de creación/actualización
const userData = {
  ...user,
  stats: serializeData(user.stats),
  trainingCycle: serializeData(user.trainingCycle),
  detailedProfile: serializeData(user.detailedProfile),
  preferences: serializeData(user.preferences)
};
```

### FASE 4: CREACIÓN DE NUEVOS TESTS

#### 4.1 Tests de integración de base de datos
**Objetivo**: Verificar que las correcciones de Foreign Key funcionen

**Archivo**: `backend/src/__tests__/databaseIntegration.test.ts`

```typescript
describe('Database Integration Tests', () => {
  beforeEach(async () => {
    jest.unmock('uuid');
    await UserDb.clear();
    await SessionDb.clear();
  });

  test('should create user and session with valid UUIDs', async () => {
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    };

    const user = await UserDb.create(userData);
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();

    const sessionData = {
      userId: user.id,
      token: 'test-token',
      userAgent: 'test-agent',
      ipAddress: '127.0.0.1'
    };

    const session = await SessionDb.create(sessionData);
    expect(session).toBeDefined();
    expect(session.userId).toBe(user.id);
  });
});
```

#### 4.2 Tests de Redis fallback
**Objetivo**: Verificar que el fallback de Redis funcione correctamente

**Archivo**: `backend/src/__tests__/redisFallback.test.ts`

```typescript
describe('Redis Fallback Tests', () => {
  test('should use memory store when Redis is unavailable', async () => {
    // Mock Redis to fail
    jest.mock('redis', () => ({
      createClient: jest.fn(() => {
        throw new Error('Redis unavailable');
      })
    }));

    const rateLimiter = new RateLimitService();
    const result = await rateLimiter.checkRateLimit('test-key');
    
    expect(result.allowed).toBeDefined();
  });
});
```

#### 4.3 Tests de validación robusta
**Objetivo**: Verificar que la validación de input funcione correctamente

**Archivo**: `backend/src/__tests__/validationRobust.test.ts`

```typescript
describe('Robust Validation Tests', () => {
  test('should reject malformed email addresses', async () => {
    const mockReq = {
      body: { email: 'invalid-email' },
      query: {},
      params: {}
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const mockNext = jest.fn();

    await validate(userSchema)(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Validation failed'
      })
    );
  });
});
```

### FASE 5: VERIFICACIÓN FINAL

#### 5.1 Ejecución de tests completos
**Comando**: `npm test`

#### 5.2 Verificación de cobertura
**Comando**: `npm run test:coverage`

#### 5.3 Pruebas de integración
**Comando**: `npm run test:integration`

#### 5.4 Verificación de frontend
**Comando**: `npm run build` y `npm run typecheck`

## 📊 CRITERIOS DE ÉXITO

### Métricas de Calidad
- **Tests pasados**: > 95%
- **Cobertura de código**: > 80%
- **Errores TypeScript**: 0
- **Errores de integración**: 0

### Métricas de Rendimiento
- **Tiempo de respuesta API**: < 500ms
- **Rate limiting**: Funcional
- **Conexiones DB**: Estables
- **AI Service**: Disponible o con fallback

### Métricas de Seguridad
- **Validación de input**: 100% funcional
- **Autenticación**: Sin brechas
- **Rate limiting**: Activo
- **Mensajes de error**: Seguros

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Cambios en UUID afectan otros tests
**Mitigación**: Verificar que los tests que no usan BD sigan usando mock

### Riesgo 2: Redis fallback no es suficiente
**Mitigación**: Implementar métricas de monitoreo para detectar uso de fallback

### Riesgo 3: Nuevos errores TypeScript
**Mitigación**: Ejecutar typecheck después de cada cambio

### Riesgo 4: Regresiones en funcionalidad
**Mitigación**: Tests de integración completos antes de deploy

## 📅 CRONOGRAMA ESTIMADO

- **Día 1**: Fase 1 (Errores Críticos) - 4 horas
- **Día 1**: Fase 2 (Errores Mayores) - 3 horas  
- **Día 2**: Fase 3 (Errores Menores) - 2 horas
- **Día 2**: Fase 4 (Nuevos Tests) - 2 horas
- **Día 2**: Fase 5 (Verificación Final) - 1 hora

**Total estimado**: 12 horas distribuidas en 2 días

## 🚀 ENTREGABLES

1. **Código corregido** en todos los archivos afectados
2. **Nuevos tests** para validar correcciones
3. **Documentación** de cambios realizados
4. **Reporte final** de métricas y resultados
5. **Guía de despliegue** para evitar regresiones