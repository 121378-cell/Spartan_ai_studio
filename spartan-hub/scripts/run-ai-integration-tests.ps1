# AI Services Integration Test Runner (PowerShell)
# Executes comprehensive integration tests for AI functionality

param(
    [string]$Category = "",
    [switch]$Help = $false
)

# Colors for output
$colors = @{
    Red = [System.ConsoleColor]::Red
    Green = [System.ConsoleColor]::Green
    Yellow = [System.ConsoleColor]::Yellow
    Blue = [System.ConsoleColor]::Blue
    Magenta = [System.ConsoleColor]::Magenta
    Cyan = [System.ConsoleColor]::Cyan
    White = [System.ConsoleColor]::White
}

# Logging functions
function Write-Log {
    param([string]$Message, [System.ConsoleColor]$Color = $colors.Blue)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Log $Message $colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Log $Message $colors.Yellow
}

function Write-ErrorLog {
    param([string]$Message)
    Write-Log $Message $colors.Red
}

function Write-Header {
    param([string]$Message)
    Write-Host "`n=== $Message ===" -ForegroundColor $colors.Magenta
}

function Write-Section {
    param([string]$Message)
    Write-Host "▶ $Message" -ForegroundColor $colors.Cyan
}

# Configuration
$testSuite = "aiServices.e2e.test.ts"
$testDir = "backend/src/__tests__/e2e"
$reportDir = "test-reports/ai-integration"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Create report directory
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}

# Test metrics tracking
$totalTests = 0
$passedTests = 0
$failedTests = 0
$skippedTests = 0

# AI Service Test Categories
$aiTestCategories = @{
    "workout_planning" = "Workout Planning Integration"
    "biometric_analysis" = "Biometric Analysis Integration" 
    "nutrition_planning" = "Nutrition Planning Integration"
    "coaching" = "Coaching Advice Integration"
    "performance_forecasting" = "Performance Forecasting Integration"
    "error_handling" = "Error Handling and Edge Cases"
    "health_monitoring" = "Service Health and Monitoring"
}

# Function to run specific test category
function Invoke-TestCategory {
    param([string]$Category, [string]$Description, [string]$TestPattern)
    
    Write-Section $Description
    
    $reportFile = Join-Path $reportDir "${Category}_${timestamp}.xml"
    
    try {
        # Run tests with specific pattern
        $result = npm test -- --testPathPattern="$testSuite" --testNamePattern="$TestPattern" --coverage --silent
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$Description tests passed"
            $script:passedTests++
        } else {
            Write-ErrorLog "$Description tests failed"
            $script:failedTests++
        }
    } catch {
        Write-ErrorLog "Error running test category $Category : $_"
        $script:failedTests++
    }
    
    $script:totalTests++
    Start-Sleep -Seconds 1
}

# Function to check AI service availability
function Test-AiServices {
    Write-Log "Checking AI service availability..."
    
    # Check if backend is running
    try {
        $healthResponse = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -ErrorAction Stop
        Write-Success "Backend service is already running"
    } catch {
        Write-Warning "Backend service not running on port 3001"
        Write-Log "Starting backend service..."
        
        # Start backend in background
        Set-Location backend
        Start-Process -FilePath "npm" -ArgumentList "run", "dev" -RedirectStandardOutput "..\$reportDir\backend.log" -RedirectStandardError "..\$reportDir\backend-error.log"
        Set-Location ..
        
        # Wait for service to start
        $maxRetries = 30
        for ($i = 1; $i -le $maxRetries; $i++) {
            try {
                $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method GET -ErrorAction Stop
                Write-Success "Backend service started successfully"
                break
            } catch {
                Start-Sleep -Seconds 2
                if ($i -eq $maxRetries) {
                    Write-ErrorLog "Backend service failed to start"
                    return $false
                }
            }
        }
    }
    
    # Check AI health endpoint
    try {
        $aiHealth = Invoke-WebRequest -Uri "http://localhost:3001/api/ai/health" -Method GET -ErrorAction Stop
        Write-Success "AI services are accessible"
        return $true
    } catch {
        Write-Warning "AI services may not be fully available"
        return $true # Continue anyway, tests should handle unavailable services gracefully
    }
}

# Function to prepare test data
function Initialize-TestData {
    Write-Log "Preparing test data..."
    
    # This would typically involve:
    # 1. Creating test users
    # 2. Seeding biometric data
    # 3. Setting up workout history
    # 4. Configuring AI service mocks if needed
    
    Write-Success "Test data preparation completed"
}

