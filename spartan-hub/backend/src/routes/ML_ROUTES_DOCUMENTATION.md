# Phase 4.2: ML-Enhanced Injury Prediction Routes Documentation

## Overview

Phase 4.2 implements the HTTP API routes for ML-enhanced injury prediction, built on top of Phase 4.1 infrastructure. It provides RESTful endpoints for:

1. **Injury Risk Prediction** - ML predictions with Phase 3 fallback
2. **Explanation API** - SHAP-like feature importance analysis
3. **Model Status** - Real-time system health monitoring
4. **Feedback Collection** - Training data for model improvements

## Key Features

### 1. Hybrid Inference Architecture
- **Primary**: ML model prediction (injury probability 0-100, confidence 0-1)
- **Fallback**: Phase 3 rule-based analysis when ML unavailable
- **Seamless Degradation**: Always provides prediction (ML or fallback)
- **Confidence Tracking**: Clear indication of prediction source

### 2. Detailed Risk Analysis
- **Area-Specific Risks**: Lower body, upper body, core, cardiovascular (0-100)
- **Injury Type Identification**: 5 types with probability scores
- **Risk Factor Assessment**: 7 factors (training load, recovery, sleep, etc.)
- **Prevention Recommendations**: Actionable, factor-specific guidance

### 3. Interpretability
- **SHAP-like Values**: Feature importance ranking
- **Natural Explanations**: Human-readable risk factor analysis
- **Confidence Indicators**: Transparency on prediction reliability
- **Feedback Loop**: Users validate predictions for model improvement

## API Endpoints

### 1. POST /api/ml/injury-prediction
Main injury prediction endpoint with ML-enhanced analysis.

