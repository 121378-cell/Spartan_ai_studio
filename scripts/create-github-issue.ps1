# Spartan Hub 2.0 - Create GitHub Issue from Bug
# Usage: .\scripts\create-github-issue.ps1 <bug-file.json>

param(
    [Parameter(Mandatory=$true)]
    [string]$bugFile
)

# Check if file exists
if (-not (Test-Path $bugFile)) {
    Write-Host "❌ Bug file not found: $bugFile" -ForegroundColor Red
    exit 1
}

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI (gh) not found. Install from: https://cli.github.com/" -ForegroundColor Red
    Write-Host "`nAlternatively, create issue manually at: https://github.com/121378-cell/Spartan_ai_studio/issues" -ForegroundColor Yellow
    exit 1
}

# Load bug report
$bug = Get-Content $bugFile | ConvertFrom-Json

# Create issue body
$issueBody = @"
## 🐛 Bug Report

**Bug ID:** $($bug.id)
**Timestamp:** $($bug.timestamp)
**Severity:** $($bug.severity)
**Priority:** $($bug.priority)
**Affected Feature:** $($bug.affected_feature)

---

### Description
$($bug.description)

---

### Steps to Reproduce
$(if($bug.steps_to_reproduce) { $bug.steps_to_reproduce | ForEach-Object { "1. $_" } } else { "Not provided" })

---

### Expected Behavior
$($bug.expected_behavior)

---

### Actual Behavior
$($bug.actual_behavior)

---

### Environment
- **Environment:** $($bug.environment)
- **Users Affected:** $($bug.users_affected)
- **Reported By:** $($bug.reported_by)

---

### Logs
Location: $($bug.logs_location)

``````
# View relevant logs
Get-Content .\logs\production.log -Tail 100
``````

---

### Additional Context
$(if($bug.additional_context) { $bug.additional_context } else { "No additional context provided" })

---

### Action Items
- [ ] Reproduce bug
- [ ] Identify root cause
- [ ] Implement fix
- [ ] Test fix
- [ ] Deploy fix
- [ ] Verify fix in production

---

*Automatically generated from Spartan Hub Bug Tracker*
"@

# Determine labels
$labels = @("bug")
if ($bug.severity -eq "critical") { $labels += "severity/critical" }
elseif ($bug.severity -eq "high") { $labels += "severity/high" }
elseif ($bug.severity -eq "medium") { $labels += "severity/medium" }
else { $labels += "severity/low" }

if ($bug.priority -eq "P0") { $labels += "priority/P0" }
elseif ($bug.priority -eq "P1") { $labels += "priority/P1" }

# Create issue
Write-Host "`n📤 Creating GitHub Issue..." -ForegroundColor Cyan

$issueTitle = "🐛 BUG: $($bug.description)"

try {
    $output = gh issue create `
        --title "$issueTitle" `
        --body "$issueBody" `
        --label ($labels -join ",") `
        --repo "121378-cell/Spartan_ai_studio" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ GITHUB ISSUE CREATED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "   URL: $output" -ForegroundColor Green
    } else {
        throw $output
    }
} catch {
    Write-Host "`n❌ Error creating GitHub issue: $_" -ForegroundColor Red
    Write-Host "`n📝 Manual creation:" -ForegroundColor Yellow
    Write-Host "   1. Go to: https://github.com/121378-cell/Spartan_ai_studio/issues/new" -ForegroundColor Gray
    Write-Host "   2. Copy issue body from clipboard" -ForegroundColor Gray
    Write-Host "   3. Paste and submit" -ForegroundColor Gray
    
    # Copy to clipboard
    $issueBody | Set-Clipboard
    Write-Host "`n📋 Issue body copied to clipboard" -ForegroundColor Cyan
}

Write-Host "`n═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
