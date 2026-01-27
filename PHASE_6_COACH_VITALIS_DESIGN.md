# Phase 6: Coach Vitalis - Hiper-Personalización Inteligente

**Objetivo Principal**: Transformar Spartan Hub de un sistema pasivo de análisis a un **coach inteligente proactivo** que toma decisiones biológicamente fundamentadas en tiempo real.

**Visión**: Un sistema que detecta estados fisiológicos y automáticamente optimiza el plan de entrenamiento, recuperación y alertas del usuario.

---

## 📊 Problema a Resolver

### Limitaciones Actuales
- ✅ Medimos HRV, estrés, carga de entrenamiento
- ✅ Calculamos puntuaciones de readiness
- ❌ **FALTA**: Motor de decisiones que actúe en base a estos datos
- ❌ **FALTA**: Recomendaciones automáticas inteligentes
- ❌ **FALTA**: Alertas proactivas contextualizadas

### Nueva Solución
```
Datos Biométricos (HRV, RHR, Estrés, Carga) 
        ↓
    [Motor de Decisiones Vitalis]
        ↓
    Análisis Multi-dimensional
    Evaluación de Riesgos
    Selección de Intervención
        ↓
    Acción Inteligente
    (Entrenamientos ajustados, alertas, recomendaciones)
```

---

## 🎯 Core Features - Motor de Decisiones

### 1. **Sistema de Reglas Dinámicas**

#### Regla #1: Protección del Sistema Nervioso
```
IF HRV < 20% baseline 
   AND Estrés >= 70 
   AND Carga Entrenamiento > 80
THEN {
  - Recomendación: "Sesión de Recuperación Activa"
  - Tipo: Caminar 30min, yoga, meditación
  - Intensidad Máxima: 50% FCmax
  - Prioridad: HIGH
}
```

#### Regla #2: Sobre-entrenamiento Detectado
```
IF Carga Entrenamiento > 85 
   AND RHR > baseline + 5 bpm
   AND Duración Sueño < 7 horas
   AND Varianza HRV disminuyendo (última semana)
THEN {
  - Estado: "OVERTRAINING ALERT"
  - Acción: Reducir intensidad próximos 2 días
  - Recomendación: Enfoque en recuperación pasiva
  - Notificación: URGENT (push + email)
}
```

#### Regla #3: Ventana de Entrenamiento Óptima
```
IF HRV > 60% baseline
   AND Estrés < 40
   AND Sueño >= 8 horas
   AND Motivación >= 70%
THEN {
  - Estado: "OPTIMAL TRAINING WINDOW"
  - Acción: Sesión High Intensity Available
  - Duración Recomendada: 60-90 min
  - Intensidad: 80-95% FCmax permitido
  - Volumen: +15% vs baseline
}
```

#### Regla #4: Recuperación Deficiente
```
IF Resting Heart Rate > baseline + 8 bpm
   AND HRV < 30% baseline (2+ días)
   AND Sueño < 6 horas
THEN {
  - Estado: "RECOVERY INTERVENTION REQUIRED"
  - Acción 1: Cancelar/reducir entreno si estaba planeado
  - Acción 2: Protocolo de Sueño (melatonina, ventana fría)
  - Acción 3: Masaje/stretching 20min
  - Acción 4: Hidratación + nutrición enfocada
}
```

#### Regla #5: Manejo del Estrés Crónico
```
IF Estrés >= 70 
   AND Duración (Estrés >= 70) > 3 días
THEN {
  - Señal: "Estrés Crónico Detectado"
  - Acción 1: Reducir Entrenamiento (-30% intensidad)
  - Acción 2: Aumentar Meditación (+10min/día)
  - Acción 3: Sesión de Respiración Diafragmática
  - Acción 4: Evaluación de Factores Externos
  - Notificación: "Tu sistema nervioso necesita atención"
}
```

### 2. **Motor de Evaluación Multi-Dimensional**

```typescript
interface BioStateEvaluation {
  // Componentes individuales
  hrvStatus: "excellent" | "good" | "fair" | "critical"
  rhrTrend: "improving" | "stable" | "declining"
  stressLevel: "low" | "moderate" | "high" | "critical"
  trainingLoadState: "optimal" | "heavy" | "excessive"
  sleepQuality: "excellent" | "good" | "poor" | "critical"
  
  // Estados compuestos
  overallRecoveryStatus: number (0-100)
  nervousSystemLoad: number (0-100)
  injuryRisk: "low" | "moderate" | "high" | "critical"
  trainingReadiness: "excellent" | "good" | "limited" | "restricted"
  
  // Recomendaciones generadas
  recommendedAction: string
  actionPriority: "low" | "medium" | "high" | "urgent"
  confidence: number (0-100)
}
```

