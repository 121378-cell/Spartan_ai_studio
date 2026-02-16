# Run All Tests Script

Write-Host "=== Running All Tests ===" -ForegroundColor Green
Write-Host ""

# Change to backend directory
Set-Location -Path "c:\spartan hub\backend"

# Build the project first
Write-Host "Building project..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Run database test
Write-Host "Running Database Test..." -ForegroundColor Yellow
try {
    node dist/testDatabase.js
    Write-Host "✓ Database Test completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Database Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Run AI service test
Write-Host "Running AI Service Test..." -ForegroundColor Yellow
try {
    node dist/testAiService.js
    Write-Host "✓ AI Service Test completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ AI Service Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Run simple test
Write-Host "Running Simple Test..." -ForegroundColor Yellow
try {
    node dist/test.js
    Write-Host "✓ Simple Test completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Simple Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== All Tests Completed ===" -ForegroundColor Green