#!/bin/bash

# Ollama AI Connection Test Script

BASE_URL="http://localhost:3001"
TIMEOUT=500

echo "=== Ollama AI Connection Test ==="
echo ""

# Function to create test user data
create_test_user() {
  cat <<EOF
{
  "name": "Test User",
  "email": "test@example.com",
  "quest": "Test AI connection",
  "stats": {
    "totalWorkouts": 10,
    "currentStreak": 5,
    "joinDate": "2023-01-01T00:00:00.000Z"
  },
  "onboardingCompleted": true,
  "keystoneHabits": [
    {
      "id": "habit1",
      "name": "Morning Workout",
      "anchor": "After breakfast",
      "currentStreak": 5,
      "longestStreak": 7
    }
  ],
  "masterRegulationSettings": {
    "targetBedtime": "22:00"
  },
  "nutritionSettings": {
    "priority": "performance"
  },
  "isInAutonomyPhase": false,
  "weightKg": 70
}
EOF
}

# Test health endpoints
echo "1. Testing health endpoints..."
echo "Backend health:"
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL/health
echo ""

echo "AI health:"
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL/ai/health
echo ""

# Test latency with Ollama running
echo "2. Testing AI service latency..."
start_time=$(date +%s%3N)
response=$(curl -s -X POST $BASE_URL/ai/alert \
  -H "Content-Type: application/json" \
  -d "$(create_test_user)")
end_time=$(date +%s%3N)

response_time=$((end_time - start_time))
echo "Response time: ${response_time}ms"

if [ $response_time -lt $TIMEOUT ]; then
  echo "✓ Latency requirement met (< ${TIMEOUT}ms)"
else
  echo "⚠ Latency requirement not met (>= ${TIMEOUT}ms)"
fi

echo "Response:"
echo $response | jq '.'
echo ""

# Check if fallback was used
fallback_used=$(echo $response | jq -r '.data.fallback_used')
if [ "$fallback_used" = "true" ]; then
  echo "Info: Fallback was used in this response"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "To test fallback mechanism:"
echo "1. Stop Ollama service: docker stop ollama_service"
echo "2. Run this script again"
echo "3. Restart services: docker compose restart"