### 3. **Decision Tree - Árbol de Decisiones Jerárquico**

```
┌─ ¿HRV < 20% baseline?
│  ├─ YES → ¿Estrés > 70?
│  │  ├─ YES → ¿Carga Entrenamiento > 80?
│  │  │  ├─ YES → PROTECT NERVOUS SYSTEM (Regla #1)
│  │  │  └─ NO → MONITOR + RECOVERY
│  │  └─ NO → CHECK RHR TREND
│  └─ NO → ¿RHR > +5 baseline?
│     ├─ YES → CHECK FOR OVERTRAINING
│     └─ NO → EVALUATE TRAINING WINDOW
│
├─ ¿Carga Entrenamiento > 85?
│  ├─ YES → ¿RHR elevado + Sueño < 7h?
│  │  ├─ YES → OVERTRAINING ALERT (Regla #2)
│  │  └─ NO → MONITOR TREND
│  └─ NO → CONTINUE
│
└─ ¿Estrés >= 70 por 3+ días?
   ├─ YES → CHRONIC STRESS PROTOCOL (Regla #5)
   └─ NO → NORMAL MONITORING
```

---

## 🤖 Arquitectura Técnica

### 1. **CoachVitalisService** (Nueva Clase)

```typescript
class CoachVitalisService {
  // Métodos principales
  async evaluateBioState(userId: string, date?: string): Promise<BioStateEvaluation>
  async getRecommendedAction(userId: string): Promise<ActionRecommendation>
  async generateProactiveAlerts(userId: string): Promise<Alert[]>
  async adjustTrainingPlan(userId: string): Promise<AdjustedPlan>
  async monitorNervousSystem(userId: string): Promise<NervousSystemMetrics>
  
  // Métodos privados (Motor de Reglas)
  private evaluateNervousSystemProtection(bioData: BiometricData): Decision
  private detectOvertraining(bioData: BiometricData): Decision
  private findOptimalTrainingWindow(bioData: BiometricData): Decision
  private assessRecoveryDeficiency(bioData: BiometricData): Decision
  private handleChronicStress(bioData: BiometricData): Decision
  
  // Utilidades
  private calculateHRVPercentile(userId: string, currentHRV: number): number
  private getTrendVector(userId: string, metric: string, days: number): number
  private getConfidenceScore(rule: string, factors: number[]): number
}
```

### 2. **Decision Engine - Componentes**

#### a) **Rule Evaluator**
```typescript
interface Rule {
  id: string
  name: string
  conditions: Condition[]  // AND logic
  action: Action
  priority: "low" | "medium" | "high" | "urgent"
  confidence_threshold: number (0-100)
}

interface Condition {
  metric: string  // "hrv", "stress", "rhr", "training_load", "sleep"
  operator: ">" | "<" | "==" | "changes" | "exceeds_duration"
  value: number | string
  relative_to?: "baseline" | "threshold" | "percentile"
}

interface Action {
  type: "training_adjustment" | "alert" | "intervention" | "monitoring"
  target: "user" | "trainer" | "coach"
  content: string
  intensity: "low" | "medium" | "high" | "critical"
}
```

#### b) **Bio-Feedback Loop**
```
Momento 1: Captura datos
  - HRV, RHR, Estrés, Carga, Sueño

Momento 2: Evaluación
  - Comparar contra baselines
  - Calcular percentiles
  - Detectar tendencias

Momento 3: Decisión
  - Evaluar reglas en orden de prioridad
  - Calcular confianza
  - Seleccionar acción

Momento 4: Acción
  - Notificar usuario
  - Ajustar plan de entrenamiento
  - Registrar decisión para auditoría
  - Feedback al sistema
```

### 3. **Alertas Proactivas Inteligentes**

#### Tipos de Alertas Contextualizadas

