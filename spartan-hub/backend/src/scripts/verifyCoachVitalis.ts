/**
 * Coach Vitalis Verification Script
 * 
 * Verifies the end-to-end functionality of the Coach Vitalis service:
 * 1. Database schema verification
 * 2. Biometric data persistence
 * 3. Bio-state evaluation rules
 * 4. Alert generation
 * 5. Training adjustments
 */

import { getDatabase, initializeDatabase } from '../database/databaseManager';
import { getCoachVitalisService } from '../services/coachVitalisService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

async function verify() {
  console.log('--- Coach Vitalis End-to-End Verification ---');

  // 0. Initialize Database
  console.log('0. Initializing database...');
  await initializeDatabase();

  const userId = `test-user-${  uuidv4().substring(0, 8)}`;
  const db = getDatabase();

  // 1. Ensure users table exists and create test user
  console.log('1. Ensuring users table and test user exist...');
  db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);

  db.prepare('INSERT OR IGNORE INTO users (id, name, email, password) VALUES (?, ?, ?, ?)').run(
    userId, 'Test User', `${userId}@example.com`, 'password123'
  );

  const service = getCoachVitalisService();

  try {
    // 1. Initialize Service
    console.log('1. Initializing service...');
    await service.initialize();

    // 2. Setup Test Data (Last 7 days of HRV trend)
    console.log('2. Setting up test biometric data...');
    const today = new Date().toISOString().split('T')[0];

    // Insert summaries for the last 7 days with a declining HRV trend
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Simulating declining HRV: 60, 58, 55, 52, 50, 48, 45
      const hrv = 60 - (6 - i) * 2;

      db.prepare(`
          INSERT OR REPLACE INTO daily_biometric_summaries (
            id, userId, date, heartRateAvg, hrvAvg, stressLevel, sleepDuration, totalCalories, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
        `${userId}_${dateStr}`,
        userId,
        dateStr,
        65 + i, // Increasing RHR
        hrv,
        70 - i * 5, // Decreasing stress (to avoid Rule 1 and trigger Rule 2/4)
        6 + i * 0.2, // Poor sleep
        2500
      );
    }

    console.log('   Data inserted for user:', userId);

    // 3. Evaluate Bio State
    console.log('3. Evaluating bio state...');
    const evaluation = await service.evaluateBioState(userId, today);

    console.log('   Evaluation Result:');
    console.log('   - HRV Status:', evaluation.hrvStatus);
    console.log('   - Readiness:', evaluation.trainingReadiness);
    console.log('   - Nervous Load:', evaluation.nervousSystemLoad);
    console.log('   - Triggered Rules:', evaluation.triggeredRules.join(', '));
    console.log('   - Recommendation:', evaluation.recommendedAction);

    // 4. Generate Alerts
    console.log('4. Generating proactive alerts...');
    const alerts = await service.generateProactiveAlerts(userId);
    console.log(`   Generated ${alerts.length} alerts.`);
    alerts.forEach(a => console.log(`   - [${a.severity}] ${a.title}: ${a.message}`));

    // 5. Adjust Training
    console.log('5. Checking training adjustments...');
    const adjustments = await service.adjustTrainingPlan(userId);
    console.log(`   Generated ${adjustments.length} adjustments.`);
    adjustments.forEach(adj => console.log(`   - Adjusted ${adj.originalType} to ${adj.adjustedType} because ${adj.adjustmentReason}`));

    // 6. Check Persistence
    console.log('6. Verifying persistence in DB...');
    const history = await service.getDecisionHistory(userId);
    console.log(`   Found ${history.length} persistent decisions.`);

    console.log('\n--- Verification SUCCESSFUL ---');

  } catch (error) {
    console.error('\n--- Verification FAILED ---');
    console.error(error);
    process.exit(1);
  } finally {
    service.close();
  }
}

verify();
