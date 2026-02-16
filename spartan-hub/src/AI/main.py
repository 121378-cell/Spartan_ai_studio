from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import onnxruntime as ort
import joblib
import numpy as np
import time

app = FastAPI(title="Spartan Coach AI API", version="1.0.0")

# Global variables for model and scaler
sess = None
scaler = None
model_loaded = False

# Load the ONNX model and scaler at startup
@app.on_event("startup")
async def load_model():
    global sess, scaler, model_loaded
    try:
        sess = ort.InferenceSession("risk_classifier.onnx")
        scaler = joblib.load("scaler.pkl")
        model_loaded = True
        print("Model loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load model files: {e}")
        model_loaded = False

class UserInput(BaseModel):
    recovery_score: float  # 0-100 scale
    habit_adherence: float  # 1-5 scale
    stress_level: float  # 1-10 scale
    sleep_quality: float  # 1-5 scale
    workout_frequency: float  # 0-7 times per week

class RiskPrediction(BaseModel):
    risk_level: str  # "low" or "high"
    risk_probability: float
    recommendation: str

class AlertPrediction(BaseModel):
    alerta_roja: bool  # True if high risk, False otherwise
    processing_time_ms: float

@app.get("/")
async def root():
    return {"message": "Spartan Coach AI API"}

@app.post("/predict_risk", response_model=RiskPrediction)
async def predict_risk(user_input: UserInput):
    if not model_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    start_time = time.time()
    
    # Prepare input data
    input_data = np.array([[
        user_input.recovery_score,
        user_input.habit_adherence,
        user_input.stress_level,
        user_input.sleep_quality,
        user_input.workout_frequency
    ]])
    
    # Scale the input data
    input_scaled = scaler.transform(input_data)
    
    # Run inference
    input_name = sess.get_inputs()[0].name
    raw_prediction = sess.run(None, {input_name: input_scaled.astype(np.float32)})[0]
    
    processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
    
    # Convert to probability and risk level
    risk_probability = float(raw_prediction[0]) if raw_prediction[0] > 0.5 else 1.0 - float(raw_prediction[0])
    risk_level = "high" if raw_prediction[0] > 0.5 else "low"
    
    # Generate recommendation based on risk level
    if risk_level == "high":
        recommendation = "Se detecta un riesgo elevado de sobreentrenamiento o burnout. Te recomendamos priorizar la recuperación, reducir la frecuencia de entrenamiento e implementar técnicas de manejo del estrés."
    else:
        recommendation = "Tu nivel de riesgo es bajo. ¡Sigue con tu rutina actual y mantén el buen trabajo!"
    
    print(f"Risk prediction processed in {processing_time:.2f}ms")
    
    return RiskPrediction(
        risk_level=risk_level,
        risk_probability=risk_probability,
        recommendation=recommendation
    )

@app.post("/predict_alert", response_model=AlertPrediction)
async def predict_alert(user_input: UserInput):
    """Low-latency endpoint that returns AlertaRoja decision in less than 50ms"""
    if not model_loaded:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    start_time = time.time()
    
    # Prepare input data
    input_data = np.array([[
        user_input.recovery_score,
        user_input.habit_adherence,
        user_input.stress_level,
        user_input.sleep_quality,
        user_input.workout_frequency
    ]])
    
    # Scale the input data
    input_scaled = scaler.transform(input_data)
    
    # Run inference
    input_name = sess.get_inputs()[0].name
    raw_prediction = sess.run(None, {input_name: input_scaled.astype(np.float32)})[0]
    
    processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
    
    # Convert to alert decision (AlertaRoja)
    alerta_roja = bool(raw_prediction[0] > 0.5)
    
    print(f"Alert prediction processed in {processing_time:.2f}ms")
    
    return AlertPrediction(
        alerta_roja=alerta_roja,
        processing_time_ms=processing_time
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": model_loaded}