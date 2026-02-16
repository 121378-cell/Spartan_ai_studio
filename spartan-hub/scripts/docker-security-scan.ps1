# Docker Security Scanner for Spartan Hub (Windows PowerShell)
# This script performs comprehensive security scanning of Docker images on Windows

param(
    [switch]$Verbose = $false
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

# Check if required tools are installed
function Test-Dependencies {
    Write-Log "Checking dependencies..."
    
    $deps = @("docker")
    $missingDeps = @()
    
    foreach ($dep in $deps) {
        if (!(Get-Command $dep -ErrorAction SilentlyContinue)) {
            $missingDeps += $dep
        }
    }
    
    if ($missingDeps.Count -gt 0) {
        Write-ErrorLog "Missing dependencies: $($missingDeps -join ', ')"
        Write-ErrorLog "Please install Docker Desktop for Windows"
        exit 1
    }
    
    Write-SuccessLog "All dependencies available"
}

# Check Docker daemon security
function Test-DockerDaemon {
    Write-Log "Checking Docker daemon security..."
    
    try {
        $dockerInfo = docker info --format "{{json .}}" | ConvertFrom-Json
        
        # Check for experimental features
        if ($dockerInfo.Experimental -eq $true) {
            Write-WarningLog "Experimental features are enabled"
        } else {
            Write-SuccessLog "Experimental features disabled"
        }
        
        # Check security options
        if ($dockerInfo.SecurityOptions) {
            Write-SuccessLog "Security options detected: $($dockerInfo.SecurityOptions -join ', ')"
        } else {
            Write-WarningLog "No security options detected"
        }
        
    } catch {
        Write-ErrorLog "Failed to get Docker info: $_"
    }
}

# Check container runtime security
function Test-ContainerSecurity {
    Write-Log "Checking container runtime security..."
    
    try {
        # Get running containers
        $containers = docker ps --format "{{json .}}" | ConvertFrom-Json
        
        $privilegedCount = 0
        $rootCount = 0
        
        foreach ($container in $containers) {
            # Check for privileged containers
            $inspect = docker inspect $container.Names | ConvertFrom-Json
            if ($inspect.HostConfig.Privileged) {
                Write-ErrorLog "Privileged container detected: $($container.Names)"
                $privilegedCount++
            }
            
            # Check user (this is approximate since we can't easily exec in Windows)
            if ($inspect.Config.User -eq "" -or $inspect.Config.User -eq "root") {
                Write-WarningLog "Container running as root (or unspecified user): $($container.Names)"
                $rootCount++
            }
        }
        
        if ($privilegedCount -eq 0) {
            Write-SuccessLog "No privileged containers found"
        }
        
        if ($rootCount -eq 0) {
            Write-SuccessLog "All containers running with specified non-root users"
        }
        
        # Display exposed ports
        Write-Log "Exposed ports summary:"
        $containers | Format-Table Names, Ports -AutoSize
        
    } catch {
        Write-ErrorLog "Failed to check container security: $_"
    }
}

# Scan images for basic security issues
function Test-ImageSecurity {
    Write-Log "Performing basic image security checks..."
    
    try {
        $images = docker images --format "{{json .}}" | ConvertFrom-Json
        
        foreach ($image in $images) {
            $imageName = "$($image.Repository):$($image.Tag)"
            
            # Skip <none> images
            if ($image.Repository -eq "<none>") { continue }
            
            Write-Log "Checking image: $imageName"
            
            # Check image age
            $created = [DateTime]::ParseExact($image.CreatedAt, "yyyy-MM-dd HH:mm:ss", $null)
            $age = (Get-Date) - $created
            
            if ($age.Days -gt 90) {
                Write-WarningLog "Image is older than 90 days: $imageName"
            }
            
            # Check image size
            if ([int]$image.Size.Replace("MB","").Replace("GB","") -gt 500) {
                Write-WarningLog "Large image detected (>500MB): $imageName"
            }
        }
        
        Write-SuccessLog "Basic image security checks completed"
        
    } catch {
        Write-ErrorLog "Failed to perform image security checks: $_"
    }
}

# Generate security report
function Save-SecurityReport {
    $reportFile = "docker-security-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
    
    Write-Log "Generating security report: $reportFile"
    
    try {
        $reportContent = @"
=== SPARTAN HUB DOCKER SECURITY REPORT ===
Generated: $(Get-Date)
System: Windows $(Get-WmiObject -Class Win32_OperatingSystem).Caption

=== CONTAINER STATUS ===
$((docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String))

=== IMAGE INFORMATION ===
$((docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | Out-String))

=== NETWORK INFORMATION ===
$((docker network ls | Out-String))

=== VOLUME INFORMATION ===
$((docker volume ls | Out-String))

=== DOCKER VERSION ===
$((docker version | Out-String))

END OF REPORT
"@
        
        $reportContent | Out-File -FilePath $reportFile -Encoding UTF8
        Write-SuccessLog "Security report saved to $reportFile"
        
    } catch {
        Write-ErrorLog "Failed to generate security report: $_"
    }
}

# Main execution
function Start-SecurityScan {
    Write-Log "Starting Spartan Hub Docker Security Scanner (Windows)"
    Write-Log "==================================================="
    
    Test-Dependencies
    Test-DockerDaemon
    Test-ContainerSecurity
    Test-ImageSecurity
    Save-SecurityReport
    
    Write-SuccessLog "Docker security scan completed successfully!"
    Write-Log "Next steps:"
    Write-Log "1. Review the generated security report"
    Write-Log "2. Address any identified security concerns"
    Write-Log "3. Consider implementing runtime security monitoring"
    Write-Log "4. Regularly update base images and dependencies"
}

# Run the scan
try {
    Start-SecurityScan
} catch {
    Write-ErrorLog "Security scan failed: $_"
    exit 1
}