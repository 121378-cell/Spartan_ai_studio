#!/bin/bash

###############################################################################
# Phase 2 Performance Testing Script
# 
# Runs comprehensive performance tests on Phase 2 services
# Tests: Baseline load, load response, sustained throughput, edge cases
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3001}"
NAMESPACE="spartan-hub-staging"
TEST_DURATION="60s"
BASELINE_USERS="10"
SPIKE_USERS="50"
SUSTAINED_USERS="100"

# Test results storage
RESULTS_DIR="./perf-results"
mkdir -p "$RESULTS_DIR"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Wait for API to be ready
wait_for_api() {
    log_info "Waiting for API to be ready at $API_URL..."
    
    for i in {1..30}; do
        if curl -s "$API_URL/health" >/dev/null 2>&1; then
            log_success "API is ready"
            return 0
        fi
        sleep 2
    done
    
    log_error "API did not respond within 60 seconds"
}

# Generate realistic biometric data
generate_biometric_data() {
    local user_id=$1
    local hour=$2
    
    cat <<EOF
{
  "userId": "$user_id",
  "timestamp": "$(date -d "+$hour hours" -Iseconds)",
  "heartRate": {
    "resting": $((60 + RANDOM % 20)),
    "average": $((70 + RANDOM % 30)),
    "max": $((140 + RANDOM % 40))
  },
  "sleep": {
    "duration": $((6 + RANDOM % 4)),
    "quality": $((55 + RANDOM % 45)),
    "score": $((50 + RANDOM % 50))
  },
  "activity": {
    "steps": $((5000 + RANDOM % 15000)),
    "activeCalories": $((150 + RANDOM % 400)),
    "restingCalories": $((1200 + RANDOM % 300)),
    "distance": $((2 + RANDOM % 8))
  },
  "recovery": {
    "hrvStatus": $((50 + RANDOM % 50)),
    "hrvTrend": "$([ $((RANDOM % 2)) -eq 0 ] && echo 'increasing' || echo 'decreasing')",
    "recoveryIndex": $((40 + RANDOM % 60))
  },
  "training": {
    "volume": $((20 + RANDOM % 60)),
    "intensity": $((40 + RANDOM % 60)),
    "duration": $((30 + RANDOM % 90))
  }
}
EOF
}

# Run baseline load test (10 concurrent users)
test_baseline_load() {
    log_info "Running baseline load test ($BASELINE_USERS concurrent users, $TEST_DURATION)..."
    
    local results_file="$RESULTS_DIR/baseline-load.txt"
    
    cat > /tmp/ab-script-baseline.txt <<'EOFSCRIPT'
POST /api/biometrics HTTP/1.1
Host: localhost:3001
Content-Type: application/json
Authorization: Bearer test-token

{
  "userId": "user-baseline-[rand(1,10)]",
  "timestamp": "2024-01-$(date +%d)T$(date +%H):[rand(0,59)]:00Z",
  "heartRate": {
    "resting": [rand(60,80)],
    "average": [rand(70,100)],
    "max": [rand(140,180)]
  },
  "sleep": {
    "duration": [rand(6,9)],
    "quality": [rand(50,100)],
    "score": [rand(50,100)]
  },
  "activity": {
    "steps": [rand(5000,20000)],
    "activeCalories": [rand(150,550)],
    "restingCalories": [rand(1200,1500)],
    "distance": [rand(2,10)]
  },
  "recovery": {
    "hrvStatus": [rand(50,100)],
    "hrvTrend": "increasing",
    "recoveryIndex": [rand(40,100)]
  },
  "training": {
    "volume": [rand(20,80)],
    "intensity": [rand(40,100)],
    "duration": [rand(30,120)]
  }
}
EOFSCRIPT
    
    # Using Apache Bench or similar tool - create curl-based alternative
    # Since we may not have ab installed, use curl in parallel
    
    log_info "Generating $BASELINE_USERS concurrent requests..."
    for i in $(seq 1 $BASELINE_USERS); do
        (
            for j in {1..10}; do
                response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X POST \
                    "$API_URL/api/biometrics" \
                    -H "Content-Type: application/json" \
                    -d "$(generate_biometric_data "user-$i" "$j")")
                
                http_code=$(echo "$response" | tail -n1)
                latency=$(echo "$response" | tail -n2 | head -n1)
                
                echo "User-$i Request-$j: HTTP $http_code, Latency: ${latency}s" >> "$results_file"
            done
        ) &
    done
    wait
    
    log_success "Baseline load test complete - Results: $results_file"
    cat "$results_file" | tail -20
}

