# 🧪 Phase 3: Testing & Validation - Detailed Implementation Plan

**Fecha Inicio:** 8 de Febrero de 2026 (Hoy)  
**Fecha Objetivo:** 20 de Febrero de 2026  
**Duración Estimada:** 10 días de trabajo (2 semanas calendario)  
**Status:** 🟢 Iniciando

---

## 📋 Resumen Ejecutivo

Phase 3 es la fase crítica de validación de Phase 2.2. Comprende 5 submacrófases de testing progresivo:

| Fase | Objetivo | Duración | Tests | Status |
|------|----------|----------|-------|--------|
| **3.1** | Unit Tests completos | 4-5 días | 6 suites | 🔴 No iniciado |
| **3.2** | Integration E2E | 4-5 días | 5 workflows | 🔴 No iniciado |
| **3.3** | Performance Testing | 2-3 días | 3 benchmarks | 🔴 No iniciado |
| **3.4** | Security & Compliance | 2 días | 4 security tests | 🔴 No iniciado |
| **3.5** | Regression Testing | 1 día | Existing tests | 🔴 No iniciado |

**Total de Tests a Crear:** 18 test suites (800+ líneas)  
**Cobertura Target:** >85% en nuevas features, >80% en servicios  
**Success Criteria:** 100% tests passing, 0 regressions, All performance targets met

---

## 🎯 Phase 3.1: Unit Test Suite (4-5 días)

**Objetivo:** Cobertura exhaustiva de todas las funciones y servicios críticos

### 3.1.1 brainOrchestrator.test.ts
**Descripción:** Tests del orquestador central del brain cycle  
**Archivo:** `backend/src/__tests__/brainOrchestrator.test.ts`  
**Líneas Target:** 200+  
**Coverage Target:** 85%+  
**Duración Estimada:** 1 día

#### Tests a Crear:
```typescript
describe('brainOrchestrator', () => {
  // 1. Happy path - Daily cycle execution
  test('executeDailyBrainCycle completes successfully', () => {
    // Agrega datos biométricos
    // Ejecuta análisis
    // Genera decisiones
    // Verifica outputs
  });

  // 2. Data aggregation workflow
  test('aggregates data from multiple health sources', () => {
    // Mock: healthService data
    // Mock: terraService data
    // Mock: garminService data
    // Verify: combinación correcta
  });

  // 3. Analysis pipeline
  test('analysis pipeline processes data correctly', () => {
    // Ejecuta evaluateComprehensive
    // Verifica scoring
    // Verifica injury detection
  });

  // 4. Decision generation
  test('generates decisions based on analysis', () => {
    // Verifica decision types
    // Verifica confidence levels
    // Verifica auto-approval logic
  });

  // 5. Error handling
  test('handles errors gracefully', () => {
    // Mock error conditions
    // Verifica logs
    // Verifica fallbacks
  });

  // 6. Database transactions
  test('updates all database tables consistently', () => {
    // Verifica: brain_cycles
    // Verifica: decisions
    // Verifica: biometric_data
  });
});
```

**Dependencias Mock:**
- `brainOrchestrator.ts` → Necesita executeAsyncWithReconnection
- `healthService` → Mock de healthStatus
- `terraService` → Mock de webhook data
- `aiService` → Mock de embeddings
- `db` → Transactional mock

**Success Criteria:**
- ✅ All 6+ tests passing
- ✅ Coverage ≥85%
- ✅ No flaky tests on repeat runs

---

### 3.1.2 terraHealthService.test.ts
**Descripción:** Tests de integración con Terra Health API  
**Archivo:** `backend/src/__tests__/terraHealthService.test.ts`  
**Líneas Target:** 150+  
**Coverage Target:** 80%+  
**Duración Estimada:** 1 día

