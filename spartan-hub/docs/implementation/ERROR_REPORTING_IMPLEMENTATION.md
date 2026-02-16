# Implementación de Reporte de Errores con Contexto

## Descripción General

Esta implementación proporciona un sistema de reporte de errores con contexto para ayudar a los usuarios y desarrolladores a identificar, reportar y resolver problemas en la aplicación. El sistema captura información detallada sobre los errores, incluyendo contexto del usuario, detalles técnicos y metadata del entorno.

## Componentes Clave

### 1. Servicio de Reporte de Errores (`services/errorReportingService.ts`)

Servicio central que maneja la creación, almacenamiento y envío de reportes de error:

- **reportError**: Crea y almacena un nuevo reporte de error con contexto detallado
- **getReports**: Recupera todos los reportes almacenados
- **getReportsByComponent**: Filtra reportes por componente específico
- **getReportsBySeverity**: Filtra reportes por nivel de severidad
- **sendReports**: Envía reportes a un servicio backend (simulado)
- **clearReports**: Limpia todos los reportes almacenados
- **exportReports**: Exporta reportes en formato JSON

### 2. Componente de Botón de Reporte (`components/ErrorReportButton.tsx`)

Componente reutilizable que permite a los usuarios reportar errores manualmente:

- **Estado visual**: Indicadores claros para estados pendiente, enviando y reportado
- **Integración con servicio**: Conecta automáticamente con el servicio de reporte
- **Feedback inmediato**: Proporciona confirmación visual cuando se envía un reporte
- **Personalización**: Acepta props para personalizar el texto y comportamiento

### 3. Pantalla de Error Mejorada (`components/AiErrorScreen.tsx`)

Actualización de la pantalla de error de IA para incluir la capacidad de reporte:

- **Botón de reporte integrado**: Permite a los usuarios reportar errores de IA directamente
- **Contexto del usuario**: Incluye información del perfil del usuario en el reporte
- **Metadata del error**: Captura detalles técnicos del error para diagnóstico

## Información Capturada en los Reportes

### Detalles Técnicos
- **Timestamp**: Fecha y hora exacta del error
- **Error message**: Mensaje descriptivo del error
- **Error stack**: Traza completa del error para debugging
- **Component**: Componente donde ocurrió el error
- **Severity**: Nivel de severidad (low, medium, high, critical)

### Contexto del Usuario
- **User agent**: Información del navegador/dispositivo
- **Current URL**: Página donde ocurrió el error
- **User profile**: Información relevante del perfil del usuario (nombre, email, fase de entrenamiento, etc.)

### Metadata Adicional
- **Custom context**: Información específica del contexto de la aplicación
- **Reported by user**: Indicador de si el error fue reportado por el usuario
- **Unique ID**: Identificador único para cada reporte

## Beneficios de la Implementación

- **Diagnóstico mejorado**: Información detallada para resolver problemas más rápidamente
- **Experiencia de usuario**: Permite a los usuarios participar activamente en la mejora de la aplicación
- **Seguimiento de errores**: Sistema para rastrear y analizar patrones de errores
- **Integración flexible**: Fácil de integrar en cualquier componente de la aplicación
- **Privacidad consciente**: Solo captura información relevante, evitando datos sensibles

## Cómo Usar

### 1. Reportar errores automáticamente
```typescript
import ErrorReportingService from '../services/errorReportingService';

try {
  // Código que puede fallar
  await someOperation();
} catch (error) {
  ErrorReportingService.reportError(
    error,
    'MyComponent',
    { operation: 'someOperation', params: { id: 123 } },
    userProfile,
    'high'
  );
}
```

### 2. Permitir reporte manual a usuarios
```tsx
import ErrorReportButton from '../components/ErrorReportButton';

<ErrorReportButton 
  error={errorMessage}
  component="MyComponent"
  context={{ userId: 123, action: 'save' }}
  userProfile={userProfile}
>
  Reportar este problema
</ErrorReportButton>
```

## Personalización

El sistema puede personalizarse modificando:

- **Niveles de severidad**: Agregar o modificar categorías de severidad
- **Campos de contexto**: Extender la información capturada en los reportes
- **Formato de exportación**: Cambiar cómo se estructuran los datos exportados
- **Método de envío**: Implementar comunicación real con backend en producción

## Pruebas

La implementación ha sido verificada con:
- Importación correcta de todos los componentes y servicios
- Funcionamiento básico de los métodos del servicio
- Reporte y almacenamiento correcto de errores
- Renderizado adecuado del botón de reporte
- Integración con la pantalla de error de IA

## Consideraciones de Rendimiento

- **Memoria limitada**: Solo se almacenan los 50 reportes más recientes para evitar problemas de memoria
- **Envío asíncrono**: No bloquea la interfaz de usuario durante el envío de reportes
- **Sin dependencias pesadas**: No introduce bibliotecas externas que afecten el tamaño de la aplicación
- **Seguridad**: No expone información sensible del sistema o del usuario

## Futuras Mejoras

1. **Integración con backend real**: Conectar con un servicio de reporte de errores en producción
2. **Categorización avanzada**: Implementar etiquetas y categorías para errores comunes
3. **Análisis de patrones**: Agregar funcionalidad para identificar patrones recurrentes
4. **Notificaciones**: Implementar alertas para errores críticos
5. **Exportación avanzada**: Agregar formatos de exportación adicionales (CSV, PDF)