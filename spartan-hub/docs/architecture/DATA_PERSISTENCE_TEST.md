# Data Persistence Test Guide

This guide explains how to test that critical data is retained in the local database after Docker Compose restarts.

## Overview

The application uses SQLite for local data storage with the database file located at `data/spartan.db`. This test will verify that:

1. User data is persisted
2. Routine data is persisted
3. Workout history is persisted (for chronic load calculation)
4. Other critical data is retained after restart

## Test Plan

### Test 1: Create Test Data

1. Start the application services
2. Create a test user
3. Create a test routine
4. Record a workout session
5. Verify data is stored correctly

### Test 2: Restart Services

1. Stop all Docker Compose services
2. Start all Docker Compose services
3. Verify data still exists

### Test 3: Verify Chronic Load Calculation

1. Ensure workout history is retained
2. Verify chronic load calculation is correct

## Prerequisites

1. Docker and Docker Compose installed
2. Application services running

## Test Execution

### Step 1: Start Services

```bash
# Navigate to project root
cd c:\spartan hub

# Start services
docker compose up -d
```

### Step 2: Create Test Data

Use the following script to create test data:

```bash
# Create a test user
curl -X POST http://localhost:3001/test/create-user \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Persistence Test User",
    "email": "persistence@test.com",
    "quest": "Test data persistence",
    "stats": {
      "totalWorkouts": 0,
      "currentStreak": 0,
      "joinDate": "2023-01-01T00:00:00.000Z"
    },
    "onboardingCompleted": true,
    "keystoneHabits": [],
    "masterRegulationSettings": {
      "targetBedtime": "22:00"
    },
    "nutritionSettings": {
      "priority": "performance"
    },
    "isInAutonomyPhase": false
  }'

# Note the returned user ID for subsequent requests
```

### Step 3: Create Test Routine

```bash
# Create a test routine (replace USER_ID with actual user ID)
curl -X POST http://localhost:3001/test/create-routine \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "name": "Persistence Test Routine",
    "focus": "strength",
    "duration": 60,
    "blocks": [
      {
        "name": "Warm-up",
        "exercises": [
          {
            "name": "Jumping Jacks",
            "sets": 1,
            "reps": "10"
          }
        ]
      }
    ]
  }'
```

### Step 4: Record Workout Session

```bash
# Record a workout session (replace USER_ID and ROUTINE_ID)
curl -X POST http://localhost:3001/test/record-workout \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "routineId": "ROUTINE_ID",
    "date": "2023-06-01",
    "durationMinutes": 45,
    "totalWeightLifted": 5000,
    "focus": "strength"
  }'
```

### Step 5: Verify Data

```bash
# Check user data
curl http://localhost:3001/test/user/USER_ID

# Check routine data
curl http://localhost:3001/test/routine/ROUTINE_ID

# Check workout history
curl http://localhost:3001/test/workouts/USER_ID
```

### Step 6: Restart Services

```bash
# Stop all services
docker compose down

# Start all services
docker compose up -d

# Wait for services to be ready
sleep 10
```

### Step 7: Verify Data Persistence

Repeat Step 5 to verify all data is still available.

### Step 8: Verify Chronic Load Calculation

```bash
# If there's an endpoint for chronic load calculation, test it
curl http://localhost:3001/test/chronic-load/USER_ID
```

## Expected Results

After restarting services:

1. **User Data**: All user information should be available
2. **Routine Data**: All created routines should be available
3. **Workout History**: All recorded workouts should be available
4. **Chronic Load**: Should be calculated correctly based on persisted workout history

## Test Script

Let's create a test script to automate this process:

