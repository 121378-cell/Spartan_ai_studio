import { UserProfile } from '../types';

/**
 * Interface for automatic suggestions
 */
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  severity: 'low' | 'medium' | 'high';
  category: 'ai' | 'performance' | 'usage' | 'setup';
}

/**
 * Automatic suggestion service for common problems
 */
export class SuggestionService {
  /**
   * Get automatic suggestions based on user profile and system state
   * @param userProfile The user's profile
   * @param systemErrors Recent system errors
   * @returns Array of relevant suggestions
   */
  static getAutomaticSuggestions(
    userProfile: UserProfile,
    systemErrors: string[] = []
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Check for AI service related issues
    if (systemErrors.some(error => error.includes('Ollama') || error.includes('timeout'))) {
      suggestions.push({
        id: 'ai_timeout',
        title: 'Problemas de Conectividad con IA',
        description: 'El sistema de inteligencia artificial no está respondiendo en el tiempo esperado.',
        action: 'Verifica que Ollama esté ejecutándose y que el modelo gemma2:2b esté disponible.',
        severity: 'high',
        category: 'ai'
      });
    }

    // Check for performance issues based on user profile
    if (userProfile.trainingCycle?.phase === 'strength') {
      suggestions.push({
        id: 'recovery_focus',
        title: 'Enfócate en la Recuperación',
        description: 'Durante la fase de fuerza, es crucial priorizar la recuperación para prevenir el sobreentrenamiento.',
        action: 'Considera añadir días de descanso o sesiones de movilidad y respiración.',
        severity: 'medium',
        category: 'performance'
      });
    }

    // Check for consistency in training (based on stats)
    if (userProfile.stats && userProfile.stats.totalWorkouts > 0) {
      const consistencyRatio = userProfile.stats.currentStreak / userProfile.stats.totalWorkouts;
      if (consistencyRatio < 0.6) {
        suggestions.push({
          id: 'consistency_improvement',
          title: 'Mejora tu Consistencia',
          description: 'Tu ratio de consistencia indica que podrías beneficiarte de una rutina más estable.',
          action: 'Intenta entrenar en los mismos días y horarios cada semana para desarrollar un hábito sólido.',
          severity: 'medium',
          category: 'performance'
        });
      }
    }

    // Generic fallback suggestions
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'general_tip',
        title: 'Consejo General',
        description: 'Mantén una buena hidratación y sueño para optimizar tu rendimiento.',
        action: 'Asegúrate de dormir al menos 7-8 horas y beber suficiente agua durante el día.',
        severity: 'low',
        category: 'usage'
      });
    }

    return suggestions;
  }

  /**
   * Get suggestions for specific AI service errors
   * @param error The error message
   * @returns Array of relevant suggestions
   */
  static getSuggestionsForAiError(error: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (error.includes('timeout')) {
      suggestions.push({
        id: 'ai_timeout_solution',
        title: 'Solución para Tiempos de Espera',
        description: 'El servicio de IA está tardando demasiado en responder.',
        action: '1. Reinicia Ollama: ollama run gemma2:2b\n2. Verifica recursos del sistema\n3. Considera migrar a Kimi API',
        severity: 'high',
        category: 'ai'
      });
    }

    if (error.includes('ECONNREFUSED')) {
      suggestions.push({
        id: 'ai_connection_solution',
        title: 'Solución para Problemas de Conexión',
        description: 'No se puede conectar con el servicio de IA.',
        action: '1. Verifica que Ollama esté ejecutándose\n2. Comprueba el puerto 11434\n3. Revisa la configuración de red',
        severity: 'high',
        category: 'ai'
      });
    }

    if (error.includes('invalid json')) {
      suggestions.push({
        id: 'ai_json_solution',
        title: 'Solución para Respuestas Inválidas',
        description: 'El servicio de IA está devolviendo respuestas en formato incorrecto.',
        action: '1. Reinicia el modelo de IA\n2. Verifica la integridad del modelo\n3. Considera usar un modelo diferente',
        severity: 'medium',
        category: 'ai'
      });
    }

    return suggestions;
  }

  /**
   * Get setup suggestions for new users
   * @returns Array of setup suggestions
   */
  static getSetupSuggestions(): Suggestion[] {
    return [
      {
        id: 'setup_ollama',
        title: 'Configuración de Ollama',
        description: 'Para utilizar todas las funciones de IA, necesitas configurar Ollama correctamente.',
        action: '1. Descarga e instala Ollama desde ollama.com\n2. Ejecuta: ollama run gemma2:2b\n3. Verifica la conexión en http://localhost:11434',
        severity: 'high',
        category: 'setup'
      },
      {
        id: 'setup_profile',
        title: 'Completa tu Perfil',
        description: 'Un perfil completo permite personalizar mejor tus planes de entrenamiento.',
        action: 'Visita la sección de perfil y completa toda la información sobre tu experiencia, objetivos y disponibilidad.',
        severity: 'medium',
        category: 'setup'
      }
    ];
  }
}

export default SuggestionService;
