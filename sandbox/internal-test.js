const http = require('http');

async function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length,
        'x-terra-signature': 'sandbox-mock-signature',
        'x-terra-timestamp': Math.floor(Date.now() / 1000).toString()
      }
    }, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: resData }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('--- STARTING INTERNAL SMOKE TEST ---');
  
  // 1. Test Register
  try {
    const reg = await post('/auth/register', {
      email: `internal_${Date.now()}@spartan.com`,
      password: 'Password123!',
      name: 'Internal User'
    });
    console.log('Register Result:', reg.statusCode, reg.body);
    
    if (reg.statusCode === 201 || reg.statusCode === 200) {
      const user = JSON.parse(reg.body).user;
      const userId = user.id || user.userId;
      
      // 2. Test Webhook
      const web = await post('/api/webhooks/terra', {
        type: 'body',
        user: { reference_id: userId },
        data: [{
          metadata: { start_time: new Date().toISOString() },
          heart_data: { summary_data: { avg_hr_bpm: 99 } }
        }]
      });
      console.log('Webhook Result:', web.statusCode, web.body);
    }
  } catch (e) {
    console.error('Test Failed:', e.message);
  }
}

run();