**Request Body**:
```json
{
  "trainingLoad": 1000,  // Optional: current weekly training load (0-10000)
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "injuryRisk": 65,                    // 0-100 risk score
    "riskLevel": "high",                 // "low", "moderate", "high", "critical"
    "confidence": 0.85,                  // 0-1 confidence (higher = more confident)
    "mlSource": true,                    // true=ML, false=Phase3 fallback
    "areaRisks": {
      "lowerBody": 75,                   // 0-100 risk per body area
      "upperBody": 45,
      "core": 55,
      "cardiovascular": 40
    },
    "injuryTypes": [
      {
        "type": "Muscle strain",
        "probability": 0.60,              // Likelihood of this injury type
        "affectedAreas": ["lower body"]
      },
      {
        "type": "Overuse injury",
        "probability": 0.30,
        "affectedAreas": ["lower body", "core"]
      }
    ],
    "riskFactors": {
      "highTrainingLoad": true,          // ACR > 1.3
      "inadequateRecovery": true,        // 3+ low recovery days
      "muscleImbalance": false,          // HRV variability > 20%
      "overusePattern": false,           // 4+ consecutive low recovery
      "inflammationMarkers": false,      // HRV < 80% baseline
      "sleepDeprivation": false,         // <6 hours for 2+ nights
      "rapidIntensityIncrease": false    // >20% week-over-week progression
    },
    "preventionRecommendations": [
      "Reduce training intensity by 20%",
      "Increase recovery time between sessions",
      "Focus on lower body mobility work"
    ]
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Status Codes**:
- `200 OK` - Prediction successful (ML or fallback)
- `400 Bad Request` - Insufficient biometric data (<7 days)
- `401 Unauthorized` - Missing/invalid authentication
- `429 Too Many Requests` - Rate limited (40 req/min)
- `500 Internal Server Error` - Service error

**Rate Limit**: 40 requests/minute (stricter than default)

**Authentication**: Required (Bearer token)

---

### 2. POST /api/ml/injury-prediction/explain
Detailed explanation endpoint with feature importance analysis (SHAP-like values).

**Request Body**:
```json
{
  // No required parameters, uses user's current biometric data
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "prediction": 70,                    // Risk score 0-100
    "riskLevel": "high",
    "confidence": 0.88,
    "featureImportance": {
      "acuteToChronicRatio": 0.25,      // Most important feature
      "recoveryScore": 0.20,
      "hrvVariability": 0.15,
      "sleepQuality": 0.15,
      "overusePattern": 0.20,
      "inflammationMarkers": 0.15,
      "rapidIntensity": 0.10
    },                                   // Sum = 1.0 (normalized)
    "riskFactors": {
      "highTrainingLoad": true,
      "inadequateRecovery": true,
      "muscleImbalance": false,
      "overusePattern": true,
      "inflammationMarkers": false,
      "sleepDeprivation": false,
      "rapidIntensityIncrease": true
    },
    "explanations": {
      "highTrainingLoad": "ACR > 1.3 indicates potential overtraining",
      "inadequateRecovery": "3+ days with low recovery score detected",
      "muscleImbalance": "Movement patterns appear balanced",
      "overusePattern": "Consecutive low recovery days detected",
      "inflammationMarkers": "HRV values within normal range",
      "sleepDeprivation": "Sleep duration adequate",
      "rapidIntensityIncrease": "Rapid intensity increase detected in training"
    }
  },
  "timestamp": "2025-01-15T10:32:00Z"
}
```

**Use Cases**:
- Understand which factors are driving injury risk
- Identify specific areas to address
- Get natural language explanations for each risk factor
- Support user education and behavior change

---

### 3. GET /api/ml/injury-prediction/model-status
Check ML system health and model performance metrics.

**Request**:
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://api.spartanhub.com/api/ml/injury-prediction/model-status
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "mlSystemReady": true,               // Overall system status
    "injuryPredictionModel": {
      "available": true,                 // Model loaded and ready
      "metrics": {
        "precision": 0.85,               // TP / (TP + FP) - correct positive predictions
        "recall": 0.78,                  // TP / (TP + FN) - detect actual injuries
        "f1": 0.81,                      // Harmonic mean of precision & recall
        "rocAuc": 0.88,                  // ROC-AUC score (0.5=random, 1.0=perfect)
        "accuracy": 0.83,                // Overall correctness
        "support": 1250,                 // Number of test samples
        "lastUpdated": "2025-01-10T00:00:00Z"
      }
    },
    "fallbackEnabled": true,             // Phase 3 fallback available
    "confidenceThreshold": 0.5,          // Minimum confidence for ML prediction
    "cacheEnabled": true,                // Prediction caching active
    "lastUpdated": "2025-01-15T10:30:00Z"
  },
  "timestamp": "2025-01-15T10:35:00Z"
}
```

**Interpretation**:
- `precision=0.85` - 85% of "high risk" predictions are correct
- `recall=0.78` - Catches 78% of actual injuries
- `f1=0.81` - Good balance between precision and recall
- `rocAuc=0.88` - Excellent discrimination ability

---

### 4. POST /api/ml/injury-prediction/feedback
Log user feedback on prediction accuracy for model improvement.

**Request Body**:
```json
{
  "predictionId": "pred_12345",           // ID of the prediction being validated
  "actualOutcome": "injury",              // "injury" or "no-injury"
  "feedback": "User experienced ankle sprain 3 days after prediction",
  "rating": 5                             // 1-5: How useful was the prediction?
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Feedback recorded successfully",
  "data": {
    "timestamp": "2025-01-15T10:40:00Z",
    "feedbackId": "feedback_1705317600000"
  }
}
```

**Validation**:
- `actualOutcome` must be "injury" or "no-injury"
- `rating` should be 1-5 (optional)
- Feedback stored for:
  - Model retraining
  - Accuracy monitoring
  - Bias detection

**Status Codes**:
- `200 OK` - Feedback recorded
- `400 Bad Request` - Invalid outcome value
- `401 Unauthorized` - Not authenticated
- `500 Internal Server Error` - Storage error

---

## Authentication & Rate Limiting

### Authentication
All endpoints require:
```bash
Authorization: Bearer <JWT_TOKEN>
```

Obtained from `/auth/login` endpoint with valid credentials.

