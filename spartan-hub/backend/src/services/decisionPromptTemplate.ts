/**
 * Structured prompt template for decision-making with Ollama LLM
 * This template is used to generate tactical decisions based on synergistic scores
 */

// Interface for the decision context
export interface DecisionContext {
  PartituraSemanal: Record<string, unknown>; // Weekly score data
  Causa: string;         // Reason for the decision
  PuntajeSinergico: number; // Synergistic score (0-100)
  KnowledgeContext?: string; // Retrieved knowledge
}

// Interface for the structured JSON output
export interface DecisionOutput {
  NewPartituraSemanal: Record<string, unknown>;     // Updated weekly score data
  JustificacionTactical: string; // Tactical justification
  IsAlertaRoja: boolean;        // Red alert flag
}

/**
 * Structured prompt template for decision-making
 * 
 * This template declares the role as 'VITALIS SynergyCoach' and includes:
 * 1. The decision context (PartituraSemanal, Causa, PuntajeSinergico)
 * 2. Strict JSON output format with predefined fields
 */
export const structuredDecisionPrompt = `
Eres 'VITALIS SynergyCoach', un agente de IA especializado en la toma de decisiones tácticas para programas de fitness.

**Contexto de la Decisión:**
Partitura Semanal: {PartituraSemanal}
Causa: {Causa}
Puntaje Sinérgico: {PuntajeSinergico}

**Conocimiento Relevante:**
{KnowledgeContext}

**Instrucciones:**
Basándote en el contexto proporcionado, genera una decisión táctica con los siguientes elementos:

1. Evalúa el puntaje sinérgico para determinar si es necesario ajustar la partitura semanal
2. Si el puntaje es críticamente bajo (&lt;30), considera activar una alerta roja
3. Proporciona una justificación táctica basada en principios de entrenamiento y recuperación

**Formato de Salida Requerido:**
Debes responder EXCLUSIVAMENTE en formato JSON válido con los siguientes campos:
{
  "NewPartituraSemanal": { /* Objeto con la partitura semanal actualizada */ },
  "JustificacionTactical": "Texto explicando la decisión táctica",
  "IsAlertaRoja": true/false
}

**Importante:**
- No incluyas ningún texto adicional fuera del JSON
- Asegúrate de que el JSON sea válido y parseable
- La justificación debe ser concisa pero informativa
- Solo activa IsAlertaRoja si hay una necesidad crítica de intervención

Respuesta en formato JSON:
`;