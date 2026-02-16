# Spartan Hub Deployment Verification

This document explains how to verify the deployment and interconnection of the Spartan Hub services.

## Overview

The application consists of two main services:
1. **Ollama Service**: Provides local LLM inference capabilities
2. **Backend Service**: Node.js/Express application that serves the API and connects to Ollama

## Prerequisites

Before running the verification, ensure you have:
- Docker and Docker Compose installed
- The repository cloned to your local machine

## Deployment Verification Process

### 1. Start the Services

```bash
# Navigate to the project root
cd "c:\spartan hub"

# Build and start services using npm script
npm run docker:up
# Or manually:
# docker compose -f scripts/docker/docker-compose.yml up --build
```

### 2. Load the Required LLM Model

In a separate terminal, load the lightweight phi3 model:

```bash
docker exec ollama_service ollama pull phi3:latest
```

### 3. Run Automated Verification

You can use the provided test scripts to automatically verify the deployment:

**On Windows (PowerShell):**
```powershell
.\scripts\deployment\test_deployment.ps1
```

**On Linux/Mac (Bash):**
```bash
chmod +x scripts/deployment/test_deployment.sh
./scripts/deployment/test_deployment.sh
```

### 4. Manual Verification Steps

If you prefer to manually verify the deployment:

1. **Check running containers:**
   ```bash
   docker ps
   ```

2. **Verify both services are running and on the same network:**
   - `ollama_service`
   - `synergycoach_backend`

3. **Check backend logs for successful startup:**
   ```bash
   docker logs synergycoach_backend
   ```

4. **Test health endpoints:**
   ```bash
   # Backend health
   curl http://localhost:3001/health

   # AI service health
   curl http://localhost:3001/ai/health

   # Ollama service
   curl http://localhost:11434/api/tags
   ```

## Expected Results

A successful deployment should show:
- Both containers running without errors
- Backend successfully connecting to Ollama at `http://ollama:11434`
- All health checks returning status 200
- No connection errors in the logs

## Troubleshooting

### Common Issues

1. **Services not starting:**
   - Check Docker is running
   - Ensure ports 3001 and 11434 are not in use

2. **Connection errors between services:**
   - Verify both containers are on the same network
   - Check that Ollama service is fully started before backend connects

3. **Health checks failing:**
   - Check logs for error messages
   - Ensure the required LLM model is loaded in Ollama

### Useful Commands

```bash
# View logs for a specific service
docker logs <service_name>

# Restart a specific service
docker compose restart <service_name>

# Stop all services
docker compose down

# View network information
docker network ls
docker network inspect synergycoach_net
```

## Next Steps

Once deployment is verified, you can:
1. Access the backend API at `http://localhost:3001`
2. Use the AI endpoints for alert predictions and structured decisions
3. Connect the frontend application to the backend API