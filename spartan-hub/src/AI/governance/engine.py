from typing import Dict, Any, Optional, List
import asyncio
import logging
import json
from datetime import datetime
from enum import Enum
import aiohttp
from prometheus_client import Counter, Histogram, start_http_server
from pydantic import BaseModel

# Métricas para monitoreo
DECISION_LATENCY = Histogram('governance_decision_latency_seconds', 
                           'Time spent processing governance decisions',
                           ['model', 'decision_type'])
DECISION_COUNTER = Counter('governance_decisions_total',
                         'Number of governance decisions made',
                         ['model', 'decision_type', 'result'])

class DecisionType(Enum):
    SECURITY = "security"
    TRAINING = "training"
    HEALTH = "health"
    COMPLIANCE = "compliance"
    DATA_VALIDATION = "data_validation"

class DecisionRequest(BaseModel):
    context: Dict[str, Any]
    decision_type: DecisionType
    urgency: bool = False
    timeout: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class DecisionResponse(BaseModel):
    decision: str
    confidence: float
    reasoning: str
    model_used: str
    processing_time: float
    timestamp: str
    metadata: Dict[str, Any]

class GovernanceEngine:
    def __init__(self):
        self.logger = logging.getLogger("governance")
        self.model_configs = self._load_model_configs()
        self._setup_logging()
        # Iniciar servidor de métricas en puerto 9090
        start_http_server(9090)
        
    def _setup_logging(self):
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[
                logging.FileHandler('governance.log'),
                logging.StreamHandler()
            ]
        )

    def _load_model_configs(self) -> Dict[str, Dict[str, Any]]:
        model_configs = {
            "mixtral": {
                "priority": ["HEALTH", "SECURITY", "COMPLIANCE"],
                "temperature": 0.7,
                "max_tokens": 2000,
                "timeout": 10.0
            },
            "llama2": {
                "priority": ["TRAINING", "DATA_VALIDATION"],
                "temperature": 0.8,
                "max_tokens": 1000,
                "timeout": 5.0
            },
            "orca-mini": {
                "priority": [],  # Fallback model
                "temperature": 0.9,
                "max_tokens": 500,
                "timeout": 2.0
            }
        }
        return model_configs

    def _select_model(self, decision_type: DecisionType, urgency: bool) -> str:
        if urgency:
            return "orca-mini"
        
        for model, config in self.model_configs.items():
            if decision_type.value.upper() in config["priority"]:
                return model
        
        return "orca-mini"

    async def _query_model(
        self, 
        model: str, 
        prompt: str,
        timeout: Optional[float] = None
    ) -> Dict[str, Any]:
        config = self.model_configs[model]
        timeout = timeout or config["timeout"]

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(
                    'http://localhost:11434/api/generate',
                    json={
                        "model": model,
                        "prompt": prompt,
                        "temperature": config["temperature"],
                        "max_tokens": config["max_tokens"],
                        "stream": False
                    },
                    timeout=timeout
                ) as response:
                    return await response.json()
            except asyncio.TimeoutError:
                self.logger.warning(f"Timeout querying model {model}")
                raise
            except Exception as e:
                self.logger.error(f"Error querying model {model}: {str(e)}")
                raise

    def _build_prompt(
        self, 
        context: Dict[str, Any],
        decision_type: DecisionType
    ) -> str:
        prompts = {
            DecisionType.SECURITY: """
                Evaluación de Seguridad:
                
                Contexto:
                {context}
                
                Consideraciones de seguridad:
                1. Autenticación y autorización
                2. Validación de entrada
                3. Exposición de datos sensibles
                4. Vectores de ataque potenciales
                
                Por favor proporciona:
                1. Evaluación de riesgo (Alto/Medio/Bajo)
                2. Justificación detallada
                3. Recomendaciones específicas
            """,
            DecisionType.TRAINING: """
                Evaluación de Plan de Entrenamiento:
                
                Contexto del usuario:
                {context}
                
                Evaluar:
                1. Seguridad del ejercicio
                2. Progresión adecuada
                3. Factores de riesgo
                4. Adaptaciones necesarias
                
                Proporciona:
                1. Decisión (Aprobar/Modificar/Rechazar)
                2. Justificación
                3. Modificaciones sugeridas si aplica
            """,
            DecisionType.HEALTH: """
                Evaluación de Riesgo de Salud:
                
                Datos del usuario:
                {context}
                
                Análisis requerido:
                1. Indicadores de riesgo inmediato
                2. Contraindicaciones
                3. Limitaciones necesarias
                4. Monitoreo requerido
                
                Entregar:
                1. Nivel de riesgo (Alto/Medio/Bajo)
                2. Justificación médica
                3. Precauciones recomendadas
            """
        }
        
        template = prompts.get(
            decision_type,
            "Evaluación General:\n\nContexto:\n{context}\n\nProporcionar decisión justificada."
        )
        
        return template.format(context=json.dumps(context, indent=2))

    async def make_decision(
        self, 
        request: DecisionRequest
    ) -> DecisionResponse:
        start_time = datetime.now()
        model = self._select_model(request.decision_type, request.urgency)
        
        try:
            prompt = self._build_prompt(request.context, request.decision_type)
            with DECISION_LATENCY.labels(model=model, 
                                      decision_type=request.decision_type.value).time():
                response = await self._query_model(
                    model,
                    prompt,
                    request.timeout
                )
            
            decision_response = self._process_response(
                response,
                model,
                start_time,
                request
            )
            
            DECISION_COUNTER.labels(
                model=model,
                decision_type=request.decision_type.value,
                result="success"
            ).inc()
            
            return decision_response
            
        except Exception as e:
            DECISION_COUNTER.labels(
                model=model,
                decision_type=request.decision_type.value,
                result="error"
            ).inc()
            
            self.logger.error(f"Error making decision: {str(e)}")
            return self._fallback_response(request, str(e), start_time)

    def _process_response(
        self,
        response: Dict[str, Any],
        model: str,
        start_time: datetime,
        request: DecisionRequest
    ) -> DecisionResponse:
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return DecisionResponse(
            decision=self._extract_decision(response["response"]),
            confidence=self._calculate_confidence(response),
            reasoning=response["response"],
            model_used=model,
            processing_time=processing_time,
            timestamp=datetime.now().isoformat(),
            metadata={
                "request_type": request.decision_type.value,
                "urgency": request.urgency,
                **(request.metadata or {})
            }
        )

    def _extract_decision(self, response_text: str) -> str:
        # Implementar lógica para extraer la decisión del texto
        # Por ahora, usamos una implementación simple
        if "APROBAR" in response_text.upper():
            return "APPROVE"
        elif "RECHAZAR" in response_text.upper():
            return "REJECT"
        else:
            return "REVIEW_NEEDED"

    def _calculate_confidence(self, response: Dict[str, Any]) -> float:
        # Implementar lógica de scoring
        # Por ahora, retornamos un valor fijo
        return 0.85

    def _fallback_response(
        self,
        request: DecisionRequest,
        error: str,
        start_time: datetime
    ) -> DecisionResponse:
        return DecisionResponse(
            decision="MANUAL_REVIEW_NEEDED",
            confidence=0.0,
            reasoning=f"Error in automated decision: {error}",
            model_used="fallback",
            processing_time=(datetime.now() - start_time).total_seconds(),
            timestamp=datetime.now().isoformat(),
            metadata={
                "error": error,
                "request_type": request.decision_type.value
            }
        )