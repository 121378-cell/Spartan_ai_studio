# 🧪 Terra + Garmin Sync Test - Instructions

## Descripción
Prueba real de sincronización con dispositivo Garmin a través de Terra API y verificación de respuesta de la IA.

## Requisitos Previos

### 1. Terra API Configured
Asegúrate de tener Terra API configurado en `.env`:

```bash
# Terra API Configuration
TERRA_API_KEY=your_terra_api_key
TERRA_API_SECRET=your_terra_api_secret
TERRA_ENVIRONMENT=sandbox  # o 'production'
```

### 2. Garmin Device Connected
El usuario debe tener su dispositivo Garmin conectado a través de Terra.

## Instrucciones de Ejecución

### Opción 1: Usando el script de prueba (Recomendado)

```bash
# Navega al directorio backend
cd spartan-hub/backend

# Ejecuta la prueba
npx ts-node src/tests/terraGarminSyncTest.ts test-user-123
```

### Opción 2: Usando la consola de Node

```bash
# Inicia la consola
cd spartan-hub/backend
node -e "
const { TerraGarminSyncTest } = require('./src/tests/terraGarminSyncTest');
const test = new TerraGarminSyncTest('test-user-123');
test.runTest().then(results => console.log(results));
"
```

### Opción 3: Manual desde el código

1. Importa el servicio en tu código:
```typescript
import { TerraHealthService } from './services/terraHealthService';

const terraService = new TerraHealthService();

// Verifica conexión
const isConnected = await terraService.checkConnection();

// Sincroniza datos
const activities = await terraService.getActivities(userId);
const heartRate = await terraService.getHeartRate(userId);
const sleep = await terraService.getSleepData(userId);

// Obtén análisis de IA
const aiAnalysis = await coachVitalisService.analyzeData({
  userId,
  activities,
  heartRate,
  sleep
});
```

## Qué Hace la Prueba

### Step 1: Verificar Conexión Terra ✅
- Verifica que Terra API esté configurado
- Verifica credenciales válidas
- Verifica conexión con API

### Step 2: Sincronizar Datos Garmin ✅
- Obtiene actividades recientes
- Obtiene datos de frecuencia cardíaca
- Obtiene datos de sueño
- Obtiene métricas corporales

### Step 3: Obtener Respuesta de IA ✅
- Crea prompt con datos sincronizados
- Envía a Coach Vitalis para análisis
- Obtiene recomendaciones personalizadas

## Resultados Esperados

### Éxito ✅
```
🚀 Starting Terra + Garmin Sync Test

User ID: test-user-123
Timestamp: 2026-05-01T10:00:00.000Z

📊 SYNCED DATA SUMMARY

Activities: 2
Heart Rate Data Points: 24
Sleep Nights: 1
Total Data Points: 27
Sync Duration: 1250ms

🤖 AI RESPONSE

Basado en tus datos de Garmin...
[Análisis completo de la IA]

📊 TEST RESULTS

✅ Success: true
🔗 Terra Connected: true
📈 Garmin Data Synced: true
🤖 AI Response Generated: true
📊 Data Points: 27
⏱️  Duration: 3450ms
```

### Error ❌
```
❌ Errors:
  - Terra API not configured
  - Garmin device not connected
  - AI service unavailable
```

## Solución de Problemas

### Error: "Terra API not configured"
**Solución:** Verifica que las variables de entorno estén configuradas correctamente.

### Error: "Garmin device not connected"
**Solución:** Conecta tu dispositivo Garmin a través de Terra primero.

### Error: "AI service unavailable"
**Solución:** Verifica que Coach Vitalis esté inicializado correctamente.

## Próximos Pasos

Después de ejecutar la prueba exitosamente:

1. **Verifica datos en base de datos**
```sql
SELECT * FROM biometric_data 
WHERE user_id = 'test-user-123' 
ORDER BY timestamp DESC 
LIMIT 10;
```

2. **Verifica análisis de IA**
```sql
SELECT * FROM ai_responses 
WHERE user_id = 'test-user-123' 
AND source = 'terra-garmin-sync'
ORDER BY created_at DESC 
LIMIT 1;
```

3. **Continúa con Week 12 Day 2**
   - Real-time Notifications
   - Push notification setup
   - Notification center UI

---

**© 2026 Spartan Hub. All rights reserved.**
