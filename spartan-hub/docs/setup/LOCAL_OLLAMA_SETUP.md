# Local Ollama Setup Guide

This guide explains how to connect your local Ollama instance with the Spartan Hub application.

## Prerequisites

1. Ollama installed on your local machine
2. Node.js and npm installed
3. The Spartan Hub application codebase

## Setup Steps

### 1. Verify Ollama Installation

First, verify that Ollama is installed and running on your system:

```bash
ollama --version
```

You should see output similar to:
```
ollama version is 0.12.6
```

### 2. Pull Required Models

The application requires a lightweight model that can run on your system. We recommend using the gemma2:2b model:

```bash
ollama pull gemma2:2b
```

This will download a 1.6GB model that should work well with most systems.

### 3. Update Application Configuration

The application has been configured to use your local Ollama instance. The key changes made:

1. Updated the Ollama service URL in `backend/src/services/aiService.ts`:
   ```typescript
   const OLLAMA_SERVICE_URL = process.env.OLLAMA_HOST || 'http://localhost:11434';
   ```

2. Changed the model to use in `backend/src/services/aiService.ts`:
   ```typescript
   model: "gemma2:2b", // Lightweight model for low-memory systems
   ```

### 4. Test the Connection

You can test the connection with the following script:

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

### 5. Run the Application

To run the complete application:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the backend TypeScript code:
   ```bash
   cd backend
   npx tsc
   cd ..
   ```

3. Start the application:
   ```bash
   # If you have the start script
   ./start.ps1
   ```

## Troubleshooting

### Memory Issues

If you encounter memory issues with models, try these solutions:

1. Use a quantized model like `gemma2:2b` which requires less memory
2. Close other applications to free up system memory
3. Restart Ollama service

### Connection Issues

If the application cannot connect to Ollama:

1. Verify Ollama is running:
   ```bash
   ollama list
   ```

2. Check if the Ollama service is listening on port 11434:
   ```bash
   netstat -an | findstr 11434
   ```

3. Ensure the OLLAMA_HOST environment variable is not set incorrectly

### Model Response Issues

If the model is not returning properly formatted JSON:

1. The prompt might need adjustment for the specific model
2. Try a different model that better follows instructions
3. Check the model's documentation for specific formatting requirements

## Available Models

You can see all available models on your system with:
```bash
ollama list
```

Some recommended lightweight models:
- `gemma2:2b` - 1.6GB, good balance of performance and memory usage
- `llama3:8b` - 4.7GB, more capable but requires more memory
- `phi3:latest` - 2.2GB, optimized for reasoning tasks

## Performance Notes

- The gemma2:2b model typically responds in 2-5 seconds on most systems
- Larger models will provide more accurate responses but take longer
- The application includes a 10-second timeout for AI processing
- If the AI service doesn't respond within the timeout, the fallback mechanism will be triggered

## Next Steps

1. Integrate the AI service with the frontend application
2. Test the alert system with various user data scenarios
3. Optimize prompts for better accuracy
4. Consider fine-tuning models for fitness-specific tasks