#### Tests a Crear:
```typescript
describe('terraHealthService', () => {
  // 1. OAuth flow
  test('initiates OAuth flow correctly', () => {
    // Generate state token
    // Verify redirect URL
    // Verify scope parameters
  });

  // 2. Token exchange
  test('exchanges auth code for tokens', () => {
    // Mock auth code
    // Verify token received
    // Verify token stored
  });

  // 3. Data sync
  test('syncs biometric data from Terra', () => {
    // Mock Terra API response
    // Verify data parsing
    // Verify database storage
  });

  // 4. Webhook handling
  test('processes Terra webhooks', () => {
    // Mock incoming webhook
    // Verify signature validation
    // Verify data stored
    // Verify event emitted
  });

  // 5. Error handling
  test('handles API errors gracefully', () => {
    // Mock 401 Unauthorized
    // Mock 429 Rate Limited
    // Verify retry logic
    // Verify user notification
  });

  // 6. Data persistence
  test('persists data to database correctly', () => {
    // Verify: biometric_data_points insert
    // Verify: user_connected_apps update
    // Verify: transaction rollback on error
  });
});
```

**Dependencias Mock:**
- `axios` → HTTP client
- `db` → Database connection
- `eventBus` → Event emitter
- `logger` → Logging service

**Success Criteria:**
- ✅ OAuth flow validated
- ✅ Webhook processing working
- ✅ Error handling robust

---

### 3.1.3 criticalSignalMonitor.test.ts
**Descripción:** Tests del monitor de señales críticas  
**Archivo:** `backend/src/__tests__/criticalSignalMonitor.test.ts`  
**Líneas Target:** 100+  
**Coverage Target:** 85%+  
**Duración Estimada:** 0.5 días

#### Tests a Crear:
```typescript
describe('criticalSignalMonitor', () => {
  // 1. Signal detection
  test('detects critical signals correctly', () => {
    // Mock high HR anomaly
    // Verify detection triggered
    // Verify severity assessed
  });

  // 2. Signal classification
  test('classifies signals by type', () => {
    // Test: HRV drop
    // Test: Sleep disruption
    // Test: Recovery alert
  });

  // 3. Intervention proposals
  test('proposes appropriate interventions', () => {
    // Mock: critical signal
    // Verify: intervention type
    // Verify: confidence level
  });

  // 4. Notification dispatch
  test('dispatches notifications to user', () => {
    // Verify message sent
    // Verify channel (push/email)
    // Verify retry on failure
  });

  // 5. Database logging
  test('logs alerts to database', () => {
    // Verify: alerts table insert
    // Verify: intervention_history update
  });
});
```

**Dependencias Mock:**
- `anomalyDetector` → ML anomaly service
- `notificationService` → Message dispatch
- `db` → Database persistence

**Success Criteria:**
- ✅ Detection accuracy >95%
- ✅ All alert types tested
- ✅ Notifications delivery confirmed

---

### 3.1.4 socketManager.test.ts
**Descripción:** Tests del gestor de WebSocket  
**Archivo:** `backend/src/__tests__/socketManager.test.ts`  
**Líneas Target:** 100+  
**Coverage Target:** 80%+  
**Duración Estimada:** 1 día

#### Tests a Crear:
```typescript
describe('socketManager', () => {
  // 1. Connection handling
  test('accepts and manages WebSocket connections', () => {
    // Mock client connection
    // Verify handshake
    // Verify ID assignment
  });

  // 2. Authentication
  test('authenticates WebSocket connections', () => {
    // Mock JWT token
    // Verify auth success
    // Verify auth failure rejection
  });

  // 3. Event emission
  test('emits events to subscribed clients', () => {
    // Client subscribes to channel
    // Emit event
    // Verify delivery
  });

  // 4. Broadcast
  test('broadcasts events to multiple clients', () => {
    // 10 clients connected
    // Emit broadcast
    // Verify all clients receive
  });

  // 5. Disconnection handling
  test('handles client disconnections', () => {
    // Client connects
    // Trigger disconnect
    // Verify cleanup
  });

  // 6. Error handling
  test('handles transmission errors', () => {
    // Mock transmission error
    // Verify retry logic
    // Verify logging
  });
});
```

**Dependencias Mock:**
- `socket.io` → WebSocket framework
- `jwt` → Token verification
- `eventBus` → Event distribution

**Success Criteria:**
- ✅ Connection/disconnection stable
- ✅ Event delivery reliable
- ✅ No memory leaks

---

### 3.1.5 eventBus.test.ts
**Descripción:** Tests del bus de eventos  
**Archivo:** `backend/src/__tests__/eventBus.test.ts`  
**Líneas Target:** 80+  
**Coverage Target:** 90%+  
**Duración Estimada:** 0.5 días

