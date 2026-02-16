# Implementación de Mecanismos de Timeout por Solicitud Individual

## Descripción

Este documento describe la implementación de mecanismos de timeout por solicitud individual en la aplicación Spartan Hub para mejorar la resiliencia y el rendimiento de las llamadas a servicios externos.

## Problema

La implementación anterior de manejo de errores y reintentos no tenía tiempos de espera específicos por solicitud individual, lo que podía causar:

1. **Tiempo de respuesta impredecible**: Las solicitudes podían tardar mucho tiempo en fallar
2. **Bloqueo de recursos**: Las conexiones lentas podían mantener recursos ocupados durante períodos prolongados
3. **Experiencia de usuario inconsistente**: Los tiempos de espera variaban según las condiciones de red
4. **Dificultad para diagnosticar problemas**: Sin tiempos de espera claros, era difícil identificar cuellos de botella

## Solución Implementada

Se ha implementado un sistema de timeouts por solicitud individual con las siguientes características:

### 1. Mejora del Utilitario de Retry Handler (`retryHandler.ts`)

#### Nueva opción de configuración:
```typescript
interface RetryOptions {
  maxRetries?: number;        // Número máximo de reintentos (por defecto: 3)
  initialDelay?: number;      // Retraso inicial en ms (por defecto: 1000)
  maxDelay?: number;          // Retraso máximo en ms (por defecto: 10000)
  factor?: number;            // Factor de backoff (por defecto: 2)
  jitter?: boolean;           // Usar jitter (por defecto: true)
  timeout?: number;           // Tiempo de espera general en ms (por defecto: 30000)
  retryableErrors?: string[]; // Lista de errores reintentables
  perRequestTimeout?: number; // Tiempo de espera por solicitud individual en ms (por defecto: mismo que timeout)
}
```

#### Características principales:
- **Timeout por solicitud**: Cada solicitud individual tiene su propio límite de tiempo
- **Compatibilidad hacia atrás**: La nueva opción es opcional y mantiene compatibilidad
- **Manejo de timeouts en fetch**: Implementación de timeouts para llamadas fetch
- **Mejor manejo de errores**: Validación más robusta de tipos de error

### 2. Configuración en el Servicio de Fitness y Nutrición

#### Opciones de retry actualizadas:
```typescript
const FITNESS_NUTRITION_RETRY_OPTIONS = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 5000,
  factor: 2,
  jitter: true,
  timeout: 10000,
  perRequestTimeout: 5000, // Timeout individual de 5 segundos
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EPIPE', 'EHOSTUNREACH']
};
```

### 3. Configuración en las Rutas del Backend

#### Constante de timeout:
```typescript
const DEFAULT_API_TIMEOUT = 5000; // 5 segundos
```

#### Aplicación en todas las llamadas a APIs externas:
```typescript
const response = await axios.get(`${API_NINJAS_BASE_URL}/exercises`, {
  headers: { 'X-Api-Key': API_NINJAS_KEY },
  params,
  timeout: DEFAULT_API_TIMEOUT
});
```

## Beneficios

1. **Respuesta más rápida**: Las solicitudes fallidas se interrumpen rápidamente
2. **Mejor uso de recursos**: Las conexiones lentas no mantienen recursos bloqueados
3. **Experiencia de usuario consistente**: Tiempos de espera predecibles
4. **Diagnóstico más fácil**: Errores de timeout claros ayudan a identificar problemas
5. **Resiliencia mejorada**: El sistema puede recuperarse más rápidamente de problemas de red

## Pruebas Realizadas

1. ✅ Funciones que completan rápidamente sin timeout
2. ✅ Funciones que exceden el tiempo de espera y son interrumpidas correctamente
3. ✅ Integración correcta con el servicio de fitness y nutrición
4. ✅ Integración correcta con las rutas del backend
5. ✅ Compilación exitosa de archivos TypeScript

## Recomendaciones

1. **Monitoreo**: Seguir los tiempos de respuesta y timeouts para identificar posibles ajustes
2. **Ajuste fino**: Adaptar los tiempos de espera según el comportamiento observado
3. **Pruebas de caos**: Probar el sistema bajo condiciones de red simuladas
4. **Registro de métricas**: Registrar estadísticas de timeouts para análisis de rendimiento

## Conclusión

La implementación del sistema de timeouts por solicitud individual proporciona una solución efectiva para mejorar la resiliencia y el rendimiento de las llamadas a servicios externos. Esta mejora asegura tiempos de respuesta más predecibles y una mejor experiencia de usuario en la aplicación Spartan Hub.