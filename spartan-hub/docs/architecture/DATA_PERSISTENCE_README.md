# Data Persistence Test Documentation

This document explains how to test that critical data is retained in the local database after Docker Compose restarts.

## Overview

The application uses SQLite for local data storage with the database file located at `data/spartan.db`. This test verifies that:

1. User data is persisted
2. Routine data is persisted
3. Workout history is persisted (for chronic load calculation)
4. Other critical data is retained after restart

## Database Structure

The SQLite database contains the following tables:

1. **users**: User profile information
2. **routines**: Exercise routines
3. **exercises**: Individual exercises
4. **plan_assignments**: Assigned workout plans
5. **commitments**: User commitments to routines

## Test Endpoints

The backend includes special test endpoints to facilitate data persistence testing:

- **POST** `/test/create-user` - Create a test user
- **POST** `/test/create-routine` - Create a test routine
- **POST** `/test/record-workout` - Record a workout session
- **GET** `/test/user/:userId` - Get user data
- **GET** `/test/routine/:routineId` - Get routine data
- **GET** `/test/workouts/:userId` - Get workout history
- **GET** `/test/chronic-load/:userId` - Calculate chronic load

## Test Procedure

### Prerequisites

1. Docker and Docker Compose installed
2. Application services running

### Step 1: Start Services

```bash
# Navigate to project root
cd c:\spartan hub

# Start services
docker compose up -d
```

### Step 2: Run Automated Test

On Windows, use the PowerShell script:
```powershell
.\test_data_persistence.ps1
```

On Linux/Mac, use the bash script:
```bash
chmod +x test_data_persistence.sh
./test_data_persistence.sh
```

### Step 3: Manual Testing

Alternatively, you can manually test using curl or Postman:

1. **Create a test user**:
   ```bash
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
   ```

2. **Note the returned user ID** from the response.

3. **Create a test routine** (replace USER_ID with actual user ID):
   ```bash
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

4. **Note the returned routine ID** from the response.

5. **Record a workout session**:
   ```bash
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

6. **Verify data before restart**:
   ```bash
   # Check user data
   curl http://localhost:3001/test/user/USER_ID

   # Check routine data
   curl http://localhost:3001/test/routine/ROUTINE_ID

   # Check workout history
   curl http://localhost:3001/test/workouts/USER_ID
   ```

7. **Restart services**:
   ```bash
   # Stop all services
   docker compose down

   # Start all services
   docker compose up -d

   # Wait for services to be ready
   sleep 10
   ```

8. **Verify data after restart** (repeat step 6)

## Expected Results

After restarting services:

1. **User Data**: All user information should be available
2. **Routine Data**: All created routines should be available
3. **Workout History**: All recorded workouts should be available
4. **Chronic Load**: Should be calculated correctly based on persisted workout history

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

### Manual Database Verification

You can directly inspect the SQLite database:

```bash
# Check if database file exists
docker exec synergycoach_backend ls -la /app/data/

# Check database tables
docker exec synergycoach_backend sqlite3 /app/data/spartan.db ".tables"

# Check user count
docker exec synergycoach_backend sqlite3 /app/data/spartan.db "SELECT COUNT(*) FROM users;"

# Check routine count
docker exec synergycoach_backend sqlite3 /app/data/spartan.db "SELECT COUNT(*) FROM routines;"
```

## Cleanup

After testing, you can clean up test data by deleting the database file:

```bash
# Stop services
docker compose down

# Remove database file
rm data/spartan.db

# Start services (new database will be created)
docker compose up -d
```

Note: This will remove ALL data, not just test data.

## Implementation Details

The data persistence is implemented through:

1. **SQLite Database**: Persistent storage in `data/spartan.db`
2. **Docker Volume**: The `data` directory is mounted as a volume in docker-compose.yml
3. **Proper Shutdown**: Docker Compose ensures proper shutdown of services
4. **File System Persistence**: Database file remains on the host file system

The test endpoints in [testController.ts](file:///c:/spartan%20hub/backend/src/controllers/testController.ts) provide a convenient way to create and verify test data without modifying the main application logic.