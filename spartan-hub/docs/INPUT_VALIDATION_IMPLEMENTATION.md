# Implementación de Validación Exhaustiva de Datos de Entrada con Zod

## Descripción General

Esta implementación proporciona un sistema completo de validación de datos de entrada basado en Zod para proteger la aplicación contra datos inválidos, ataques de inyección y abuso. El sistema incluye validación de tipos, rangos, formatos y sanitización de entradas, además de protección contra límites de tasa (rate limiting).

## Componentes Clave

### 1. Esquemas de Validación Zod (`backend/src/schemas/`)

Colección de esquemas Zod para todos los endpoints de la API:

- **Esquemas de autenticación**: Validación para registro, login y actualización de roles
- **Esquemas de actividades**: Validación para creación y consulta de actividades
- **Esquemas de fitness**: Validación para ejercicios, rutinas y nutrición
- **Esquemas de parámetros**: Validación para parámetros de ruta y query
- **Esquemas de salud**: Validación para endpoints de salud del sistema
- **Esquemas de cache**: Validación para endpoints de administración de cache
- **Esquemas de IA**: Validación para endpoints de servicios de IA

### 2. Middleware de Validación (`backend/src/middleware/validate.ts`)

Middleware universal de validación basado en Zod:

- **Validación de body**: Verificación de datos en el cuerpo de la solicitud
- **Validación de query**: Verificación de parámetros en la URL
- **Validación de params**: Verificación de parámetros en la ruta
- **Respuestas estandarizadas**: Formato consistente para errores de validación
- **Integración con Express**: Middleware reusable en rutas de la API

### 3. Implementación en Rutas (`backend/src/routes/`)

Aplicación de validación en todos los endpoints:

- **Rutas de autenticación**: Validación de registro, login y otros endpoints
- **Rutas de actividad**: Validación de endpoints de actividades
- **Rutas de fitness**: Validación de endpoints de fitness
- **Rutas de salud**: Validación de endpoints de monitoreo
- **Rutas de cache**: Validación de endpoints de administración de cache
- **Rutas de IA**: Validación de endpoints de servicios de IA

## Tipos de Validación Implementados

### 1. Validación de Perfil de Usuario
- Nombre (requerido, mínimo 1 carácter)
- Email (requerido, formato válido)
- Quest (requerido, mínimo 5 caracteres)
- Estadísticas (objeto con campos numéricos y fecha válida)
- Arrays de datos (trials, hábitos, reflexiones, etc.)
- Configuraciones (horario, nutrición)
- Ciclo de entrenamiento (fase y fecha de inicio)

### 2. Validación de Formularios de Evaluación
- Metas físicas y mentales (requeridas, longitud mínima)
- Nivel de experiencia (enumeración válida)
- Métricas numéricas (peso, energía, estrés, enfoque)
- Equipamiento y estilo de vida (requeridos)
- Punto de dolor (requerido)
- Tonos de comunicación y prioridades nutricionales

### 3. Validación de Rutinas y Ejercicios
- Identificadores (requeridos)
- Nombres (requeridos)
- Duración (número positivo)
- Bloques y ejercicios (estructura de arrays anidados)
- Sets y reps (números positivos, cadenas válidas)
- Campos opcionales (RIR, segundos de descanso, consejos)

### 4. Validación de Sesiones de Entrenamiento
- Rutinas válidas
- Progreso estructurado
- Tiempo de inicio válido

### 5. Validación de Elementos Secundarios
- Trials (metas personales)
- Hábitos clave
- Entradas de diario
- Hitos

## Características de Seguridad

### 1. Validación de Entradas con Zod
- Validación de tipos de datos (string, number, boolean, etc.)
- Validación de estructuras complejas: objetos anidados como perfiles de usuario, rutinas, etc.
- Validación de formatos: Email, fechas, URLs, patrones específicos
- Validación de rangos: Valores mínimos y máximos para números
- Validación de parámetros: Verificación de parámetros de ruta y query

