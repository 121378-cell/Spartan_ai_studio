## Configuración de Proveedores de IA

### Variables de entorno principales

- `AI_PROVIDER`: proveedor activo. Valores soportados:
  - `microservice` (por defecto, usa el microservicio HTTP existente)
  - `groq`
  - `openai`
  - `anthropic`
  - `google` / `googleai` / `gemini`
  - `multi` (modo multi‑proveedor con fallback)
- `AI_PROVIDER_MODE`:
  - `single` (por defecto): se usa un único proveedor (definido por `AI_PROVIDER` o `AI_PRIMARY_PROVIDER`).
  - `multi`: registra la configuración multi‑proveedor, aunque el modo efectivo lo controla `AI_PROVIDER=multi`.
- `AI_PRIMARY_PROVIDER`: proveedor primario cuando se usan varios (por ejemplo, `groq`).
- `AI_FALLBACK_PROVIDERS`: lista separada por comas de proveedores de respaldo en orden de prioridad.

Ejemplo:

```bash
AI_PROVIDER=multi
AI_PRIMARY_PROVIDER=groq
AI_FALLBACK_PROVIDERS=openai,anthropic,google
```

### Configuración de Circuit Breakers

Variables para ajustar el comportamiento de los interruptores de circuito:

- `AI_CB_FAILURE_THRESHOLD` (por defecto `3`): Número de fallos consecutivos para abrir el circuito.
- `AI_CB_RESET_TIMEOUT_MS` (por defecto `60000`): Tiempo en ms que un proveedor permanece deshabilitado (estado `open`) antes de intentar reconectar (`half_open`).
- `AI_CB_HALF_OPEN_MAX_TRIALS` (por defecto `1`): Número de intentos permitidos en estado `half_open` para verificar recuperación.

### Límites de rate limiting y timeouts por proveedor


- `AI_MICROSERVICE_RATE_LIMIT_PER_MINUTE` (por defecto `120`)
- `AI_MICROSERVICE_TIMEOUT_MS` (por defecto `30000`)
- `AI_GROQ_RATE_LIMIT_PER_MINUTE` / `AI_GROQ_TIMEOUT_MS`
- `AI_OPENAI_RATE_LIMIT_PER_MINUTE` / `AI_OPENAI_TIMEOUT_MS`
- `AI_ANTHROPIC_RATE_LIMIT_PER_MINUTE` / `AI_ANTHROPIC_TIMEOUT_MS`
- `AI_GOOGLE_RATE_LIMIT_PER_MINUTE` / `AI_GOOGLE_TIMEOUT_MS`

### Credenciales de proveedores

- Groq:
  - `GROQ_API_KEY`
  - `GROQ_MODEL` (opcional, por defecto `llama-3.1-8b-instant`)
- OpenAI:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (por defecto `gpt-4o-mini`)
  - `OPENAI_API_URL` (opcional, por defecto `https://api.openai.com/v1/chat/completions`)
- Anthropic:
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_MODEL` (por defecto `claude-3-5-sonnet-latest`)
  - `ANTHROPIC_API_URL` (opcional, por defecto `https://api.anthropic.com/v1/messages`)
  - `ANTHROPIC_VERSION` (por defecto `2023-06-01`)
- Google / Gemini:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` (por defecto `gemini-1.5-flash`)

Las API keys se leen únicamente desde variables de entorno. No se almacenan en código ni en base de datos.

## Arquitectura

- Módulo de configuración: [`aiConfig.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/config/aiConfig.ts)
- Fábrica de proveedores: [`AiProviderFactory.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/AiProviderFactory.ts)
- Interfaz común: [`interfaces.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/interfaces.ts)
- Tipos compartidos: [`types.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/types.ts)
- Proveedor multi‑IA: [`MultiAiProvider.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/providers/MultiAiProvider.ts)
- Adaptadores de proveedor:
  - Groq: [`GroqProvider.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/providers/GroqProvider.ts)
  - Microservicio HTTP: [`MicroserviceProvider.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/providers/MicroserviceProvider.ts)
  - OpenAI: [`OpenAIProvider.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/providers/OpenAIProvider.ts)
  - Anthropic: [`AnthropicProvider.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/providers/AnthropicProvider.ts)
  - Google / Gemini: [`GoogleAiProvider.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/ai/providers/GoogleAiProvider.ts)

El servicio de alto nivel que consume estos proveedores es [`aiService.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/services/aiService.ts), que expone:

- `processAiRequest(type, payload)`
- `CheckInferenciaIA(userProfile)`
- `GenerateStructuredDecision(context)`
- `checkAiServiceHealth()`

## Modo multi‑proveedor y fallback

Cuando `AI_PROVIDER=multi`:

- Se construye un orden de proveedores a partir de:
  - `AI_PRIMARY_PROVIDER`
  - `AI_FALLBACK_PROVIDERS`
  - Siempre se añade `microservice` como último recurso.
- Solo se incluyen proveedores marcados como `enabled` en `aiConfig.ts` (por ejemplo, un proveedor sin API key queda automáticamente deshabilitado).
- Cada proveedor tiene su propio `RateLimiter` interno con ventana de 60s y cuota configurable por entorno.

### Flujo de petición