#### Tests a Crear:
```typescript
describe('eventBus', () => {
  // 1. Event emission
  test('emits events to subscribers', () => {
    // Subscribe to event
    // Emit event with data
    // Verify callback fired
  });

  // 2. Multiple subscribers
  test('supports multiple subscribers per event', () => {
    // Add 5 subscribers
    // Emit event
    // Verify all callbacks fired
  });

  // 3. Priority handling
  test('respects subscriber priority', () => {
    // Add subscribers with different priorities
    // Emit event
    // Verify execution order
  });

  // 4. Event filtering
  test('filters events by type', () => {
    // Emit multiple event types
    // Verify correct filtering
  });

  // 5. Statistics
  test('tracks event statistics', () => {
    // Emit 100 events
    // Verify statistics accurate
    // Verify performance metrics
  });

  // 6. Unsubscribe
  test('properly unsubscribes listeners', () => {
    // Add subscriber
    // Unsubscribe
    // Emit event
    // Verify callback NOT fired
  });
});
```

**Dependencias Mock:**
- Events.EventEmitter → Node.js base

**Success Criteria:**
- ✅ Coverage ≥90%
- ✅ Performance <1µs per emit

---

### 3.1.6 CoachVitalisService.test.ts
**Descripción:** Tests del servicio de AI Coach Vitalis  
**Archivo:** `backend/src/__tests__/CoachVitalisService.test.ts`  
**Líneas Target:** 150+  
**Coverage Target:** 85%+  
**Duración Estimada:** 1 día

#### Tests a Crear:
```typescript
describe('CoachVitalisService', () => {
  // 1. Comprehensive evaluation
  test('evaluates training plan comprehensively', () => {
    // Mock: user data
    // Mock: biometric data
    // Call: evaluateComprehensive
    // Verify: scoring computed
  });

  // 2. Decision generation
  test('generates coaching decisions', () => {
    // Mock: evaluation results
    // Call: generateDecision
    // Verify: decision type correct
    // Verify: confidence level set
  });

  // 3. Auto-approval rules
  test('auto-approves low-risk modifications', () => {
    // Mock: low severity adjustment
    // Verify: auto-approved
    // Verify: applied immediately
  });

  // 4. User notification
  test('notifies user of decisions', () => {
    // Mock: decision created
    // Verify: notification sent
    // Verify: channel used
  });

  // 5. Feedback learning
  test('learns from user feedback', () => {
    // Mock: user feedback
    // Verify: learning recorded
    // Verify: future decisions adjusted
  });

  // 6. Context awareness
  test('incorporates context in decisions', () => {
    // Mock: user schedule
    // Mock: weather data
    // Mock: personal goals
    // Verify: context used
  });
});
```

**Dependencias Mock:**
- `aiService` → Embeddings and scoring
- `notificationService` → Notifications
- `feedbackLearning` → Learning system
- `db` → Data persistence

**Success Criteria:**
- ✅ All decision types tested
- ✅ Learning loop validated
- ✅ Feedback integration working

---

## 🎯 Phase 3.2: Integration Test Suite (4-5 días)

**Objetivo:** Validación de flujos E2E complejos y interacción entre servicios

### 3.2.1 Daily Brain Cycle E2E Test
**Archivo:** `backend/src/__tests__/integration/dailyBrainCycle.e2e.test.ts`  
**Líneas Target:** 300+  
**Duración Estimada:** 1 día

#### Flujo Completo:
```
1. Setup (Pre-conditions)
   ├─ Create test user
   ├─ Create test biometric data
   └─ Mock external APIs

2. Data Aggregation Phase (5 min)
   ├─ Fetch from Terra
   ├─ Fetch from Google Fit
   ├─ Fetch from Garmin
   └─ Store in DB

3. Analysis Phase (5 min)
   ├─ Compute metrics
   ├─ Detect anomalies
   ├─ Evaluate readiness
   └─ Assess risk

4. Decision Phase (5 min)
   ├─ Generate recommendations
   ├─ Apply auto-approvals
   └─ Create notifications

5. Notification Phase (2 min)
   ├─ Send push notification
   ├─ Send email notification
   └─ Update WebSocket clients

6. Cleanup & Validation
   ├─ Verify all DB tables updated
   ├─ Verify no orphaned records
   └─ Verify transaction consistency
```

