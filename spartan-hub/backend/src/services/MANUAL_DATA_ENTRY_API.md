
# Garmin Manual Data Entry - API Documentation

## Overview

The Garmin Manual Data Entry feature provides API endpoints for users to manually enter biometric data when Garmin API credentials are not yet available. This serves as a temporary workaround while API credentials are being configured.

## Base URL

```
/api/wearables/garmin/manual
```

## Authentication

All endpoints require:
- **Authorization Header**: JWT token in `Authorization: Bearer <token>`
- **Rate Limiting**: Applied to all endpoints (see backend rate limiting configuration)

## Endpoints

### 1. Add Manual Heart Rate

**Endpoint**: `POST /api/wearables/garmin/manual/heart-rate`

**Description**: Add a manual heart rate measurement

**Request Body**:
```json
{
  "deviceId": "string",
  "timestamp": "number (milliseconds)",
  "value": "number (0-250 bpm)",
  "unit": "string (optional, default: 'bpm')"
}
```

**Validation**:
- `deviceId`: Required, non-empty string
- `timestamp`: Required, valid timestamp (not in future)
- `value`: Required, 0-250 bpm range
- `unit`: Optional, default is 'bpm'

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "deviceId": "string",
    "dataType": "heart_rate",
    "value": 72,
    "unit": "bpm",
    "timestamp": 1704067200000,
    "source": "garmin_manual",
    "device": "garmin",
    "confidence": 1.0,
    "createdAt": 1704067200000
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input (heart rate out of range, invalid timestamp)
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database or server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/wearables/garmin/manual/heart-rate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "garmin-device-1",
    "timestamp": 1704067200000,
    "value": 72,
    "unit": "bpm"
  }'
```

---

### 2. Add Manual Sleep

**Endpoint**: `POST /api/wearables/garmin/manual/sleep`

**Description**: Add manual sleep data for a day

**Request Body**:
```json
{
  "deviceId": "string",
  "date": "string (YYYY-MM-DD)",
  "startTime": "number (unix timestamp in seconds)",
  "endTime": "number (unix timestamp in seconds)",
  "duration": "number (optional, in seconds)",
  "quality": "string (optional, POOR|FAIR|GOOD|EXCELLENT)",
  "notes": "string (optional)"
}
```

**Validation**:
- `deviceId`: Required, non-empty string
- `date`: Required, valid date in YYYY-MM-DD format
- `startTime`: Required, unix timestamp
- `endTime`: Required, must be > startTime
- `duration`: Optional, auto-calculated from startTime/endTime if not provided
- `quality`: Optional, one of POOR (0.6), FAIR (0.75), GOOD (0.9), EXCELLENT (1.0)
- `notes`: Optional, up to 500 characters

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "deviceId": "string",
    "dataType": "sleep_duration",
    "value": 8,
    "unit": "hours",
    "timestamp": 1704067200000,
    "source": "garmin_manual",
    "device": "garmin",
    "confidence": 0.9,
    "metadata": {
      "quality": "GOOD",
      "startTime": 1704038400,
      "endTime": 1704067200
    },
    "createdAt": 1704067200000
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid date format, endTime <= startTime, etc.
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database or server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/wearables/garmin/manual/sleep \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "garmin-device-1",
    "date": "2026-01-24",
    "startTime": 1704038400,
    "endTime": 1704067200,
    "duration": 28800,
    "quality": "GOOD"
  }'
```

---

### 3. Add Manual Activity

**Endpoint**: `POST /api/wearables/garmin/manual/activity`

**Description**: Add manual activity/exercise data

**Request Body**:
```json
{
  "deviceId": "string",
  "date": "string (YYYY-MM-DD)",
  "name": "string (required, e.g., 'Running')",
  "startTime": "number (unix timestamp in seconds)",
  "duration": "number (in seconds)",
  "calories": "number (optional, kcal)",
  "distance": "number (optional, meters)",
  "steps": "number (optional)",
  "avgHeartRate": "number (optional, bpm)",
  "maxHeartRate": "number (optional, bpm)",
  "minHeartRate": "number (optional, bpm)",
  "notes": "string (optional)"
}
```

**Validation**:
- `deviceId`: Required, non-empty string
- `date`: Required, valid date in YYYY-MM-DD format
- `name`: Required, non-empty string
- `startTime`: Required, unix timestamp
- `duration`: Required, > 0 seconds
- `calories`: Optional, >= 0
- `distance`: Optional, >= 0 meters
- `steps`: Optional, >= 0
- Heart rates: Optional, 0-250 bpm range

