# Ollama Setup for Spartan Hub

This document explains how to set up Ollama for use with Spartan Hub, which now uses Ollama exclusively for AI functionality instead of Google Gemini.

## Prerequisites

1. Ollama must be installed on your system
2. The `gemma2:2b` model must be available

## Installation

1. Download and install Ollama from https://ollama.com/download
2. Pull the required model:
   ```
   ollama pull gemma2:2b
   ```

## Configuration

The application is configured to connect to Ollama at `http://localhost:11434` by default. This can be changed by setting the `OLLAMA_HOST` environment variable.

## Testing

To verify that Ollama is working correctly with Spartan Hub:

1. Run the test script:
   ```
   node test-ollama-exclusive.js
   ```

2. You should see output similar to:
   ```
   ✅ Ollama is running
   Available models: [ 'gemma2:2b', ... ]
   ✅ Ollama model response: Ollama is working correctly
   ```

## Docker Configuration

When running with Docker, the `docker-compose.yml` file is configured to:
- Run Ollama service on port 11434
- Set the `OLLAMA_HOST` environment variable to `http://ollama:11434` for the backend service
- Ensure the backend service depends on the Ollama service being started

## Troubleshooting

If you encounter issues:

1. Ensure Ollama is running:
   ```
   ollama --version
   ```

2. Verify the required model is available:
   ```
   ollama list
   ```

3. Test the model directly:
   ```
   ollama run gemma2:2b "Hello, how are you?"
   ```