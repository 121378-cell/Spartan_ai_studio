# Spartan Hub AI Microservice

## Overview

This microservice provides AI-powered functionality for the Spartan Hub application. It handles all AI-related operations including alert predictions and decision generation, communicating with the Ollama service for LLM inference.

## Features

- **Alert Prediction**: Analyzes user data to determine if a red alert should be triggered
- **Decision Generation**: Creates structured decisions based on user performance data
- **Health Monitoring**: Provides health checks for the AI service and its connection to Ollama
- **Fallback Mechanisms**: Gracefully handles AI service failures with appropriate fallback responses

## API Endpoints

### Health Check
- **GET** `/health`
  - Returns the health status of the AI microservice and its connection to Ollama
  - Response: `{ "status": "healthy", "ollama_available": true, "model": "gemma2:2b" }`

### Alert Prediction
- **POST** `/predict_alert`
  - Analyzes user input data to predict if a red alert should be triggered
  - Request Body:
    ```json
    {
      "recovery_score": 75.5,
      "habit_adherence": 4.2,
      "stress_level": 3.0,
      "sleep_quality": 4.0,
      "workout_frequency": 5.0
    }
    ```
  - Response:
    ```json
    {
      "alerta_roja": false,
      "processing_time_ms": 125.5
    }
    ```

### Decision Generation
- **POST** `/generate_decision`
  - Generates structured decisions based on weekly performance data
  - Request Body:
    ```json
    {
      "PartituraSemanal": { /* weekly score data */ },
      "Causa": "Low recovery score detected",
      "PuntajeSinergico": 75.5
    }
    ```
  - Response:
    ```json
    {
      "NewPartituraSemanal": { /* adjusted weekly score */ },
      "JustificacionTactica": "Detailed tactical justification...",
      "IsAlertaRoja": false
    }
    ```

## Environment Variables

- `OLLAMA_HOST`: URL of the Ollama service (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Model to use for inference (default: `gemma2:2b`)

## Deployment

The AI microservice is designed to run in a Docker container and is included in the main `docker-compose.yml` file. It depends on the Ollama service for LLM inference.

To build and run the service:

```bash
# Build the Docker image
docker build -t ai-microservice .

# Run the container
docker run -p 8000:8000 ai-microservice
```

## Integration with Spartan Hub Backend

The Spartan Hub backend communicates with this microservice through HTTP requests. The backend service is configured to use the AI microservice at `http://ai_microservice:8000` in the Docker environment.

## Error Handling

The microservice includes comprehensive error handling:
- Network timeouts and retries for Ollama service calls
- Fallback responses when AI services are unavailable
- Detailed logging for debugging purposes
- Health checks to monitor service availability

## Monitoring

The microservice exposes health check endpoints that can be used for monitoring:
- Container health through Docker health checks
- Application health through the `/health` endpoint
- Processing time metrics in API responses

## Verification

The AI microservice has been thoroughly tested and verified:

1. **Functionality Testing**: All endpoints respond correctly with expected data
2. **Integration Testing**: End-to-end testing confirms proper communication
3. **Direct Communication**: Backend can successfully call microservice endpoints
4. **Error Handling**: Fallback mechanisms work as expected

To run the integration tests:
```bash
cd ai-microservice
python test_integration.py
```

All tests pass, confirming that the AI microservice is ready for production use.