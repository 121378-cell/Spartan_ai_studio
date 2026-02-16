#!/bin/bash

# E2E Test Suite Runner for Spartan Hub
# Executes comprehensive end-to-end tests with detailed reporting

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

# Test suite configuration
TEST_DIR="backend/src/__tests__/e2e"
REPORT_DIR="test-reports/e2e"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create report directory
mkdir -p "$REPORT_DIR"

# Initialize test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Test suite definitions
declare -A TEST_SUITES=(
    ["auth"]="Authentication Flow Tests"
    ["workout"]="Workout Management Tests"
    ["mlForecasting"]="ML Forecasting Tests"
)

# Function to run individual test suite
run_test_suite() {
    local suite_name=$1
    local suite_description=$2
    local test_file="${TEST_DIR}/${suite_name}.e2e.test.ts"
    
    log_header "Running $suite_description"
    
    if [ ! -f "$test_file" ]; then
        log_warn "Test file not found: $test_file"
        SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
        return
    fi
    
    # Run the test suite
    local report_file="${REPORT_DIR}/${suite_name}_${TIMESTAMP}.xml"
    
    log "Executing test suite: $suite_name"
    
    # Run tests with coverage and junit reporting
    if npm test -- --testPathPattern="$suite_name" --coverage --watchAll=false --reporters="default" --reporters="jest-junit" --testResultsProcessor="jest-sonar-reporter"; then
        log_success "$suite_description completed successfully"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        log_error "$suite_description failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    # Add delay between test suites to avoid resource contention
    sleep 2
}

# Function to run all E2E tests
run_all_e2e_tests() {
    log_header "Starting Spartan Hub E2E Test Suite"
    log "Timestamp: $(date)"
    log "Test Directory: $TEST_DIR"
    log "Report Directory: $REPORT_DIR"
    echo
    
    # Check prerequisites
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    if [ ! -d "$TEST_DIR" ]; then
        log_error "Test directory not found: $TEST_DIR"
        exit 1
    fi
    
    # Start backend services if needed
    log "Ensuring backend services are running..."
    # Add backend startup logic here if needed
    
    # Run each test suite
    for suite in "${!TEST_SUITES[@]}"; do
        run_test_suite "$suite" "${TEST_SUITES[$suite]}"
        echo
    done
    
    # Generate summary report
    generate_summary_report
}

# Function to generate test summary
generate_summary_report() {
    log_header "Test Execution Summary"
    
    local success_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    fi
    
    echo "📊 Test Results Summary"
    echo "======================"
    echo "Total Suites: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Skipped: $SKIPPED_TESTS"
    echo "Success Rate: ${success_rate}%"
    echo
    
    # Success criteria check
    if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
        log_success "All E2E tests passed! 🎉"
        return 0
    else
        log_error "Some E2E tests failed. Please review the reports."
        return 1
    fi
}

# Function to clean up test environment
cleanup() {
    log "Cleaning up test environment..."
    # Add cleanup logic here
    # Stop any test services
    # Remove temporary files
    log_success "Cleanup completed"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    # Parse command line arguments
    local run_all=true
    local specific_suite=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --suite)
                specific_suite="$2"
                run_all=false
                shift 2
                ;;
            --help|-h)
                echo "Usage: $0 [--suite SUITE_NAME] [--help]"
                echo "Available suites: ${!TEST_SUITES[@]}"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run tests
    if [ "$run_all" = true ]; then
        run_all_e2e_tests
    else
        if [[ -n "${TEST_SUITES[$specific_suite]}" ]]; then
            run_test_suite "$specific_suite" "${TEST_SUITES[$specific_suite]}"
            generate_summary_report
        else
            log_error "Unknown test suite: $specific_suite"
            log "Available suites: ${!TEST_SUITES[@]}"
            exit 1
        fi
    fi
}

# Run main function
main "$@"