#### Test Code Structure:
```typescript
describe('Daily Brain Cycle E2E', () => {
  beforeAll(() => {
    // Initialize test database
    // Mock external services
    // Create test fixtures
  });

  afterAll(() => {
    // Cleanup test data
    // Close connections
  });

  test('completes full daily cycle with 1000 concurrent users', async () => {
    // Simulate 1000 users
    // Execute brain cycle
    // Verify completion in <5 minutes
    // Verify all tables updated
    // Verify no data loss
    // Verify transaction consistency
  });

  test('handles partial failures gracefully', async () => {
    // Mock Terra API timeout
    // Mock Google Fit 401
    // Verify fallback logic
    // Verify data integrity
  });

  test('maintains audit trail', async () => {
    // Execute cycle
    // Verify all actions logged
    // Verify timestamps correct
    // Verify user attribution
  });
});
```

**Success Criteria:**
- ✅ 1000 concurrent users in <5 min
- ✅ All DB tables updated consistently
- ✅ No data corruption
- ✅ Audit trail complete

---

### 3.2.2 Terra Webhook Ingestion Test
**Archivo:** `backend/src/__tests__/integration/terraWebhook.e2e.test.ts`  
**Líneas Target:** 200+  
**Duración Estimada:** 1 día

#### Flujo:
```
1. Webhook Received
   ├─ Signature verification (HMAC)
   ├─ Payload decryption
   └─ Request logging

2. Data Processing
   ├─ Parse biometric data
   ├─ Validate data ranges
   ├─ Handle duplicates
   └─ Store in DB

3. Event Emission
   ├─ Emit data_received event
   ├─ Signal critical signals if needed
   └─ Trigger health monitoring

4. Response
   ├─ Return 200 OK
   └─ Log successful processing
```

#### Test Code:
```typescript
describe('Terra Webhook Ingestion', () => {
  test('processes valid webhook correctly', async () => {
    // Prepare webhook payload
    // Calculate HMAC signature
    // POST to webhook endpoint
    // Verify 200 response
    // Verify data in DB
  });

  test('rejects invalid signatures', async () => {
    // Prepare webhook with wrong signature
    // POST to webhook endpoint
    // Verify 401 Unauthorized
    // Verify no data stored
  });

  test('handles duplicate webhooks', async () => {
    // Send same webhook twice
    // Verify no duplicate data
    // Verify deduplication logic
  });

  test('processes high-volume webhooks (100/sec)', async () => {
    // Send 100 webhooks in 1 second
    // Verify all processed
    // Verify latency <100ms average
  });

  test('persists to biometric_data_points correctly', async () => {
    // Process webhook
    // Query DB directly
    // Verify fields populated
    // Verify timestamp correct
  });
});
```

**Success Criteria:**
- ✅ 100 webhooks/sec processed
- ✅ <100ms average latency
- ✅ No duplicate data
- ✅ HMAC validation strict

---

### 3.2.3 Critical Signal Alert Flow Test
**Archivo:** `backend/src/__tests__/integration/criticalSignalFlow.e2e.test.ts`  
**Líneas Target:** 250+  
**Duración Estimada:** 1 día

#### Flujo:
```
1. Anomaly Detection
   ├─ Biometric data arrives
   ├─ ML model scores anomaly
   └─ Threshold exceeded?

2. Intervention Proposal
   ├─ Generate intervention recommendation
   ├─ Calculate confidence
   └─ Determine approval status

3. User Notification
   ├─ Compose message
   ├─ Select delivery channels (push/email/SMS)
   └─ Ensure delivery

4. Database Logging
   ├─ Create alerts record
   ├─ Update intervention_history
   └─ Log user receipt

5. Follow-up
   ├─ Schedule follow-up check
   └─ Track intervention effectiveness
```

#### Test Code:
```typescript
describe('Critical Signal Alert Flow', () => {
  test('detects critical HR anomaly and alerts user', async () => {
    // Inject anomalous data
    // Wait for detection
    // Verify alert created
    // Verify notification sent
    // Verify alerts table updated
  });

  test('proposes appropriate intervention', async () => {
    // Trigger anomaly
    // Verify intervention type matches severity
    // Verify confidence score set
    // Verify auto-approval status
  });

  test('delivers notification through all channels', async () => {
    // Trigger alert
    // Verify push notification
    // Verify email notification
    // Verify SMS if enrolled
  });

  test('tracks user acknowledgment', async () => {
    // User receives notification
    // User acknowledges
    // Verify receipt logged
    // Verify follow-up triggered
  });

  test('handles multiple simultaneous alerts', async () => {
    // Trigger 10 simultaneous alerts
    // Verify all processed
    // Verify priority ordering
    // Verify no race conditions
  });
});
```

