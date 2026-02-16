# How to Connect Your Local Ollama with the Application

This document explains how to connect your local Ollama installation with the Spartan Hub application.

## Current Setup Status

✅ **Your local Ollama is successfully connected to the application!**

The application has been configured to work with your local Ollama instance, and we've verified that:

1. Ollama is installed and running on your system
2. The lightweight `gemma2:2b` model is available
3. The AI service can successfully communicate with Ollama
4. The application returns properly formatted JSON responses

## Key Configuration Changes Made

### 1. Updated Ollama Service URL

In `backend/src/services/aiService.ts`, we changed:
```typescript
// From Docker container reference
const OLLAMA_SERVICE_URL = process.env.OLLAMA_HOST || 'http://ollama:11434';

// To local instance reference
const OLLAMA_SERVICE_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
```

### 2. Changed AI Model

We switched from the memory-intensive `phi3:latest` model to the more efficient `gemma2:2b`:
```typescript
// From
model: "phi3:latest"

// To
model: "gemma2:2b" // Lightweight model for low-memory systems
```

## Testing the Connection

You can verify the connection at any time by running:
```bash
node test_ai_service.js
```

This should produce output similar to:
```
Testing CheckInferenciaIA with sample user data...
✅ AI service responded successfully!
Result: {
  "alerta_roja": true,
  "processing_time_ms": 0,
  "fallback_used": false
}
```

## Running the Complete Application

To run the full application:

1. Make sure Ollama is running (check the system tray icon)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the backend:
   ```bash
   cd backend
   npx tsc
   cd ..
   ```
4. Start the application (the specific command depends on your setup)

## Troubleshooting

### If Ollama is Not Running

1. Check the system tray for the Ollama icon
2. Start Ollama by running:
   ```bash
   ollama serve
   ```

### If the Model is Not Available

Download the required model:
```bash
ollama pull gemma2:2b
```

### If You Get Memory Errors

The `gemma2:2b` model is specifically chosen for low-memory systems. If you still encounter memory issues:

1. Close other applications to free up memory
2. Restart Ollama: 
   ```bash
   ollama serve
   ```

### If the AI Service Returns Invalid JSON

This can happen with some models. The application includes robust JSON parsing and fallback mechanisms:

1. The application validates JSON format before processing
2. If invalid JSON is received, the fallback mechanism is triggered
3. The fallback returns `alerta_roja: false` to maintain functionality

## Performance Information

- **Model**: gemma2:2b (1.6GB)
- **Typical Response Time**: 2-5 seconds
- **Timeout**: 10 seconds (configurable in aiService.ts)
- **Fallback**: Automatically triggered on timeout or errors

## Next Steps

1. Integrate the AI service with your frontend application
2. Test with various user data scenarios
3. Monitor performance and adjust timeout values if needed
4. Consider experimenting with other lightweight models if needed

## Additional Resources

- [Ollama Documentation](https://github.com/ollama/ollama)
- [Gemma2 Model Information](https://ai.google.dev/gemma)
- Local setup guide: `LOCAL_OLLAMA_SETUP.md`
- Test scripts: `test_ai_service.js`, `test_fitness_prompt.js`