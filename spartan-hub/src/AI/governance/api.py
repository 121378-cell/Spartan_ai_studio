from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .models import DecisionRequest, DecisionResponse, HealthCheckResponse, HealthStatus, DecisionType
from .engine import GovernanceEngine
from .auth import auth, Role, User
import logging
from typing import Dict, Any
import jsonschema
from datetime import datetime
import uvicorn

app = FastAPI(title="Spartan Hub Governance API")

# Configurar CORS para desarrollo local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar el motor de gobernanza
governance_engine = GovernanceEngine()
logger = logging.getLogger("governance_api")

@app.post("/api/governance/decision", response_model=DecisionResponse)
async def make_decision(
    request: DecisionRequest,
    user: User = Depends(auth.require_roles([Role.USER, Role.REVIEWER, Role.ADMIN]))
):
    try:
        # The request is automatically validated by Pydantic/FastAPI
        ai_response = await governance_engine.make_decision(request)
        
        # Validate AI response against our schema
        try:
            from .validation import validate_ai_response, ValidationError
            validate_ai_response(ai_response)
        except ValidationError as ve:
            logger.error("AI response validation failed", extra=ve.details)
            return JSONResponse(
                status_code=502,
                content={
                    "detail": "Invalid AI response format",
                    "error_type": "ai_validation_error",
                    "error_details": ve.details
                }
            )
        
        return ai_response
            
    except ValueError as ve:
        # Handle validation errors from request processing
        logger.warning(f"Invalid request: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Handle unexpected errors
        logger.error(f"Error processing decision request: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/governance/security")
async def get_security_status(
    user: User = Depends(auth.require_roles([Role.REVIEWER, Role.ADMIN]))
):
    return {"status": "secure", "last_check": "2025-11-04T12:00:00Z"}

@app.get("/api/governance/health")
async def health_check():
    return {"status": "healthy"}

# Endpoints específicos para cada tipo de decisión
@app.post("/api/governance/training", response_model=DecisionResponse)
async def evaluate_training(context: Dict[str, Any]):
    request = DecisionRequest(
        context=context,
        decision_type=DecisionType.TRAINING
    )
    return await governance_engine.make_decision(request)

@app.post("/api/governance/health", response_model=DecisionResponse)
async def evaluate_health(context: Dict[str, Any]):
    request = DecisionRequest(
        context=context,
        decision_type=DecisionType.HEALTH,
        urgency=True  # Las decisiones de salud son siempre urgentes
    )
    return await governance_engine.make_decision(request)

@app.post("/api/governance/security", response_model=DecisionResponse)
async def evaluate_security(context: Dict[str, Any]):
    request = DecisionRequest(
        context=context,
        decision_type=DecisionType.SECURITY
    )
    return await governance_engine.make_decision(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)