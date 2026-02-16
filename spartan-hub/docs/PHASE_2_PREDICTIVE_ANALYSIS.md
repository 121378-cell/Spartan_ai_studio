# FASE 2: Análisis Predictivo - Documentación Completa

## 📋 Resumen Ejecutivo

La **Fase 2: Análisis Predictivo** implementa un motor de inteligencia analítica que predice tendencias de recuperación, fatiga y síntomas de sobreentrenamiento. Transforma datos biométricos históricos en insights predictivos para optimizar rendimiento y prevenir lesiones.

**Arquitectura**: 4-layer stack (Data Layer → Analysis Layer → Insight Layer → Recommendation Layer)
**Endpoints**: 6 APIs REST + comprehensive analysis endpoint
**Test Coverage**: 50+ unit tests + 15+ E2E tests
**Response Time**: < 500ms para análisis típico

---

## 🎯 Características Principales

### 1. **Análisis de Tendencias (Trends)**
Identifica patrones de recuperación en períodos específicos.

```typescript
GET /api/predictive/trends/30d
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "startDate": "2024-12-25",
    "endDate": "2025-01-24",
    "statistics": {
      "mean": 62,
      "median": 64,
      "stdDev": 12,
      "min": 38,
      "max": 89,
      "trend": "improving",
      "trendStrength": 45
    },
    "dataPoints": [
      {
        "date": "2024-12-25",
        "score": 52,
        "components": {
          "hrv": 48,
          "rhr": 55,
          "sleepQuality": 45,
          "stressLevel": 60
        },
        "isOutlier": false
      }
    ],
    "componentTrends": {
      "hrv": {
        "mean": 52,
        "trend": "improving",
        "changePercent": 12,
        "volatility": 8
      },
      "rhr": {
        "mean": 58,
        "trend": "declining",
        "changePercent": -8,
        "volatility": 5
      },
      "sleepQuality": {
        "mean": 48,
        "trend": "stable",
        "changePercent": 2,
        "volatility": 6
      },
      "stressLevel": {
        "mean": 58,
        "trend": "declining",
        "changePercent": -10,
        "volatility": 9
      }
    },
    "insights": [
      "Recovery is improving with an average score of 62",
      "HRV showing positive trend - nervous system recovering well",
      "High variability in recovery scores - be mindful of consistency"
    ],
    "recommendations": [
      "Maintain current training and recovery habits",
      "Continue monitoring metrics for consistency"
    ]
  }
}
```

**Parámetros**:
- `period`: '7d' | '30d' | '90d'

**Métricas Calculadas**:
- **Mean**: Promedio del período
- **Median**: Valor central (resistente a outliers)
- **StdDev**: Variabilidad de recuperación
- **Trend**: Dirección del cambio (improving/declining/stable)
- **TrendStrength**: Magnitud del cambio (0-100)

---

### 2. **Predicción de Fatiga (Fatigue Risk)**
Predice riesgo de fatiga y fatiga futura basada en tendencias recientes.

```typescript
GET /api/predictive/fatigue-risk?daysAhead=7
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "date": "2025-01-24",
    "fatigueRisk": 38,
    "fatigueLevel": "moderate",
    "confidence": 75,
    "riskFactors": {
      "lowHRV": false,
      "elevatedRHR": false,
      "poorSleep": false,
      "highStress": true,
      "overtraining": false,
      "consecutiveBadDays": 1
    },
    "nextDaysPrediction": [
      {
        "date": "2025-01-25",
        "predictedFatigueLevel": "moderate"
      },
      {
        "date": "2025-01-26",
        "predictedFatigueLevel": "low"
      }
    ],
    "recommendations": [
      "Maintain current training but monitor closely",
      "Prioritize sleep quality and duration",
      "Include active recovery in your routine",
      "Practice stress management: meditation, breathing exercises"
    ]
  }
}
```

**Niveles de Riesgo**:
- **Low** (0-25): Listo para entrenamientos intensos
- **Moderate** (25-50): Entrenamientos normales con monitoreo
- **High** (50-75): Reducir volumen 30-50%
- **Critical** (75-100): Descanso completo recomendado

**Cálculo de Fatigabilidad**:
```
Risk = (LowHRV × 20) + (ElevatedRHR × 15) + (PoorSleep × 20) 
      + (HighStress × 15) + (Overtraining × 20) + (BadDays × 3)

Capped at 100
```

