# Deployment Verification Guide

This document outlines the steps to verify the startup and stable interconnection of the services defined in the docker-compose.yml file.

## Prerequisites

1. Docker and Docker Compose must be installed on the system
2. The Ollama model must be loaded (phi3:latest or llama3:8b)

## Verification Steps

### 1. Build and Start Services

```bash
# Navigate to the project root directory
cd c:\spartan hub

# Build and start all services
npm run docker:up
# Or manually:
# docker compose -f scripts/docker/docker-compose.yml up --build
```

Expected output should show:
- Building of the synergycoach_backend services (two instances)
- Pulling/starting of the ollama service
- All services starting without errors

### 2. Verify Container Status

In a separate terminal, check that all containers are running:

```bash
docker ps
```

Expected output should show:
- `ollama_service` container running
- `synergycoach_backend_1` container running
- `synergycoach_backend_2` container running
- `ai_microservice` container running
- All containers on the same network (`synergycoach_net`)

### 3. Load Ollama Model

After the services are up, load a lightweight LLM model:

```bash
# Load phi3 model (lightweight)
docker exec ollama_service ollama pull phi3:latest

# Or load llama3 model (more capable but larger)
docker exec ollama_service ollama pull llama3:8b
```

### 4. Verify Backend Connection to Ollama

Check the backend logs to confirm it can connect to Ollama:

```bash
docker logs synergycoach_backend_1
docker logs synergycoach_backend_2
```

Expected output should show:
- "Server is running on port 3001"
- "instanceId: 1" or "instanceId: 2"
- No connection errors to http://ollama:11434
- Database initialized successfully

### 5. Test API Endpoints

Once services are running, test the health endpoints:

```bash
# Test backend health (load balanced)
curl http://localhost:3001/health

# Test AI service health
curl http://localhost:3001/ai/health
```

### 6. Verify Load Balancing

Make multiple requests and check the logs to verify load balancing:

```bash
# Make several requests
for i in {1..10}; do curl -s http://localhost:3001/health; done
```

Check the logs to see requests being distributed between instances:
```bash
docker logs synergycoach_backend_1 | grep "Health check endpoint accessed"
docker logs synergycoach_backend_2 | grep "Health check endpoint accessed"
```

## Expected Results

### Container Status
All containers should be in the "Up" state with healthy status indicators.

### Logs
- No error messages related to service startup
- Successful database initialization messages
- Confirmation that services are listening on their respective ports
- Instance IDs in backend logs showing load balancing is working

### API Responses
- Health check endpoints should return HTTP 200 with JSON responses
- AI service health check should return HTTP 200 with JSON responses

## Troubleshooting

### Common Issues

1. **Containers not starting**
   - Check Docker daemon is running
   - Verify sufficient system resources
   - Check for port conflicts

2. **Connection errors between services**
   - Verify all containers are on the same network
   - Check service dependencies in docker-compose.yml
   - Ensure health checks are passing

3. **Load balancing not working**
   - Verify NGINX configuration
   - Check that both backend instances are healthy
   - Review NGINX logs for errors

### Diagnostic Commands

```bash
# Check container status
docker ps

# Check container logs
docker logs <container_name>

# Check network configuration
docker network inspect synergycoach_net

# Verify service connectivity
docker exec <container_name> wget -qO- http://<service_name>:<port>/health
```

## Success Criteria

Deployment is successful when:
- All containers are running and healthy
- Backend instances can connect to Ollama service
- Load balancer is distributing requests between backend instances
- All health checks pass
- API endpoints respond correctly
- No error messages in logs related to service interconnection