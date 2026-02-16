# E2E Test Suite Runner for Spartan Hub (PowerShell)
# Executes comprehensive end-to-end tests with detailed reporting

param(
    [string]$Suite = "",
    [switch]$Help = $false
)

# Colors for output
$colors = @{
    Red = [System.ConsoleColor]::Red
    Green = [System.ConsoleColor]::Green
    Yellow = [System.ConsoleColor]::Yellow
    Blue = [System.ConsoleColor]::Blue
    Magenta = [System.ConsoleColor]::Magenta
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

# Test configuration
$testDir = "backend/src/__tests__/e2e"
$reportDir = "test-reports/e2e"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# Test suite definitions
$testSuites = @{
    "auth" = "Authentication Flow Tests"
    "workout" = "Workout Management Tests"
    "mlForecasting" = "ML Forecasting Tests"
}

# Initialize counters
$totalTests = 0
$passedTests = 0
$failedTests = 0
$skippedTests = 0

# Function to run individual test suite
function Invoke-TestSuite {
    param([string]$SuiteName, [string]$SuiteDescription)
    
    Write-Header "Running $SuiteDescription"
    
    $testFile = Join-Path $testDir "$SuiteName.e2e.test.ts"
    
    if (-not (Test-Path $testFile)) {
        Write-Warning "Test file not found: $testFile"
        $script:skippedTests++
        return
    }
    
    Write-Log "Executing test suite: $SuiteName"
    
    try {
        # Run the test suite
        $result = npm test -- --testPathPattern="$SuiteName" --coverage --watchAll=false --silent
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "$SuiteDescription completed successfully"
            $script:passedTests++
        } else {
            Write-ErrorLog "$SuiteDescription failed"
            $script:failedTests++
        }
    } catch {
        Write-ErrorLog "Error running test suite $SuiteName : $_"
        $script:failedTests++
    }
    
    $script:totalTests++
    
    # Add delay between test suites
    Start-Sleep -Seconds 2
}

# Function to run all E2E tests
function Invoke-AllE2ETests {
    Write-Header "Starting Spartan Hub E2E Test Suite"
    Write-Log "Timestamp: $(Get-Date)"
    Write-Log "Test Directory: $testDir"
    Write-Log "Report Directory: $reportDir"
    
    # Create report directory
    if (-not (Test-Path $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    
    # Check prerequisites
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-ErrorLog "npm is not installed"
        exit 1
    }
    
    if (-not (Test-Path $testDir)) {
        Write-ErrorLog "Test directory not found: $testDir"
        exit 1
    }
    
    # Ensure backend is running
    Write-Log "Ensuring backend services are running..."
    # Add backend startup logic here if needed
    
    # Run each test suite
    foreach ($suite in $testSuites.Keys) {
        Invoke-TestSuite $suite $testSuites[$suite]
        Write-Host ""
    }
    
    # Generate summary report
    Show-SummaryReport
}

# Function to show summary report
function Show-SummaryReport {
    Write-Header "Test Execution Summary"
    
    $successRate = 0
    if ($totalTests -gt 0) {
        $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    }
    
    Write-Host "📊 Test Results Summary" -ForegroundColor $colors.White
    Write-Host "======================" -ForegroundColor $colors.White
    Write-Host "Total Suites: $totalTests"
    Write-Host "Passed: $passedTests"
    Write-Host "Failed: $failedTests"
    Write-Host "Skipped: $skippedTests"
    Write-Host "Success Rate: $successRate%"
    Write-Host ""
    
    # Success criteria check
    if ($failedTests -eq 0 -and $totalTests -gt 0) {
        Write-Success "All E2E tests passed! 🎉"
        return $true
    } else {
        Write-ErrorLog "Some E2E tests failed. Please review the reports."
        return $false
    }
}

# Function to show help
function Show-Help {
    Write-Host "Spartan Hub E2E Test Runner" -ForegroundColor $colors.Cyan
    Write-Host "===========================" -ForegroundColor $colors.Cyan
    Write-Host ""
    Write-Host "Usage: .\run-e2e-tests.ps1 [-Suite SUITE_NAME] [-Help]" -ForegroundColor $colors.White
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor $colors.White
    Write-Host "  -Suite    Run a specific test suite" -ForegroundColor $colors.White
    Write-Host "  -Help     Show this help message" -ForegroundColor $colors.White
    Write-Host ""
    Write-Host "Available test suites:" -ForegroundColor $colors.White
    $testSuites.GetEnumerator() | ForEach-Object {
        Write-Host "  $($_.Key) : $($_.Value)" -ForegroundColor $colors.White
    }
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor $colors.White
    Write-Host "  .\run-e2e-tests.ps1                    # Run all test suites" -ForegroundColor $colors.White
    Write-Host "  .\run-e2e-tests.ps1 -Suite auth        # Run only authentication tests" -ForegroundColor $colors.White
    Write-Host "  .\run-e2e-tests.ps1 -Help              # Show help information" -ForegroundColor $colors.White
}

# Main execution logic
function Start-Main {
    # Handle help parameter
    if ($Help) {
        Show-Help
        return
    }
    
    # Handle specific suite
    if ($Suite) {
        if ($testSuites.ContainsKey($Suite)) {
            Invoke-TestSuite $Suite $testSuites[$Suite]
            Show-SummaryReport
        } else {
            Write-ErrorLog "Unknown test suite: $Suite"
            Write-Host "Available suites:" -ForegroundColor $colors.White
            $testSuites.Keys | ForEach-Object { Write-Host "  $_" -ForegroundColor $colors.White }
            exit 1
        }
    } else {
        # Run all tests
        Invoke-AllE2ETests
    }
}

# Execute main function
try {
    Start-Main
} catch {
    Write-ErrorLog "Test execution failed: $_"
    exit 1
}