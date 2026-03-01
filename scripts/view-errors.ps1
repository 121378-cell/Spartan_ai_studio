# Spartan Hub 2.0 - View Errors Script
# Usage: .\scripts\view-errors.ps1 [-Last <number>] [-Group]

param(
    [int]$Last = 50,
    [switch]$Group,
    [ValidateSet("today", "week", "all")]
    [string]$Period = "today"
)

$logFile = ".\logs\production.log"

if (-not (Test-Path $logFile)) {
    Write-Host "❌ Log file not found: $logFile" -ForegroundColor Red
    exit 1
}

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 SPARTAN HUB ERROR VIEWER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Filter by period
if ($Period -eq "today") {
    $dateFilter = Get-Date -Format "yyyy-MM-dd"
    Write-Host "📅 Period: TODAY ($dateFilter)" -ForegroundColor Yellow
} elseif ($Period -eq "week") {
    $dateFilter = (Get-Date).AddDays(-7).ToString("yyyy-MM-dd")
    Write-Host "📅 Period: LAST 7 DAYS (since $dateFilter)" -ForegroundColor Yellow
} else {
    $dateFilter = $null
    Write-Host "📅 Period: ALL" -ForegroundColor Yellow
}

# Get errors
$errors = Get-Content $logFile | Select-String "ERROR"

if ($dateFilter) {
    $errors = $errors | Where-Object { $_ -match $dateFilter }
}

if ($errors.Count -eq 0) {
    Write-Host "`n✅ NO ERRORS FOUND" -ForegroundColor Green
    exit 0
}

Write-Host "`n📊 Total Errors Found: $($errors.Count)`n" -ForegroundColor Yellow

if ($Group) {
    # Group errors by type
    Write-Host "📊 ERRORS GROUPED BY TYPE:`n" -ForegroundColor Cyan
    
    $groupedErrors = $errors | 
        ForEach-Object { 
            if ($_ -match "\[ERROR\].*?\[(.*?)\]") {
                $matches[1]
            } else {
                "Unknown"
            }
        } |
        Group-Object | 
        Sort-Object Count -Descending

    $groupedErrors | Format-Table -AutoSize Count, Name
    
    Write-Host "`n📋 TOP 5 MOST COMMON ERRORS:`n" -ForegroundColor Cyan
    $groupedErrors | Select-Object -First 5 | ForEach-Object {
        Write-Host "   $($_.Count)x - $($_.Name)" -ForegroundColor $(if($_.Count -gt 10){"Red"}else{"Yellow"})
    }
} else {
    # Show last N errors
    Write-Host "📋 LAST $Last ERRORS:`n" -ForegroundColor Cyan
    
    $errors | Select-Object -Last $Last | ForEach-Object {
        $color = "Gray"
        if ($_ -match "CRITICAL") { $color = "Red" }
        elseif ($_ -match "WARN") { $color = "Yellow" }
        
        Write-Host $_ -ForegroundColor $color
    }
}

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "💡 COMMANDS:" -ForegroundColor Cyan
Write-Host "   - View grouped: .\scripts\view-errors.ps1 -Group" -ForegroundColor Gray
Write-Host "   - View last 100: .\scripts\view-errors.ps1 -Last 100" -ForegroundColor Gray
Write-Host "   - View all week: .\scripts\view-errors.ps1 -Period week" -ForegroundColor Gray
Write-Host "   - View raw logs: Get-Content .\logs\production.log -Tail 100" -ForegroundColor Gray
Write-Host "═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