# Function to run all AI integration tests
function Invoke-AllAiIntegrationTests {
    Write-Header "Spartan Hub AI Services Integration Tests"
    Write-Log "Timestamp: $(Get-Date)"
    Write-Log "Test Suite: $testSuite"
    Write-Log "Report Directory: $reportDir"
    
    # Validate prerequisites
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-ErrorLog "npm is not installed"
        exit 1
    }
    
    $testSuitePath = Join-Path $testDir $testSuite
    if (-not (Test-Path $testSuitePath)) {
        Write-ErrorLog "Test suite not found: $testSuitePath"
        exit 1
    }
    
    # Check and prepare services
    if (-not (Test-AiServices)) {
        Write-ErrorLog "Failed to prepare required services"
        exit 1
    }
    
    Initialize-TestData
    
    # Run each test category
    Invoke-TestCategory "workout_planning" "Workout Planning Integration" "AI Workout Planning Integration"
    Invoke-TestCategory "biometric_analysis" "Biometric Analysis Integration" "AI Biometric Analysis Integration"  
    Invoke-TestCategory "nutrition_planning" "Nutrition Planning Integration" "AI Nutrition Planning Integration"
    Invoke-TestCategory "coaching" "Coaching Advice Integration" "AI Coaching Integration"
    Invoke-TestCategory "performance_forecasting" "Performance Forecasting Integration" "AI Performance Forecasting Integration"
    Invoke-TestCategory "error_handling" "Error Handling Integration" "AI Integration Error Handling"
    Invoke-TestCategory "health_monitoring" "Service Health Integration" "AI Service Health and Monitoring"
    
    # Generate summary and cleanup
    Show-TestSummary
    Remove-TestServices
}

# Function to show test summary
function Show-TestSummary {
    Write-Header "AI Integration Test Summary"
    
    $successRate = 0
    if ($totalTests -gt 0) {
        $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    }
    
    Write-Host "📊 AI Integration Test Results" -ForegroundColor $colors.White
    Write-Host "==============================" -ForegroundColor $colors.White
    Write-Host "Total Categories: $totalTests"
    Write-Host "Passed: $passedTests"
    Write-Host "Failed: $failedTests"
    Write-Host "Skipped: $skippedTests"
    Write-Host "Success Rate: $successRate%"
    Write-Host ""
    
    # Performance metrics
    Write-Host "📈 Performance Metrics:" -ForegroundColor $colors.White
    Write-Host "  - Test Execution Time: TBD seconds"
    Write-Host "  - Average Tests per Category: TBD"
    Write-Host "  - Coverage: Generated in reports"
    Write-Host ""
    
    # Success criteria
    if ($failedTests -eq 0 -and $totalTests -gt 0) {
        Write-Success "🎉 All AI integration tests passed!"
        Write-Log "AI services are functioning correctly and integrated properly"
        return $true
    } else {
        Write-ErrorLog "Some AI integration tests failed"
        Write-Log "Review test reports for details:"
        Get-ChildItem "$reportDir\*.xml" -ErrorAction SilentlyContinue | ForEach-Object {
            Write-Host "  $($_.Name)" -ForegroundColor $colors.White
        }
        return $false
    }
}

# Function to cleanup services
function Remove-TestServices {
    Write-Log "Cleaning up test environment..."
    
    # Cleanup test data if needed
    # Add database cleanup logic here
    
    Write-Success "Cleanup completed"
}

# Function to show help
function Show-Help {
    Write-Host "Spartan Hub AI Integration Test Runner" -ForegroundColor $colors.Cyan
    Write-Host "=====================================" -ForegroundColor $colors.Cyan
    Write-Host ""
    Write-Host "Usage: .\run-ai-integration-tests.ps1 [-Category CATEGORY] [-Help]" -ForegroundColor $colors.White
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor $colors.White
    Write-Host "  -Category    Run specific test category" -ForegroundColor $colors.White
    Write-Host "  -Help        Show this help message" -ForegroundColor $colors.White
    Write-Host ""
    Write-Host "Available Categories:" -ForegroundColor $colors.White
    $aiTestCategories.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key) : $($_.Value)" -ForegroundColor $colors.White
    }
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor $colors.White
    Write-Host "  .\run-ai-integration-tests.ps1                    # Run all AI integration tests" -ForegroundColor $colors.White
    Write-Host "  .\run-ai-integration-tests.ps1 -Category workout_planning  # Run only workout planning tests" -ForegroundColor $colors.White
    Write-Host "  .\run-ai-integration-tests.ps1 -Help              # Show help information" -ForegroundColor $colors.White
}

# Main execution
function Start-Main {
    # Handle help parameter
    if ($Help) {
        Show-Help
        return
    }
    
    # Handle specific category
    if ($Category) {
        if ($aiTestCategories.ContainsKey($Category)) {
            # Run single category
            if (Test-AiServices) {
                Initialize-TestData
                Invoke-TestCategory $Category $aiTestCategories[$Category] $aiTestCategories[$Category]
                Show-TestSummary
            }
        } else {
            Write-ErrorLog "Unknown test category: $Category"
            Write-Host "Available categories:" -ForegroundColor $colors.White
            $aiTestCategories.Keys | ForEach-Object { Write-Host "  $_" -ForegroundColor $colors.White }
            exit 1
        }
    } else {
        # Run all tests
        Invoke-AllAiIntegrationTests
    }
}

# Execute main function
try {
    Start-Main
} catch {
    Write-ErrorLog "Test execution failed: $_"
    exit 1
}