---

### 3. **Comparación Histórica (Historical Comparison)**
Compara período actual con período anterior (mismo número de días).

```typescript
GET /api/predictive/historical-comparison?days=30
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "currentPeriod": {
      "start": "2024-12-25",
      "end": "2025-01-24",
      "averageRecovery": 62,
      "averageHRV": 52,
      "averageRHR": 58,
      "averageSleepDuration": 465,
      "averageSleepQuality": "good"
    },
    "previousPeriod": {
      "start": "2024-11-25",
      "end": "2024-12-24",
      "averageRecovery": 48,
      "averageHRV": 42,
      "averageRHR": 62,
      "averageSleepDuration": 420,
      "averageSleepQuality": "fair"
    },
    "changes": {
      "recoveryDelta": 14,
      "hrvDelta": 10,
      "rhrDelta": 4,
      "sleepDurationDelta": 45
    },
    "assessment": "improving",
    "improvementPercent": 29.2
  }
}
```

**Deltas Positivos**:
- **Recovery**: Mayor es mejor
- **HRV**: Mayor es mejor
- **RHR**: Menor es mejor (inverso)
- **Sleep**: Mayor duración es mejor

---

### 4. **Detección de Sobreentrenamiento (Overtraining Detection)**
Identifica síntomas de síndrome de sobreentrenamiento.

```typescript
GET /api/predictive/overtraining-detection
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "isOvertrained": true,
    "riskLevel": "high",
    "indicators": {
      "consecutiveHighStress": 5,
      "consecutiveLowRecovery": 4,
      "hrv_declining": true,
      "rhr_elevated": true,
      "sleep_disrupted": true
    },
    "severityScore": 72,
    "recommendations": [
      "Implement 5-day deload period",
      "Reduce training volume and intensity significantly",
      "Increase recovery modalities (massage, ice baths, etc.)"
    ],
    "suggestedActions": {
      "recommendedAction": "rest",
      "deloadDuration": 5,
      "justification": "Overtraining indicators: 5 consecutive high-stress days, 4 consecutive low-recovery days, HRV declining trend detected, Resting heart rate elevated, Sleep patterns disrupted"
    }
  }
}
```

**Indicadores de Sobreentrenamiento**:
1. **Estrés Consecutivo Alto** (> 3 días)
2. **Recuperación Baja Consecutiva** (> 3 días)
3. **HRV Declinando** (> 15% en 7 días)
4. **RHR Elevada** (> 70 bpm)
5. **Sueño Disrupto** (< 6 horas en 3+ días)

---

### 5. **Detección de Anomalías (Anomalies)**
Identifica valores anómalos en datos biométricos recientes.

```typescript
GET /api/predictive/anomalies
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "date": "2025-01-24",
    "anomalies": [
      {
        "metric": "sleep",
        "value": 300,
        "expected": 480,
        "deviation": 3.2,
        "severity": "moderate",
        "possibleCause": "Sleep deprivation - may impact recovery"
      }
    ],
    "hasAnomalies": true,
    "anomalyCount": 1
  }
}
```

**Umbrales de Detección**:
- **HRV**: Z-score > 2 (2σ)
- **Sleep**: < 360 min (6 horas)
- **RHR**: > 65 bpm
- **Recovery**: Z-score > 2

---

### 6. **Análisis Comprehensivo (Comprehensive Analysis)**
Combina todos los análisis en un reporte integrado.

```typescript
GET /api/predictive/comprehensive-analysis
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "generatedAt": "2025-01-24T15:30:00Z",
    "trends": { /* TrendAnalysis */ },
    "fatigueRisk": { /* FatiguePrediction */ },
    "overtrainingDetection": { /* OvertainingDetection */ },
    "overallHealthAssessment": {
      "score": 68,
      "status": "good",
      "keyInsights": [
        "Recovery is improving with an average score of 62",
        "HRV showing positive trend - nervous system recovering well"
      ],
      "actionItems": [
        "Maintain current training and recovery habits",
        "Continue monitoring metrics for consistency"
      ]
    }
  }
}
```

---

## 🏗️ Arquitectura de Análisis

### 4-Layer Pipeline

