# Gaps Identificados entre brainOrchestrator.test.ts y brainOrchestrator.ts

## 1. Métodos Faltantes en el Test
- `executeWeeklyRebalancing()` - El test tiene tests para este método pero no está mockeado
- `monitorCriticalSignals()` - El test tiene tests pero no está mockeado
- `getRecentBiometricData()` - Método privado no mockeado
- `aggregateDailyData()` - Método privado no mockeado
- `executeAnalysisPipeline()` - Método privado no mockeado
- `generateCoachDecision()` - Método privado no mockeado
- `generatePlanAdjustments()` - Método privado no mockeado
- `persistBrainDecision()` - Método privado no mockeado
- `applyPlanChanges()` - Método privado no mockeado
- `generateNotifications()` - Método privado no mockeado
- `dispatchNotifications()` - Método privado no mockeado

## 2. Mocks Incompletos
- `mockCoachVitalis` - Solo tiene `evaluateComprehensive` y `generateDecision`, pero el código usa `decidePlanAdjustments`
- `mockAdvancedAnalysis` - Solo tiene `analyze`, pero el código usa `analyzeTrainingLoadV2` (método estático)
- `mockMLForecasting` - Solo tiene `forecast`, pero el código usa `predictInjuryRisk`
- `mockPlanAdjuster` - Solo tiene `generateAdjustments`, pero el código usa `applyAdjustment`
- `mockBiometricService` - Solo tiene `aggregateData`, pero el código usa `aggregateDayData`

## 3. Estructura de Datos Diferente
- El test espera `result.analyses.trainingLoad`, `result.analyses.injuryRisk`, `result.analyses.readiness`
- El código real devuelve `trainingLoad`, `injuryRisk`, `readiness` directamente (no anidados)

## 4. Eventos y WebSocket
- El test espera `eventBus.emit('brain_cycle_complete')` pero el código usa `eventBus.emit('brain.cycle.complete')`
- El test espera `socketManager.broadcast` pero el código usa `socketManager.emitToUser`

## 5. Persistencia de Datos
- El test verifica `mockDb.prepare` pero no verifica la estructura completa de la inserción
- El código usa `daily_brain_decisions` con campos específicos

## 6. Métodos Privados No Testeados
- `getRecentBiometricData()` - No está testeado a pesar de ser crítico
- `aggregateDailyData()` - No está testeado
- `executeAnalysisPipeline()` - No está testeado en detalle

## 7. Configuración de Servicios
- El test usa `new (require('./coachVitalisService').CoachVitalisService)()` pero el código usa `getCoachVitalisService()`
- El test instancia servicios manualmente pero el código usa inyección de dependencias

## Plan de Actualización

1. **Actualizar mocks** para incluir todos los métodos necesarios
2. **Alinear estructura de datos** entre test y código
3. **Corregir nombres de eventos** y métodos de WebSocket
4. **Agregar tests para métodos privados críticos**
5. **Verificar configuración de servicios** y dependencias