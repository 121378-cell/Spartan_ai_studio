# Spartan Hub Startup Guide

This guide explains how to start and stop the Spartan Hub application using the provided scripts.

## Available Scripts

The project includes startup and stop scripts for different operating systems:

### Startup Scripts:
1. `start.sh` - For Unix/Linux/macOS systems
2. `start.bat` - For Windows Command Prompt
3. `start.ps1` - For Windows PowerShell

### Stop Scripts:
1. `stop.sh` - For Unix/Linux/macOS systems
2. `stop.bat` - For Windows Command Prompt
3. `stop.ps1` - For Windows PowerShell

## Prerequisites

Before running any of the scripts, ensure you have:

1. Docker installed and running
2. Docker Compose installed
3. Appropriate permissions to execute the scripts

## Usage Instructions

### For Unix/Linux/macOS:

```bash
# Make the scripts executable (if needed)
chmod +x start.sh stop.sh

# Run the startup script
./start.sh

# Run the stop script
./stop.sh
```

### For Windows Command Prompt:

```cmd
# Start the application
start.bat

# Stop the application
stop.bat
```

### For Windows PowerShell:

```powershell
# You might need to allow script execution first
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Start the application
.\start.ps1

# Stop the application
.\stop.ps1
```

## Loading an LLM Model into Ollama

Before running the application, you need to load an LLM model into the Ollama container. This can be done using the docker exec command after the services are started:

```bash
# First start the services
docker-compose up -d

# Wait a moment for the ollama service to be ready
sleep 10

# Load a lightweight LLM model (e.g., phi3 or llama3)
docker exec ollama_service ollama pull phi3:latest

# Alternative: Load llama3 8b model (larger but more capable)
# docker exec ollama_service ollama pull llama3:8b
```

Note: The model phi3:latest is recommended for local development as it's lightweight while still providing good performance. For production use, llama3:8b offers better capabilities but requires more system resources.

## What the Startup Scripts Do

1. Check if Docker and Docker Compose are installed
2. Verify that the Docker daemon is running
3. Build and start all services in detached mode using `docker-compose up -d --build`
4. Display the status of the services
5. Show the URLs where you can access the services

## What the Stop Scripts Do

1. Check if Docker and Docker Compose are installed
2. Verify that the Docker daemon is running
3. Stop all services using `docker-compose down`
4. Perform cleanup

## Services Started

- **AI Service**: http://localhost:8000
- **Backend API**: http://localhost:3001

## Health Check Endpoints

- **Backend Health**: http://localhost:3001/health
- **AI Health**: http://localhost:8000/health