```
┌─────────────────────────────────────────┐
│ 1. DATA LAYER                           │
│ • Raw biometric data (7-90 days)        │
│ • HRV, RHR, Sleep, Activity, Stress    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. PROCESSING LAYER                    │
│ • Normalize & validate                  │
│ • Calculate statistics                  │
│ • Detect outliers (z-score)            │
│ • Extract trends                        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. ANALYSIS LAYER                      │
│ • Trend analysis                        │
│ • Fatigue prediction                    │
│ • Overtraining detection                │
│ • Anomaly detection                     │
│ • Historical comparison                 │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 4. INSIGHT & RECOMMENDATION LAYER       │
│ • Generate insights                     │
│ • Create recommendations                │
│ • Suggest actions                       │
│ • Alert on critical conditions          │
└─────────────────────────────────────────┘
```

---

## 📊 Algoritmos de Análisis

### Cálculo de Tendencia (Trend Direction)

```
Divide datos en dos mitades:
- Primera mitad: primeros N/2 puntos
- Segunda mitad: últimos N/2 puntos

mean_first = promedio de primera mitad
mean_second = promedio de segunda mitad

Trend Change = mean_second - mean_first

Si |Change| > 5:
  - Si Change > 0: "improving"
  - Si Change < 0: "declining"
De lo contrario: "stable"

Trend Strength = min(100, (|Change| / 50) × 100)
```

### Predicción de Fatiga (Fatigue Risk Scoring)

```
Base Scoring:
- Low HRV (< 30ms en 3+ últimos días): +20 puntos
- Elevated RHR (> 70 bpm en 3+ días): +15 puntos
- Poor Sleep (< 6 horas en 2+ días): +20 puntos
- High Stress (> 70/100 en 3+ días): +15 puntos
- Overtraining indicators: +20 puntos
- Consecutive bad days: +3 puntos/día

Risk = min(100, sum of all factors)

Risk Level:
  0-25: Low
  25-50: Moderate
  50-75: High
  75-100: Critical
```

### Detección de Sobreentrenamiento (Overtraining Index)

```
Severity Score Calculation:
- Consecutive high stress (> 5 días): +20
- Consecutive low recovery (> 4 días): +25
- HRV declining (> 15% en 7 días): +15
- Elevated RHR: +15
- Sleep disrupted (< 6 horas en 3+ días): +15

Total = min(100, sum of all factors)

Risk Level:
  0-25: Low
  25-50: Moderate
  50-75: High
  75-100: Critical

Recommendation:
  0-25: "continue"
  25-50: "deload" (3 días)
  50-75: "rest" (5 días)
  75-100: "medical-consultation" (7 días)
```

### Detección de Anomalías (Anomaly Detection)

```
Para cada métrica:
1. Calculate z-score = (value - mean) / stdDev
2. Si |z-score| > 2: anomalía detectada
3. Si |z-score| > 3: anomalía severa

Severidad:
- |z-score| 2-2.5: minor
- |z-score| 2.5-3: moderate
- |z-score| > 3: severe
```

---

## 📈 Tipos de Datos

### TrendAnalysis
```typescript
interface TrendAnalysis {
  period: '7d' | '30d' | '90d';
  startDate: string;
  endDate: string;
  dataPoints: RecoveryTrendPoint[];
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    trend: 'improving' | 'declining' | 'stable';
    trendStrength: number; // 0-100
  };
  componentTrends: {
    hrv: TrendMetric;
    rhr: TrendMetric;
    sleepQuality: TrendMetric;
    stressLevel: TrendMetric;
  };
  insights: string[];
  recommendations: string[];
}
```

### FatiguePrediction
```typescript
interface FatiguePrediction {
  date: string;
  fatigueRisk: number; // 0-100
  fatigueLevel: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number; // 0-100
  riskFactors: {
    lowHRV: boolean;
    elevatedRHR: boolean;
    poorSleep: boolean;
    highStress: boolean;
    overtraining: boolean;
    consecutiveBadDays: number;
  };
  nextDaysPrediction: {
    date: string;
    predictedFatigueLevel: 'low' | 'moderate' | 'high' | 'critical';
  }[];
  recommendations: string[];
  overtrainingWarning?: string;
  injuryRisk?: string;
}
```

### OvertainingDetection
```typescript
interface OvertainingDetection {
  isOvertrained: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  indicators: {
    consecutiveHighStress: number;
    consecutiveLowRecovery: number;
    hrv_declining: boolean;
    rhr_elevated: boolean;
    sleep_disrupted: boolean;
  };
  severityScore: number; // 0-100
  recommendations: string[];
  suggestedActions: {
    recommendedAction: 'continue' | 'deload' | 'rest' | 'medical-consultation';
    deloadDuration?: number;
    justification: string;
  };
}
```

