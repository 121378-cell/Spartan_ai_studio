# Run this script as administrator to fix husky hook permissions
$hookPath = Join-Path $PSScriptRoot ".husky\pre-commit"
$preCommitPs1 = Join-Path $PSScriptRoot ".husky\pre-commit.ps1"

# Create pre-commit.ps1 if it doesn't exist
if (-not (Test-Path $preCommitPs1)) {
    @'
# Check for secrets in staged files
$patterns = @(
    'API[_-]KEY[="\']',
    'SECRET[_-]KEY[="\']',
    'password[="\']',
    'api[_-]token[="\']',
    'auth[_-]token[="\']',
    'access[_-]token[="\']',
    'secret[="\']',
    'key[="\']',
    'bearer[="\']',
    'token[="\']'
)

# Get staged files
$stagedFiles = git diff --cached --name-only

foreach ($file in $stagedFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                Write-Host "Error: Potential secret found in $file"
                Write-Host "Pattern matched: $pattern"
                exit 1
            }
        }
    }
}

# Run additional checks here
# Run tests
npm test
if ($LASTEXITCODE -ne 0) { exit 1 }

# Run linting
npm run lint
if ($LASTEXITCODE -ne 0) { exit 1 }

exit 0
'@ | Set-Content $preCommitPs1 -Force
}

# Fix pre-commit hook if needed
if (-not (Test-Path $hookPath) -or (Get-Content $hookPath -Raw) -notmatch 'pre-commit.ps1') {
    @'
#!/bin/sh
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .husky/pre-commit.ps1
exit $?
'@ | Set-Content $hookPath -Force -NoNewline
}

# Set correct permissions
$acl = Get-Acl $hookPath
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$fileSystemRights = [System.Security.AccessControl.FileSystemRights]"FullControl"
$type = [System.Security.AccessControl.AccessControlType]::Allow
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity, $fileSystemRights, $type)
$acl.AddAccessRule($rule)
Set-Acl $hookPath $acl

# Do the same for pre-commit.ps1
$acl = Get-Acl $preCommitPs1
$acl.AddAccessRule($rule)
Set-Acl $preCommitPs1 $acl

Write-Host "Permissions fixed successfully!"