# Invalidación de Caché por Eventos

## Descripción

Este documento describe la implementación de un sistema de invalidación de caché por eventos en la aplicación Spartan Hub, proporcionando una solución proactiva para mantener la coherencia de los datos cacheados cuando ocurren cambios en la aplicación.

## Problema

La implementación anterior del sistema de caché dependía únicamente de TTLs (Time To Live) para la expiración de los datos. Este enfoque tenía varias limitaciones:

1. **Datos obsoletos**: Los datos podían permanecer en caché más tiempo del necesario, mostrando información desactualizada a los usuarios
2. **Ineficiencia**: No se invalidaban los datos cacheados cuando se sabía que habían cambiado
3. **Experiencia de usuario**: Los usuarios podían ver información inconsistente hasta que expiraran los TTLs
4. **Complejidad de mantenimiento**: No había un mecanismo centralizado para gestionar la invalidación de caché

## Solución Implementada

Se ha implementado un sistema de invalidación de caché por eventos con las siguientes características:

### 1. Sistema de Tags para Entradas de Caché

Cada entrada de caché puede tener uno o más tags asociados, permitiendo una invalidación selectiva:

```typescript
interface CacheEntry<T> {
  data: T;
  expiry: number;
  contentType?: string;
  tags?: string[]; // Tags para invalidación por eventos
}
```

### 2. Índice de Tags

Se mantiene un índice inverso de tags a claves de caché para una invalidación eficiente:

```typescript
const tagIndex = new Map<string, Set<string>>(); // tag -> set of cache keys
```

### 3. Servicio de Eventos de Caché (`cacheEventService.ts`)

Un servicio centralizado que maneja la invalidación de caché basada en eventos:

#### Tipos de Eventos:
- **Eventos de Usuario**: `USER_PROFILE_UPDATED`, `USER_PREFERENCES_CHANGED`, `USER_WORKOUT_COMPLETED`
- **Eventos de Ejercicio**: `EXERCISE_ADDED`, `EXERCISE_UPDATED`, `EXERCISE_DELETED`
- **Eventos de Nutrición**: `NUTRITION_LOG_ADDED`, `NUTRITION_LOG_UPDATED`
- **Eventos de Planes de Entrenamiento**: `WORKOUT_PLAN_CREATED`, `WORKOUT_PLAN_UPDATED`, `WORKOUT_PLAN_DELETED`
- **Eventos de Servicio de IA**: `AI_MODEL_UPDATED`, `AI_SERVICE_RESTARTED`
- **Eventos del Sistema**: `SYSTEM_MAINTENANCE`, `DATA_IMPORT_COMPLETED`

#### Mapeo de Eventos a Tags:
```typescript
const EVENT_TAG_MAPPING: Record<CacheEventType, string[]> = {
  [CacheEventType.USER_PROFILE_UPDATED]: ['user/profile', 'user/preferences'],
  [CacheEventType.EXERCISE_ADDED]: ['exercise/list', 'exercise/search', 'ai/recommendation'],
  // ... más mapeos
};
```

### 4. Funciones de Invalidación

#### Invalidación por Tag:
```typescript
invalidateCacheByTag(tag: string): number
```

#### Invalidación por Múltiples Tags:
```typescript
invalidateCacheByTags(tags: string[]): number
```

#### Invalidación por Evento:
```typescript
triggerCacheInvalidation(eventType: CacheEventType, customTags?: string[]): number
```

### 5. Integración con Servicios Existentes

#### Servicio de Fitness y Nutrición (`fitnessNutritionService.ts`):
- Asociación de tags a llamadas de caché:
  - Búsquedas de ejercicios por grupo muscular: `['exercise/list', 'exercise/muscle/{muscle}']`
  - Búsquedas de ejercicios por nombre: `['exercise/search', 'exercise/name/{name}']`
  - Información nutricional: `['nutrition/info']`
- Funciones de demostración para invalidación por eventos:
  - `addExercise()` - Invalida cachés relacionados con ejercicios
  - `updateExercise()` - Invalida cachés relacionados con ejercicios
  - `deleteExercise()` - Invalida cachés relacionados con ejercicios

## Beneficios

1. **Coherencia de datos**: Los datos cacheados se invalidan inmediatamente cuando se sabe que han cambiado
2. **Experiencia de usuario mejorada**: Los usuarios ven siempre la información más reciente
3. **Eficiencia**: Solo se invalidan los datos afectados, no toda la caché
4. **Mantenimiento centralizado**: Un solo lugar para gestionar todas las políticas de invalidación
5. **Extensibilidad**: Fácil de ampliar con nuevos tipos de eventos y mapeos
6. **Observabilidad**: Registro detallado de eventos de invalidación

## Pruebas Realizadas

1. ✅ Compilación exitosa de archivos TypeScript
2. ✅ Mapeo correcto de eventos a tags
3. ✅ Caché con tags y políticas asociadas
4. ✅ Invalidación de caché por tags individuales
5. ✅ Invalidación de caché por múltiples tags
6. ✅ Invalidación de caché disparada por eventos
7. ✅ Estadísticas mejoradas con distribución por tags
8. ✅ Integración correcta con servicios existentes
9. ✅ Limpieza completa de la caché

## Recomendaciones

1. **Monitoreo**: Seguir los registros de invalidación para identificar patrones de uso
2. **Optimización**: Ajustar los mapeos de eventos a tags basándose en el uso real
3. **Expansión**: Agregar más eventos y mapeos a medida que la aplicación crezca
4. **Performance**: Monitorear el impacto en el rendimiento de las operaciones de invalidación

## Conclusión

La implementación del sistema de invalidación de caché por eventos proporciona una solución proactiva y eficiente para mantener la coherencia de los datos en la aplicación Spartan Hub. Esta mejora asegura que los usuarios siempre vean la información más reciente, mejorando significativamente la experiencia de usuario y la confiabilidad del sistema.