```typescript
interface ProactiveAlert {
  id: string
  userId: string
  type: "warning" | "optimization" | "intervention" | "celebration"
  severity: "info" | "warning" | "urgent" | "critical"
  title: string
  message: string
  context: {
    triggerReason: string
    affectedMetrics: string[]
    confidenceScore: number
  }
  recommendedAction: {
    action: string
    expectedBenefit: string
    duration?: string
  }
  channels: ("push" | "email" | "in_app")[]
  timestamp: Date
  expiresAt: Date
}
```

#### Ejemplos de Alertas

**Alerta #1: Protección del Sistema Nervioso**
```
Título: "Tu sistema nervioso necesita descanso"
Mensaje: "Detectamos HRV baja (35% de tu baseline) + estrés alto. 
Hemos reducido tu entrenamiento de hoy a una caminata de 30min. 
Tu cuerpo necesita recuperación."
Acción: Ver sesión de yoga recomendada
Urgencia: HIGH
```

**Alerta #2: Ventana Óptima de Entrenamiento**
```
Título: "¡Día perfecto para entrenar fuerte! 💪"
Mensaje: "Tu HRV está excelente (85%), sueño de 8.5h, estrés bajo. 
Puedes hacer una sesión de alta intensidad de 90min hoy."
Acción: Ver entrenamientos intensos recomendados
Urgencia: INFO
```

**Alerta #3: Alerta de Sobre-entrenamiento**
```
Título: "⚠️ Señales de sobre-entrenamiento"
Mensaje: "Tu FC en reposo aumentó 8 bpm, HRV está bajando 
3 días seguidos y duermes menos de 7h. Necesitamos frenar."
Acción: 2 días de recuperación activa
Urgencia: URGENT
```

---

## 🗄️ Estructura de Datos

### Nuevas Tablas de Base de Datos

#### Tabla 1: `vital_coach_decisions`
```sql
CREATE TABLE vital_coach_decisions (
  id PRIMARY KEY,
  user_id FOREIGN KEY,
  timestamp DATETIME,
  
  -- Métricas de entrada
  hrv_current DECIMAL,
  hrv_baseline DECIMAL,
  hrv_percentile DECIMAL,
  rhr_current DECIMAL,
  rhr_baseline DECIMAL,
  stress_level DECIMAL,
  training_load DECIMAL,
  sleep_duration DECIMAL,
  
  -- Evaluación
  nervous_system_load DECIMAL,
  overall_recovery_status DECIMAL,
  injury_risk_level VARCHAR,
  training_readiness VARCHAR,
  
  -- Decisión tomada
  decision_rule_id VARCHAR,
  recommended_action TEXT,
  action_priority VARCHAR,
  confidence_score DECIMAL,
  
  -- Impacto
  was_followed BOOLEAN,
  outcome_notes TEXT,
  
  INDEX(user_id, timestamp)
);
```

#### Tabla 2: `vital_coach_alerts`
```sql
CREATE TABLE vital_coach_alerts (
  id PRIMARY KEY,
  user_id FOREIGN KEY,
  timestamp DATETIME,
  alert_type VARCHAR,
  severity VARCHAR,
  title TEXT,
  message TEXT,
  trigger_reason TEXT,
  recommended_action TEXT,
  delivery_channels JSON,
  delivered BOOLEAN,
  read_at DATETIME,
  action_taken BOOLEAN,
  INDEX(user_id, timestamp)
);
```

#### Tabla 3: `vital_coach_training_adjustments`
```sql
CREATE TABLE vital_coach_training_adjustments (
  id PRIMARY KEY,
  user_id FOREIGN KEY,
  planned_date DATE,
  
  -- Plan original
  original_type VARCHAR,
  original_duration INT,
  original_intensity VARCHAR,
  
  -- Ajuste aplicado
  adjusted_type VARCHAR,
  adjusted_duration INT,
  adjusted_intensity VARCHAR,
  adjustment_reason TEXT,
  
  -- Resultado
  user_accepted BOOLEAN,
  actual_completed BOOLEAN,
  
  INDEX(user_id, planned_date)
);
```

#### Tabla 4: `vital_coach_bio_baselines`
```sql
CREATE TABLE vital_coach_bio_baselines (
  id PRIMARY KEY,
  user_id FOREIGN KEY,
  metric_type VARCHAR,
  baseline_value DECIMAL,
  percentile_25 DECIMAL,
  percentile_50 DECIMAL,
  percentile_75 DECIMAL,
  baseline_calculated_at DATETIME,
  last_updated DATETIME,
  INDEX(user_id, metric_type)
);
```