**Success Criteria:**
- ✅ Detection latency <10 seconds
- ✅ Notification delivery <5 seconds
- ✅ Multi-channel delivery working
- ✅ No lost alerts

---

### 3.2.4 WebSocket Real-Time Communication Test
**Archivo:** `backend/src/__tests__/integration/websocketRealtimeFlow.e2e.test.ts`  
**Líneas Target:** 250+  
**Duración Estimada:** 1 día

#### Flujo:
```
1. Client Connection
   ├─ Establish WS connection
   ├─ Authenticate with JWT
   └─ Subscribe to channels

2. Event Broadcasting
   ├─ Brain cycle completes
   ├─ Event emitted
   ├─ Broadcast to all subscribed clients
   └─ Verify delivery on each client

3. Message Priority
   ├─ Critical alerts (Priority 1)
   ├─ Status updates (Priority 2)
   ├─ Informational (Priority 3)
   └─ Verify ordering respected

4. Disconnection Handling
   ├─ Client disconnects
   ├─ Connection cleaned up
   ├─ Resources freed
   └─ Verify no memory leak

5. Reconnection
   ├─ Client connection lost
   ├─ Automatic reconnection
   ├─ Resume event subscription
   └─ Verify message history
```

#### Test Code:
```typescript
describe('WebSocket Real-Time Communication', () => {
  test('broadcasts brain cycle updates to connected clients', async () => {
    // Connect 100 WebSocket clients
    // Emit brain cycle complete event
    // Verify all clients receive within 500ms
  });

  test('maintains connection for 1 hour', async () => {
    // Connect client
    // Subscribe to channel
    // Verify heartbeat every 30s
    // Wait 3600s
    // Verify connection still active
  });

  test('handles rapid reconnections', async () => {
    // Connect/disconnect 100 times rapidly
    // Verify no memory leak
    // Verify timing correct
  });

  test('orders messages by priority', async () => {
    // Emit Priority 3, Priority 1, Priority 2 simultaneously
    // Verify reception order: 1, 2, 3
  });

  test('supports message filtering by channel', async () => {
    // Client subscribes to "alerts" only
    // Emit: alert, status, info events
    // Verify only alert received
  });
});
```

**Success Criteria:**
- ✅ 1M concurrent connections stable
- ✅ Message delivery <500ms
- ✅ No memory leaks over time
- ✅ Auto-reconnection working

---

### 3.2.5 Feedback Learning Loop Test
**Archivo:** `backend/src/__tests__/integration/feedbackLearningLoop.e2e.test.ts`  
**Líneas Target:** 200+  
**Duración Estimada:** 0.5 días

#### Flujo:
```
1. Initial Decision
   ├─ Coach Vitalis generates recommendation
   └─ User presented with choice

2. User Feedback
   ├─ User accepts/rejects recommendation
   ├─ Provides optional reasoning
   └─ System records feedback

3. Learning
   ├─ Feedback analyzed
   ├─ User preferences updated
   ├─ Similar patterns identified
   └─ Model weights adjusted

4. Verification
   ├─ Future decisions reflect learning
   ├─ Similar situations handled better
   └─ User satisfaction improved
```

#### Test Code:
```typescript
describe('Feedback Learning Loop', () => {
  test('records user feedback correctly', async () => {
    // Generate recommendation
    // User provides feedback
    // Verify feedback_learning table
    // Verify metadata captured
  });

  test('integrates feedback into future decisions', async () => {
    // Generate 10 recommendations
    // User rejects 8, accepts 2
    // Generate 10 new recommendations
    // Verify acceptance rate improves
  });

  test('learns user preferences over time', async () => {
    // 100 feedback iterations
    // Track learning progress
    // Verify convergence to user preference
  });

  test('handles conflicting feedback', async () => {
    // User accepts recommendation A
    // User rejects similar recommendation B
    // Verify system resolves conflict
  });
});
```

