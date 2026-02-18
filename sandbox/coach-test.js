const http = require('http');

async function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost', port: 3003, path: path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length }
    }, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: resData, headers: res.headers }));
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function get(path, cookie) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3003, path: path, method: 'GET',
      headers: { 'Cookie': cookie }
    }, (res) => {
      let resData = '';
      res.on('data', (chunk) => resData += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: resData }));
    });
    req.on('error', reject); req.end();
  });
}

async function run() {
  console.log('--- COACH VITALIS PERSISTENCE & AI TEST ---');
  try {
    const login = await post('/auth/login', { email: 'test_final_v2@spartan.com', password: 'Password123!' });
    const setCookie = login.headers['set-cookie'];
    const cookieHeader = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
    
    const userId = '7c32cf87-adac-4a34-a449-08db0e93fc4d';
    
    // 1. Bio-State (Triggers Persistence)
    console.log(`1. Requesting Bio-State for user ${userId}...`);
    const bioRes = await get(`/api/vitalis/bio-state/${userId}`, cookieHeader);
    console.log('Bio-State Result:', bioRes.statusCode);
    
    // 2. AI Advice (Triggers AI Microservice)
    console.log(`2. Requesting AI Advice for user ${userId}...`);
    const aiRes = await get(`/api/vitalis/ai-advice/${userId}`, cookieHeader);
    console.log('AI Advice Result:', aiRes.statusCode);
    
    console.log('Test completed. Check database logs.');
  } catch (e) { console.error('Error:', e.message); }
}
run();
