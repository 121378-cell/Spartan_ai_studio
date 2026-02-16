# Implementación de Sugerencias Automáticas para Resolver Problemas Comunes

## Descripción General

Esta implementación proporciona un sistema de sugerencias automáticas para ayudar a los usuarios a resolver problemas comunes relacionados con el entrenamiento, la IA y la configuración de la aplicación. El sistema analiza el perfil del usuario y los errores del sistema para ofrecer recomendaciones personalizadas y acciones específicas.

## Componentes Clave

### 1. Servicio de Sugerencias (`services/suggestionService.ts`)

Servicio central que contiene la lógica para generar sugerencias automáticas:

- **getAutomaticSuggestions**: Genera sugerencias basadas en el perfil del usuario y errores del sistema
- **getSuggestionsForAiError**: Proporciona soluciones específicas para errores de IA
- **getSetupSuggestions**: Ofrece sugerencias para nuevos usuarios

### 2. Componentes de UI (`components/SuggestionCard.tsx` y `components/SuggestionPanel.tsx`)

Componentes visuales para mostrar las sugerencias:

- **SuggestionCard**: Tarjeta individual para cada sugerencia con severidad codificada por colores
- **SuggestionPanel**: Panel contenedor que agrupa múltiples sugerencias

### 3. Hook Personalizado (`hooks/useSuggestions.ts`)

Hook de React para gestionar el estado y lógica de las sugerencias:

- **refreshSuggestions**: Actualiza las sugerencias basadas en el perfil del usuario
- **getSuggestionsForAiError**: Obtiene sugerencias para errores específicos de IA
- **dismissSuggestion**: Permite descartar sugerencias individualmente
- **clearDismissedSuggestions**: Limpia todas las sugerencias descartadas

## Tipos de Sugerencias

### 1. Problemas de IA
- **Timeouts de Ollama**: Sugiere reiniciar el servicio y verificar recursos del sistema
- **Errores de conexión**: Proporciona pasos para verificar la configuración de red
- **Respuestas inválidas**: Recomienda reiniciar modelos y verificar integridad

### 2. Rendimiento del Usuario
- **Fase de entrenamiento**: Ofrece consejos específicos según la fase actual
- **Consistencia**: Sugiere rutinas más estables para mejorar hábitos
- **Recuperación**: Recomienda días de descanso y técnicas de movilidad

### 3. Configuración Inicial
- **Instalación de Ollama**: Guía paso a paso para configurar el servicio de IA
- **Perfil de usuario**: Incentiva completar la información para personalización

## Beneficios de la Implementación

- **Experiencia de usuario mejorada**: Proporciona ayuda contextual sin interrumpir el flujo
- **Resolución proactiva**: Identifica y sugiere soluciones antes de que se conviertan en problemas mayores
- **Personalización**: Adapta las sugerencias al perfil y comportamiento del usuario
- **Facilidad de uso**: Ofrece instrucciones claras y acciones específicas
- **Persistencia**: Recuerda las sugerencias descartadas para evitar repetirlas

## Integración con Otros Componentes

El sistema de sugerencias puede integrarse fácilmente con:

- **Dashboard**: Mostrar sugerencias en la página principal
- **AI Chat**: Proporcionar sugerencias cuando la IA no responde
- **Error Screens**: Ofrecer soluciones específicas para errores comunes
- **Profile Section**: Sugerir mejoras basadas en datos del usuario

## Personalización

Las sugerencias pueden personalizarse modificando:

- **Criterios de generación**: Ajustar las condiciones que activan cada sugerencia
- **Contenido de las sugerencias**: Modificar los mensajes y acciones recomendadas
- **Severidad**: Cambiar la clasificación de severidad para cada tipo de sugerencia
- **Categorías**: Agregar nuevas categorías para diferentes tipos de problemas

## Pruebas

La implementación ha sido verificada con:
- Importación correcta de todos los componentes y servicios
- Funcionamiento básico de los métodos del servicio
- Renderizado adecuado de los componentes de UI
- Gestión correcta del estado en el hook personalizado

## Consideraciones de Rendimiento

- El sistema tiene un impacto mínimo en el rendimiento general
- No introduce dependencias pesadas o recursos innecesarios
- Las sugerencias se generan de forma eficiente basadas en datos ya disponibles
- El estado de las sugerencias descartadas se mantiene en memoria para evitar repeticiones