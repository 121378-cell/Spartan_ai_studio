from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import time
import os
import json

app = FastAPI(title="Spartan Hub AI Microservice", version="1.0.0")

# Ollama service configuration
OLLAMA_SERVICE_URL = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:2b")

class UserInput(BaseModel):
    recovery_score: float  # 0-100 scale
    habit_adherence: float  # 1-5 scale
    stress_level: float  # 1-10 scale
    sleep_quality: float  # 1-5 scale
    workout_frequency: float  # 0-7 times per week

class UserProfile(BaseModel):
    name: str
    email: str
    quest: str
    stats: dict
    onboardingCompleted: bool
    keystoneHabits: list
    masterRegulationSettings: dict
    nutritionSettings: dict
    isInAutonomyPhase: bool
    weightKg: float

class AlertPrediction(BaseModel):
    alerta_roja: bool
    processing_time_ms: float
    fallback_used: bool = False
    error: str = None

class DecisionContext(BaseModel):
    PartituraSemanal: dict
    Causa: str
    PuntajeSinergico: float

class DecisionOutput(BaseModel):
    NewPartituraSemanal: dict
    JustificacionTactica: str
    IsAlertaRoja: bool

class HealthCheckResponse(BaseModel):
    status: str
    ollama_available: bool
    model: str = None

class EmbeddingRequest(BaseModel):
    text: str

class EmbeddingResponse(BaseModel):
    embedding: list[float]
    model: str
    tokens: int

@app.get("/")
async def root():
    return {"message": "Spartan Hub AI Microservice"}

@app.post("/embeddings", response_model=EmbeddingResponse)
async def get_embeddings(request: EmbeddingRequest):
    """Generate deterministic mock embeddings for testing"""
    # 384 dimensions matching all-MiniLM-L6-v2
    dimension = 384
    text = request.text
    
    # Generate a deterministic mock vector based on text
    embedding = []
    for i in range(dimension):
        char_code = ord(text[i % len(text)]) if text else 0
        val = (char_code / 255.0) * (1.0 if i % 2 == 0 else -1.0)
        embedding.append(val)
        
    return EmbeddingResponse(
        embedding=embedding,
        model="mock-all-MiniLM-L6-v2",
        tokens=len(text) // 4
    )

@app.post("/predict_alert", response_model=AlertPrediction)
async def predict_alert(user_input: UserInput):
    """Generate alert prediction based on user input data"""
    start_time = time.time()
    
    # For testing purposes, we'll return a mock response
    # In a real implementation, this would call the Ollama service
    processing_time = (time.time() - start_time) * 1000
    
    # Mock response - in a real scenario, this would come from Ollama
    return AlertPrediction(
        alerta_roja=False,  # Mock value
        processing_time_ms=processing_time,
        fallback_used=False
    )

@app.post("/generate_decision", response_model=DecisionOutput)
async def generate_decision(context: DecisionContext):
    """Generate structured decision based on context data"""
    # Mock response - in a real scenario, this would come from Ollama
    return DecisionOutput(
        NewPartituraSemanal=context.PartituraSemanal,  # Echo back for testing
        JustificacionTactica="Mock decision justification for testing purposes",
        IsAlertaRoja=False
    )

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Check the health of the AI microservice"""
    # Mock health check - in a real scenario, this would check Ollama connection
    return HealthCheckResponse(
        status="healthy",
        ollama_available=True,
        model="gemma2:2b"
    )