**Success Criteria:**
- ✅ Feedback logged accurately
- ✅ Learning loop functional
- ✅ User satisfaction trend positive

---

## 🚀 Phase 3.3: Performance Testing (2-3 días)

**Objetivo:** Validar performance bajo cargas realistas y picos de tráfico

### 3.3.1 Daily Cycle Throughput Test
**Archivo:** `backend/src/__tests__/performance/dailyCycleThroughput.perf.test.ts`  
**Target:** 1,000 concurrent users in <5 minutes

```typescript
describe('Daily Cycle Performance', () => {
  test('processes 1000 concurrent daily cycles in <5 minutes', async () => {
    const userCount = 1000;
    const startTime = Date.now();

    // Spawn 1000 simulated users
    const cycles = Array(userCount).fill(null).map(() =>
      executeDailyBrainCycle(userId)
    );

    // Wait for completion
    await Promise.all(cycles);

    const duration = (Date.now() - startTime) / 1000 / 60; // minutes

    // Assertions
    expect(duration).toBeLessThan(5);
    expect(cpuUsage()).toBeLessThan(50); // percent
    expect(memoryUsage()).toBeLessThan(200); // MB

    // Output: {"duration": 4.2, "cpu": 45%, "memory": 180MB}
  });
});
```

**Success Criteria:**
- ✅ Duration <5 minutes
- ✅ CPU <50%
- ✅ Memory <200MB
- ✅ No errors

---

### 3.3.2 Webhook Ingestion Rate Test
**Archivo:** `backend/src/__tests__/performance/webhookIngestionRate.perf.test.ts`  
**Target:** 100 webhooks/second with <100ms latency

```typescript
describe('Webhook Ingestion Performance', () => {
  test('processes 100 webhooks/second with <100ms latency', async () => {
    const webhooksPerSecond = 100;
    const durationSeconds = 60;
    const totalWebhooks = webhooksPerSecond * durationSeconds;

    const latencies: number[] = [];

    for (let i = 0; i < totalWebhooks; i++) {
      const startTime = Date.now();
      
      await sendWebhook({
        timestamp: new Date().toISOString(),
        data: generateBiometricData()
      });

      latencies.push(Date.now() - startTime);
    }

    // Calculate statistics
    const p50 = calculatePercentile(latencies, 50);
    const p95 = calculatePercentile(latencies, 95);
    const p99 = calculatePercentile(latencies, 99);

    expect(p50).toBeLessThan(50);
    expect(p95).toBeLessThan(100);
    expect(p99).toBeLessThan(200);

    // Output: {"p50": 45ms, "p95": 85ms, "p99": 180ms}
  });
});
```

**Success Criteria:**
- ✅ P50 <50ms
- ✅ P95 <100ms
- ✅ P99 <200ms
- ✅ Zero timeouts

---

### 3.3.3 WebSocket Broadcast Performance Test
**Archivo:** `backend/src/__tests__/performance/websocketBroadcast.perf.test.ts`  
**Target:** 1M concurrent connections, <500ms delivery

```typescript
describe('WebSocket Broadcast Performance', () => {
  test('delivers messages to 1M clients within 500ms', async () => {
    const clientCount = 1000000;
    
    // Connect 1M clients (simulated)
    const clients = await connectSimulatedClients(clientCount);

    const startTime = Date.now();
    
    // Broadcast message
    await broadcastMessage({
      event: 'brain_cycle_complete',
      data: { /* ... */ }
    });

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(500);
    expect(cpuUsage()).toBeLessThan(60);
    expect(memoryUsage()).toBeLessThan(500);

    // Output: {"duration": 350ms, "cpu": 58%, "memory": 450MB}
  });
});
```

**Success Criteria:**
- ✅ Delivery time <500ms
- ✅ CPU <60%
- ✅ Memory <500MB
- ✅ No dropped messages

---

## 🔐 Phase 3.4: Security & Compliance Testing (2 días)

### 3.4.1 JWT Authentication Tests
**Archivo:** `backend/src/__tests__/security/jwtAuthentication.security.test.ts`

