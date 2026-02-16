#!/bin/bash

# Docker Security Scanner for Spartan Hub
# This script performs comprehensive security scanning of Docker images

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log "Checking dependencies..."
    
    local deps=("docker" "trivy" "dockle")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log "Installing required tools..."
        
        # Install trivy (Aqua Security scanner)
        if ! command -v trivy &> /dev/null; then
            log "Installing Trivy..."
            wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
            echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list
            sudo apt-get update
            sudo apt-get install trivy -y
        fi
        
        # Install dockle (Docker linter)
        if ! command -v dockle &> /dev/null; then
            log "Installing Dockle..."
            VERSION=$(curl --silent "https://api.github.com/repos/goodwithtech/dockle/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
            curl -L -o dockle.deb https://github.com/goodwithtech/dockle/releases/download/${VERSION}/dockle_${VERSION}_Linux-64bit.deb
            sudo dpkg -i dockle.deb && rm dockle.deb
        fi
    fi
    
    log_success "All dependencies checked"
}

# Scan Docker images for vulnerabilities
scan_images() {
    local images=("nginx_proxy" "postgres_primary" "postgres_replica_1" "postgres_replica_2" "ollama_service" "ai_microservice" "synergycoach_backend_1" "synergycoach_backend_2")
    
    log "Starting Docker image security scan..."
    
    for image in "${images[@]}"; do
        log "Scanning $image..."
        
        # Check if container is running
        if ! docker ps --format '{{.Names}}' | grep -q "^${image}$"; then
            log_warn "$image is not running, skipping scan"
            continue
        fi
        
        # Get image ID
        local image_id=$(docker inspect --format='{{.Image}}' "$image")
        
        # Scan with Trivy
        log "Running Trivy scan on $image..."
        if command -v trivy &> /dev/null; then
            trivy image --severity HIGH,CRITICAL --exit-code 1 "$image_id" || {
                log_error "Trivy found critical/high vulnerabilities in $image"
                return 1
            }
            log_success "Trivy scan passed for $image"
        else
            log_warn "Trivy not found, skipping vulnerability scan"
        fi
        
        # Scan with Dockle
        log "Running Dockle scan on $image..."
        if command -v dockle &> /dev/null; then
            dockle --exit-code 1 "$image_id" || {
                log_error "Dockle found configuration issues in $image"
                return 1
            }
            log_success "Dockle scan passed for $image"
        else
            log_warn "Dockle not found, skipping configuration scan"
        fi
    done
    
    log_success "All image scans completed successfully"
}

# Check Docker daemon security
check_docker_daemon() {
    log "Checking Docker daemon security..."
    
    # Check if Docker is running in rootless mode
    if docker info --format '{{.SecurityOptions}}' | grep -q "rootless"; then
        log_success "Docker running in rootless mode"
    else
        log_warn "Docker not running in rootless mode"
    fi
    
    # Check for user namespace remapping
    if docker info --format '{{.SecurityOptions}}' | grep -q "userns"; then
        log_success "User namespace remapping enabled"
    else
        log_warn "User namespace remapping not enabled"
    fi
    
    # Check SELinux/AppArmor status
    if docker info --format '{{.SecurityOptions}}' | grep -q "selinux"; then
        log_success "SELinux enabled"
    elif docker info --format '{{.SecurityOptions}}' | grep -q "apparmor"; then
        log_success "AppArmor enabled"
    else
        log_warn "Neither SELinux nor AppArmor detected"
    fi
}

# Check container runtime security
check_container_security() {
    log "Checking container runtime security..."
    
    # Check for privileged containers
    local privileged_containers=$(docker ps --filter "privileged=true" --format '{{.Names}}')
    if [ -n "$privileged_containers" ]; then
        log_error "Privileged containers detected: $privileged_containers"
        return 1
    else
        log_success "No privileged containers found"
    fi
    
    # Check for containers running as root
    local root_containers=""
    while IFS= read -r container; do
        local user=$(docker exec "$container" whoami 2>/dev/null || echo "unknown")
        if [ "$user" = "root" ]; then
            root_containers="$root_containers $container"
        fi
    done < <(docker ps --format '{{.Names}}')
    
    if [ -n "$root_containers" ]; then
        log_warn "Containers running as root:$root_containers"
    else
        log_success "All containers running as non-root users"
    fi
    
    # Check for exposed ports
    local exposed_ports=$(docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep -v "NAMES")
    log "Exposed ports:"
    echo "$exposed_ports"
}

# Generate security report
generate_report() {
    local report_file="docker-security-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log "Generating security report: $report_file"
    
    {
        echo "=== SPARTAN HUB DOCKER SECURITY REPORT ==="
        echo "Generated: $(date)"
        echo ""
        echo "=== CONTAINER STATUS ==="
        docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
        echo ""
        echo "=== IMAGE VULNERABILITIES ==="
        docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}'
        echo ""
        echo "=== NETWORK INFORMATION ==="
        docker network ls
        echo ""
        echo "=== VOLUME INFORMATION ==="
        docker volume ls
    } > "$report_file"
    
    log_success "Security report saved to $report_file"
}

# Main execution
main() {
    log "Starting Spartan Hub Docker Security Scanner"
    
    check_dependencies
    check_docker_daemon
    check_container_security
    scan_images
    generate_report
    
    log_success "Docker security scan completed successfully!"
    log "Next steps:"
    log "1. Review the generated security report"
    log "2. Address any identified vulnerabilities"
    log "3. Consider implementing runtime security monitoring"
}

# Run main function
main "$@"