### Rate Limiting
ML endpoints use stricter limits:
- **Normal endpoints**: 100 req/min
- **ML endpoints**: 40 req/min

Exceeded limit returns:
```json
{
  "status": 429,
  "error": "Too Many Requests",
  "retryAfter": 60
}
```

---

## Error Handling

### Common Errors

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid outcome (must be 'injury' or 'no-injury')"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "User not authenticated"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Error predicting injury risk",
  "error": "Model inference failed"
}
```

---

## Integration Examples

### JavaScript/TypeScript Client

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.spartanhub.com',
  headers: {
    'Authorization': `Bearer ${authToken}`
  }
});

// Get injury prediction
async function predictInjuryRisk() {
  try {
    const response = await apiClient.post('/api/ml/injury-prediction', {
      trainingLoad: 1200
    });
    
    const { data } = response.data;
    console.log(`Risk Level: ${data.riskLevel}`);
    console.log(`Risk Score: ${data.injuryRisk}/100`);
    console.log(`Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    
    return data;
  } catch (error) {
    console.error('Prediction failed:', error);
  }
}

// Get explanation
async function getExplanation() {
  try {
    const response = await apiClient.post('/api/ml/injury-prediction/explain');
    const { data } = response.data;
    
    console.log('Feature Importance:');
    Object.entries(data.featureImportance).forEach(([feature, importance]) => {
      console.log(`  ${feature}: ${(importance * 100).toFixed(1)}%`);
    });
  } catch (error) {
    console.error('Explanation failed:', error);
  }
}

// Log feedback
async function logFeedback(predictionId: string, outcome: 'injury' | 'no-injury') {
  try {
    await apiClient.post('/api/ml/injury-prediction/feedback', {
      predictionId,
      actualOutcome: outcome,
      feedback: 'User confirmed the outcome',
      rating: 4
    });
  } catch (error) {
    console.error('Feedback submission failed:', error);
  }
}
```

### cURL Examples

```bash
# Get prediction
curl -X POST https://api.spartanhub.com/api/ml/injury-prediction \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"trainingLoad": 1200}'

# Get explanation
curl -X POST https://api.spartanhub.com/api/ml/injury-prediction/explain \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check model status
curl https://api.spartanhub.com/api/ml/injury-prediction/model-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Submit feedback
curl -X POST https://api.spartanhub.com/api/ml/injury-prediction/feedback \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "predictionId": "pred_12345",
    "actualOutcome": "injury",
    "rating": 4
  }'
```

---

## Data Flow

```
User Request
    ↓
[Authentication Middleware]
    ↓
[Rate Limiter (40 req/min)]
    ↓
[ML Injury Prediction Route Handler]
    ├─ Fetch user biometric history (90 days)
    ├─ Validate data (min 7 days)
    ├─ Extract features (36 features)
    ├─ Call InjuryPredictionModel.predict()
    │   ├─ Call MLInferenceService
    │   │   ├─ Try ML model prediction
    │   │   └─ Fallback to Phase 3 if needed
    │   ├─ Assess 7 risk factors
    │   ├─ Calculate area-specific risks
    │   ├─ Identify injury types
    │   └─ Generate recommendations
    ├─ Log request (for monitoring)
    └─ Return structured response
    ↓
Response (JSON)
```

---

## Performance Characteristics

### Latency
- **Typical**: 200-500ms
- **With ML model**: 300-500ms
- **With Phase 3 fallback**: 200-300ms
- **Cached predictions**: 50-100ms

### Throughput
- **Per user**: 40 req/min (API limit)
- **Per instance**: Depends on ML model size
- **Concurrent users**: Scales with backend capacity

### Storage
- Feedback data: ~100 bytes per entry
- Prediction cache: ~500 bytes per entry (1 hour TTL)
- Logs: ~1KB per request

---

## Monitoring & Alerts

### Key Metrics to Monitor
1. **Prediction Accuracy** (from feedback data)
   - Injury precision: Target >85%
   - Injury recall: Target >75%
   
2. **System Health**
   - ML model availability: Should be 99.9%+
   - Average inference latency: <500ms
   - Error rate: <1%
   
3. **User Engagement**
   - Feedback submission rate
   - Prediction utilization

### Alert Thresholds
- ML unavailability >5 minutes → Alert
- Latency >1000ms → Warning
- Error rate >5% → Alert
- Feedback suggests systematic bias → Alert

---

## Testing

### Run Tests
```bash
# Run all route tests
npm test -- mlInjuryPredictionRoutes

