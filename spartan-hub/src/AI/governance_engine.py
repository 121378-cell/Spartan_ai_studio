import asyncio
from typing import Dict, Any, Optional
from enum import Enum

class GovernanceLevel(Enum):
    BASIC = "basic"        # Validaciones simples y rápidas
    STANDARD = "standard"  # Decisiones de nivel medio
    CRITICAL = "critical"  # Decisiones críticas y complejas

class GovernanceEngine:
    def __init__(self):
        self.models = {
            GovernanceLevel.BASIC: "orca-mini",
            GovernanceLevel.STANDARD: "llama2",
            GovernanceLevel.CRITICAL: "mixtral"
        }
        
    async def evaluate(self, 
                      context: Dict[str, Any], 
                      level: GovernanceLevel,
                      timeout: Optional[float] = None) -> Dict[str, Any]:
        """
        Evalúa una decisión de gobernanza usando el modelo apropiado.
        
        Args:
            context: Diccionario con el contexto de la decisión
            level: Nivel de gobernanza requerido
            timeout: Timeout opcional en segundos
        
        Returns:
            Dict con la decisión y metadatos
        """
        model = self.models[level]
        
        # Construir prompt basado en el contexto
        prompt = self._build_prompt(context, level)
        
        try:
            async with asyncio.timeout(timeout or self._get_default_timeout(level)):
                decision = await self._query_model(model, prompt)
                return self._process_decision(decision, context)
        except asyncio.TimeoutError:
            return self._fallback_decision(context, level)
    
    def _build_prompt(self, context: Dict[str, Any], level: GovernanceLevel) -> str:
        """Construye un prompt específico según el nivel y contexto."""
        templates = {
            GovernanceLevel.BASIC: """
            Contexto rápido de validación:
            {context}
            
            Reglas básicas a aplicar:
            1. Validación de tipos de datos
            2. Rangos permitidos
            3. Patrones de seguridad básicos
            
            ¿Es válida esta operación? Responde con Sí/No y una breve explicación.
            """,
            
            GovernanceLevel.STANDARD: """
            Análisis de decisión de nivel medio:
            {context}
            
            Consideraciones a evaluar:
            1. Impacto en el usuario
            2. Recursos del sistema
            3. Políticas de negocio
            4. Patrones históricos
            
            Proporciona una decisión detallada con justificación.
            """,
            
            GovernanceLevel.CRITICAL: """
            Evaluación crítica de gobernanza:
            {context}
            
            Áreas de análisis requeridas:
            1. Cumplimiento normativo (GDPR, etc.)
            2. Seguridad y privacidad
            3. Impacto en el negocio
            4. Riesgos potenciales
            5. Alternativas y mitigaciones
            
            Proporciona un análisis exhaustivo y recomendaciones.
            """
        }
        
        return templates[level].format(context=context)
    
    async def _query_model(self, model: str, prompt: str) -> Dict[str, Any]:
        """Realiza la consulta al modelo de IA."""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'http://localhost:11434/api/generate',
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False
                }
            ) as response:
                return await response.json()
    
    def _process_decision(self, 
                         decision: Dict[str, Any], 
                         context: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa y valida la decisión del modelo."""
        return {
            "decision": decision["response"],
            "confidence": self._calculate_confidence(decision),
            "metadata": {
                "model_used": decision.get("model"),
                "processing_time": decision.get("processing_time"),
                "context_hash": hash(str(context)),
                "timestamp": datetime.now().isoformat()
            }
        }
    
    def _calculate_confidence(self, decision: Dict[str, Any]) -> float:
        """Calcula un score de confianza para la decisión."""
        # Implementar lógica de scoring basada en:
        # - Claridad de la respuesta
        # - Consistencia con políticas conocidas
        # - Tiempo de respuesta
        # - Factores de contexto
        return 0.85  # Placeholder
    
    def _get_default_timeout(self, level: GovernanceLevel) -> float:
        """Retorna el timeout predeterminado según el nivel."""
        return {
            GovernanceLevel.BASIC: 1.0,      # 1 segundo
            GovernanceLevel.STANDARD: 3.0,    # 3 segundos
            GovernanceLevel.CRITICAL: 10.0    # 10 segundos
        }[level]
    
    def _fallback_decision(self, 
                          context: Dict[str, Any], 
                          level: GovernanceLevel) -> Dict[str, Any]:
        """Proporciona una decisión de fallback si hay timeout."""
        return {
            "decision": "DENIED",
            "reason": "Timeout en la evaluación de gobernanza",
            "fallback_level": level.value,
            "suggested_action": "Revisar manualmente",
            "context_hash": hash(str(context)),
            "timestamp": datetime.now().isoformat()
        }