```bash
#!/bin/bash

BASE_URL="http://localhost:3001"
TEST_USER_ID=""
TEST_ROUTINE_ID=""

echo "=== Data Persistence Test ==="
echo ""

# Function to check if services are running
check_services() {
  echo "Checking if services are running..."
  if curl -s -f $BASE_URL/health > /dev/null; then
    echo "✓ Backend service is running"
  else
    echo "✗ Backend service is not running"
    exit 1
  fi
}

# Function to create test user
create_test_user() {
  echo "Creating test user..."
  response=$(curl -s -X POST $BASE_URL/test/create-user \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Persistence Test User",
      "email": "persistence@test.com",
      "quest": "Test data persistence",
      "stats": {
        "totalWorkouts": 0,
        "currentStreak": 0,
        "joinDate": "2023-01-01T00:00:00.000Z"
      },
      "onboardingCompleted": true,
      "keystoneHabits": [],
      "masterRegulationSettings": {
        "targetBedtime": "22:00"
      },
      "nutritionSettings": {
        "priority": "performance"
      },
      "isInAutonomyPhase": false
    }')
  
  TEST_USER_ID=$(echo $response | jq -r '.id')
  echo "Created user with ID: $TEST_USER_ID"
}

# Function to create test routine
create_test_routine() {
  echo "Creating test routine..."
  response=$(curl -s -X POST $BASE_URL/test/create-routine \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "'$TEST_USER_ID'",
      "name": "Persistence Test Routine",
      "focus": "strength",
      "duration": 60,
      "blocks": [
        {
          "name": "Warm-up",
          "exercises": [
            {
              "name": "Jumping Jacks",
              "sets": 1,
              "reps": "10"
            }
          ]
        }
      ]
    }')
  
  TEST_ROUTINE_ID=$(echo $response | jq -r '.id')
  echo "Created routine with ID: $TEST_ROUTINE_ID"
}

# Function to record workout
record_workout() {
  echo "Recording workout session..."
  curl -s -X POST $BASE_URL/test/record-workout \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "'$TEST_USER_ID'",
      "routineId": "'$TEST_ROUTINE_ID'",
      "date": "2023-06-01",
      "durationMinutes": 45,
      "totalWeightLifted": 5000,
      "focus": "strength"
    }'
  
  echo "Workout recorded"
}

# Function to verify data
verify_data() {
  echo "Verifying data..."
  
  # Check user
  user_response=$(curl -s $BASE_URL/test/user/$TEST_USER_ID)
  if [ "$(echo $user_response | jq -r '.name')" = "Persistence Test User" ]; then
    echo "✓ User data verified"
  else
    echo "✗ User data verification failed"
  fi
  
  # Check routine
  routine_response=$(curl -s $BASE_URL/test/routine/$TEST_ROUTINE_ID)
  if [ "$(echo $routine_response | jq -r '.name')" = "Persistence Test Routine" ]; then
    echo "✓ Routine data verified"
  else
    echo "✗ Routine data verification failed"
  fi
  
  # Check workout
  workouts_response=$(curl -s $BASE_URL/test/workouts/$TEST_USER_ID)
  workout_count=$(echo $workouts_response | jq 'length')
  if [ "$workout_count" -ge 1 ]; then
    echo "✓ Workout history verified ($workout_count workouts)"
  else
    echo "✗ Workout history verification failed"
  fi
}

# Function to restart services
restart_services() {
  echo "Restarting services..."
  docker compose down
  sleep 5
  docker compose up -d
  sleep 10  # Wait for services to be ready
  echo "Services restarted"
}

# Main test execution
main() {
  check_services
  create_test_user
  create_test_routine
  record_workout
  verify_data
  
  echo ""
  echo "=== Before Restart Verification ==="
  verify_data
  
  restart_services
  
  echo ""
  echo "=== After Restart Verification ==="
  verify_data
  
  echo ""
  echo "=== Test Complete ==="
}

# Run the test
main
```

## Manual Verification Steps

If automated testing is not possible, use these manual steps:

### 1. Check Database File

```bash
# Check if database file exists and has data
docker exec synergycoach_backend ls -la /app/data/
docker exec synergycoach_backend sqlite3 /app/data/spartan.db ".tables"
```

### 2. Query Database Directly

```bash
# Check users table
docker exec synergycoach_backend sqlite3 /app/data/spartan.db "SELECT COUNT(*) FROM users;"

# Check routines table
docker exec synergycoach_backend sqlite3 /app/data/spartan.db "SELECT COUNT(*) FROM routines;"

# Check exercises table
docker exec synergycoach_backend sqlite3 /app/data/spartan.db "SELECT COUNT(*) FROM exercises;"
```

## Success Criteria

The test is successful if:

1. All services start without errors
2. Test data can be created and retrieved
3. After service restart, all test data is still available
4. Database file persists between restarts
5. Chronic load calculation works correctly with persisted data

## Troubleshooting

### Common Issues

1. **Database file not found**: Ensure the `data` directory is properly mounted
2. **Permission errors**: Check file permissions on the database file
3. **Data corruption**: Verify database integrity with `PRAGMA integrity_check`

### Logs to Check

1. **Backend logs**:
   ```bash
   docker logs synergycoach_backend
   ```

2. **Database initialization**:
   Look for "Database initialized successfully" message

## Cleanup

After testing, you can clean up test data:

```bash
# Remove test user and related data
curl -X DELETE http://localhost:3001/test/user/TEST_USER_ID
```