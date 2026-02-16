# Data Persistence Test Script

$BASE_URL = "http://localhost:3001"
$TEST_USER_ID = ""
$TEST_ROUTINE_ID = ""

Write-Host "=== Data Persistence Test ===" -ForegroundColor Green
Write-Host ""

# Function to check if services are running
function Check-Services {
    Write-Host "Checking if services are running..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$BASE_URL/health" -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Backend service is running" -ForegroundColor Green
            return $true
        } else {
            Write-Host "✗ Backend service returned status $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "✗ Backend service is not running: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to create test user
function Create-TestUser {
    Write-Host "Creating test user..." -ForegroundColor Yellow
    try {
        $userData = @{
            name = "Persistence Test User"
            email = "persistence@test.com"
            quest = "Test data persistence"
            stats = @{
                totalWorkouts = 0
                currentStreak = 0
                joinDate = "2023-01-01T00:00:00.000Z"
            }
            onboardingCompleted = $true
            keystoneHabits = @()
            masterRegulationSettings = @{
                targetBedtime = "22:00"
            }
            nutritionSettings = @{
                priority = "performance"
            }
            isInAutonomyPhase = $false
        } | ConvertTo-Json -Depth 10

        $response = Invoke-WebRequest -Uri "$BASE_URL/test/create-user" -Method POST -ContentType "application/json" -Body $userData -UseBasicParsing
        $responseObject = $response.Content | ConvertFrom-Json
        $script:TEST_USER_ID = $responseObject.id
        Write-Host "Created user with ID: $TEST_USER_ID" -ForegroundColor Cyan
        return $true
    } catch {
        Write-Host "✗ Failed to create test user: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to create test routine
function Create-TestRoutine {
    Write-Host "Creating test routine..." -ForegroundColor Yellow
    try {
        $routineData = @{
            userId = $TEST_USER_ID
            name = "Persistence Test Routine"
            focus = "strength"
            duration = 60
            blocks = @(
                @{
                    name = "Warm-up"
                    exercises = @(
                        @{
                            name = "Jumping Jacks"
                            sets = 1
                            reps = "10"
                        }
                    )
                }
            )
        } | ConvertTo-Json -Depth 10

        $response = Invoke-WebRequest -Uri "$BASE_URL/test/create-routine" -Method POST -ContentType "application/json" -Body $routineData -UseBasicParsing
        $responseObject = $response.Content | ConvertFrom-Json
        $script:TEST_ROUTINE_ID = $responseObject.id
        Write-Host "Created routine with ID: $TEST_ROUTINE_ID" -ForegroundColor Cyan
        return $true
    } catch {
        Write-Host "✗ Failed to create test routine: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to record workout
function Record-Workout {
    Write-Host "Recording workout session..." -ForegroundColor Yellow
    try {
        $workoutData = @{
            userId = $TEST_USER_ID
            routineId = $TEST_ROUTINE_ID
            date = "2023-06-01"
            durationMinutes = 45
            totalWeightLifted = 5000
            focus = "strength"
        } | ConvertTo-Json -Depth 10

        $response = Invoke-WebRequest -Uri "$BASE_URL/test/record-workout" -Method POST -ContentType "application/json" -Body $workoutData -UseBasicParsing
        Write-Host "Workout recorded" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Failed to record workout: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to verify data
function Verify-Data {
    Write-Host "Verifying data..." -ForegroundColor Yellow
    
    $allVerified = $true
    
    # Check user
    try {
        $userResponse = Invoke-WebRequest -Uri "$BASE_URL/test/user/$TEST_USER_ID" -UseBasicParsing
        $userObject = $userResponse.Content | ConvertFrom-Json
        if ($userObject.name -eq "Persistence Test User") {
            Write-Host "✓ User data verified" -ForegroundColor Green
        } else {
            Write-Host "✗ User data verification failed" -ForegroundColor Red
            $allVerified = $false
        }
    } catch {
        Write-Host "✗ Failed to verify user data: $($_.Exception.Message)" -ForegroundColor Red
        $allVerified = $false
    }
    
    # Check routine
    try {
        $routineResponse = Invoke-WebRequest -Uri "$BASE_URL/test/routine/$TEST_ROUTINE_ID" -UseBasicParsing
        $routineObject = $routineResponse.Content | ConvertFrom-Json
        if ($routineObject.name -eq "Persistence Test Routine") {
            Write-Host "✓ Routine data verified" -ForegroundColor Green
        } else {
            Write-Host "✗ Routine data verification failed" -ForegroundColor Red
            $allVerified = $false
        }
    } catch {
        Write-Host "✗ Failed to verify routine data: $($_.Exception.Message)" -ForegroundColor Red
        $allVerified = $false
    }
    
    # Check workout
    try {
        $workoutsResponse = Invoke-WebRequest -Uri "$BASE_URL/test/workouts/$TEST_USER_ID" -UseBasicParsing
        $workoutsObject = $workoutsResponse.Content | ConvertFrom-Json
        $workoutCount = @($workoutsObject).Count
        if ($workoutCount -ge 1) {
            Write-Host "✓ Workout history verified ($workoutCount workouts)" -ForegroundColor Green
        } else {
            Write-Host "✗ Workout history verification failed" -ForegroundColor Red
            $allVerified = $false
        }
    } catch {
        Write-Host "✗ Failed to verify workout history: $($_.Exception.Message)" -ForegroundColor Red
        $allVerified = $false
    }
    
    return $allVerified
}

# Function to restart services
function Restart-Services {
    Write-Host "Restarting services..." -ForegroundColor Yellow
    try {
        docker compose down
        Start-Sleep -Seconds 5
        docker compose up -d
        Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10  # Wait for services to be ready
        Write-Host "Services restarted" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Failed to restart services: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Main test execution
function Main {
    if (-not (Check-Services)) {
        Write-Host "Cannot proceed with tests. Services are not running." -ForegroundColor Red
        return
    }
    
    if (-not (Create-TestUser)) {
        Write-Host "Cannot proceed with tests. Failed to create test user." -ForegroundColor Red
        return
    }
    
    if (-not (Create-TestRoutine)) {
        Write-Host "Cannot proceed with tests. Failed to create test routine." -ForegroundColor Red
        return
    }
    
    if (-not (Record-Workout)) {
        Write-Host "Warning: Failed to record workout, but continuing with tests." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=== Before Restart Verification ===" -ForegroundColor Green
    $beforeVerification = Verify-Data
    
    if (-not (Restart-Services)) {
        Write-Host "Failed to restart services. Cannot continue with after-restart verification." -ForegroundColor Red
        return
    }
    
    # Wait a bit more to ensure services are fully ready
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "=== After Restart Verification ===" -ForegroundColor Green
    $afterVerification = Verify-Data
    
    Write-Host ""
    Write-Host "=== Test Summary ===" -ForegroundColor Green
    Write-Host "Before Restart: $(if ($beforeVerification) { 'PASSED' } else { 'FAILED' })" -ForegroundColor $(if ($beforeVerification) { 'Green' } else { 'Red' })
    Write-Host "After Restart: $(if ($afterVerification) { 'PASSED' } else { 'FAILED' })" -ForegroundColor $(if ($afterVerification) { 'Green' } else { 'Red' })
    
    if ($beforeVerification -and $afterVerification) {
        Write-Host "✓ Data persistence test PASSED" -ForegroundColor Green
    } else {
        Write-Host "✗ Data persistence test FAILED" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "=== Test Complete ===" -ForegroundColor Green
}

# Run the test
Main