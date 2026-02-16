# Guía de Despliegue y Configuración de Servicios de IA

## Nueva Configuración de IA (Groq API)

Se ha implementado una arquitectura flexible para el servicio de IA que soporta múltiples proveedores. Actualmente soportamos:

1. **Microservicio Legacy** (Default)
2. **Groq API** (Nuevo)

### Configuración de Variables de Entorno

Para activar el proveedor de Groq en producción, debes configurar las siguientes variables de entorno:

```bash
# Seleccionar el proveedor de IA
AI_PROVIDER=groq

# Clave de API de Groq (Requerido si AI_PROVIDER=groq)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Pasos para Despliegue

1. **Actualizar Código**: Asegúrate de que los últimos cambios estén desplegados.
2. **Configurar Entorno**:
   - Accede al panel de configuración de tu servidor o proveedor de hosting (ej. Vercel, Heroku, AWS).
   - Añade `GROQ_API_KEY` con tu clave válida.
   - Establece `AI_PROVIDER` a `groq`.
3. **Reiniciar Servicios**: Es necesario reiniciar el backend para que los cambios de configuración surtan efecto.

### Verificación

Para verificar que el servicio está funcionando correctamente con Groq:

1. Revisa los logs de inicio del servidor. Deberías ver:
   `[INFO] Initializing AI Provider: groq`
2. Realiza una petición de prueba a `/api/ai/health` o endpoint equivalente.

### Fallback

El sistema incluye un mecanismo de fallback. Si Groq API falla o no está configurada correctamente, el sistema registrará el error y devolverá una respuesta por defecto segura, pero no cambiará automáticamente al microservicio legacy a menos que se reconfigure `AI_PROVIDER`.