1. `processAiRequest` delega en `AiProviderFactory.getProvider()`.
2. Si el proveedor es `MultiAiProvider`:
   - Recorre la lista de proveedores en orden.
   - Comprueba rate limit por proveedor.
   - Ejecuta la operación (`predictAlert` o `generateDecision`) con `executeWithRetry` (backoff exponencial + jitter + timeout por proveedor).
   - Registra métricas de latencia y estado vía `apmService.recordAiApiCall`.
3. Si un proveedor falla (excepción, timeout, respuesta inválida) se pasa al siguiente proveedor.
4. Si todos fallan:
   - `predictAlert` devuelve una respuesta de fallback consistente:
     - `alerta_roja: false`
     - `fallback_used: true`
     - `error` con detalle de proveedores que fallaron.
   - `generateDecision` devuelve `null`.

## Rate limiting y cuotas

- Implementado con [`RateLimiter`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/utils/rateLimiter.ts).
- Cada entrada de `MultiAiProvider` crea su propio `RateLimiter`:
  - clave interna `ai_<providerId>`
  - ventana fija de 60 segundos
  - `maxRequests` configurable por variable de entorno.
- Cuando un proveedor supera su cuota:
  - No se hace llamada al proveedor.
  - Se registra un warning en logs.
  - Se intenta el siguiente proveedor disponible.

## Logging y métricas

- Logging estructurado con `logger` en cada proveedor:
  - errores contextuales (`GroqProvider`, `OpenAIProvider`, etc.)
  - errores agregados en `MultiAiProvider`.
- Métricas Prometheus:
  - `apmService.recordAiApiCall(service, model, status, durationMs)`:
    - `service`: id del proveedor (`groq`, `openai`, `anthropic`, `google`, `microservice`, `multi`).
    - `model`: nombre de modelo por proveedor.
    - `status`: `success` o `error`.
  - Métricas específicas en `metricsCollector` para endpoints del microservicio de IA si se usa `MicroserviceProvider`.

### Health Checks y Circuit Breakers

El sistema implementa patrones de resiliencia:

1. **Circuit Breakers**:
   - Cada proveedor tiene su propio interruptor.
   - Si un proveedor falla `AI_CB_FAILURE_THRESHOLD` veces consecutivas, el circuito se abre (`open`).
   - Las peticiones posteriores fallan inmediatamente sin intentar llamar al API externo.
   - Tras `AI_CB_RESET_TIMEOUT_MS`, el circuito pasa a `half_open` permitiendo un intento de prueba.
   - Si el intento tiene éxito, el circuito se cierra (`closed`); si falla, vuelve a abrirse.

2. **Health Checks Periódicos**:
   - `/ai/health` verifica el estado de todos los proveedores configurados.
   - Un health check exitoso puede resetear automáticamente un circuito abierto.

3. **Caché Inteligente (Ollama/Microservicio)**:
   - Para el proveedor local (`microservice`), se implementa caché con Redis/memoria.
   - Se cachean solo respuestas exitosas y validadas.
   - Claves basadas en parámetros de entrada para garantizar consistencia.
   - TTL específico para alertas y decisiones.

## Validación y formato de respuestas

### Alertas (`predictAlert`)

Formato normalizado:

```ts
type FallbackResponse = {
  alerta_roja: boolean;
  processing_time_ms: number;
  fallback_used: boolean;
  error?: string;
};
```

- Los proveedores Groq, OpenAI, Anthropic y Google:
  - Construyen un `prompt` común y fuerzan salida en JSON.
  - Parsean la respuesta con `JSON.parse`.
  - Validan campos mínimos (`alerta_roja`, `processing_time_ms`).
  - Si la respuesta no es válida, generan un `FallbackResponse` con `fallback_used=true`.

### Decisiones estructuradas (`generateDecision`)

- Usan el `structuredDecisionPrompt` y devuelven un `DecisionOutput | null`.
- Cualquier error o respuesta inválida se traduce en `null`.

## Uso desde controladores REST

- Controladores de IA: [`aiController.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/controllers/aiController.ts)
- Ejemplos:
  - `/ai/alert/:userId` → usa `aiMessageQueue` y `CheckInferenciaIA`.
  - `/ai/alert` (body) → idem pero tomando datos del cuerpo.
  - `/ai/health` → usa `checkAiServiceHealth` y expone estado de proveedores.
  - `/ai/config/reload` (POST, admin) → Recarga la configuración de proveedores en caliente.

## Pruebas

- Unitarias:
  - [`AiProviderFactory.test.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/__tests__/ai/AiProviderFactory.test.ts) valida la resolución de proveedores y el patrón singleton.
- Integración / configuración:
  - [`ai-service-configuration.test.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/__tests__/ai-service-configuration.test.ts) valida salud del servicio, manejo de errores y compatibilidad de `processAiRequest`.
  - [`aiServices.e2e.test.ts`](file:///C:/Proyectos/Spartan%20hub%202.0%20-%20codex%20-%20ollama/spartan-hub/backend/src/__tests__/e2e/aiServices.e2e.test.ts) cubre endpoints REST de alto nivel, autenticación y rate limiting a nivel HTTP.

Para ejecutar solo las pruebas de IA:

```bash
cd backend
npm test -- --testPathPatterns=\"AiProviderFactory|ai-service-configuration|aiServices\"
```