---

## 🔌 API Endpoints

### Nuevos Endpoints (Vitalis Coach)

**1. GET /api/vitalis/bio-state/:userId**
- Response: `BioStateEvaluation` completa
- Rate Limit: 50 req/15min

**2. GET /api/vitalis/recommended-action/:userId**
- Response: Acción recomendada con explicación
- Rate Limit: 50 req/15min

**3. GET /api/vitalis/alerts/:userId**
- Query: `status` (active/all), `severity` (filter)
- Response: Array de `ProactiveAlert[]`
- Rate Limit: 100 req/15min

**4. POST /api/vitalis/acknowledge-alert/:userId/:alertId**
- Body: `{ followedAction: boolean, feedback?: string }`
- Response: Alert actualizada
- Rate Limit: 100 req/15min

**5. GET /api/vitalis/training-adjustment/:userId**
- Query: `date` (YYYY-MM-DD)
- Response: Ajuste de plan si aplica
- Rate Limit: 50 req/15min

**6. POST /api/vitalis/training-adjustment/:userId/accept**
- Body: `{ adjustmentId: string }`
- Response: Confirmación y detalles de sesión ajustada
- Rate Limit: 50 req/15min

**7. GET /api/vitalis/nervous-system-report/:userId**
- Query: `days` (default: 30)
- Response: Reporte detallado de carga del SN
- Rate Limit: 50 req/15min

**8. GET /api/vitalis/decision-history/:userId**
- Query: `limit` (default: 30), `days` (default: 30)
- Response: Historial de decisiones tomadas
- Rate Limit: 100 req/15min

---

## 🧪 Test Strategy

### Test Categories (Target: 60+ tests)

1. **Rule Evaluation** (15 tests)
   - Cada regla se evalúa correctamente
   - Combinaciones de métricas funcionan
   - Edge cases manejados

2. **Decision Engine** (12 tests)
   - Priorización correcta
   - Confianza calculada bien
   - Selección de mejor acción

3. **Bio-Feedback Loop** (10 tests)
   - Captura → Evaluación → Decisión → Acción
   - Feedback loop cierra correctamente
   - Estado se persiste

4. **Alert Generation** (12 tests)
   - Alertas se crean con contexto correcto
   - Severidad asignada bien
   - Canales de entrega correctos

5. **Training Adjustment** (8 tests)
   - Entrenamientos se ajustan según reglas
   - Aceptación/rechazo se registra
   - Histórico se mantiene

6. **Nervous System Monitoring** (8 tests)
   - Carga del SN se calcula
   - Tendencias se detectan
   - Alertas de protección se generan

7. **Integration Tests** (5 tests)
   - End-to-end con datos reales
   - Alertas se envían
   - Sistema mantiene consistencia

---

## 📋 Implementation Roadmap

### Phase 6.1: Foundation (Days 1-2)
- [ ] Create `CoachVitalisService.ts` (1,200+ lines)
- [ ] Create `CoachVitalisController.ts` (500+ lines)
- [ ] Create `CoachVitalisRoutes.ts` (250+ lines)
- [ ] Database schema setup (4 new tables)

### Phase 6.2: Core Rules (Day 3)
- [ ] Implement all 5 core rules
- [ ] Decision tree evaluation
- [ ] Confidence scoring

### Phase 6.3: Alerts & Actions (Days 3-4)
- [ ] Proactive alert generation
- [ ] Training plan adjustments
- [ ] Nervous system monitoring

### Phase 6.4: Testing & Integration (Days 4-5)
- [ ] Create test suite (60+ tests)
- [ ] Integration with existing services
- [ ] Server.ts integration
- [ ] Run all tests

### Phase 6.5: Documentation & Deployment (Day 5-6)
- [ ] Completion documentation
- [ ] API documentation
- [ ] Git commit & push
- [ ] Deployment checklist

---

## 🎯 Success Criteria

**Functional**:
- [ ] 5 core rules fully functional
- [ ] 8 API endpoints working
- [ ] Bio-feedback loop complete
- [ ] 4 new database tables created

**Quality**:
- [ ] 60+ tests passing (100%)
- [ ] 0 TypeScript errors
- [ ] 0 security vulnerabilities
- [ ] Code documented

