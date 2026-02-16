const axios = require('axios');

async function testApi() {
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('Health response:', healthResponse.data);
    
    // Test AI health endpoint
    console.log('\nTesting AI health endpoint...');
    const aiHealthResponse = await axios.get('http://localhost:3001/ai/health');
    console.log('AI Health response:', aiHealthResponse.data);
    
    // Test AI alert endpoint
    console.log('\nTesting AI alert endpoint...');
    const alertResponse = await axios.post('http://localhost:3001/ai/alert', {
      userId: 'test-user'
    });
    console.log('Alert response:', alertResponse.data);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
  }
}

testApi();