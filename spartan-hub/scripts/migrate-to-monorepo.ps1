# Spartan Hub Monorepo Migration Script (Windows PowerShell)
# This script helps migrate the existing codebase to the new monorepo structure

param(
    [switch]$Force = $false
)

# Colors for output
$colors = @{
    Red = [System.ConsoleColor]::Red
    Green = [System.ConsoleColor]::Green
    Yellow = [System.ConsoleColor]::Yellow
    Blue = [System.ConsoleColor]::Blue
    White = [System.ConsoleColor]::White
}

# Logging functions
function Write-Log {
    param([string]$Message, [System.ConsoleColor]$Color = $colors.Blue)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [INFO] $Message" -ForegroundColor $Color
}

function Write-WarningLog {
    param([string]$Message)
    Write-Log $Message $colors.Yellow
}

function Write-ErrorLog {
    param([string]$Message)
    Write-Log $Message $colors.Red
}

function Write-SuccessLog {
    param([string]$Message)
    Write-Log $Message $colors.Green
}

# Backup original structure
function Backup-Original {
    Write-Log "Creating backup of original structure..."
    
    $backupPath = "..\spartan-hub-backup"
    
    if (-not (Test-Path $backupPath)) {
        Copy-Item -Path "..\spartan-hub" -Destination $backupPath -Recurse
        Write-SuccessLog "Backup created at $backupPath"
    } else {
        Write-WarningLog "Backup already exists, skipping..."
    }
}

# Move frontend files
function Move-Frontend {
    Write-Log "Migrating frontend files..."
    
    # Create frontend directory structure
    $frontendPath = "packages\frontend"
    New-Item -ItemType Directory -Path "$frontendPath\src" -Force | Out-Null
    New-Item -ItemType Directory -Path "$frontendPath\public" -Force | Out-Null
    
    # Move main frontend files
    @("src\App.tsx", "src\main.tsx", "src\index.css") | ForEach-Object {
        if (Test-Path $_) {
            Move-Item -Path $_ -Destination "$frontendPath\$($_.Replace('src\', 'src\'))" -Force
        }
    }
    
    # Move directories
    @("src\components", "src\hooks", "src\context", "src\services", "src\utils", "src\__tests__") | ForEach-Object {
        if (Test-Path $_) {
            Move-Item -Path $_ -Destination "$frontendPath\$($_.Replace('src\', 'src\'))" -Force
        }
    }
    
    # Move public files
    if (Test-Path "public") {
        Get-ChildItem -Path "public" | ForEach-Object {
            Move-Item -Path $_.FullName -Destination "$frontendPath\public\" -Force
        }
    }
    
    Write-SuccessLog "Frontend files migrated"
}

# Move backend files
function Move-Backend {
    Write-Log "Migrating backend files..."
    
    if (Test-Path "backend\src") {
        # Move backend to packages directory
        Move-Item -Path "backend" -Destination "packages\backend" -Force
        
        # Update backend package.json references (if needed)
        $backendPkgJson = "packages\backend\package.json"
        if (Test-Path $backendPkgJson) {
            $content = Get-Content $backendPkgJson -Raw
            $updatedContent = $content -replace '\.\.\/\.\.\/', '..\/..\/'
            Set-Content -Path $backendPkgJson -Value $updatedContent
        }
    }
    
    Write-SuccessLog "Backend files migrated"
}

# Move AI files
function Move-AI {
    Write-Log "Migrating AI files..."
    
    $aiPath = "packages\ai"
    New-Item -ItemType Directory -Path $aiPath -Force | Out-Null
    
    if (Test-Path "src\AI") {
        Get-ChildItem -Path "src\AI" | ForEach-Object {
            Move-Item -Path $_.FullName -Destination $aiPath -Force
        }
    }
    
    # Create basic AI package.json
    $aiPkgJson = @{
        name = "@spartan-hub/ai"
        version = "1.0.0"
        description = "Spartan Hub AI Services"
        private = $true
        scripts = @{
            start = "python main.py"
            test = "python -m pytest"
            dev = "python main.py"
        }
    }
    
    $aiPkgJson | ConvertTo-Json -Depth 10 | Set-Content -Path "$aiPath\package.json"
    
    Write-SuccessLog "AI files migrated"
}

# Update configuration files
function Update-Configs {
    Write-Log "Updating configuration files..."
    
    # Replace main package.json with workspaces version
    if (Test-Path "package.workspaces.json") {
        Rename-Item -Path "package.json" -NewName "package.original.json" -Force
        Rename-Item -Path "package.workspaces.json" -NewName "package.json" -Force
        Write-SuccessLog "Package.json updated for workspaces"
    }
    
    Write-SuccessLog "Configuration files updated"
}

# Install dependencies
function Install-Dependencies {
    Write-Log "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install workspace dependencies
    npm run build:shared
    
    Write-SuccessLog "Dependencies installed"
}

# Validate migration
function Test-Migration {
    Write-Log "Validating migration..."
    
    # Check if all packages exist
    $requiredPackages = @("packages\frontend", "packages\backend", "packages\shared")
    
    foreach ($package in $requiredPackages) {
        if (-not (Test-Path $package)) {
            Write-ErrorLog "Required package not found: $package"
            return $false
        }
    }
    
    # Try building shared package
    try {
        npm run build:shared
        Write-SuccessLog "Migration validation passed"
        return $true
    } catch {
        Write-ErrorLog "Migration validation failed - build failed"
        return $false
    }
}

# Main migration function
function Start-Migration {
    Write-Log "Starting Spartan Hub Monorepo Migration"
    Write-Log "========================================"
    
    try {
        Backup-Original
        Move-Frontend
        Move-Backend
        Move-AI
        Update-Configs
        Install-Dependencies
        
        if (Test-Migration) {
            Write-SuccessLog "Monorepo migration completed successfully!"
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor $colors.White
            Write-Host "1. Review the migrated structure in packages/" -ForegroundColor $colors.White
            Write-Host "2. Test the build: npm run build" -ForegroundColor $colors.White
            Write-Host "3. Test development mode: npm run dev" -ForegroundColor $colors.White
            Write-Host "4. Run tests: npm test" -ForegroundColor $colors.White
            Write-Host ""
            Write-Host "If you need to rollback, the original structure is backed up at ..\spartan-hub-backup" -ForegroundColor $colors.White
        } else {
            Write-ErrorLog "Migration validation failed"
            exit 1
        }
    } catch {
        Write-ErrorLog "Migration failed: $_"
        exit 1
    }
}

# Run migration
Start-Migration