**Response (201 Created)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "userId": "string",
      "deviceId": "string",
      "dataType": "distance",
      "value": 5000,
      "unit": "meters",
      "timestamp": 1704063600000,
      "source": "garmin_manual",
      "device": "garmin",
      "confidence": 0.9,
      "createdAt": 1704063600000
    },
    {
      "id": "string",
      "dataType": "calories",
      "value": 500,
      "unit": "kcal",
      "confidence": 0.85
    },
    {
      "id": "string",
      "dataType": "steps",
      "value": 5500,
      "unit": "count",
      "confidence": 0.8
    },
    {
      "id": "string",
      "dataType": "heart_rate_avg",
      "value": 140,
      "unit": "bpm",
      "confidence": 0.9
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields, invalid date, activity name empty, etc.
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database or server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/wearables/garmin/manual/activity \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "garmin-device-1",
    "date": "2026-01-24",
    "name": "Running",
    "startTime": 1704063600,
    "duration": 3600,
    "calories": 500,
    "distance": 5000,
    "steps": 5500,
    "avgHeartRate": 140,
    "maxHeartRate": 160
  }'
```

---

### 4. Add Manual Stress

**Endpoint**: `POST /api/wearables/garmin/manual/stress`

**Description**: Add manual stress level data

**Request Body**:
```json
{
  "deviceId": "string",
  "date": "string (YYYY-MM-DD)",
  "dayAverage": "number (0-100)",
  "minStress": "number (optional, 0-100)",
  "maxStress": "number (optional, 0-100)",
  "notes": "string (optional)"
}
```

**Validation**:
- `deviceId`: Required, non-empty string
- `date`: Required, valid date in YYYY-MM-DD format
- `dayAverage`: Required, 0-100 stress index
- `minStress`: Optional, 0-100
- `maxStress`: Optional, 0-100
- `notes`: Optional, up to 500 characters

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "string",
    "userId": "string",
    "deviceId": "string",
    "dataType": "stress_level",
    "value": 45,
    "unit": "index",
    "timestamp": 1704067200000,
    "source": "garmin_manual",
    "device": "garmin",
    "confidence": 0.95,
    "metadata": {
      "minStress": 20,
      "maxStress": 75
    },
    "createdAt": 1704067200000
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid stress values (outside 0-100), invalid date format
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database or server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/wearables/garmin/manual/stress \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "garmin-device-1",
    "date": "2026-01-24",
    "dayAverage": 45,
    "minStress": 20,
    "maxStress": 75
  }'
```

---

### 5. Get Manual Data Entries

**Endpoint**: `GET /api/wearables/garmin/manual/data`

**Description**: Retrieve manual data entries with optional filtering

**Query Parameters**:
- `startDate`: Optional, date string (YYYY-MM-DD) or ISO 8601 timestamp
- `endDate`: Optional, date string (YYYY-MM-DD) or ISO 8601 timestamp
- `dataType`: Optional, filter by data type (heart_rate, sleep_duration, steps, calories, etc.)
- `limit`: Optional, max results (default: 100, max: 1000)
- `offset`: Optional, pagination offset (default: 0)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "userId": "string",
      "deviceId": "string",
      "dataType": "heart_rate",
      "value": 72,
      "unit": "bpm",
      "timestamp": 1704067200000,
      "source": "garmin_manual",
      "device": "garmin",
      "confidence": 1.0,
      "createdAt": 1704067200000
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid date format, invalid dataType
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database or server error

**Example**:
```bash
curl -X GET "http://localhost:3000/api/wearables/garmin/manual/data?startDate=2026-01-20&endDate=2026-01-25&dataType=heart_rate&limit=50" \
  -H "Authorization: Bearer <token>"
```

---

### 6. Bulk Import Manual Data

**Endpoint**: `POST /api/wearables/garmin/manual/bulk-import`

**Description**: Import multiple data points at once (CSV, JSON batch)

**Request Body**:
```json
{
  "deviceId": "string",
  "dataPoints": [
    {
      "timestamp": "number (milliseconds)",
      "dataType": "string (heart_rate, sleep_duration, steps, etc.)",
      "value": "number",
      "unit": "string (optional)",
      "confidence": "number (optional, 0-1)",
      "notes": "string (optional)"
    }
  ]
}
```

**Validation**:
- `deviceId`: Required, non-empty string
- `dataPoints`: Required, non-empty array
- Each data point must have: timestamp, dataType, value
- Invalid data points are skipped with error tracking

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "imported": 47,
    "skipped": 3,
    "errors": [
      {
        "index": 1,
        "reason": "Invalid timestamp"
      },
      {
        "index": 15,
        "reason": "Value must be a number"
      },
      {
        "index": 28,
        "reason": "Timestamp is in the future"
      }
    ]
  }
}
```

**Error Responses**:
- `400 Bad Request`: Empty dataPoints array, missing deviceId
- `401 Unauthorized`: Missing or invalid JWT token
- `500 Internal Server Error`: Database or server error

**Example**:
```bash
curl -X POST http://localhost:3000/api/wearables/garmin/manual/bulk-import \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "garmin-device-1",
    "dataPoints": [
      {
        "timestamp": 1704067200000,
        "dataType": "heart_rate",
        "value": 72,
        "unit": "bpm",
        "confidence": 0.95
      },
      {
        "timestamp": 1704063600000,
        "dataType": "steps",
        "value": 8500,
        "unit": "count",
        "confidence": 0.9
      },
      {
        "timestamp": 1704050400000,
        "dataType": "calories",
        "value": 2300,
        "unit": "kcal",
        "confidence": 0.85
      }
    ]
  }'
