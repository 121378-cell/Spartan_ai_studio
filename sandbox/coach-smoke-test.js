const http = require('http');

// Configuration
const HOST = 'localhost';
const PORT = 3003; // Updated to match Docker mapping

// Helper to make HTTP requests
function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runSmokeTest() {
  console.log('🚀 Starting Coach Vitalis Smoke Test (Postgres Verification)...');

  try {
    // 1. Authenticate (or create user)
    console.log('🔑 Authenticating...');
    let token;
    let userId;
    
    // Try login first
    let authRes = await request('POST', '/auth/login', {
      email: 'smoke@test.com',
      password: 'password123'
    });

    if (authRes.status === 401 || authRes.status === 404) {
      console.log('⚠️ Login failed, attempting registration...');
      authRes = await request('POST', '/auth/register', {
        name: 'Smoke Test User',
        email: 'smoke@test.com',
        password: 'password123'
      });
    }

    if (authRes.status !== 200 && authRes.status !== 201) {
      throw new Error(`Authentication failed: ${authRes.status} - ${JSON.stringify(authRes.data)}`);
    }

    console.log('DEBUG: Auth Response FULL:', JSON.stringify(authRes));
    console.log('DEBUG: Auth Response DATA:', JSON.stringify(authRes.data));
    token = authRes.data.token;
    userId = authRes.data.user ? authRes.data.user.userId : undefined; // Try userId instead of id
    if (!userId) userId = authRes.data.user ? authRes.data.user.id : undefined;

    console.log(`✅ Authenticated as user ${userId}`);

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 2. Trigger Bio-State Evaluation (which triggers logic + persistence)
    console.log('🧠 Requesting Bio-State Evaluation...');
    // Found in coachVitalisRoutes.ts: router.get('/bio-state/:userId', ...)
    const bioStateRes = await request('GET', `/api/vitalis/bio-state/${userId}`, null, authHeaders);

    if (bioStateRes.status !== 200) {
      throw new Error(`Bio-State Evaluation failed: ${bioStateRes.status} - ${JSON.stringify(bioStateRes.data)}`);
    }

    console.log('✅ Bio-State retrieved.');
    console.log('   Action:', bioStateRes.data.recommendedAction);
    console.log('   Explanation:', bioStateRes.data.explanation);

    // 3. Verify Persistence (History)
    console.log('💾 Verifying Database Persistence...');
    // Found in coachVitalisRoutes.ts: router.get('/decision-history/:userId', ...)
    const historyRes = await request('GET', `/api/vitalis/decision-history/${userId}`, null, authHeaders);
    
    if (historyRes.status !== 200) {
      throw new Error(`History query failed: ${historyRes.status} - ${JSON.stringify(historyRes.data)}`);
    }

    if (historyRes.data && Array.isArray(historyRes.data) && historyRes.data.length > 0) {
      const latest = historyRes.data[0];
      console.log('✅ Persistence Verified! Found decision in history.');
      console.log(`   ID: ${latest.id}`);
      console.log(`   Action: ${latest.decision || latest.recommendedAction}`);
      console.log(`   Timestamp: ${latest.timestamp}`);
    } else {
      throw new Error('❌ No history found! Database persistence failed.');
    }

    console.log('\n🎉 SMOKE TEST PASSED: Postgres integration is working correctly!');

  } catch (error) {
    console.error('\n❌ SMOKE TEST FAILED');
    console.error(error.message);
    process.exit(1);
  }
}

runSmokeTest();
