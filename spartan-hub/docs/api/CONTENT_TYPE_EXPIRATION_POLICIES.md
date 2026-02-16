# Políticas de Expiración Basadas en Tipo de Contenido

## Descripción

Este documento describe la implementación de políticas de expiración basadas en tipo de contenido en el sistema de caché de la aplicación Spartan Hub, proporcionando una solución más inteligente para gestionar la expiración de datos cacheados según su naturaleza y frecuencia de cambio.

## Problema

La implementación anterior del sistema de caché utilizaba TTLs (Time To Live) fijos definidos por el desarrollador para cada llamada a API. Este enfoque tenía varias limitaciones:

1. **Configuración manual**: Los TTLs tenían que ser definidos manualmente para cada llamada
2. **Mantenimiento complejo**: Cambiar las políticas de expiración requería modificar múltiples archivos
3. **Inflexibilidad**: No se podía adaptar dinámicamente según el tipo de contenido
4. **Duplicación**: Las mismas políticas se repetían en diferentes partes del código

## Solución Implementada

Se ha implementado un sistema de políticas de expiración basadas en tipo de contenido con las siguientes características:

### 1. Política de Expiración por Tipo de Contenido

Se ha definido un conjunto de políticas de expiración basadas en el tipo de contenido:

```typescript
const CONTENT_TYPE_TTL_POLICIES: Record<string, number> = {
  // User-specific data - shorter TTL as it changes frequently
  'user/profile': 2 * 60 * 1000, // 2 minutes
  'user/preferences': 5 * 60 * 1000, // 5 minutes
  'user/progress': 3 * 60 * 1000, // 3 minutes
  
  // Exercise data - longer TTL as it rarely changes
  'exercise/list': 60 * 60 * 1000, // 1 hour
  'exercise/detail': 30 * 60 * 1000, // 30 minutes
  'exercise/search': 10 * 60 * 1000, // 10 minutes
  
  // Nutrition data - moderate TTL
  'nutrition/info': 30 * 60 * 1000, // 30 minutes
  'nutrition/search': 15 * 60 * 1000, // 15 minutes
  
  // Workout plans - longer TTL
  'workout/plan': 60 * 60 * 1000, // 1 hour
  'workout/template': 120 * 60 * 1000, // 2 hours
  
  // AI-generated content - shorter TTL as it's personalized
  'ai/alert': 5 * 60 * 1000, // 5 minutes
  'ai/decision': 10 * 60 * 1000, // 10 minutes
  'ai/recommendation': 15 * 60 * 1000, // 15 minutes
  
  // Default fallback
  'default': DEFAULT_TTL
};
```

### 2. Actualización del Servicio de Caché

El servicio de caché (`cacheService.ts`) ha sido actualizado para soportar estas nuevas políticas:

#### Características principales:
- **Tipo de contenido en entradas de caché**: Cada entrada puede tener asociado un tipo de contenido
- **Función para obtener TTL por tipo de contenido**: `getTtlForContentType`
- **Envoltorios actualizados**: `withCache` y `withConditionalCache` ahora aceptan tipo de contenido
- **Estadísticas mejoradas**: Distribución de tipos de contenido en la caché

### 3. Integración con Servicios Existentes

#### Servicio de Fitness y Nutrición (`fitnessNutritionService.ts`):
- Reemplazo de TTLs fijos por tipos de contenido:
  - `'exercise/list'` para búsquedas de ejercicios por grupo muscular (1 hora)
  - `'exercise/search'` para búsquedas de ejercicios por nombre (10 minutos)
  - `'nutrition/info'` para información nutricional (30 minutos)
- Eliminación de constantes de TTL fijo
- Simplificación del código al eliminar funciones de condición de caché

## Beneficios

1. **Configuración centralizada**: Todas las políticas de expiración están en un solo lugar
2. **Mantenimiento sencillo**: Cambiar una política afecta a todas las llamadas que la usan
3. **Flexibilidad**: Se puede adaptar fácilmente a nuevos tipos de contenido
4. **Consistencia**: Todos los datos del mismo tipo tienen la misma política de expiración
5. **Inteligencia**: Las políticas se basan en la naturaleza del contenido, no en suposiciones arbitrarias
6. **Observabilidad**: Estadísticas por tipo de contenido para monitoreo

## Pruebas Realizadas

1. ✅ Compilación exitosa de archivos TypeScript
2. ✅ Obtención correcta de TTLs por tipo de contenido
3. ✅ Caché con tipos de contenido y políticas asociadas
4. ✅ Envoltorios de caché actualizados con soporte para tipos de contenido
5. ✅ Estadísticas mejoradas con distribución por tipo de contenido
6. ✅ Integración correcta con servicios existentes
7. ✅ Limpieza completa de la caché

## Recomendaciones

1. **Monitoreo**: Seguir las estadísticas por tipo de contenido para ajustar políticas
2. **Expansión**: Agregar más tipos de contenido a medida que la aplicación crezca
3. **Ajuste fino**: Refinar las políticas basándose en el uso real de la aplicación
4. **Documentación**: Mantener actualizada la documentación de tipos de contenido y sus políticas

## Conclusión

La implementación de políticas de expiración basadas en tipo de contenido proporciona una solución más inteligente y mantenible para gestionar la caché en la aplicación Spartan Hub. Esta mejora simplifica la configuración y hace que el sistema sea más adaptable a las necesidades reales de cada tipo de dato.