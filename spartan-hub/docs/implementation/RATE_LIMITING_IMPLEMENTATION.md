# Implementación de Rate Limiting para Prevenir Abuso

## Descripción General

Esta implementación proporciona un sistema completo de rate limiting (limitación de tasa) para proteger la aplicación contra abusos, ataques de denegación de servicio (DoS) y uso excesivo de recursos. El sistema incluye utilidades de rate limiting, middlewares reutilizables y configuraciones predefinidas para diferentes tipos de endpoints.

## Componentes Clave

### 1. Utilidad de Rate Limiting (`backend/src/utils/rateLimiter.ts`)

Módulo central que contiene toda la lógica de rate limiting:

- **Clase RateLimiter**: Implementación principal con almacenamiento en memoria
- **Almacenamiento en memoria**: Uso de Map para seguimiento de solicitudes
- **Limpieza automática**: Intervalo para prevenir fugas de memoria
- **Prefijos de clave**: Organización de límites por tipo de operación
- **Estado detallado**: Información completa sobre límites actuales

### 2. Middlewares de Rate Limiting (`backend/src/middleware/rateLimitMiddleware.ts`)

Middlewares reutilizables para aplicaciones Express:

- **globalRateLimit**: Límite global para todas las solicitudes
- **authRateLimit**: Límites estrictos para endpoints de autenticación
- **apiRateLimit**: Límites estándar para endpoints de API
- **heavyApiRateLimit**: Límites restrictivos para operaciones intensivas
- **customRateLimit**: Middleware configurable para casos especiales

### 3. Integración en el Servidor (`backend/src/server.ts`)

Aplicación de rate limiting en toda la aplicación:

- **Rate limiting global**: Protección en todos los endpoints
- **Rate limiting por ruta**: Configuraciones específicas por tipo de endpoint
- **Headers informativos**: Respuestas con información de límites
- **Manejo de errores**: Respuestas consistentes cuando se exceden límites

## Configuraciones Predefinidas

### 1. Límites Globales
- **GLOBAL_RATE_LIMITER**: 1000 solicitudes por minuto por cliente

### 2. Límites de Autenticación
- **AUTH_RATE_LIMITER**: 10 solicitudes por minuto por cliente

### 3. Límites de API
- **API_RATE_LIMITER**: 100 solicitudes por minuto por cliente
- **HEAVY_API_RATE_LIMITER**: 20 solicitudes por minuto por cliente

## Beneficios de la Implementación

- **Protección contra abusos**: Prevención de uso excesivo de recursos
- **Prevención de DoS**: Protección contra ataques de denegación de servicio
- **Equidad de acceso**: Distribución justa de recursos entre usuarios
- **Información detallada**: Headers con estado de rate limiting
- **Flexibilidad**: Configuraciones adaptables a diferentes necesidades
- **Mantenibilidad**: Código modular y bien organizado

## Cómo Funciona

### 1. Algoritmo de Ventana Fija
El sistema utiliza un algoritmo de ventana fija para contar solicitudes:
- Cada cliente tiene un contador y tiempo de reinicio
- El contador se incrementa con cada solicitud
- Se reinicia después del período de ventana
- Se permite hasta el máximo de solicitudes configuradas

### 2. Identificación de Clientes
Los clientes se identifican mediante:
- Direcciones IP reales
- Direcciones IP de proxies (X-Forwarded-For)
- Identificadores de usuario cuando están disponibles

### 3. Respuesta a Exceso de Límites
Cuando se excede el límite:
- Código de estado HTTP 429 (Too Many Requests)
- Headers con información de retry-after
- Mensajes de error descriptivos

## Cómo Usar

### 1. Rate Limiting Global
```
import { globalRateLimit } from './middleware/rateLimitMiddleware';

app.use(globalRateLimit);
```

### 2. Rate Limiting por Ruta
```
import { authRateLimit, apiRateLimit, heavyApiRateLimit } from './middleware/rateLimitMiddleware';

// Endpoints de autenticación con límites estrictos
app.use('/auth', authRateLimit, authRoutes);

// Endpoints de API con límites estándar
app.use('/api', apiRateLimit, apiRoutes);

// Endpoints intensivos con límites restrictivos
app.use('/ai', heavyApiRateLimit, aiRoutes);
```

### 3. Rate Limiting Personalizado
```
import { customRateLimit } from './middleware/rateLimitMiddleware';

// 50 solicitudes por 30 segundos
app.use('/special', customRateLimit(50, 30000, 'special'), specialRoutes);
```

## Personalización

El sistema puede personalizarse modificando:

- **Límites de solicitudes**: Ajustar máximos por tipo de endpoint
- **Ventanas de tiempo**: Cambiar períodos de reinicio
- **Prefijos de clave**: Organizar límites por funcionalidad
- **Identificación de cliente**: Adaptar a infraestructura específica

## Consideraciones de Producción

### 1. Almacenamiento Externo
Para entornos de producción, se recomienda reemplazar el almacenamiento en memoria con:
- **Redis**: Para entornos distribuidos
- **Memcached**: Para alto rendimiento
- **Base de datos**: Para persistencia

### 2. Balanceadores de Carga
Cuando se usan balanceadores de carga:
- Configurar encabezados X-Forwarded-For
- Compartir almacenamiento de rate limiting
- Sincronizar ventanas de tiempo

### 3. Monitoreo
Implementar monitoreo de:
- Solicitudes bloqueadas por rate limiting
- Patrones de uso por cliente
- Alertas para posibles ataques

## Estado de Implementación

✅ **Implementación completa y funcional**

La implementación de rate limiting ha sido completada y probada exitosamente. Todos los componentes están funcionando correctamente:

- ✅ Utilidad de Rate Limiting (`backend/src/utils/rateLimiter.ts`)
- ✅ Middlewares de Rate Limiting (`backend/src/middleware/rateLimitMiddleware.ts`)
- ✅ Integración en el Servidor (`backend/src/server.ts`)
- ✅ Pruebas unitarias y verificación manual

## Futuras Mejoras

1. **Integración con Redis**: Para entornos distribuidos
2. **Rate limiting adaptativo**: Ajuste dinámico según carga
3. **Whitelisting**: Excepciones para clientes confiables
4. **Análisis de patrones**: Detección automática de abusos
5. **Métricas avanzadas**: Dashboards de uso y bloqueos