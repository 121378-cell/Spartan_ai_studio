# Spartan Coach AI Module

This directory contains the Docker configuration for the Spartan Coach AI module.

## Files

- `Dockerfile`: Defines the container image for the AI module
- `requirements.txt`: Lists Python dependencies
- `main.py`: FastAPI application for serving risk predictions
- `train_risk_model.py`: Script to train and export the risk classification model to ONNX format
- `risk_classifier.onnx`: Optimized ONNX model for risk classification (generated)
- `scaler.pkl`: Scaler for input normalization (generated)

## Building the Docker Image

First, you need to train and export the model to ONNX format:

```bash
# Install dependencies for model training
pip install -r requirements.txt

# Train and export the model
python train_risk_model.py
```

Then build the Docker image:

```bash
docker build -t spartan-coach-ai .
```

## Running the Container

```bash
docker run -p 8000:8000 spartan-coach-ai
```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /` - Health check endpoint
- `POST /predict_risk` - Get burnout risk prediction based on user profile
- `POST /predict_alert` - Get low-latency AlertaRoja decision (under 50ms)
- `GET /health` - Service health status

## ONNX Model Optimization

The risk classification model is exported to ONNX format for maximum inference optimization on local CPUs using ONNX Runtime. The Docker image contains only the optimized model and the FastAPI boot script.

The model is loaded once at startup for maximum performance, and the `/predict_alert` endpoint is designed to return decisions in under 50ms.

## Dependencies

- Python 3.10
- FastAPI
- ONNX Runtime
- scikit-learn
- skl2onnx (for model conversion)