# Implementación de Límites de Concurrencia

## Descripción

Este documento describe la implementación de límites de concurrencia en la aplicación Spartan Hub para evitar la sobrecarga de los servicios externos y mejorar la gestión de recursos del sistema.

## Problema

La implementación anterior de paralelización de llamadas a múltiples APIs no tenía límites de concurrencia, lo que podía causar:

1. **Sobrecarga de servicios externos**: Demasiadas solicitudes simultáneas podrían saturar las APIs de terceros
2. **Agotamiento de recursos locales**: Un gran número de conexiones simultáneas podría agotar los recursos del sistema
3. **Degradación del rendimiento**: La falta de control de concurrencia podía llevar a tiempos de respuesta inconsistentes
4. **Posibles bloqueos**: Algunas APIs tienen límites de tasa que podrían bloquear solicitudes excesivas

## Solución Implementada

Se ha implementado un sistema de límites de concurrencia con las siguientes características:

### 1. Utilitario de Limitación de Concurrencia (`concurrencyLimiter.ts`)

Creamos una clase `ConcurrencyLimiter` que proporciona:

#### Características principales:
- **Limitación configurable**: Se puede establecer un límite máximo de operaciones concurrentes
- **Cola de espera**: Las solicitudes adicionales se ponen en cola hasta que haya espacio disponible
- **Gestión automática de recursos**: Liberación automática de slots cuando las operaciones terminan
- **Métodos convenientes**: Métodos para ejecutar funciones individuales o conjuntos de funciones con límites

#### Clase `ConcurrencyLimiter`:
```typescript
export class ConcurrencyLimiter {
  private readonly maxConcurrency: number;
  private currentConcurrency: number = 0;
  private readonly queue: Array<() => void> = [];

  constructor(maxConcurrency: number) {
    if (maxConcurrency <= 0) {
      throw new Error('Max concurrency must be greater than 0');
    }
    this.maxConcurrency = maxConcurrency;
  }

  async acquire(): Promise<void>
  release(): void
  async run<T>(fn: () => Promise<T>): Promise<T>
  async runAll<T>(fns: (() => Promise<T>)[]): Promise<T[]>
  getStatus(): { current: number; max: number; queued: number }
}
```

#### Limitadores predefinidos:
```typescript
export const API_CONCURRENCY_LIMITER = new ConcurrencyLimiter(5);
export const NUTRITION_API_CONCURRENCY_LIMITER = new ConcurrencyLimiter(3);
export const EXERCISE_API_CONCURRENCY_LIMITER = new ConcurrencyLimiter(3);
```

### 2. Integración en el Servicio de Fitness y Nutrición

#### Función `getExerciseRecommendations`:
- **Antes**: Usaba `Promise.all()` sin límites para ejecutar todas las llamadas simultáneamente
- **Después**: Usa `EXERCISE_API_CONCURRENCY_LIMITER.runAll()` para limitar el número de llamadas concurrentes

```typescript
// Ejecutar todas las llamadas API con limitación de concurrencia
const exercisePromises = muscleGroups.map(muscle => 
  () => searchExercisesByMuscle(muscle)
);
const exerciseResults = await EXERCISE_API_CONCURRENCY_LIMITER.runAll(exercisePromises);
```

#### Función `getCombinedFitnessData`:
- **Nota**: Mantiene `Promise.all()` para las funciones de nivel superior ya que cada una gestiona su propia concurrencia

### 3. Integración en las Rutas del Backend

#### Ruta `/exercises/muscle/:muscle`:
- **Antes**: Usaba `Promise.all()` sin límites para consultar ambas APIs simultáneamente
- **Después**: Usa `EXERCISE_API_CONCURRENCY_LIMITER.run()` para limitar las llamadas concurrentes

```typescript
// Consultar ambas APIs con limitación de concurrencia
const [apiNinjasResult, exerciseDbResult] = await Promise.all([
  EXERCISE_API_CONCURRENCY_LIMITER.run(() => fetchFromApiNinjasExercises(muscle)),
  EXERCISE_API_CONCURRENCY_LIMITER.run(() => fetchFromExerciseDB(muscle))
]);
```

#### Ruta `/exercises/search`:
- **Antes**: Una sola llamada sin limitación
- **Después**: Usa `EXERCISE_API_CONCURRENCY_LIMITER.run()` para controlar la concurrencia

#### Ruta `/nutrition`:
- **Antes**: Usaba `Promise.all()` sin límites para consultar las tres APIs de nutrición
- **Después**: Las funciones auxiliares (`fetchFromFatSecret`, `fetchFromEdamam`, `fetchFromApiNinjasNutrition`) usan `NUTRITION_API_CONCURRENCY_LIMITER.runAll()` para limitar las llamadas concurrentes

```typescript
// Ejecutar todas las llamadas API con limitación de concurrencia
const promises = foodItems.map((foodItem) => 
  () => {
    return NUTRITION_API_CONCURRENCY_LIMITER.run(async () => {
      // Lógica de llamada a API
    });
  }
);
const results = await NUTRITION_API_CONCURRENCY_LIMITER.runAll(promises);
```

## Beneficios

1. **Protección de servicios externos**: Evita sobrecargar las APIs de terceros con demasiadas solicitudes simultáneas
2. **Gestión eficiente de recursos**: Controla el uso de conexiones y memoria del sistema
3. **Mejor experiencia de usuario**: Tiempos de respuesta más consistentes y predecibles
4. **Cumplimiento de límites de tasa**: Reduce el riesgo de ser bloqueado por límites de tasa de APIs externas
5. **Escalabilidad**: Facilita la expansión a más APIs sin preocuparse por la sobrecarga

## Pruebas Realizadas

1. ✅ Creación y funcionamiento correcto del utilitario `ConcurrencyLimiter`
2. ✅ Limitación efectiva del número de operaciones concurrentes
3. ✅ Funcionamiento correcto de la cola de espera
4. ✅ Liberación automática de recursos
5. ✅ Integración correcta con el servicio de fitness y nutrición
6. ✅ Integración correcta con las rutas del backend
7. ✅ Compilación exitosa de archivos TypeScript

## Recomendaciones

1. **Monitoreo**: Seguir el estado de los limitadores de concurrencia para identificar posibles ajustes necesarios
2. **Ajuste de límites**: Adaptar los límites según el rendimiento observado y las restricciones de las APIs externas
3. **Configuración dinámica**: Considerar la posibilidad de ajustar los límites en tiempo de ejecución según las condiciones del sistema
4. **Registro de métricas**: Registrar estadísticas de uso de concurrencia para análisis de rendimiento

## Conclusión

La implementación del sistema de límites de concurrencia proporciona una solución efectiva para proteger tanto los servicios externos como los recursos locales del sistema. Esta mejora asegura una utilización más eficiente y responsable de las APIs de terceros, contribuyendo a una mayor estabilidad y rendimiento de la aplicación Spartan Hub.