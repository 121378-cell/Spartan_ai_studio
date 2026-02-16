# Ollama AI Connection Test Script

$BASE_URL = "http://localhost:3001"
$TIMEOUT = 500

Write-Host "=== Ollama AI Connection Test ===" -ForegroundColor Green
Write-Host ""

# Function to create test user data
function Create-TestUser {
    return @{
        name = "Test User"
        email = "test@example.com"
        quest = "Test AI connection"
        stats = @{
            totalWorkouts = 10
            currentStreak = 5
            joinDate = "2023-01-01T00:00:00.000Z"
        }
        onboardingCompleted = $true
        keystoneHabits = @(
            @{
                id = "habit1"
                name = "Morning Workout"
                anchor = "After breakfast"
                currentStreak = 5
                longestStreak = 7
            }
        )
        masterRegulationSettings = @{
            targetBedtime = "22:00"
        }
        nutritionSettings = @{
            priority = "performance"
        }
        isInAutonomyPhase = $false
        weightKg = 70
    } | ConvertTo-Json -Depth 10
}

# Test health endpoints
Write-Host "1. Testing health endpoints..." -ForegroundColor Yellow
Write-Host "Backend health:"
try {
    $backendHealth = Invoke-WebRequest -Uri "$BASE_URL/health" -UseBasicParsing
    Write-Host "Status: $($backendHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "AI health:"
try {
    $aiHealth = Invoke-WebRequest -Uri "$BASE_URL/ai/health" -UseBasicParsing
    Write-Host "Status: $($aiHealth.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test latency with Ollama running
Write-Host "2. Testing AI service latency..." -ForegroundColor Yellow
$startTime = Get-Date
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/ai/alert" -Method POST -ContentType "application/json" -Body (Create-TestUser) -UseBasicParsing
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "Response time: $($responseTime)ms" -ForegroundColor Cyan
    
    if ($responseTime -lt $TIMEOUT) {
        Write-Host "✓ Latency requirement met (< ${TIMEOUT}ms)" -ForegroundColor Green
    } else {
        Write-Host "⚠ Latency requirement not met (>= ${TIMEOUT}ms)" -ForegroundColor Yellow
    }
    
    Write-Host "Response:"
    $responseObject = $response.Content | ConvertFrom-Json
    $response.Content | ConvertFrom-Json | Format-List
    
    Write-Host ""
    
    # Check if fallback was used
    if ($responseObject.data.fallback_used -eq $true) {
        Write-Host "Info: Fallback was used in this response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "To test fallback mechanism:" -ForegroundColor Yellow
Write-Host "1. Stop Ollama service: docker stop ollama_service" -ForegroundColor Yellow
Write-Host "2. Run this script again" -ForegroundColor Yellow
Write-Host "3. Restart services: docker compose restart" -ForegroundColor Yellow