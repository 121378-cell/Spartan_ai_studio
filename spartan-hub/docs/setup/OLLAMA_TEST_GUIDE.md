# Ollama AI Connection Test Guide

This guide explains how to test the latency and fallback mechanism for the Ollama AI connection.

## Prerequisites

1. Backend service running on `http://localhost:3001`
2. Ollama service running (for latency test)
3. Ollama service stopped (for fallback test)

## Test Endpoints

The main endpoint to test is:
- **POST** `/ai/alert` - AI alert prediction with user data in request body

## Test 1: Latency Test (Ollama Running)

### Using curl

```bash
# Measure response time with curl
time curl -X POST http://localhost:3001/ai/alert \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "quest": "Test AI latency",
    "stats": {
      "totalWorkouts": 10,
      "currentStreak": 5,
      "joinDate": "2023-01-01T00:00:00.000Z"
    },
    "onboardingCompleted": true,
    "keystoneHabits": [
      {
        "id": "habit1",
        "name": "Morning Workout",
        "anchor": "After breakfast",
        "currentStreak": 5,
        "longestStreak": 7
      }
    ],
    "masterRegulationSettings": {
      "targetBedtime": "22:00"
    },
    "nutritionSettings": {
      "priority": "performance"
    },
    "isInAutonomyPhase": false,
    "weightKg": 70
  }'
```

### Using PowerShell

```powershell
# Measure response time with PowerShell
$startTime = Get-Date
$response = Invoke-WebRequest -Uri "http://localhost:3001/ai/alert" -Method POST -ContentType "application/json" -Body '{
  "name": "Test User",
  "email": "test@example.com",
  "quest": "Test AI latency",
  "stats": {
    "totalWorkouts": 10,
    "currentStreak": 5,
    "joinDate": "2023-01-01T00:00:00.000Z"
  },
  "onboardingCompleted": true,
  "keystoneHabits": [
    {
      "id": "habit1",
      "name": "Morning Workout",
      "anchor": "After breakfast",
      "currentStreak": 5,
      "longestStreak": 7
    }
  ],
  "masterRegulationSettings": {
    "targetBedtime": "22:00"
  },
  "nutritionSettings": {
    "priority": "performance"
  },
  "isInAutonomyPhase": false,
  "weightKg": 70
}'
$endTime = Get-Date
$responseTime = ($endTime - $startTime).TotalMilliseconds

Write-Host "Response time: $responseTime ms"
Write-Host "Response: $($response.Content)"
```

### Expected Results

- Response time should be < 500ms
- Response should include:
  ```json
  {
    "success": true,
    "data": {
      "alerta_roja": false,
      "processing_time_ms": 0,
      "fallback_used": false
    }
  }
  ```

## Test 2: Fallback Test (Ollama Stopped)

### Preparation

First, stop the Ollama service:

```bash
# Stop Ollama container
docker stop ollama_service
```

### Using curl

```bash
# Test with Ollama stopped
curl -X POST http://localhost:3001/ai/alert \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "quest": "Test AI fallback",
    "stats": {
      "totalWorkouts": 5,
      "currentStreak": 3,
      "joinDate": "2023-01-01T00:00:00.000Z"
    },
    "onboardingCompleted": true,
    "keystoneHabits": [
      {
        "id": "habit1",
        "name": "Evening Workout",
        "anchor": "Before dinner",
        "currentStreak": 3,
        "longestStreak": 5
      }
    ],
    "masterRegulationSettings": {
      "targetBedtime": "23:00"
    },
    "nutritionSettings": {
      "priority": "longevity"
    },
    "isInAutonomyPhase": true,
    "weightKg": 65
  }'
```

### Expected Results

- Service should not crash
- Response should include fallback data:
  ```json
  {
    "success": true,
    "data": {
      "alerta_roja": false,
      "processing_time_ms": 0,
      "fallback_used": true,
      "error": "Ollama service error: connect ECONNREFUSED 127.0.0.1:11434"
    }
  }
  ```

## Test 3: Health Check Endpoints

### Backend Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Backend server is running",
  "timestamp": "2023-XX-XXTXX:XX:XX.XXXZ",
  "port": "3001"
}
```

### AI Service Health

```bash
curl http://localhost:3001/ai/health
```

Expected response when Ollama is running:
```json
{
  "success": true,
  "data": {
    "aiServiceHealthy": false
  }
}
```

Note: The `aiServiceHealthy` field may be false because the old ONNX service is not running, but the Ollama-based service should still work.

## Test Results Evaluation

### Latency Requirements

- **PASS**: Response time < 500ms
- **FAIL**: Response time >= 500ms

### Fallback Requirements

- **PASS**: 
  1. Service does not crash when Ollama is unavailable
  2. Response includes `fallback_used: true`
  3. Response includes error information
  4. Response still has valid structure

- **FAIL**:
  1. Service crashes or returns 500 error
  2. No fallback mechanism activated
  3. Invalid response structure

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure backend service is running on port 3001
2. **Timeout**: Check if Ollama service is properly configured and responding
3. **Invalid JSON**: Ensure request body is properly formatted JSON

### Logs to Check

1. **Backend logs**:
   ```bash
   docker logs synergycoach_backend
   ```

2. **Ollama logs** (when running):
   ```bash
   docker logs ollama_service
   ```

## Reset Environment

After testing, restart all services:

```bash
# Restart all services
docker compose restart

# Or stop and start
docker compose down
docker compose up -d
```