```

---

## Data Types Supported

| Data Type | Unit | Range/Notes | Confidence |
|-----------|------|-------------|-----------|
| `heart_rate` | bpm | 0-250 | 1.0 |
| `heart_rate_avg` | bpm | 0-250 | 0.9 |
| `heart_rate_max` | bpm | 0-250 | 0.85 |
| `heart_rate_min` | bpm | 0-250 | 0.85 |
| `sleep_duration` | hours | 0-24 | varies by quality |
| `steps` | count | 0+ | 0.8 |
| `distance` | meters | 0+ | 0.9 |
| `calories` | kcal | 0+ | 0.85 |
| `stress_level` | index | 0-100 | 0.95 |
| `pace` | min/km | 0+ | 0.85 |

---

## Confidence Scores

Confidence scores indicate data reliability:

- **1.0**: Direct user entry, high certainty (heart rate)
- **0.95**: Calculated from precise inputs (stress)
- **0.9**: Good quality input (distance, avg HR)
- **0.85**: Derived or moderate quality (calories, max HR)
- **0.8**: Estimated data (steps, pace)
- **0.6-0.75**: Lower quality sleep (POOR/FAIR quality)

---

## Error Handling

### Common Error Codes

| Code | Message | Cause |
|------|---------|-------|
| 400 | Invalid input | Validation failed (see details in response) |
| 401 | Unauthorized | Missing/invalid JWT token |
| 422 | Unprocessable Entity | Data validation failed |
| 500 | Internal Server Error | Database or server issue |

### Error Response Format

```json
{
  "success": false,
  "message": "Heart rate must be between 0 and 250 bpm",
  "statusCode": 400,
  "details": {
    "field": "value",
    "reason": "out of range"
  }
}
```

---

## Rate Limiting

All endpoints are subject to rate limiting:
- **Default**: 100 requests per 15 minutes per user
- **Bulk import**: 10 requests per 15 minutes per user

Rate limit info in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1704069600
```

---

## Usage Examples

### TypeScript Client

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:3000/api/wearables/garmin/manual',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Add heart rate
const heartRateResponse = await client.post('/heart-rate', {
  deviceId: 'garmin-watch-1',
  timestamp: Date.now(),
  value: 72,
  unit: 'bpm'
});

// Add activity
const activityResponse = await client.post('/activity', {
  deviceId: 'garmin-watch-1',
  date: '2026-01-24',
  name: 'Running',
  startTime: Math.floor(Date.now() / 1000) - 3600,
  duration: 3600,
  distance: 5000,
  calories: 500
});

// Get entries
const entriesResponse = await client.get('/data', {
  params: {
    startDate: '2026-01-20',
    endDate: '2026-01-25',
    dataType: 'heart_rate'
  }
});

// Bulk import
const bulkResponse = await client.post('/bulk-import', {
  deviceId: 'garmin-watch-1',
  dataPoints: [
    { timestamp: Date.now(), dataType: 'heart_rate', value: 72 },
    { timestamp: Date.now() - 3600000, dataType: 'steps', value: 8500 }
  ]
});
```

---

## Source Tracking

All manual data is tagged with:
- **Source**: `garmin_manual` (to distinguish from API data)
- **Device**: `garmin`

This allows the system to:
- Differentiate manual vs API-driven data
- Track data entry methods
- Maintain data provenance
- Enable future Garmin API integration without data conflicts

---

## Database Schema

Manual data is stored in the existing `biometric_data_points` table:

```sql
CREATE TABLE biometric_data_points (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  deviceId TEXT NOT NULL,
  dataType TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'garmin_manual',
  device TEXT NOT NULL DEFAULT 'garmin',
  confidence REAL,
  metadata TEXT,
  createdAt INTEGER,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

---

## Next Steps

1. **Garmin API Integration**: When API credentials are available, API data will be tagged with `source: 'garmin'` while manual data remains `source: 'garmin_manual'`
2. **Data Reconciliation**: System will handle both sources seamlessly
3. **Web UI**: Frontend forms for easy manual data entry
4. **CSV Import**: Support for exporting/importing via CSV files

---

## Support

For questions or issues with manual data entry, contact:
- Developer: [Your name/team]
- Status: Phase 5.1.2 Implementation
- Last Updated: 2026-01-24
