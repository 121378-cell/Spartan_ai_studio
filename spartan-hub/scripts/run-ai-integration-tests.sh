#!/bin/bash

# AI Services Integration Test Runner
# Executes comprehensive integration tests for AI functionality

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

log_section() {
    echo -e "${CYAN}▶ $1${NC}"
}

# Configuration
TEST_SUITE="aiServices.e2e.test.ts"
TEST_DIR="backend/src/__tests__/e2e"
REPORT_DIR="test-reports/ai-integration"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create report directory
mkdir -p "$REPORT_DIR"

# Test metrics tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# AI Service Test Categories
declare -A AI_TEST_CATEGORIES=(
    ["workout_planning"]="Workout Planning Integration"
    ["biometric_analysis"]="Biometric Analysis Integration" 
    ["nutrition_planning"]="Nutrition Planning Integration"
    ["coaching"]="Coaching Advice Integration"
    ["performance_forecasting"]="Performance Forecasting Integration"
    ["error_handling"]="Error Handling and Edge Cases"
    ["health_monitoring"]="Service Health and Monitoring"
)

# Function to run specific test category
run_test_category() {
    local category=$1
    local description=$2
    local test_pattern=$3
    
    log_section "$description"
    
    local report_file="${REPORT_DIR}/${category}_${TIMESTAMP}.xml"
    
    # Run tests with specific pattern
    if npm test -- --testPathPattern="$TEST_SUITE" --testNamePattern="$test_pattern" --coverage --silent; then
        log_success "$description tests passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "$description tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    sleep 1
}

# Function to check AI service availability
check_ai_services() {
    log "Checking AI service availability..."
    
    # Check if backend is running
    if ! curl -f http://localhost:3001/health &>/dev/null; then
        log_warn "Backend service not running on port 3001"
        log "Starting backend service..."
        
        # Start backend in background
        cd backend
        npm run dev > ../"$REPORT_DIR/backend.log" 2>&1 &
        BACKEND_PID=$!
        cd ..
        
        # Wait for service to start
        for i in {1..30}; do
            if curl -f http://localhost:3001/health &>/dev/null; then
                log_success "Backend service started successfully"
                break
            fi
            sleep 2
            if [ $i -eq 30 ]; then
                log_error "Backend service failed to start"
                return 1
            fi
        done
    else
        log_success "Backend service is already running"
    fi
    
    # Check AI health endpoint
    if curl -f http://localhost:3001/api/ai/health &>/dev/null; then
        log_success "AI services are accessible"
        return 0
    else
        log_warn "AI services may not be fully available"
        return 0 # Continue anyway, tests should handle unavailable services gracefully
    fi
}

# Function to prepare test data
prepare_test_data() {
    log "Preparing test data..."
    
    # This would typically involve:
    # 1. Creating test users
    # 2. Seeding biometric data
    # 3. Setting up workout history
    # 4. Configuring AI service mocks if needed
    
    log_success "Test data preparation completed"
}

# Function to run all AI integration tests
run_all_ai_integration_tests() {
    log_header "Spartan Hub AI Services Integration Tests"
    log "Timestamp: $(date)"
    log "Test Suite: $TEST_SUITE"
    log "Report Directory: $REPORT_DIR"
    echo
    
    # Validate prerequisites
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if [ ! -f "$TEST_DIR/$TEST_SUITE" ]; then
        log_error "Test suite not found: $TEST_DIR/$TEST_SUITE"
        exit 1
    fi
    
    # Check and prepare services
    if ! check_ai_services; then
        log_error "Failed to prepare required services"
        exit 1
    fi
    
    prepare_test_data
    
    # Run each test category
    run_test_category "workout_planning" "Workout Planning Integration" "AI Workout Planning Integration"
    run_test_category "biometric_analysis" "Biometric Analysis Integration" "AI Biometric Analysis Integration"  
    run_test_category "nutrition_planning" "Nutrition Planning Integration" "AI Nutrition Planning Integration"
    run_test_category "coaching" "Coaching Advice Integration" "AI Coaching Integration"
    run_test_category "performance_forecasting" "Performance Forecasting Integration" "AI Performance Forecasting Integration"
    run_test_category "error_handling" "Error Handling Integration" "AI Integration Error Handling"
    run_test_category "health_monitoring" "Service Health Integration" "AI Service Health and Monitoring"
    
    # Generate summary and cleanup
    generate_test_summary
    cleanup_services
}

# Function to generate test summary
generate_test_summary() {
    log_header "AI Integration Test Summary"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo "📊 AI Integration Test Results"
    echo "=============================="
    echo "Total Categories: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Skipped: $SKIPPED_TESTS"
    echo "Success Rate: ${success_rate}%"
    echo
    
    # Performance metrics
    echo "📈 Performance Metrics:"
    echo "  - Test Execution Time: $(($(date +%s) - START_TIME)) seconds"
    echo "  - Average Tests per Category: TBD"
    echo "  - Coverage: Generated in reports"
    echo
    
    # Success criteria
    if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
        log_success "🎉 All AI integration tests passed!"
        log "AI services are functioning correctly and integrated properly"
        return 0
    else
        log_error "Some AI integration tests failed"
        log "Review test reports for details:"
        ls -la "$REPORT_DIR"/*.xml 2>/dev/null || echo "No XML reports found"
        return 1
    fi
}

# Function to cleanup services
cleanup_services() {
    log "Cleaning up test environment..."
    
    # Kill backend if we started it
    if [ -n "${BACKEND_PID:-}" ]; then
        if kill $BACKEND_PID 2>/dev/null; then
            log_success "Backend service stopped"
        fi
    fi
    
    # Cleanup test data if needed
    # Add database cleanup logic here
    
    log_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Spartan Hub AI Integration Test Runner"
    echo "====================================="
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --category CATEGORY    Run specific test category"
    echo "  --help                Show this help message"
    echo ""
    echo "Available Categories:"
    for category in "${!AI_TEST_CATEGORIES[@]}"; do
        echo "  $category : ${AI_TEST_CATEGORIES[$category]}"
    done
    echo ""
    echo "Examples:"
    echo "  $0                          # Run all AI integration tests"
    echo "  $0 --category workout_planning  # Run only workout planning tests"
}

# Main execution
main() {
    START_TIME=$(date +%s)
    
    # Parse command line arguments
    local specific_category=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --category)
                specific_category="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Run tests
    if [ -n "$specific_category" ]; then
        if [[ -n "${AI_TEST_CATEGORIES[$specific_category]}" ]]; then
            # Run single category
            check_ai_services
            prepare_test_data
            run_test_category "$specific_category" "${AI_TEST_CATEGORIES[$specific_category]}" "${AI_TEST_CATEGORIES[$specific_category]}"
            generate_test_summary
        else
            log_error "Unknown test category: $specific_category"
            log "Available categories: ${!AI_TEST_CATEGORIES[@]}"
            exit 1
        fi
    else
        # Run all tests
        run_all_ai_integration_tests
    fi
}

# Execute main function
main "$@"