# Run with coverage
npm test -- mlInjuryPredictionRoutes --coverage

# Run specific test suite
npm test -- mlInjuryPredictionRoutes.test.ts -t "POST /api/ml/injury-prediction"
```

### Test Coverage
- ✅ POST /api/ml/injury-prediction
  - Valid prediction response
  - Phase 3 fallback behavior
  - Insufficient data handling
  - Authentication validation
  - Critical injury recommendations
  
- ✅ POST /api/ml/injury-prediction/explain
  - SHAP value calculation
  - Feature importance ranking
  - Risk factor explanations
  - Unauthenticated requests
  
- ✅ GET /api/ml/injury-prediction/model-status
  - Model availability reporting
  - Metrics accuracy
  - Model unavailability handling
  
- ✅ POST /api/ml/injury-prediction/feedback
  - Feedback logging
  - Outcome validation
  - Both outcome types

- ✅ Cross-cutting
  - Rate limiting enforcement
  - Error handling
  - Response format consistency
  - Timestamp inclusion

---

## Deployment

### Prerequisites
- Phase 4.1 ML infrastructure running
- ONNX model files available
- PostgreSQL/SQLite database
- Redis cache (optional, for distributed caching)

### Configuration (`.env.ml`)
```
ML_ENABLED=true
ML_MODEL_INJURY_PREDICTION=./models/injury_prediction.onnx
ML_MODEL_CONFIDENCE_THRESHOLD=0.5
ML_CACHE_TTL=3600
ML_FALLBACK_ENABLED=true
```

### Deployment Checklist
- [ ] ML models downloaded and verified
- [ ] ML infrastructure tests passing (35+ tests)
- [ ] Route tests passing (20+ tests)
- [ ] Load testing completed (<100ms p99)
- [ ] Error handling validated
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Monitoring/alerting set up
- [ ] Documentation reviewed
- [ ] User communications prepared

---

## Future Enhancements

### Phase 4.3
- Training Recommendation ML model
- Personalized 7-day plans
- LSTM-based pattern learning

### Phase 4.4
- Performance Forecasting
- SARIMA/Prophet models
- 12-week projections with confidence intervals

### Phase 4.5
- Advanced testing & benchmarking
- Production deployment guide
- Model retraining pipeline

---

## Troubleshooting

### "Insufficient biometric data"
- **Cause**: User has <7 days of data
- **Solution**: Collect more biometric data before prediction
- **Workaround**: Use Phase 3 fallback (automatic)

### "Model inference failed"
- **Cause**: ML model unavailable or corrupted
- **Solution**: Restart service, verify model files
- **Fallback**: Automatically uses Phase 3

### High latency (>1000ms)
- **Cause**: ML model inference, feature engineering
- **Solution**: Check system resources, enable caching
- **Workaround**: Pre-compute features during off-hours

### Rate limit exceeded (429)
- **Cause**: >40 requests/minute per user
- **Solution**: Implement client-side request batching
- **Alternative**: Increase limit in production (with justification)

---

## Support & References

**Related Documentation**:
- [Phase 4.1 ML Infrastructure](../ml/README.md)
- [InjuryPredictionModel](../ml/models/injuryPredictionModel.ts)
- [MLInferenceService](../ml/services/mlInferenceService.ts)
- [Feature Engineering](../ml/services/featureEngineeringService.ts)

**API Specification**:
- Swagger/OpenAPI docs: `/api-docs`
- Postman collection: [coming soon]
- GraphQL schema: [future enhancement]

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-15  
**Status**: Production Ready