### 2. Prevención de Inyección SQL
- Uso exclusivo de consultas parametrizadas en todas las operaciones de base de datos
- Consultas con placeholders ($1, $2, etc.) para prevenir inyección SQL
- Validación de IDs y parámetros antes de usarlos en consultas

### 3. Rate Limiting
- Prevención de abuso de API
- Límites configurables de solicitudes
- Respuestas de error apropiadas

## Beneficios de la Implementación

- **Seguridad mejorada**: Protección contra entradas maliciosas
- **Integridad de datos**: Garantía de que los datos cumplen con los requisitos
- **Experiencia de usuario**: Mensajes de error claros y útiles
- **Mantenibilidad**: Sistema modular y fácil de extender
- **Consistencia**: Validación uniforme en toda la aplicación
- **Prevención de errores**: Detección temprana de problemas de datos

## Cómo Usar

### 1. Creación de Esquemas Zod
```typescript
import { z } from 'zod';

// Esquema para validación de parámetros de ruta
export const getActivityByIdSchema = z.object({
  params: z.object({
    activityId: z.string({
      message: 'Activity ID is required',
    }).min(1, {
      message: 'Activity ID cannot be empty',
    }),
  }),
});

// Esquema para validación de cuerpo de solicitud
export const createActivitySchema = z.object({
  body: z.object({
    type: z.string({
      message: 'Activity type is required',
    }),
    description: z.string({
      message: 'Description is required',
    }),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});
```

### 2. Middleware de Validación con Zod
```typescript
import { validate } from '../middleware/validate';
import { getActivityByIdSchema } from '../schemas/activitySchema';

// Aplicación de validación a un endpoint
router.get('/:activityId', validate(getActivityByIdSchema), async (req, res) => {
  // La validación ya ha verificado que activityId es válido
  const { activityId } = req.params;
  // Procesar la solicitud con datos validados
  res.json({ success: true });
});
```

### 3. Validación de Múltiples Componentes
```typescript
import { z } from 'zod';

// Esquema que valida body, query y params simultáneamente
export const complexEndpointSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    age: z.number().min(0).max(120),
  }),
  query: z.object({
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 50),
  }),
  params: z.object({
    userId: z.string().min(1),
  }),
});
```

## Personalización

El sistema puede personalizarse modificando:

- **Reglas de validación**: Agregar o modificar reglas para tipos de datos específicos
- **Mensajes de error**: Personalizar mensajes para diferentes contextos
- **Límites de rate limiting**: Ajustar umbrales para diferentes tipos de solicitudes
- **Patrones de validación**: Agregar nuevas expresiones regulares para formatos específicos

## Pruebas

La implementación ha sido verificada con:

- Validación de perfiles de usuario correctos e incorrectos
- Validación de formularios de evaluación
- Validación de rutinas y ejercicios
- Sanitización de entradas peligrosas
- Middleware de Express para validación
- Rate limiting (implementación básica)

## Consideraciones de Rendimiento

- **Validación eficiente**: Funciones optimizadas para verificación rápida
- **Sin dependencias pesadas**: No introduce bibliotecas externas que afecten el tamaño
- **Cortocircuitos**: Validación temprana para detener procesamiento innecesario
- **Memoria controlada**: No almacena datos de validación innecesariamente

## Futuras Mejoras

1. **Validación en tiempo real**: Integración con formularios frontend
2. **Internacionalización**: Mensajes de error en múltiples idiomas
3. **Validación asincrónica**: Para verificaciones que requieren llamadas externas
4. **Métricas de validación**: Seguimiento de tipos comunes de errores de validación
5. **Cache de validación**: Para estructuras de datos repetidas
6. **Esquemas compartidos**: Reutilización de esquemas entre backend y frontend
7. **Generación automática**: Creación de tipos TypeScript a partir de esquemas Zod