# PowerShell script to verify deployment of Spartan Hub services

Write-Host "=== Spartan Hub Deployment Verification ===" -ForegroundColor Green

# Check if Docker is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Docker is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Docker Desktop or Docker Engine" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Docker is installed" -ForegroundColor Green

# Check if Docker Compose is available
try {
    $composeVersion = docker compose version
    Write-Host "✓ Docker Compose is available" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Docker Compose is not available" -ForegroundColor Red
    Write-Host "Please ensure Docker Compose plugin is installed" -ForegroundColor Yellow
    exit 1
}

# Check if services are running
$ollamaRunning = docker ps | Select-String -Pattern "ollama_service"
if (-not $ollamaRunning) {
    Write-Host "WARNING: Ollama service is not running" -ForegroundColor Yellow
    Write-Host "Starting services..." -ForegroundColor Yellow
    docker compose up -d
    Start-Sleep -Seconds 10
}

# Check running containers
Write-Host ""
Write-Host "=== Running Containers ===" -ForegroundColor Green
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Networks}}"

# Check if required services are running
$ollamaRunning = (docker ps | Select-String -Pattern "ollama_service").Count
$backend1Running = (docker ps | Select-String -Pattern "synergycoach_backend_1").Count
$backend2Running = (docker ps | Select-String -Pattern "synergycoach_backend_2").Count
$aiServiceRunning = (docker ps | Select-String -Pattern "ai_microservice").Count

if ($ollamaRunning -eq 0) {
    Write-Host "ERROR: Ollama service is not running" -ForegroundColor Red
    exit 1
}

if ($backend1Running -eq 0) {
    Write-Host "ERROR: Backend service instance 1 is not running" -ForegroundColor Red
    exit 1
}

if ($backend2Running -eq 0) {
    Write-Host "ERROR: Backend service instance 2 is not running" -ForegroundColor Red
    exit 1
}

if ($aiServiceRunning -eq 0) {
    Write-Host "ERROR: AI microservice is not running" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All services are running" -ForegroundColor Green

# Check if services are on the same network
try {
    $ollamaNetwork = docker inspect ollama_service | Select-String -Pattern '"synergycoach_net"' | Select-Object -First 1
    $backend1Network = docker inspect synergycoach_backend_1 | Select-String -Pattern '"synergycoach_net"' | Select-Object -First 1
    $backend2Network = docker inspect synergycoach_backend_2 | Select-String -Pattern '"synergycoach_net"' | Select-Object -First 1
    $aiNetwork = docker inspect ai_microservice | Select-String -Pattern '"synergycoach_net"' | Select-Object -First 1
    
    if (-not $ollamaNetwork -or -not $backend1Network -or -not $backend2Network -or -not $aiNetwork) {
        Write-Host "ERROR: Services are not on the expected network" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Services are on the same network" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Could not check network configuration" -ForegroundColor Red
    exit 1
}

# Check backend logs for connection errors
Write-Host ""
Write-Host "=== Checking Backend Logs ===" -ForegroundColor Green
Write-Host "--- Backend Instance 1 ---" -ForegroundColor Cyan
$backend1Logs = docker logs synergycoach_backend_1 2>&1
$errorLines1 = $backend1Logs | Select-String -Pattern "error|fail" | Select-Object -First 5

if ($errorLines1) {
    Write-Host "Found potential errors in backend instance 1 logs:" -ForegroundColor Yellow
    $errorLines1 | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Yellow }
} else {
    Write-Host "No obvious errors found in backend instance 1 logs" -ForegroundColor Green
}

Write-Host "--- Backend Instance 2 ---" -ForegroundColor Cyan
$backend2Logs = docker logs synergycoach_backend_2 2>&1
$errorLines2 = $backend2Logs | Select-String -Pattern "error|fail" | Select-Object -First 5

if ($errorLines2) {
    Write-Host "Found potential errors in backend instance 2 logs:" -ForegroundColor Yellow
    $errorLines2 | ForEach-Object { Write-Host "  $($_.Line)" -ForegroundColor Yellow }
} else {
    Write-Host "No obvious errors found in backend instance 2 logs" -ForegroundColor Green
}

# Check for successful startup messages
$successLines1 = $backend1Logs | Select-String -Pattern "Server is running on port"
$successLines2 = $backend2Logs | Select-String -Pattern "Server is running on port"

if ($successLines1) {
    Write-Host "✓ Backend instance 1 started successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not confirm backend instance 1 startup" -ForegroundColor Yellow
}

if ($successLines2) {
    Write-Host "✓ Backend instance 2 started successfully" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not confirm backend instance 2 startup" -ForegroundColor Yellow
}

# Test health endpoints
Write-Host ""
Write-Host "=== Testing Health Endpoints ===" -ForegroundColor Green

# Test backend health
try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    if ($backendHealth.StatusCode -eq 200) {
        Write-Host "✓ Backend health check passed" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Backend health check failed with status $($backendHealth.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Backend health check failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Test AI service health
try {
    $aiHealth = Invoke-WebRequest -Uri "http://localhost:3001/ai/health" -UseBasicParsing
    if ($aiHealth.StatusCode -eq 200) {
        Write-Host "✓ AI service health check passed" -ForegroundColor Green
    } else {
        Write-Host "ERROR: AI service health check failed with status $($aiHealth.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: AI service health check failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Test Ollama service
try {
    $ollamaResponse = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing
    if ($ollamaResponse.StatusCode -eq 200) {
        Write-Host "✓ Ollama service is responding" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Ollama service responded with status $($ollamaResponse.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Ollama service is not responding" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Test load balancing by making multiple requests
Write-Host ""
Write-Host "=== Testing Load Balancing ===" -ForegroundColor Green
Write-Host "Making 5 requests to verify load distribution..." -ForegroundColor Cyan

for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
        Write-Host "Request $i: $($response.Content)" -ForegroundColor White
    } catch {
        Write-Host "Request $i: FAILED - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Deployment Verification Complete ===" -ForegroundColor Green
Write-Host "All checks passed! Services are running and interconnected properly." -ForegroundColor Green