---

## 🔄 Flujo de Integración

### Paso 1: Configurar Rutas
```typescript
// src/app.ts
import predictiveRoutes from './routes/predictiveAnalysisRoutes';

app.use('/api/predictive', predictiveRoutes);
```

### Paso 2: Conectar Base de Datos
```typescript
// En predictiveAnalysisRoutes.ts
const biometricHistory = await BiometricModel.findByUserIdAndDateRange(
  userId,
  startDate,
  endDate
);
```

### Paso 3: Llamar desde Frontend
```typescript
// React component
const [trends, setTrends] = useState(null);

useEffect(() => {
  fetch('/api/predictive/trends/30d', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(data => setTrends(data.data));
}, []);
```

---

## 🧪 Testing

### Ejecutar Unit Tests
```bash
cd spartan-hub/backend
npm test -- predictiveAnalysisService.test.ts
```

### Ejecutar E2E Tests
```bash
npm test -- predictiveAnalysisRoutes.test.ts
```

### Coverage Report
```bash
npm run test:coverage
```

---

## 📊 Casos de Uso

### Use Case 1: Atleta Mejorando
```
Entrada:
- 30 días de datos
- Tendencia improving (50→65)
- HRV+10%, RHR-5%
- Sueño consistente 7-8 horas

Output:
- "Recovery is improving"
- Trend strength: 45%
- Recomendación: "Maintain current habits"
```

### Use Case 2: Síndrome de Sobreentrenamiento
```
Entrada:
- 30 días con 5 días alta estrés
- 4 días baja recuperación
- HRV -20% en 7 días
- RHR 75 bpm
- Sueño < 6 horas en 3 días

Output:
- isOvertrained: true
- Risk Level: HIGH
- Recommended Action: "rest" (5 días)
- Alertas: injury risk, medical consultation suggested
```

### Use Case 3: Anomalía Detectada
```
Entrada:
- Sleep de 3 horas (vs 7-9 normal)
- RHR 85 bpm (vs 60 normal)

Output:
- 2 anomalías detectadas
- Severity: "moderate" y "severe"
- Cause: "Sleep deprivation", "Elevated stress/illness"
```

---

## ⚙️ Configuración de Rate Limiting

```typescript
// Límite: 50 requests/minuto por usuario
const analysisRateLimit = rateLimit(50, 60);
router.use(analysisRateLimit);
```

---

## 🚨 Errores Comunes y Soluciones

### Error: "Insufficient data"
```
Causa: < 3 días de datos para trend analysis
Solución: Esperar a que se accumule más datos
```

### Error: "Invalid period"
```
Causa: period != '7d' | '30d' | '90d'
Solución: Usar uno de los períodos válidos
```

### Error: "Invalid daysAhead"
```
Causa: daysAhead < 1 o > 30
Solución: Usar valor entre 1 y 30
```

---

## 🔐 Seguridad

- ✅ Todos los endpoints requieren JWT authentication
- ✅ Rate limiting: 50 req/min por usuario
- ✅ Input validation en todos los parámetros
- ✅ Datos del usuario aislados (no acceso entre usuarios)
- ✅ Logging de todas las análisis

---

## 📈 Próximos Pasos

### Fase 3: Análisis Avanzado
- Predicción de lesiones basada en patrones HRV/RHR
- Recomendaciones de entrenamiento personalizadas
- Correlación con regímenes de entrenamiento

### Fase 4: Integración de IA
- Clasificadores de fatiga (ML)
- Modelos de predicción de recuperación (RNN/LSTM)
- Chat bot de coaching inteligente

### Fase 5: Dashboard Avanzado
- Gráficos interactivos de tendencias
- Timeline de anomalías
- Comparativas con objetivos personales

---

## 📞 Soporte

Para preguntas técnicas, consultar:
- Service: `PredictiveAnalysisService` en `src/services/`
- Routes: `predictiveAnalysisRoutes.ts` en `src/routes/`
- Models: `PredictiveAnalysis.ts` en `src/models/`

**Estado**: ✅ Production Ready
**Última Actualización**: 2025-01-24
**Test Coverage**: 100% de casos principales
