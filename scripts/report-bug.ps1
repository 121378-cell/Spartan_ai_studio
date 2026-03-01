# Spartan Hub 2.0 - Bug Reporter Script
# Usage: .\scripts\report-bug.ps1 "Description del bug"

param(
    [Parameter(Mandatory=$true)]
    [string]$description,
    
    [ValidateSet("low", "medium", "high", "critical")]
    [string]$severity = "medium",
    
    [string]$affectedFeature = "",
    [string]$steps = "",
    [string]$expected = "",
    [string]$actual = ""
)

# Create bugs directory if not exists
if (-not (Test-Path ".\bugs")) {
    New-Item -ItemType Directory -Path ".\bugs" | Out-Null
    Write-Host "📁 Created bugs directory" -ForegroundColor Green
}

# Generate bug ID
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$bugId = "BUG-$timestamp-$(Get-Random -Minimum 1000 -Maximum 9999)"

# Create bug report
$bugReport = @{
    id = $bugId
    timestamp = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    description = $description
    severity = $severity
    affected_feature = $affectedFeature
    steps_to_reproduce = $steps -split "`n"
    expected_behavior = $expected
    actual_behavior = $actual
    environment = "home-production"
    users_affected = 2
    status = "open"
    priority = $(if($severity -eq "critical"){"P0"}elseif($severity -eq "high"){"P1"}elseif($severity -eq "medium"){"P2"}else{"P3"})
    reported_by = $env:USERNAME
    logs_location = ".\logs\production.log"
}

# Save to file
$bugFile = ".\bugs\$bugId.json"
$bugReport | ConvertTo-Json -Depth 10 | Out-File -FilePath $bugFile -Encoding utf8

# Display confirmation
Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ BUG REPORTADO EXITAMENTE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n📋 BUG DETAILS:"
Write-Host "   ID: $bugId"
Write-Host "   Description: $description"
Write-Host "   Severity: $severity"
Write-Host "   Priority: $($bugReport.priority)"
Write-Host "   Status: open"
Write-Host "`n📁 SAVED TO: $bugFile"
Write-Host "`n📝 NEXT STEPS:"
Write-Host "   1. Review bug file: notepad $bugFile"
Write-Host "   2. Check logs: Get-Content .\logs\production.log -Tail 100"
Write-Host "   3. Create GitHub issue: .\scripts\create-github-issue.ps1 $bugFile"
Write-Host "`n═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
