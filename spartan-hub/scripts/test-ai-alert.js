const axios = require('axios');

async function testAiAlert() {
  try {
    console.log('Testing AI alert endpoint...');
    
    const response = await axios.post('http://localhost:3001/ai/alert', {
      userId: 'test-user'
    });
    
    console.log('AI Alert Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
  }
}

testAiAlert();