```typescript
describe('JWT Authentication Security', () => {
  test('rejects invalid JWT tokens', async () => {
    const response = await makeRequest({
      auth: 'invalid.token.here'
    });
    expect(response.status).toBe(401);
  });

  test('rejects expired tokens', async () => {
    const expiredToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '-1h' });
    const response = await makeRequest({ auth: expiredToken });
    expect(response.status).toBe(401);
  });

  test('accepts valid and refresh tokens', async () => {
    const token = generateValidToken();
    const response = await makeRequest({ auth: token });
    expect(response.status).toBe(200);
  });
});
```

**Success Criteria:**
- ✅ All invalid tokens rejected
- ✅ Expired tokens handled
- ✅ Valid tokens accepted

---

### 3.4.2 HMAC Signature Verification Tests
**Archivo:** `backend/src/__tests__/security/hmacSignatureVerification.security.test.ts`

```typescript
describe('HMAC Signature Verification', () => {
  test('rejects webhooks with invalid signatures', async () => {
    const webhook = generateWebhook();
    const wrongSignature = 'wrong_signature_here';
    
    const response = await postWebhook(webhook, wrongSignature);
    expect(response.status).toBe(401);
  });

  test('detects tampered payloads', async () => {
    const webhook = generateWebhook();
    const signature = calculateHMAC(webhook);
    
    webhook.data.value = 9999; // Tamper with data
    
    const response = await postWebhook(webhook, signature);
    expect(response.status).toBe(401);
  });

  test('accepts valid HMAC signatures', async () => {
    const webhook = generateWebhook();
    const signature = calculateHMAC(webhook);
    
    const response = await postWebhook(webhook, signature);
    expect(response.status).toBe(200);
  });
});
```

**Success Criteria:**
- ✅ Invalid signatures rejected
- ✅ Tampering detected
- ✅ No false positives

---

### 3.4.3 Data Encryption Tests
**Archivo:** `backend/src/__tests__/security/dataEncryption.security.test.ts`

```typescript
describe('Data Encryption', () => {
  test('encrypts sensitive data at rest', async () => {
    const user = await createUser({
      email: 'test@example.com',
      ssn: '123-45-6789' // Sensitive
    });

    const dbRecord = await db.query('SELECT * FROM users WHERE id = ?', user.id);
    
    // Verify encrypted in database
    expect(dbRecord.ssn).not.toContain('6789');
  });

  test('enforces HTTPS for all connections', async () => {
    const response = await makeRequest({ protocol: 'http' });
    expect(response.status).toBe(307); // Redirect to HTTPS
  });

  test('uses strong cipher suites', async () => {
    const ciphers = getTLSCipherSuites();
    expect(ciphers).not.toContain('NULL');
    expect(ciphers).not.toContain('EXPORT');
  });
});
```

**Success Criteria:**
- ✅ Encryption working
- ✅ HTTPS enforced
- ✅ Strong ciphers only

---

### 3.4.4 Rate Limiting Tests
**Archivo:** `backend/src/__tests__/security/rateLimiting.security.test.ts`

```typescript
describe('Rate Limiting', () => {
  test('enforces API rate limits', async () => {
    const maxRequests = 100;
    const windowSeconds = 60;

    // Make max + 1 requests
    for (let i = 0; i < maxRequests + 1; i++) {
      const response = await makeApiRequest();
      
      if (i < maxRequests) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429); // Too Many Requests
      }
    }
  });

  test('enforces WebSocket connection limits', async () => {
    const maxConnections = 1000;
    
    const connections = await Promise.all(
      Array(maxConnections + 1).fill(null).map(() => connectWebSocket())
    );

    // Last connection should fail
    expect(connections[maxConnections]).toBeNull();
  });
});
```

**Success Criteria:**
- ✅ API rate limits enforced
- ✅ WebSocket limits enforced
- ✅ No bypass possible

---

## 🔄 Phase 3.5: Regression Testing (1 día)

**Objetivo:** Verificar que Phase 0-1 funcionalidades siguen intactas

### 3.5.1 Existing Auth Service Tests
```typescript
test('existing auth service unaffected', async () => {
  // Run all Phase 0-1 auth tests
  // Verify 100% passing
  // Verify no performance regression
});
```

### 3.5.2 Database Migration Backward Compatibility
```typescript
test('database migrations backward compatible', async () => {
  // Start with old schema
  // Apply all migrations
  // Verify data integrity
  // Verify backward compatibility
});
```

### 3.5.3 API Endpoints Still Working
```typescript
test('existing API endpoints still working', async () => {
  // Test all Phase 0-1 endpoints
  // Verify correct responses
  // Verify performance acceptable
});
```