# Run spike load test (50 concurrent users)
test_spike_load() {
    log_info "Running spike load test ($SPIKE_USERS concurrent users, $TEST_DURATION)..."
    
    local results_file="$RESULTS_DIR/spike-load.txt"
    
    log_info "Generating $SPIKE_USERS concurrent requests..."
    for i in $(seq 1 $SPIKE_USERS); do
        (
            for j in {1..5}; do
                response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X POST \
                    "$API_URL/api/readiness/evaluate" \
                    -H "Content-Type: application/json" \
                    -d "$(generate_biometric_data "user-spike-$i" "$j")")
                
                http_code=$(echo "$response" | tail -n1)
                latency=$(echo "$response" | tail -n2 | head -n1)
                
                echo "User-$i Request-$j: HTTP $http_code, Latency: ${latency}s" >> "$results_file"
            done
        ) &
    done
    wait
    
    log_success "Spike load test complete - Results: $results_file"
    cat "$results_file" | tail -20
}

# Run sustained throughput test (100 concurrent users)
test_sustained_throughput() {
    log_info "Running sustained throughput test ($SUSTAINED_USERS concurrent users, $TEST_DURATION)..."
    
    local results_file="$RESULTS_DIR/sustained-throughput.txt"
    
    log_info "Generating $SUSTAINED_USERS concurrent requests..."
    start_time=$(date +%s%N)
    
    for i in $(seq 1 $SUSTAINED_USERS); do
        (
            for j in {1..20}; do
                response=$(curl -s -w "\n%{http_code}\n%{time_total}\n%{size_download}" -X POST \
                    "$API_URL/api/analysis/comprehensive" \
                    -H "Content-Type: application/json" \
                    -d "$(generate_biometric_data "user-sustained-$i" "$j")")
                
                http_code=$(echo "$response" | tail -n3 | head -n1)
                latency=$(echo "$response" | tail -n2 | head -n1)
                size=$(echo "$response" | tail -n1)
                
                echo "User-$i Request-$j: HTTP $http_code, Latency: ${latency}s, Size: ${size}B" >> "$results_file"
            done
        ) &
    done
    wait
    
    end_time=$(date +%s%N)
    duration=$((($end_time - $start_time) / 1000000000))
    
    log_success "Sustained throughput test complete (${duration}s) - Results: $results_file"
    cat "$results_file" | tail -30
}