**Performance**:
- [ ] API response < 500ms
- [ ] Decision making < 200ms
- [ ] Alert generation < 100ms
- [ ] Database queries optimized

---

## 🚀 Expected Impact

### User Experience Improvements
- Users move from reading analytics to receiving intelligent guidance
- Proactive interventions prevent injuries and overtraining
- Personalized coaching at scale
- Real-time optimization of training plans

### Business Impact
- Higher user engagement
- Better outcomes (fewer injuries, better performance)
- Competitive advantage (AI coach integrated)
- Retention improvement

### Technical Achievement
- Advanced decision-making system
- Production-grade bio-feedback loops
- ML-ready architecture for future expansion

---

## 📊 Example Scenarios

### Scenario 1: User wakes up with Low HRV + High Stress
```
Data at 7:00 AM:
- HRV: 35 (25% below baseline 47)
- RHR: 62 (7 bpm above baseline 55)
- Stress Level: 75/100
- Sleep: 5.5 hours (insufficient)
- Planned Workout: 60min high intensity

Decision Engine:
  Rule #1 Triggered: HRV < 20% AND Stress > 70
  Action: PROTECT NERVOUS SYSTEM
  
Alert Generated:
  Title: "Tu sistema nervioso necesita descanso hoy"
  Message: "Detectamos estrés alto + HRV baja. Hemos cancelado tu 
  entrenamiento intenso. Hazlo con caminata de 30min + yoga."
  
Training Adjustment:
  Planned: 60min high intensity
  Adjusted: 30min walking + 20min yoga
  Reason: Nervous system protection
  
Result: User accepts, feels better, prevents burnout
```

### Scenario 2: User in Optimal Training Window
```
Data at 6:00 AM:
- HRV: 78 (85% of best recent)
- RHR: 52 (baseline)
- Stress: 35/100
- Sleep: 8.5 hours
- Motivation: 80%

Decision Engine:
  Rule #3 Triggered: Optimal training window
  Action: HIGH INTENSITY ALLOWED
  
Alert Generated:
  Title: "¡Día perfecto para entrenar fuerte! 💪"
  Message: "Tu cuerpo está al 100%. Puedes hacer 
  una sesión de 90min a alta intensidad."
  
Recommendation:
  - Type: Strength + Conditioning
  - Duration: 90 min
  - Intensity: 80-95% FCmax
  - Volume: +15% vs normal
  
Result: User performs at peak, maximizes training benefit
```

### Scenario 3: Chronic Stress Detection
```
Data over 4 days:
- Day 1: Stress 72
- Day 2: Stress 75
- Day 3: Stress 78
- Day 4: Stress 76

Decision Engine:
  Rule #5 Triggered: Chronic stress >= 70 for 3+ days
  Action: CHRONIC STRESS PROTOCOL
  
Alert Generated (Day 3):
  Title: "Detectamos estrés crónico"
  Message: "Tu estrés ha estado alto 3 días seguidos. 
  Necesitamos reducir carga de entrenamiento e incrementar 
  técnicas de recuperación."
  
Actions Recommended:
  - Reduce training intensity (-30%)
  - Add meditation (+10min daily)
  - Breathing exercises
  - Evaluate external stressors
  
Result: User addresses root cause, improves wellbeing
```

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Reglas muy agresivas | Confidence threshold antes de actuar |
| Usuario rechaza recomendaciones | Historial de aceptación/rechazo |
| False positives | Validación cruzada de múltiples métricas |
| Falta de contexto | Usuario puede proporcionar feedback |
| Bases incompletas | Requiere 30 días de datos mínimo |

---

## 📈 Future Enhancements

1. **Machine Learning** (Phase 7):
   - Aprender patrones individuales
   - Mejorar confianza de predicciones
   - Personalizaciones aún más profundas

2. **Coach Humano Integration** (Phase 7):
   - Alertar a coach de situaciones críticas
   - Coach puede sobrescribir decisiones
   - Colaboración AI + Humano

3. **Social Features** (Phase 8):
   - Comparar (anónimamente) con otros usuarios
   - Competiciones saludables
   - Comunidad de apoyo

4. **Wearable Integration** (Phase 8):
   - Real-time data streaming
   - Decisiones intra-día
   - Alert push en tiempo real

---

**Next Step**: ¿Procedemos con la implementación de Phase 6: Coach Vitalis?