---

## 📊 Success Metrics & Validation

| Métrica | Target | Status | Notes |
|---------|--------|--------|-------|
| **Unit Test Coverage** | >85% | 🔴 | 6 suites, 800+ líneas |
| **Integration Tests** | 5/5 passing | 🔴 | E2E workflows validated |
| **Performance** | All targets met | 🔴 | Throughput, latency, capacity |
| **Security** | 0 vulnerabilities | 🔴 | OWASP compliance |
| **Regressions** | 0 issues | 🔴 | Phase 0-1 untouched |
| **Overall Pass Rate** | 100% | 🔴 | All phases passing |

---

## 🎁 Deliverables

### Código:
- ✅ 18 test suites (800+ líneas de código de test)
- ✅ 50+ individual tests
- ✅ Mock fixtures and test data generators
- ✅ Performance benchmarking tools

### Documentación:
- ✅ Este plan (PHASE_3_DETAILED_IMPLEMENTATION_PLAN.md)
- ✅ Test execution summary
- ✅ Performance baseline reports
- ✅ Security audit findings
- ✅ Regression analysis

### Tests Files:
```
backend/src/__tests__/
├── brainOrchestrator.test.ts
├── terraHealthService.test.ts
├── criticalSignalMonitor.test.ts
├── socketManager.test.ts
├── eventBus.test.ts
├── CoachVitalisService.test.ts
├── integration/
│   ├── dailyBrainCycle.e2e.test.ts
│   ├── terraWebhook.e2e.test.ts
│   ├── criticalSignalFlow.e2e.test.ts
│   ├── websocketRealtimeFlow.e2e.test.ts
│   └── feedbackLearningLoop.e2e.test.ts
├── performance/
│   ├── dailyCycleThroughput.perf.test.ts
│   ├── webhookIngestionRate.perf.test.ts
│   └── websocketBroadcast.perf.test.ts
└── security/
    ├── jwtAuthentication.security.test.ts
    ├── hmacSignatureVerification.security.test.ts
    ├── dataEncryption.security.test.ts
    └── rateLimiting.security.test.ts
```

---

## 📅 Timeline Detallado

### Día 1-2 (4-5 hrs): Unit Tests Phase 3.1
- [ ] brainOrchestrator.test.ts
- [ ] terraHealthService.test.ts
- [ ] critica lSignalMonitor.test.ts & socketManager.test.ts

### Día 3 (2-3 hrs): Unit Tests Continuación
- [ ] eventBus.test.ts
- [ ] CoachVitalisService.test.ts
- [ ] Run full unit test suite

### Día 4-5 (4-5 hrs): Integration Tests Phase 3.2
- [ ] Daily Brain Cycle E2E
- [ ] Terra Webhook Ingestion
- [ ] Critical Signal Flow

### Día 6 (4-5 hrs): Integration Tests Continuación
- [ ] WebSocket Real-Time Communication
- [ ] Feedback Learning Loop
- [ ] Full integration test validation

### Día 7 (2-3 hrs): Performance Testing Phase 3.3
- [ ] Daily Cycle Throughput
- [ ] Webhook Ingestion Rate
- [ ] WebSocket Broadcast Performance

### Día 8 (1-2 hrs): Security Testing Phase 3.4
- [ ] JWT Authentication
- [ ] HMAC Signature Verification
- [ ] Data Encryption
- [ ] Rate Limiting

### Día 9 (0.5-1 hr): Regression Testing Phase 3.5
- [ ] Existing Auth Service
- [ ] Database Migrations
- [ ] API Endpoints

### Día 10: Consolidation & Documentation
- [ ] Fix any remaining failures
- [ ] Generate reports
- [ ] Create completion summary

---

## Próximos Pasos

Una vez Phase 3 esté completada (100% tests passing):

1. **Create detailed Phase 3 Completion Report**
2. **Commit todos los cambios**
3. **Preparar para Phase 4: Frontend Components**
4. **Notificar a stakeholders: Lista para producción**

---

**Documento creado:** 8 de Febrero de 2026  
**Status:** 🟢 Ready to Begin  
**Estimated Effort:** 9-12 horas de desarrollo activo  
**Team:** 1 Engineer (Agente AI)