# Analyze test results
analyze_results() {
    log_info "Analyzing test results..."
    
    local analysis_file="$RESULTS_DIR/analysis-summary.txt"
    
    {
        echo "======================================"
        echo "Phase 2 Performance Test Analysis"
        echo "======================================"
        echo ""
        echo "Test Date: $(date)"
        echo "API URL: $API_URL"
        echo ""
        
        # Baseline Analysis
        if [ -f "$RESULTS_DIR/baseline-load.txt" ]; then
            echo "--- BASELINE LOAD TEST ---"
            baseline_count=$(wc -l < "$RESULTS_DIR/baseline-load.txt")
            baseline_success=$(grep "HTTP 200\|HTTP 201" "$RESULTS_DIR/baseline-load.txt" | wc -l)
            baseline_avg=$(grep "Latency:" "$RESULTS_DIR/baseline-load.txt" | awk '{sum+=$NF; count++} END {if (count>0) printf "%.3f", sum/count; else print "N/A"}')
            baseline_max=$(grep "Latency:" "$RESULTS_DIR/baseline-load.txt" | awk '{gsub(/s$/,"",$NF); if ($NF > max) max=$NF} END {printf "%.3f", max}')
            
            echo "Total Requests: $baseline_count"
            echo "Success Rate: $(( baseline_success * 100 / baseline_count ))%"
            echo "Average Latency: ${baseline_avg}s"
            echo "Max Latency: ${baseline_max}s"
            echo ""
        fi
        
        # Spike Analysis
        if [ -f "$RESULTS_DIR/spike-load.txt" ]; then
            echo "--- SPIKE LOAD TEST ---"
            spike_count=$(wc -l < "$RESULTS_DIR/spike-load.txt")
            spike_success=$(grep "HTTP 200\|HTTP 201" "$RESULTS_DIR/spike-load.txt" | wc -l)
            spike_avg=$(grep "Latency:" "$RESULTS_DIR/spike-load.txt" | awk '{sum+=$NF; count++} END {if (count>0) printf "%.3f", sum/count; else print "N/A"}')
            spike_max=$(grep "Latency:" "$RESULTS_DIR/spike-load.txt" | awk '{gsub(/s$/,"",$NF); if ($NF > max) max=$NF} END {printf "%.3f", max}')
            
            echo "Total Requests: $spike_count"
            echo "Success Rate: $(( spike_success * 100 / spike_count ))%"
            echo "Average Latency: ${spike_avg}s"
            echo "Max Latency: ${spike_max}s"
            echo ""
        fi
        
        # Sustained Throughput Analysis
        if [ -f "$RESULTS_DIR/sustained-throughput.txt" ]; then
            echo "--- SUSTAINED THROUGHPUT TEST ---"
            sustained_count=$(wc -l < "$RESULTS_DIR/sustained-throughput.txt")
            sustained_success=$(grep "HTTP 200\|HTTP 201" "$RESULTS_DIR/sustained-throughput.txt" | wc -l)
            sustained_avg=$(grep "Latency:" "$RESULTS_DIR/sustained-throughput.txt" | awk '{sum+=$NF; count++} END {if (count>0) printf "%.3f", sum/count; else print "N/A"}')
            sustained_max=$(grep "Latency:" "$RESULTS_DIR/sustained-throughput.txt" | awk '{gsub(/s$/,"",$NF); if ($NF > max) max=$NF} END {printf "%.3f", max}')
            
            echo "Total Requests: $sustained_count"
            echo "Success Rate: $(( sustained_success * 100 / sustained_count ))%"
            echo "Average Latency: ${sustained_avg}s"
            echo "Max Latency: ${sustained_max}s"
            echo ""
        fi
        
        echo "======================================"
        echo "Performance Targets (SLA):"
        echo "======================================"
        echo "P95 Latency: <200ms (0.2s)"
        echo "P99 Latency: <500ms (0.5s)"
        echo "Error Rate: <0.1%"
        echo "Success Rate Target: >99.9%"
        echo ""
        
    } | tee "$analysis_file"
    
    log_success "Analysis complete: $analysis_file"
}

# Monitor cluster resources during test
monitor_resources() {
    log_info "Monitoring cluster resources..."
    
    local monitor_file="$RESULTS_DIR/resource-monitoring.txt"
    
    {
        echo "Resource Monitoring During Performance Tests"
        echo "==========================================="
        echo ""
        echo "Monitored Namespace: $NAMESPACE"
        echo "Timestamp: $(date)"
        echo ""
        
        echo "--- Memory Usage ---"
        kubectl top pods -n $NAMESPACE --no-headers 2>/dev/null | awk '{print $1, $3}' || echo "Metrics server not available"
        
        echo ""
        echo "--- CPU Usage ---"
        kubectl top pods -n $NAMESPACE --no-headers 2>/dev/null | awk '{print $1, $2}' || echo "Metrics server not available"
        
        echo ""
        echo "--- Pod Status ---"
        kubectl get pods -n $NAMESPACE -o wide || echo "Unable to get pod status"
        
        echo ""
        echo "--- Node Status ---"
        kubectl get nodes -o wide || echo "Unable to get node status"
        
    } | tee "$monitor_file"
}

# Main execution
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          Phase 2 Performance Testing Suite              ║${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}║  Testing biometric data processing capabilities        ║${NC}"
    echo -e "${BLUE}║  $(date '+%Y-%m-%d %H:%M:%S')                           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    wait_for_api
    
    log_info "Starting performance tests..."
    log_info "Results will be stored in: $RESULTS_DIR"
    echo ""
    
    test_baseline_load
    echo ""
    
    test_spike_load
    echo ""
    
    test_sustained_throughput
    echo ""
    
    monitor_resources
    echo ""
    
    analyze_results
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         🚀 Performance Testing Complete! 🚀             ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║  Results Directory: $RESULTS_DIR${NC}"
    echo -e "${GREEN}║  Analysis Summary: $RESULTS_DIR/analysis-summary.txt${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║  Next: Review results and run integration tests       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Execute main
main "$@"
