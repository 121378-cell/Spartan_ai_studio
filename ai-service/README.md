# Spartan Hub AI Service - Local Configuration

This directory contains the local configuration for the Spartan Hub AI microservice.

## 📁 Files

- `local-config.yaml` - Complete configuration for local AI service
- `Dockerfile` - Docker build configuration (in parent ai-microservice directory)

## 🚀 Quick Start

### 1. Ensure Ollama is Running

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Pull required model if not present
docker exec spartan_local_ollama ollama pull gemma2:2b
```

### 2. Ensure Qdrant is Running

```bash
# Check Qdrant status
curl http://localhost:6333/

# Create collections (done automatically on first run)
curl -X PUT http://localhost:6333/collections/spartan_knowledge \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

### 3. Start AI Service

```bash
# Via Docker Compose
docker-compose -f docker-compose.local-test.yml up -d ai-service

# Check status
docker-compose -f docker-compose.local-test.yml ps ai-service

# View logs
docker-compose -f docker-compose.local-test.yml logs -f ai-service
```

## ⚙️ Configuration Options

### Ollama Models

Available models (pull as needed):

```bash
# Lightweight (fast, less accurate)
docker exec spartan_local_ollama ollama pull phi3:mini
docker exec spartan_local_ollama ollama pull gemma2:2b

# Balanced
docker exec spartan_local_ollama ollama pull llama3.2:3b
docker exec spartan_local_ollama ollama pull mistral:7b

# High Quality (slower, more accurate)
docker exec spartan_local_ollama ollama pull gemma2:9b
docker exec spartan_local_ollama ollama pull llama3.1:8b
```

### Update Model in Configuration

Edit `local-config.yaml`:

```yaml
ollama:
  model:
    name: llama3.2:3b  # Change this
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service info |
| `/health` | GET | Health check |
| `/embeddings` | POST | Generate embeddings |
| `/predict_alert` | POST | Predict health alert |
| `/generate_decision` | POST | Generate coaching decision |

## 📝 Example Requests

### Generate Embeddings

```bash
curl -X POST http://localhost:8000/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "Best exercises for building muscle"}'
```

### Predict Alert

```bash
curl -X POST http://localhost:8000/predict_alert \
  -H "Content-Type: application/json" \
  -d '{
    "recovery_score": 75,
    "habit_adherence": 4,
    "stress_level": 3,
    "sleep_quality": 4,
    "workout_frequency": 4
  }'
```

### Generate Decision

```bash
curl -X POST http://localhost:8000/generate_decision \
  -H "Content-Type: application/json" \
  -d '{
    "PartituraSemanal": {
      "biometrics": {
        "rhr": 95,
        "hrv": 25,
        "sleep_hours": 5
      }
    },
    "Causa": "Elevated RHR detected"
  }'
```

## 🧪 Testing

### Run Integration Tests

```bash
# From ai-microservice directory
python test_integration.py
```

### Manual Testing

```bash
# Health check
curl http://localhost:8000/health

# Should return:
# {"status": "healthy", "ollama_available": true, "model": "gemma2:2b"}
```

## 🐛 Troubleshooting

### Ollama Connection Failed

```bash
# Check Ollama is running
docker ps | grep ollama

# Test connection
curl http://localhost:11434/api/tags

# Restart Ollama if needed
docker-compose -f docker-compose.local-test.yml restart ollama
```

### Model Not Found

```bash
# List available models
docker exec spartan_local_ollama ollama list

# Pull missing model
docker exec spartan_local_ollama ollama pull gemma2:2b
```

### Qdrant Connection Failed

```bash
# Check Qdrant is running
docker ps | grep qdrant

# Test connection
curl http://localhost:6333/

# Restart Qdrant if needed
docker-compose -f docker-compose.local-test.yml restart qdrant
```

## 📊 Monitoring

### View Logs

```bash
docker-compose -f docker-compose.local-test.yml logs -f ai-service
```

### Check Resource Usage

```bash
docker stats spartan_local_ai_service
```

### Metrics Endpoint

```bash
curl http://localhost:8000/metrics
```

## 🔧 Development

### Hot Reload

The AI service does not support hot reload. Rebuild after changes:

```bash
docker-compose -f docker-compose.local-test.yml up -d --build ai-service
```

### Local Development (without Docker)

```bash
# Install dependencies
pip install fastapi uvicorn requests pydantic

# Run locally
uvicorn main:app --reload --port 8000
```

## 📚 Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Local Test Setup Guide](../LOCAL_TEST_SETUP.md)
